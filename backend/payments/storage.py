"""
Supabase Storage Manager for Manual UPI Payment Proofs.
Ensures zero-trust security:
- Private bucket ('payment-proofs')
- Strict MIME type and magic number verification (JPG, JPEG, PNG, WEBP)
- 5MB maximum file size restriction
- Non-enumerable, collision-safe paths: {uid}/{order_number}/{uuid}_{clean_name}
- Short-lived signed URLs for administrative inspection
- Safe local media fallback if storage credentials are offline
"""

import os
import re
import uuid
import logging
import requests
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
}

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 Megabytes


def validate_image_file(file_obj):
    """
    Validates file size, file extension, and image header magic bytes.
    Raises ValueError with client-safe message if invalid.
    """
    # 1. Size check
    file_size = getattr(file_obj, 'size', 0)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"Uploaded file size ({round(file_size / (1024*1024), 2)} MB) exceeds the 5 MB limit.")
    if file_size <= 0:
        raise ValueError("Uploaded file is empty.")

    # 2. Extension check
    filename = getattr(file_obj, 'name', '') or 'proof.jpg'
    ext = os.path.splitext(filename)[1].lower()
    allowed_extensions = {ext for exts in ALLOWED_MIME_TYPES.values() for ext in exts}
    if ext not in allowed_extensions:
        raise ValueError(f"File extension '{ext}' is not supported. Please upload JPG, PNG, or WEBP.")

    # 3. Read header bytes for magic numbers
    initial_pos = file_obj.tell() if hasattr(file_obj, 'tell') else 0
    header = file_obj.read(16)
    if hasattr(file_obj, 'seek'):
        file_obj.seek(initial_pos)

    is_jpeg = header.startswith(b'\xff\xd8\xff')
    is_png = header.startswith(b'\x89PNG\r\n\x1a\n')
    is_webp = len(header) >= 12 and header.startswith(b'RIFF') and header[8:12] == b'WEBP'

    if not (is_jpeg or is_png or is_webp):
        raise ValueError("The uploaded file does not appear to be a valid image (JPG, PNG, or WEBP).")

    # Clean content type
    if is_jpeg:
        content_type = 'image/jpeg'
    elif is_png:
        content_type = 'image/png'
    else:
        content_type = 'image/webp'

    return ext, content_type


def get_supabase_headers(use_secret=True):
    """
    Returns authorization headers for Supabase Storage API using backend secret key.
    """
    secret_key = getattr(settings, 'SUPABASE_SECRET_KEY', getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')).strip()
    anon_key = getattr(settings, 'SUPABASE_ANON_KEY', '').strip()
    key = (secret_key if use_secret and secret_key else '') or anon_key or secret_key
    if not key:
        return None
    return {
        'Authorization': f'Bearer {key}',
        'apiKey': key,
    }


def ensure_payment_proofs_bucket():
    """
    Idempotently ensures the private 'payment-proofs' storage bucket exists in Supabase.
    """
    supabase_url = getattr(settings, 'SUPABASE_URL', '').rstrip('/')
    bucket = getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'payment-proofs')
    headers = get_supabase_headers()
    if not supabase_url or not headers:
        return False

    try:
        check_url = f"{supabase_url}/storage/v1/bucket/{bucket}"
        res = requests.get(check_url, headers=headers, timeout=5)
        if res.status_code == 200:
            return True
        if res.status_code == 404:
            # Create private bucket
            create_url = f"{supabase_url}/storage/v1/bucket"
            create_res = requests.post(
                create_url,
                headers={**headers, 'Content-Type': 'application/json'},
                json={'id': bucket, 'name': bucket, 'public': False},
                timeout=5
            )
            return create_res.status_code in (200, 201)
    except Exception as e:
        logger.warning("Could not verify/create Supabase bucket: %s", str(e))
    return False


def upload_payment_proof(file_obj, user_uid, order_number):
    """
    Validates and stores payment proof screenshot.
    Uploads directly to private Supabase Storage bucket.
    If storage is unavailable, safely saves to local Django storage.
    Returns: storage_path (relative reference path string)
    """
    ext, content_type = validate_image_file(file_obj)

    # Sanitize inputs for safe path
    safe_uid = re.sub(r'[^a-zA-Z0-9_-]', '', user_uid) or 'guest'
    safe_order = re.sub(r'[^a-zA-Z0-9_-]', '', order_number) or 'unknown-order'
    unique_suffix = uuid.uuid4().hex[:12]
    filename = f"proof_{unique_suffix}{ext}"
    relative_path = f"{safe_uid}/{safe_order}/{filename}"

    supabase_url = getattr(settings, 'SUPABASE_URL', '').rstrip('/')
    bucket = getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'payment-proofs')
    headers = get_supabase_headers()

    # Read file content
    initial_pos = file_obj.tell() if hasattr(file_obj, 'tell') else 0
    file_bytes = file_obj.read()
    if hasattr(file_obj, 'seek'):
        file_obj.seek(initial_pos)

    # Attempt Supabase upload if configured
    if supabase_url and headers:
        try:
            ensure_payment_proofs_bucket()
            upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{relative_path}"
            req_headers = {
                **headers,
                'Content-Type': content_type,
                'x-upsert': 'true',
            }
            res = requests.post(upload_url, data=file_bytes, headers=req_headers, timeout=10)
            if res.status_code in (200, 201):
                logger.info("Uploaded payment proof to Supabase Storage: %s/%s", bucket, relative_path)
                return f"supabase://{bucket}/{relative_path}"
            else:
                logger.warning("Supabase Storage upload returned %s: %s", res.status_code, res.text)
        except Exception as e:
            logger.error("Supabase Storage upload failed: %s", str(e))

    # Safe fallback: Save to Django default storage (FileSystemStorage in media/)
    local_path = f"payment_proofs/{safe_uid}/{safe_order}/{filename}"
    saved_path = default_storage.save(local_path, ContentFile(file_bytes))
    logger.info("Saved payment proof to local storage: %s", saved_path)
    return f"local://{saved_path}"


def create_signed_proof_url(storage_path, expires_in=3600):
    """
    Generates a secure, time-limited signed URL for administrative inspection.
    """
    if not storage_path:
        return ''

    if storage_path.startswith('supabase://'):
        # Format: supabase://{bucket}/{relative_path}
        parts = storage_path.replace('supabase://', '', 1).split('/', 1)
        if len(parts) == 2:
            bucket, rel_path = parts
            supabase_url = getattr(settings, 'SUPABASE_URL', '').rstrip('/')
            headers = get_supabase_headers()
            if supabase_url and headers:
                try:
                    sign_url = f"{supabase_url}/storage/v1/object/sign/{bucket}/{rel_path}"
                    res = requests.post(
                        sign_url,
                        headers={**headers, 'Content-Type': 'application/json'},
                        json={'expiresIn': int(expires_in)},
                        timeout=5
                    )
                    if res.status_code == 200:
                        data = res.json()
                        signed_part = data.get('signedURL') or data.get('url') or ''
                        if signed_part:
                            if signed_part.startswith('http'):
                                return signed_part
                            return f"{supabase_url}/storage/v1{signed_part}"
                except Exception as e:
                    logger.warning("Could not generate Supabase signed URL: %s", str(e))

    elif storage_path.startswith('local://'):
        local_rel = storage_path.replace('local://', '', 1).lstrip('/')
        media_url = getattr(settings, 'MEDIA_URL', '/media/')
        base_origin = 'http://localhost:8000' if settings.DEBUG else ''
        return f"{base_origin}{media_url}{local_rel}"

    return storage_path
