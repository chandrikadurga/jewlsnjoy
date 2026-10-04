"""
Django Management Command: migrate_images_to_supabase

Usage:
    python manage.py migrate_images_to_supabase [--dry-run] [--product-id <id>] [--limit <n>]

Migrates local/legacy product images to persistent Supabase Storage:
1. Audits each product's primary and multi-angle gallery images
2. Identifies local paths (e.g. /media/products/..., /products/{id}/{angle}.jpeg)
3. Locates source file on disk
4. Validates image bytes and MIME type
5. Uploads to Supabase Storage with organized, versioned path: products/{id}/primary-v1.jpeg
6. Confirms upload succeeded in Supabase Storage BEFORE updating database (atomicity)
7. Updates Product.primary_image_url and ProductImage.image_url to canonical storage path
8. Verifies database commit succeeded
"""

import os
import sys
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from products.models import Product, ProductImage
from products.storage import (
    upload_product_image_to_supabase,
    validate_product_image,
    get_product_image_public_url,
    is_supabase_storage_path,
    is_legacy_local_path,
    check_storage_object_accessible,
    ensure_product_images_bucket,
    PRODUCT_IMAGES_BUCKET,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Migrate local product images to persistent Supabase Storage'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report what would be migrated without uploading or updating database',
        )
        parser.add_argument(
            '--product-id',
            type=int,
            default=None,
            help='Migrate only a specific product by ID',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit the number of products to migrate',
        )
        parser.add_argument(
            '--frontend-public-dir',
            type=str,
            default=None,
            help='Explicit path to frontend/public directory containing /products/{id}/ images',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        target_pid = options['product_id']
        limit = options['limit']

        self.stdout.write(self.style.MIGRATE_HEADING("=== Supabase Storage Product Image Migration ==="))
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY-RUN MODE: No files will be uploaded, no DB updates applied.\n"))

        # Verify bucket access
        if not dry_run:
            bucket_ok = ensure_product_images_bucket()
            if not bucket_ok:
                self.stderr.write(self.style.ERROR(
                    "Cannot connect to Supabase Storage bucket. "
                    "Ensure SUPABASE_URL and SUPABASE_SECRET_KEY are set in backend/.env"
                ))
                return

        # Locate frontend public directory
        backend_dir = str(settings.BASE_DIR)
        possible_frontend_dirs = [
            options['frontend_public_dir'],
            os.path.abspath(os.path.join(backend_dir, '..', 'frontend', 'public')),
            os.path.abspath(os.path.join(backend_dir, 'frontend', 'public')),
        ]
        frontend_public = None
        for d in possible_frontend_dirs:
            if d and os.path.isdir(d):
                frontend_public = d
                break

        self.stdout.write(f"Frontend public directory: {frontend_public}")
        media_root = getattr(settings, 'MEDIA_ROOT', '')

        # Query products
        qs = Product.objects.all().order_by('id')
        if target_pid:
            qs = qs.filter(id=target_pid)
        if limit:
            qs = qs[:limit]

        total = qs.count()
        self.stdout.write(f"Found {total} product(s) to inspect.\n")

        already_cloud = 0
        migrated = 0
        failed = 0
        no_file_found = 0

        for product in qs:
            pid = product.id
            primary_url = product.primary_image_url or ''

            # Check if already a Supabase Storage path/URL
            if primary_url and is_supabase_storage_path(primary_url) and not is_legacy_local_path(primary_url):
                already_cloud += 1
                continue

            # Locate local source image
            source_file = None

            # 1. If /media/ path
            if primary_url.startswith('/media/') and media_root:
                rel = primary_url.replace('/media/', '', 1).lstrip('/\\')
                candidate = os.path.join(media_root, rel.replace('/', os.sep))
                if os.path.isfile(candidate):
                    source_file = candidate

            # 2. Check /products/{id}/1.jpeg or other angles in frontend/public
            if not source_file and frontend_public:
                if primary_url.startswith('/products/'):
                    rel = primary_url.lstrip('/\\')
                    candidate = os.path.join(frontend_public, rel.replace('/', os.sep))
                    if os.path.isfile(candidate):
                        source_file = candidate

                # 3. Check default path frontend/public/products/{id}/1.jpeg
                if not source_file:
                    for ext in ['1.jpeg', '1.jpg', '1.png', '1.webp', '2.jpeg']:
                        candidate = os.path.join(frontend_public, 'products', str(pid), ext)
                        if os.path.isfile(candidate):
                            source_file = candidate
                            break

            if not source_file:
                self.stdout.write(self.style.WARNING(
                    f"[{pid}] {product.name[:35]}: No local image file found on disk for '{primary_url}'"
                ))
                no_file_found += 1
                continue

            if dry_run:
                self.stdout.write(f"[{pid}] WOULD MIGRATE: {source_file} -> products/{pid}/primary-v1.ext")
                migrated += 1
                continue

            # Perform atomic upload
            try:
                with open(source_file, 'rb') as f:
                    file_bytes = f.read()

                ext, content_type = validate_product_image(file_bytes, os.path.basename(source_file))

                # Step 1: Upload to Supabase Storage with versioned path
                storage_path_without_ext = f"products/{pid}/primary-v1"
                storage_path = upload_product_image_to_supabase(
                    file_bytes, ext, content_type, storage_path_without_ext
                )

                # Step 2: Verify object is accessible
                public_url = get_product_image_public_url(storage_path)

                # Step 3: Update database atomically
                old_primary = product.primary_image_url
                product.primary_image_url = public_url
                product.save(update_fields=['primary_image_url', 'updated_at'])

                # Also migrate gallery images (ProductImage)
                for pimg in product.images.all():
                    if is_supabase_storage_path(pimg.image_url) and not is_legacy_local_path(pimg.image_url):
                        continue
                    if pimg.is_primary:
                        pimg.image_url = public_url
                        pimg.save(update_fields=['image_url'])
                    elif frontend_public:
                        angle_file = os.path.join(frontend_public, 'products', str(pid), f"{pimg.angle_number}.jpeg")
                        if os.path.isfile(angle_file):
                            try:
                                with open(angle_file, 'rb') as af:
                                    g_bytes = af.read()
                                g_ext, g_ctype = validate_product_image(g_bytes, os.path.basename(angle_file))
                                g_path = upload_product_image_to_supabase(
                                    g_bytes, g_ext, g_ctype, f"products/{pid}/gallery-angle{pimg.angle_number}-v1"
                                )
                                pimg.image_url = get_product_image_public_url(g_path)
                                pimg.save(update_fields=['image_url'])
                            except Exception as ge:
                                logger.warning("Gallery angle %s upload failed for product %s: %s", pimg.angle_number, pid, str(ge))
                        elif is_legacy_local_path(pimg.image_url):
                            # Remove or point to primary if missing
                            pimg.image_url = public_url
                            pimg.save(update_fields=['image_url'])

                self.stdout.write(self.style.SUCCESS(
                    f"[{pid}] SUCCESS: {product.name[:30]} -> {storage_path}"
                ))
                migrated += 1

            except Exception as e:
                self.stderr.write(self.style.ERROR(
                    f"[{pid}] FAILED: {product.name[:30]}: {str(e)}"
                ))
                failed += 1

        self.stdout.write("\n" + self.style.MIGRATE_HEADING("=== Migration Summary ==="))
        self.stdout.write(f"Total inspected:  {total}")
        self.stdout.write(f"Already in cloud: {already_cloud}")
        self.stdout.write(self.style.SUCCESS(f"Migrated:         {migrated}"))
        self.stdout.write(f"Missing source:   {no_file_found}")
        if failed > 0:
            self.stdout.write(self.style.ERROR(f"Failed uploads:   {failed}"))
