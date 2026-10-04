"""
Supabase Storage Manager for Promotional Banners & Campaign Artwork.

Features:
- Dedicated bucket: 'promotional-banners'
- Versioned, deterministic storage paths:
    promotional-banners/{banner_id}/desktop/hero-{timestamp}.{ext}
    promotional-banners/{banner_id}/mobile/hero-{timestamp}.{ext}
    promotional-banners/{banner_id}/assets/{asset_type}-{timestamp}.{ext}
- Atomic upload verification before updating database
- Safe replacement: old images are only removed after database update succeeds
- Direct CDN caching with cache-busting versioned paths (no stale browser cache)
"""

import os
import time
import logging
import requests
import base64
from django.conf import settings

logger = logging.getLogger(__name__)

PROMOTIONAL_BANNERS_BUCKET = getattr(settings, 'PROMOTIONAL_BANNERS_BUCKET', 'promotional-banners')
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'}
ALLOWED_CONTENT_TYPES = {
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
}


def get_supabase_url():
    return getattr(settings, 'SUPABASE_URL', '').rstrip('/')


def get_service_role_headers():
    secret_key = (
        getattr(settings, 'SUPABASE_SECRET_KEY', '')
        or getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')
    ).strip()
    if not secret_key:
        logger.error("SUPABASE_SECRET_KEY is not configured for Promotional Banner Storage")
        return None
    return {
        'Authorization': 'Bearer ' + secret_key,
        'apiKey': secret_key,
    }


def ensure_promotional_banners_bucket():
    """
    Idempotently ensures the public 'promotional-banners' Supabase Storage bucket exists.
    """
    supabase_url = get_supabase_url()
    headers = get_service_role_headers()
    if not supabase_url or not headers:
        return False

    try:
        check_url = f"{supabase_url}/storage/v1/bucket/{PROMOTIONAL_BANNERS_BUCKET}"
        res = requests.get(check_url, headers=headers, timeout=8)
        if res.status_code == 200:
            return True

        # Bucket does not exist - create it as public
        create_url = f"{supabase_url}/storage/v1/bucket"
        create_res = requests.post(
            create_url,
            headers={**headers, 'Content-Type': 'application/json'},
            json={
                'id': PROMOTIONAL_BANNERS_BUCKET,
                'name': PROMOTIONAL_BANNERS_BUCKET,
                'public': True,
                'allowedMimeTypes': list(ALLOWED_CONTENT_TYPES),
                'fileSizeLimit': MAX_FILE_SIZE_BYTES,
            },
            timeout=8,
        )
        if create_res.status_code in (200, 201):
            logger.info("Created Supabase Storage bucket: %s", PROMOTIONAL_BANNERS_BUCKET)
            return True
        logger.warning(
            "Failed to create Supabase bucket %s: %s %s",
            PROMOTIONAL_BANNERS_BUCKET, create_res.status_code, create_res.text,
        )
        return False
    except Exception as e:
        logger.error("Error ensuring promotional banners bucket: %s", str(e))
        return False


def validate_banner_image(file_bytes, original_filename):
    """
    Validates image bytes:
    1. Size within limit (10MB)
    2. Authoritative magic byte MIME detection
    3. Safe file extensions
    """
    size = len(file_bytes)
    if size == 0:
        raise ValueError("Uploaded file is empty.")
    if size > MAX_FILE_SIZE_BYTES:
        mb = round(size / (1024 * 1024), 2)
        raise ValueError(f"File size ({mb} MB) exceeds maximum allowed 10 MB limit.")

    ext = os.path.splitext(original_filename)[1].lower() if original_filename else '.jpg'
    if ext not in ALLOWED_EXTENSIONS:
        ext = '.jpg'

    header = file_bytes[:16]
    if header[:3] == b'\xff\xd8\xff':
        return '.jpg', 'image/jpeg'
    elif header[:8] == b'\x89PNG\r\n\x1a\n':
        return '.png', 'image/png'
    elif len(header) >= 12 and header[:4] == b'RIFF' and header[8:12] == b'WEBP':
        return '.webp', 'image/webp'
    elif header[:6] in (b'GIF87a', b'GIF89a'):
        return '.gif', 'image/gif'
    elif ext == '.avif':
        return '.avif', 'image/avif'
    else:
        raise ValueError(
            "The uploaded file is not a supported image format. "
            "Please upload a WebP, JPG, PNG, or AVIF file."
        )


def build_banner_storage_path(banner_id, slot_type='desktop', original_filename='artwork.webp'):
    """
    Creates deterministic, versioned storage path to avoid stale CDN caching.
    Format: {banner_id}/{slot_type}/banner-{timestamp}.{ext}
    """
    timestamp = int(time.time())
    clean_banner_id = str(banner_id or 'shared').strip()
    clean_slot = str(slot_type or 'desktop').strip().lower()
    return f"{clean_banner_id}/{clean_slot}/banner-{timestamp}"


def upload_banner_image_to_supabase(file_bytes, ext, content_type, relative_path_without_ext):
    """
    Uploads image bytes to Supabase Storage in 'promotional-banners' bucket.
    """
    supabase_url = get_supabase_url()
    headers = get_service_role_headers()

    if not supabase_url or not headers:
        raise RuntimeError("Supabase Storage credentials not configured.")

    ensure_promotional_banners_bucket()

    storage_path = relative_path_without_ext + ext
    upload_url = f"{supabase_url}/storage/v1/object/{PROMOTIONAL_BANNERS_BUCKET}/{storage_path}"

    req_headers = {
        **headers,
        'Content-Type': content_type,
        'x-upsert': 'true',
        'Cache-Control': 'public, max-age=31536000, immutable',
    }

    res = requests.post(upload_url, data=file_bytes, headers=req_headers, timeout=60)
    if res.status_code in (200, 201):
        logger.info("Successfully uploaded promotional banner to Supabase Storage: %s", storage_path)
        return storage_path
    else:
        logger.error("Supabase Storage upload failed: %s %s", res.status_code, res.text)
        raise RuntimeError(f"Storage upload error ({res.status_code}): {res.text}")


def get_banner_public_url(storage_path):
    """
    Generates canonical CDN public URL for a stored banner asset.
    """
    if not storage_path:
        return ''
    if storage_path.startswith('http://') or storage_path.startswith('https://'):
        return storage_path
    supabase_url = get_supabase_url()
    return f"{supabase_url}/storage/v1/object/public/{PROMOTIONAL_BANNERS_BUCKET}/{storage_path.lstrip('/')}"


def delete_banner_storage_asset(storage_path):
    """
    Safely deletes an obsolete banner asset from Supabase Storage.
    Only called AFTER database commit succeeds.
    """
    if not storage_path or storage_path.startswith('http'):
        return False
    supabase_url = get_supabase_url()
    headers = get_service_role_headers()
    if not supabase_url or not headers:
        return False

    try:
        delete_url = f"{supabase_url}/storage/v1/object/{PROMOTIONAL_BANNERS_BUCKET}"
        clean_path = storage_path.lstrip('/')
        res = requests.delete(
            delete_url,
            headers={**headers, 'Content-Type': 'application/json'},
            json={'prefixes': [clean_path]},
            timeout=10,
        )
        return res.status_code in (200, 204)
    except Exception as e:
        logger.warning("Error deleting obsolete storage path %s: %s", storage_path, str(e))
        return False
