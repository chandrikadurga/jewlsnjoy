"""
Supabase Storage Manager for Product Images.

Architecture:
  Admin selects image -> Frontend sends to Django -> Django validates ->
  Django uploads to Supabase Storage (product-images bucket) ->
  Supabase confirms -> Django stores canonical path in DB ->
  Frontend renders from Supabase CDN URL (globally accessible)

Key guarantees:
- Atomic: DB is NEVER updated before upload is confirmed in Supabase Storage
- Versioned: paths like products/{id}/primary-v3.webp prevent CDN cache stale
- Authoritative: all images live in Supabase Storage, NEVER on local Django disk
- Service-role key used server-side ONLY; never exposed to the browser
- On upload failure: old image remains untouched, DB unchanged
"""

import os
import re
import uuid
import logging
import requests
import base64
from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PRODUCT_IMAGES_BUCKET = 'product-images'
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.jfif', '.heic'}
ALLOWED_CONTENT_TYPES = {
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/heic',
}


# ---------------------------------------------------------------------------
# Internal Supabase Helpers
# ---------------------------------------------------------------------------

def _get_supabase_url():
    return getattr(settings, 'SUPABASE_URL', '').rstrip('/')


def _get_service_role_headers():
    """
    Returns service-role auth headers for privileged Storage API calls.
    The service-role key is NEVER sent to the browser - only used server-side here.
    """
    secret_key = (
        getattr(settings, 'SUPABASE_SECRET_KEY', '')
        or getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')
    ).strip()
    if not secret_key:
        logger.error("SUPABASE_SECRET_KEY is not configured - cannot upload to Supabase Storage")
        return None
    return {
        'Authorization': 'Bearer ' + secret_key,
        'apiKey': secret_key,
    }


# ---------------------------------------------------------------------------
# Bucket Management
# ---------------------------------------------------------------------------

def ensure_product_images_bucket():
    """
    Idempotently ensures the public 'product-images' Supabase Storage bucket exists.
    Returns True if bucket is ready, False otherwise.
    """
    supabase_url = _get_supabase_url()
    headers = _get_service_role_headers()
    if not supabase_url or not headers:
        return False

    try:
        check_url = supabase_url + '/storage/v1/bucket/' + PRODUCT_IMAGES_BUCKET
        res = requests.get(check_url, headers=headers, timeout=8)
        if res.status_code == 200:
            return True

        # Bucket does not exist - create it as public (product images are public assets)
        create_url = supabase_url + '/storage/v1/bucket'
        create_res = requests.post(
            create_url,
            headers=dict(list(headers.items()) + [('Content-Type', 'application/json')]),
            json={
                'id': PRODUCT_IMAGES_BUCKET,
                'name': PRODUCT_IMAGES_BUCKET,
                'public': True,
                'allowedMimeTypes': list(ALLOWED_CONTENT_TYPES),
                'fileSizeLimit': MAX_FILE_SIZE_BYTES,
            },
            timeout=8,
        )
        if create_res.status_code in (200, 201):
            logger.info("Created Supabase Storage bucket: %s", PRODUCT_IMAGES_BUCKET)
            return True
        logger.warning(
            "Failed to create Supabase bucket %s: %s %s",
            PRODUCT_IMAGES_BUCKET, create_res.status_code, create_res.text,
        )
        return False
    except Exception as e:
        logger.error("Error ensuring Supabase bucket: %s", str(e))
        return False


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_product_image(file_bytes, original_filename):
    """
    Validates image bytes by:
    1. Checking file size
    2. Checking extension  
    3. Checking magic bytes (file header) - authoritative MIME detection

    Returns (ext, content_type) on success.
    Raises ValueError with user-safe message on failure.
    """
    # 1. Size check
    size = len(file_bytes)
    if size == 0:
        raise ValueError("The uploaded file is empty.")
    if size > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            "File size (" + str(round(size / (1024 * 1024), 1)) + " MB) exceeds the 10 MB limit."
        )

    # 2. Extension check
    ext = os.path.splitext(original_filename)[1].lower() if original_filename else '.jpg'
    if ext not in ALLOWED_EXTENSIONS:
        ext = '.jpg'

    # 3. Magic byte detection (more reliable than browser-reported MIME type)
    header = file_bytes[:16]
    if header[:3] == b'\xff\xd8\xff':
        return '.jpg', 'image/jpeg'
    elif header[:8] == b'\x89PNG\r\n\x1a\n':
        return '.png', 'image/png'
    elif len(header) >= 12 and header[:4] == b'RIFF' and header[8:12] == b'WEBP':
        return '.webp', 'image/webp'
    elif header[:6] in (b'GIF87a', b'GIF89a'):
        return '.gif', 'image/gif'
    else:
        # HEIC/AVIF have complex container formats - trust extension if it's in the safe list
        if ext in ('.heic', '.avif', '.jfif'):
            return '.jpg', 'image/jpeg'
        raise ValueError(
            "The uploaded file does not appear to be a valid image. "
            "Please upload a JPG, PNG, WEBP, or GIF file."
        )


# ---------------------------------------------------------------------------
# Path Helpers
# ---------------------------------------------------------------------------

def build_versioned_storage_path(product_id='tmp', image_type='primary', version=None):
    """
    Constructs a versioned, organized storage path according to Supabase Storage structure requirements.
    
    Organized directory layout:
      - Products: products/{product_id}/{image_type}-{version}
      - Promotional Banners: promotional-banners/{banner_id or image_type}-{version}
      - Category Images: category-images/{category_id}-{version}

    Versioning prevents browser and CDN caching of old images when an image is replaced.
    """
    if version is not None:
        suffix = 'v' + str(version)
    else:
        suffix = uuid.uuid4().hex[:10]

    pid_str = str(product_id).strip() if product_id is not None else 'tmp'
    
    if pid_str in ('banner', 'hero', 'promotional', 'promo') or image_type in ('banner', 'hero', 'promo'):
        return 'promotional-banners/' + image_type + '-' + suffix
    elif pid_str.startswith('banner-') or pid_str.startswith('promo-'):
        return 'promotional-banners/' + pid_str + '/' + image_type + '-' + suffix
    elif pid_str.startswith('category') or image_type == 'category':
        return 'category-images/' + pid_str + '-' + suffix
    else:
        return 'products/' + pid_str + '/' + image_type + '-' + suffix


# ---------------------------------------------------------------------------
# Upload (Core - atomic step 2 of 5-step flow)
# ---------------------------------------------------------------------------

def upload_product_image_to_supabase(file_bytes, ext, content_type, storage_path_without_ext):
    """
    Uploads validated image bytes to Supabase Storage.

    CRITICAL ATOMICITY RULE:
    This function MUST succeed BEFORE the caller updates the database.
    The correct sequence is:
      1. Validate image
      2. Upload to Supabase (THIS FUNCTION)
      3. Verify upload succeeded
      4. Update database with new path
      5. Cleanup old image (only after DB commit)

    If this function raises RuntimeError, the caller MUST NOT update the DB.
    The existing product image must remain unchanged.

    Returns: canonical storage path string, e.g. "products/42/primary-v3.jpg"
    Raises: RuntimeError if upload fails
    """
    supabase_url = _get_supabase_url()
    headers = _get_service_role_headers()

    if not supabase_url or not headers:
        raise RuntimeError(
            "Supabase Storage is not configured. "
            "Set SUPABASE_URL and SUPABASE_SECRET_KEY environment variables."
        )

    ensure_product_images_bucket()

    storage_path = storage_path_without_ext + ext
    upload_url = supabase_url + '/storage/v1/object/' + PRODUCT_IMAGES_BUCKET + '/' + storage_path

    req_headers = dict(list(headers.items()) + [
        ('Content-Type', content_type),
        ('x-upsert', 'true'),
        ('Cache-Control', 'max-age=31536000'),  # 1 year - versioning prevents stale content
    ])

    try:
        res = requests.post(upload_url, data=file_bytes, headers=req_headers, timeout=60)
        if res.status_code in (200, 201):
            logger.info(
                "Successfully uploaded product image to Supabase Storage: %s/%s",
                PRODUCT_IMAGES_BUCKET, storage_path,
            )
            return storage_path
        else:
            logger.error(
                "Supabase Storage upload failed with status %s: %s",
                res.status_code, res.text,
            )
            raise RuntimeError(
                "Image upload to Supabase Storage failed (HTTP " + str(res.status_code) + "). "
                "Your existing product image has not been changed."
            )
    except requests.exceptions.Timeout:
        raise RuntimeError(
            "Image upload timed out. Please try again. "
            "Your existing product image has not been changed."
        )
    except requests.exceptions.ConnectionError as e:
        raise RuntimeError(
            "Could not connect to Supabase Storage: " + str(e) + ". "
            "Your existing product image has not been changed."
        )


def upload_base64_product_image(base64_data_uri, product_id=None, image_type='primary'):
    """
    Converts a base64 data URI to bytes and uploads to Supabase Storage.
    Used when the frontend sends base64-encoded image data.

    Returns canonical storage path string.
    Raises RuntimeError or ValueError on failure.
    """
    if not base64_data_uri or not isinstance(base64_data_uri, str):
        raise ValueError("No base64 image data provided.")

    if 'base64,' not in base64_data_uri:
        raise ValueError("Invalid base64 data URI format.")

    header, encoded = base64_data_uri.split('base64,', 1)
    try:
        file_bytes = base64.b64decode(encoded)
    except Exception:
        raise ValueError("Could not decode base64 image data.")

    # Infer filename hint from data URI header
    if 'png' in header:
        orig_filename = 'image.png'
    elif 'webp' in header:
        orig_filename = 'image.webp'
    elif 'gif' in header:
        orig_filename = 'image.gif'
    else:
        orig_filename = 'image.jpg'

    ext, content_type = validate_product_image(file_bytes, orig_filename)
    pid_str = str(product_id) if product_id else 'tmp'
    path_base = build_versioned_storage_path(pid_str, image_type)
    return upload_product_image_to_supabase(file_bytes, ext, content_type, path_base)


# ---------------------------------------------------------------------------
# URL Generation - Single Canonical Source of Truth
# ---------------------------------------------------------------------------

def get_product_image_public_url(storage_path):
    """
    Returns the globally-accessible public CDN URL for a product image.

    THIS IS THE ONLY PLACE where Supabase public URLs should be constructed
    for product images. All API responses should use this function.
    React components must NEVER construct storage URLs themselves.

    Handles multiple path formats for backwards compatibility:
    - Canonical path: "products/42/primary-v3.jpg" -> full Supabase URL
    - Full HTTPS URL: returned as-is
    - Local /media/ path: logged as warning, returns empty string
    - localhost URL: logged as warning, returns empty string
    """
    if not storage_path:
        return ''

    # Already a full HTTP(S) URL (e.g., already-resolved Supabase CDN URL)
    if storage_path.startswith('http://') or storage_path.startswith('https://'):
        # Warn if it's a localhost URL - not globally accessible
        if 'localhost' in storage_path or '127.0.0.1' in storage_path:
            logger.warning(
                "Product image references localhost - not globally accessible: %s", storage_path
            )
            return ''
        return storage_path

    supabase_url = _get_supabase_url()
    if not supabase_url:
        return storage_path

    # Supabase internal URI format (used by payments module, handle gracefully)
    if storage_path.startswith('supabase://'):
        parts = storage_path.replace('supabase://', '', 1).split('/', 1)
        if len(parts) == 2:
            bucket, rel_path = parts
            return supabase_url + '/storage/v1/object/public/' + bucket + '/' + rel_path
        return ''

    # Local fallback URI - not globally accessible
    if storage_path.startswith('local://'):
        logger.warning(
            "Product image has local:// path - not globally accessible: %s", storage_path
        )
        return ''

    # Legacy local relative paths - not globally accessible
    if storage_path.startswith('/media/') or storage_path.startswith('/products/'):
        logger.warning(
            "Product image has local relative path - not globally accessible: %s. "
            "This product needs to be updated with a Supabase Storage path.",
            storage_path,
        )
        return ''

    # Blob URL - temporary, never should be stored
    if storage_path.startswith('blob:') or storage_path.startswith('data:'):
        logger.error(
            "Product image has a temporary blob/data URL - this should NEVER be stored in DB: %s",
            storage_path,
        )
        return ''

    # Canonical relative storage path: "products/42/primary-v3.jpg"
    return supabase_url + '/storage/v1/object/public/' + PRODUCT_IMAGES_BUCKET + '/' + storage_path


def is_supabase_storage_path(path):
    """Returns True if path is a canonical Supabase Storage path."""
    if not path or not isinstance(path, str):
        return False
    supabase_url = _get_supabase_url()
    if supabase_url and path.startswith(supabase_url):
        return True
    # Canonical relative path patterns: "products/...", "promotional-banners/...", etc.
    if re.match(r'^(products|promotional-banners|category-images|banners)/', path):
        return True
    return False


def is_legacy_local_path(path):
    """Returns True if a path is a local/legacy path that is NOT globally accessible."""
    if not path:
        return False
    if path.startswith('/media/') or path.startswith('/products/'):
        return True
    if path.startswith('C:\\') or path.startswith('C:/'):
        return True
    if 'localhost' in path or '127.0.0.1' in path:
        return True
    if path.startswith('data:image') or path.startswith('blob:'):
        return True
    return False


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

def delete_storage_object(storage_path):
    """
    Deletes a single object from Supabase Storage.

    IMPORTANT SAFETY RULES:
    - ONLY call this AFTER the new image has been committed to the database.
    - NEVER delete before the DB update is confirmed.
    - If the DB update failed after upload, DO NOT call this - log for reconciliation instead.
    """
    if not storage_path or not is_supabase_storage_path(storage_path):
        return False

    supabase_url = _get_supabase_url()
    headers = _get_service_role_headers()
    if not supabase_url or not headers:
        return False

    try:
        delete_url = supabase_url + '/storage/v1/object/' + PRODUCT_IMAGES_BUCKET
        req_headers = dict(list(headers.items()) + [('Content-Type', 'application/json')])
        res = requests.delete(
            delete_url,
            headers=req_headers,
            json={'prefixes': [storage_path]},
            timeout=10,
        )
        if res.status_code in (200, 204):
            logger.info("Deleted storage object: %s/%s", PRODUCT_IMAGES_BUCKET, storage_path)
            return True
        logger.warning(
            "Failed to delete storage object %s: %s %s",
            storage_path, res.status_code, res.text,
        )
        return False
    except Exception as e:
        logger.error("Error deleting storage object %s: %s", storage_path, str(e))
        return False


# ---------------------------------------------------------------------------
# Health Check Utilities
# ---------------------------------------------------------------------------

def check_storage_object_accessible(storage_path):
    """
    Performs a lightweight HTTP HEAD check to verify a product image's public URL is reachable.
    Used by the GET /api/admin/system/image-health/ endpoint.
    """
    if not storage_path:
        return False
    if is_legacy_local_path(storage_path):
        return False
    url = get_product_image_public_url(storage_path)
    if not url:
        return False
    try:
        res = requests.head(url, timeout=8, allow_redirects=True)
        return res.status_code in (200, 206)
    except Exception:
        return False
