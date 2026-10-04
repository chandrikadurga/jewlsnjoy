from datetime import timedelta
from django.test import TestCase, RequestFactory
from django.utils import timezone
from django.core.signing import TimestampSigner

from .models import PromotionalBanner, PromotionalBannerAsset
from .views import (
    ActivePromotionalBannerView,
    AdminPromotionalBannerListView,
    AdminPromotionalBannerDetailView,
    AdminPromotionalBannerPublishView,
    AdminPromotionalBannerUnpublishView,
)
from .storage import validate_banner_image, MAX_FILE_SIZE_BYTES


class PromotionalBannerModelTests(TestCase):
    def test_create_and_slug_generation(self):
        banner = PromotionalBanner.objects.create(
            name="Diwali Mega Sale 2026",
            title="Diwali Special",
            price_text="Flat 50% OFF",
            status=PromotionalBanner.STATUS_PUBLISHED,
            is_active=True,
            priority=15,
        )
        self.assertTrue(banner.slug.startswith("diwali-mega-sale"))
        self.assertTrue(banner.is_currently_active())

    def test_active_selection_priority(self):
        now = timezone.now()
        # Banner A: priority 10
        banner_a = PromotionalBanner.objects.create(
            name="Campaign A",
            title="A",
            status=PromotionalBanner.STATUS_PUBLISHED,
            is_active=True,
            priority=10,
        )
        # Banner B: priority 25 (higher)
        banner_b = PromotionalBanner.objects.create(
            name="Campaign B",
            title="B",
            status=PromotionalBanner.STATUS_PUBLISHED,
            is_active=True,
            priority=25,
        )

        req = RequestFactory().get('/api/promotional-banners/active/')
        resp = ActivePromotionalBannerView.as_view()(req)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(str(resp.data['id']), str(banner_b.id))

    def test_scheduling_behavior(self):
        now = timezone.now()
        future_banner = PromotionalBanner.objects.create(
            name="Future Campaign",
            status=PromotionalBanner.STATUS_PUBLISHED,
            is_active=True,
            priority=100,
            start_at=now + timedelta(days=2),
            end_at=now + timedelta(days=5),
        )
        self.assertFalse(future_banner.is_currently_active(now))


class PromotionalBannerSecurityAndAPITests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.signer = TimestampSigner(salt='jewlsnjoy_admin_session_auth')
        self.valid_admin_token = self.signer.sign('1:admin')

    def test_unauthenticated_storefront_access_allowed(self):
        req = self.factory.get('/api/promotional-banners/active/')
        resp = ActivePromotionalBannerView.as_view()(req)
        self.assertEqual(resp.status_code, 200)

    def test_unauthorized_admin_access_rejected(self):
        req = self.factory.get('/api/admin/promotional-banners/')
        resp = AdminPromotionalBannerListView.as_view()(req)
        self.assertEqual(resp.status_code, 401)

    def test_authorized_admin_access_accepted(self):
        req = self.factory.get(
            '/api/admin/promotional-banners/',
            HTTP_X_ADMIN_TOKEN=self.valid_admin_token
        )
        resp = AdminPromotionalBannerListView.as_view()(req)
        self.assertEqual(resp.status_code, 200)

    def test_admin_create_banner(self):
        payload = {
            'name': 'Valentine Flash Sale',
            'title': 'BYOS LOVE',
            'subtitle': 'Pick 3 at',
            'price_text': '₹899/-',
            'cta_text': 'GRAB DEAL',
            'cta_url': '/collections/deals',
            'status': 'published',
            'is_active': True,
            'priority': 20,
        }
        req = self.factory.post(
            '/api/admin/promotional-banners/',
            data=payload,
            content_type='application/json',
            HTTP_X_ADMIN_TOKEN=self.valid_admin_token
        )
        resp = AdminPromotionalBannerListView.as_view()(req)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['name'], 'Valentine Flash Sale')

    def test_concurrency_race_condition_protection(self):
        banner = PromotionalBanner.objects.create(
            name="Concurrent Campaign",
            status=PromotionalBanner.STATUS_DRAFT,
            priority=5,
        )
        # Admin A tries to save with stale updated_at
        stale_updated_at = "2020-01-01T00:00:00.000000+00:00"
        payload = {
            'name': 'Overwritten Campaign',
            'last_known_updated_at': stale_updated_at,
        }
        req = self.factory.patch(
            f'/api/admin/promotional-banners/{banner.id}/',
            data=payload,
            content_type='application/json',
            HTTP_X_ADMIN_TOKEN=self.valid_admin_token
        )
        resp = AdminPromotionalBannerDetailView.as_view()(req, pk=banner.id)
        self.assertEqual(resp.status_code, 409)
        self.assertTrue(resp.data.get('conflict'))

    def test_publish_and_unpublish_flow(self):
        banner = PromotionalBanner.objects.create(
            name="Publish Flow Campaign",
            status=PromotionalBanner.STATUS_DRAFT,
            is_active=False,
        )
        # Publish
        pub_req = self.factory.post(
            f'/api/admin/promotional-banners/{banner.id}/publish/',
            HTTP_X_ADMIN_TOKEN=self.valid_admin_token
        )
        pub_resp = AdminPromotionalBannerPublishView.as_view()(pub_req, pk=banner.id)
        self.assertEqual(pub_resp.status_code, 200)
        banner.refresh_from_db()
        self.assertEqual(banner.status, PromotionalBanner.STATUS_PUBLISHED)
        self.assertTrue(banner.is_active)

        # Unpublish
        unpub_req = self.factory.post(
            f'/api/admin/promotional-banners/{banner.id}/unpublish/',
            HTTP_X_ADMIN_TOKEN=self.valid_admin_token
        )
        unpub_resp = AdminPromotionalBannerUnpublishView.as_view()(unpub_req, pk=banner.id)
        self.assertEqual(unpub_resp.status_code, 200)
        banner.refresh_from_db()
        self.assertEqual(banner.status, PromotionalBanner.STATUS_DRAFT)
        self.assertFalse(banner.is_active)


class BannerImageValidationTests(TestCase):
    def test_valid_jpeg_magic_bytes(self):
        fake_jpeg = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00'
        ext, ct = validate_banner_image(fake_jpeg, 'test.jpg')
        self.assertEqual(ext, '.jpg')
        self.assertEqual(ct, 'image/jpeg')

    def test_valid_png_magic_bytes(self):
        fake_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'
        ext, ct = validate_banner_image(fake_png, 'test.png')
        self.assertEqual(ext, '.png')
        self.assertEqual(ct, 'image/png')

    def test_empty_image_rejected(self):
        with self.assertRaises(ValueError):
            validate_banner_image(b'', 'empty.jpg')

    def test_oversized_image_rejected(self):
        oversized = b'0' * (MAX_FILE_SIZE_BYTES + 1024)
        with self.assertRaises(ValueError):
            validate_banner_image(oversized, 'huge.jpg')

    def test_executable_script_rejected(self):
        fake_exe = b'MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00'
        with self.assertRaises(ValueError):
            validate_banner_image(fake_exe, 'malicious.exe')
