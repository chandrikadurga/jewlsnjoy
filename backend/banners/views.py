import os
import logging
from django.utils import timezone
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import PromotionalBanner, PromotionalBannerAsset
from .serializers import (
    PromotionalBannerSerializer,
    ActivePromotionalBannerSerializer,
    PromotionalBannerAssetSerializer,
)
from .auth import verify_admin_request
from .storage import (
    validate_banner_image,
    build_banner_storage_path,
    upload_banner_image_to_supabase,
    get_banner_public_url,
    delete_banner_storage_asset,
    PROMOTIONAL_BANNERS_BUCKET,
)

logger = logging.getLogger(__name__)


# ─── STOREFRONT ENDPOINTS ─────────────────────────────────────────────────────

class ActivePromotionalBannerView(APIView):
    """
    GET /api/promotional-banners/active/
    Returns the currently active promotional campaign for the storefront hero.
    
    Active Selection Rules:
      1. status = 'published'
      2. is_active = True
      3. start_at <= now OR start_at IS NULL
      4. end_at >= now OR end_at IS NULL
      5. Highest priority (order_by('-priority', 'display_order', '-created_at'))
      6. If no banner qualifies, returns 200 with active: false (never crashes homepage)
    """
    def get(self, request):
        now = timezone.now()

        active_query = (
            Q(status=PromotionalBanner.STATUS_PUBLISHED) &
            Q(is_active=True) &
            (Q(start_at__isnull=True) | Q(start_at__lte=now)) &
            (Q(end_at__isnull=True) | Q(end_at__gte=now))
        )

        banner = (
            PromotionalBanner.objects.filter(active_query)
            .prefetch_related('assets')
            .order_by('-priority', 'display_order', '-created_at')
            .first()
        )

        if not banner:
            response = Response({
                'active': False,
                'banner': None,
                'message': 'No active promotional banner scheduled'
            }, status=status.HTTP_200_OK)
            response['Cache-Control'] = 'public, max-age=60, s-maxage=60'
            return response

        serialized = ActivePromotionalBannerSerializer(banner).data
        response = Response({
            'active': True,
            'banner': serialized,
            # Flatten top-level keys for direct client consumption
            **serialized,
        }, status=status.HTTP_200_OK)

        # Cache control: short cache so updates propagate quickly
        response['Cache-Control'] = 'public, max-age=60, s-maxage=60'
        return response


class StorefrontBannerListView(APIView):
    """
    GET /api/promotional-banners/
    Returns all currently active promotional banners (e.g. for multi-campaign carousels).
    """
    def get(self, request):
        now = timezone.now()

        active_query = (
            Q(status=PromotionalBanner.STATUS_PUBLISHED) &
            Q(is_active=True) &
            (Q(start_at__isnull=True) | Q(start_at__lte=now)) &
            (Q(end_at__isnull=True) | Q(end_at__gte=now))
        )

        banners = (
            PromotionalBanner.objects.filter(active_query)
            .prefetch_related('assets')
            .order_by('-priority', 'display_order', '-created_at')
        )

        serialized = ActivePromotionalBannerSerializer(banners, many=True).data
        response = Response({
            'count': len(serialized),
            'results': serialized,
        }, status=status.HTTP_200_OK)
        response['Cache-Control'] = 'public, max-age=60, s-maxage=60'
        return response


# ─── ADMIN ENDPOINTS ──────────────────────────────────────────────────────────

def _check_admin(request):
    is_valid, user_payload = verify_admin_request(request)
    if not is_valid:
        return False, Response(
            {'error': 'Unauthorized. Admin credentials required to perform this action.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    return True, user_payload


class AdminPromotionalBannerListView(APIView):
    """
    GET  /api/admin/promotional-banners/
    POST /api/admin/promotional-banners/
    """
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        is_admin, err_resp = _check_admin(request)
        if not is_admin:
            return err_resp

        banners = PromotionalBanner.objects.prefetch_related('assets').all()

        # Optional filters
        search = request.query_params.get('search', '').strip()
        if search:
            banners = banners.filter(
                Q(name__icontains=search) |
                Q(title__icontains=search) |
                Q(subtitle__icontains=search)
            )

        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            banners = banners.filter(status=status_filter)

        banners = banners.order_by('-priority', 'display_order', '-created_at')
        serializer = PromotionalBannerSerializer(banners, many=True)
        response = Response(serializer.data, status=status.HTTP_200_OK)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response

    def post(self, request):
        is_admin, user_payload = _check_admin(request)
        if not is_admin:
            return err_resp

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['created_by'] = str(user_payload or 'admin')
        data['updated_by'] = str(user_payload or 'admin')

        serializer = PromotionalBannerSerializer(data=data)
        if serializer.is_valid():
            banner = serializer.save()
            logger.info("Admin created promotional banner %s (%s)", banner.name, banner.id)
            return Response(PromotionalBannerSerializer(banner).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminPromotionalBannerDetailView(APIView):
    """
    GET    /api/admin/promotional-banners/{id}/
    PATCH  /api/admin/promotional-banners/{id}/
    DELETE /api/admin/promotional-banners/{id}/
    """
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_object(self, pk):
        return get_object_or_404(PromotionalBanner.objects.prefetch_related('assets'), pk=pk)

    def get(self, request, pk):
        is_admin, err_resp = _check_admin(request)
        if not is_admin:
            return err_resp

        banner = self.get_object(pk)
        return Response(PromotionalBannerSerializer(banner).data)

    def patch(self, request, pk):
        is_admin, user_payload = _check_admin(request)
        if not is_admin:
            return err_resp

        banner = self.get_object(pk)

        # ── Concurrency Check (Section 19: Race condition protection) ──────
        last_known_updated_at = (
            request.data.get('last_known_updated_at') or
            request.data.get('updated_at')
        )
        if last_known_updated_at:
            # Compare up to milliseconds
            current_iso = banner.updated_at.isoformat()
            if not current_iso.startswith(str(last_known_updated_at)[:19]):
                return Response({
                    'error': 'This banner was updated by another administrator. Please refresh before saving.',
                    'conflict': True,
                    'current_updated_at': current_iso,
                }, status=status.HTTP_409_CONFLICT)

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['updated_by'] = str(user_payload or 'admin')

        serializer = PromotionalBannerSerializer(banner, data=data, partial=True)
        if serializer.is_valid():
            updated_banner = serializer.save()
            logger.info("Admin updated promotional banner %s (%s)", updated_banner.name, updated_banner.id)
            return Response(PromotionalBannerSerializer(updated_banner).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        is_admin, _ = _check_admin(request)
        if not is_admin:
            return err_resp

        banner = self.get_object(pk)
        banner_name = banner.name

        # Clean up storage assets if stored in Supabase
        for asset in banner.assets.all():
            if asset.storage_path:
                delete_banner_storage_asset(asset.storage_path)

        banner.delete()
        logger.info("Admin deleted promotional banner %s (%s)", banner_name, pk)
        return Response({
            'message': f"Promotional banner '{banner_name}' deleted successfully."
        }, status=status.HTTP_200_OK)


class AdminPromotionalBannerPublishView(APIView):
    """
    POST /api/admin/promotional-banners/{id}/publish/
    """
    def post(self, request, pk):
        is_admin, user_payload = _check_admin(request)
        if not is_admin:
            return err_resp

        banner = get_object_or_404(PromotionalBanner, pk=pk)
        banner.status = PromotionalBanner.STATUS_PUBLISHED
        banner.is_active = True
        banner.updated_by = str(user_payload or 'admin')
        banner.save()

        logger.info("Admin published banner %s (%s)", banner.name, banner.id)
        return Response(PromotionalBannerSerializer(banner).data)


class AdminPromotionalBannerUnpublishView(APIView):
    """
    POST /api/admin/promotional-banners/{id}/unpublish/
    """
    def post(self, request, pk):
        is_admin, user_payload = _check_admin(request)
        if not is_admin:
            return err_resp

        banner = get_object_or_404(PromotionalBanner, pk=pk)
        banner.status = PromotionalBanner.STATUS_DRAFT
        banner.is_active = False
        banner.updated_by = str(user_payload or 'admin')
        banner.save()

        logger.info("Admin unpublished banner %s (%s)", banner.name, banner.id)
        return Response(PromotionalBannerSerializer(banner).data)


class AdminPromotionalBannerDuplicateView(APIView):
    """
    POST /api/admin/promotional-banners/{id}/duplicate/
    """
    def post(self, request, pk):
        is_admin, user_payload = _check_admin(request)
        if not is_admin:
            return err_resp

        source = get_object_or_404(PromotionalBanner.objects.prefetch_related('assets'), pk=pk)
        new_banner = PromotionalBanner.objects.create(
            name=f"Copy of {source.name}",
            title=source.title,
            subtitle=source.subtitle,
            price_text=source.price_text,
            supporting_text=source.supporting_text,
            cta_text=source.cta_text,
            cta_url=source.cta_url,
            desktop_image_url=source.desktop_image_url,
            mobile_image_url=source.mobile_image_url,
            background_image_url=source.background_image_url,
            status=PromotionalBanner.STATUS_DRAFT,
            is_active=False,
            priority=source.priority,
            start_at=source.start_at,
            end_at=source.end_at,
            display_order=source.display_order + 1,
            layer_config=source.layer_config,
            created_by=str(user_payload or 'admin'),
            updated_by=str(user_payload or 'admin'),
        )

        # Duplicate associated layer assets
        for asset in source.assets.all():
            PromotionalBannerAsset.objects.create(
                banner=new_banner,
                asset_type=asset.asset_type,
                asset_url=asset.asset_url,
                storage_path=asset.storage_path,
                alt_text=asset.alt_text,
                display_order=asset.display_order,
                is_visible=asset.is_visible,
            )

        logger.info("Admin duplicated banner %s -> %s", source.id, new_banner.id)
        return Response(PromotionalBannerSerializer(new_banner).data, status=status.HTTP_201_CREATED)


class AdminPromotionalBannerReorderView(APIView):
    """
    PATCH /api/admin/promotional-banners/reorder/
    Accepts: { "banner_ids": ["uuid-1", "uuid-2", ...] }
    """
    def patch(self, request):
        is_admin, _ = _check_admin(request)
        if not is_admin:
            return err_resp

        banner_ids = request.data.get('banner_ids', [])
        if not isinstance(banner_ids, list):
            return Response({'error': "'banner_ids' must be an array of UUIDs"}, status=status.HTTP_400_BAD_REQUEST)

        for index, b_id in enumerate(banner_ids):
            PromotionalBanner.objects.filter(pk=b_id).update(display_order=index)

        return Response({'success': True, 'reordered_count': len(banner_ids)})


class AdminBannerImageUploadView(APIView):
    """
    POST /api/admin/promotional-banners/upload-artwork/
    
    Uploads desktop or mobile banner artwork directly to Supabase Storage
    in the dedicated 'promotional-banners' bucket.
    
    ATOMIC FLOW:
      1. Validate file (size, MIME, magic bytes)
      2. Upload to Supabase Storage with versioned path
      3. Verify upload succeeded
      4. Return storage_path + public_url
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        is_admin, _ = _check_admin(request)
        if not is_admin:
            return err_resp

        banner_id = request.data.get('banner_id') or 'shared'
        slot_type = request.data.get('slot_type', 'desktop')  # 'desktop', 'mobile', or 'assets'

        file_obj = request.FILES.get('image') or request.FILES.get('file')
        if not file_obj and request.FILES:
            file_obj = list(request.FILES.values())[0]

        if not file_obj:
            return Response({'error': 'No image file provided in request.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            file_bytes = b''.join(file_obj.chunks())
            original_filename = getattr(file_obj, 'name', 'artwork.webp')

            # 1. Validate
            ext, content_type = validate_banner_image(file_bytes, original_filename)

            # 2. Build deterministic versioned path
            path_base = build_banner_storage_path(banner_id, slot_type, original_filename)

            # 3. Upload to Supabase Storage
            storage_path = upload_banner_image_to_supabase(
                file_bytes, ext, content_type, path_base
            )

            # 4. Generate public CDN URL
            public_url = get_banner_public_url(storage_path)

            return Response({
                'url': public_url,
                'storage_path': storage_path,
                'bucket': PROMOTIONAL_BANNERS_BUCKET,
                'filename': os.path.basename(storage_path),
                'slot_type': slot_type,
            }, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as e:
            logger.error("Supabase Storage error: %s", str(e))
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.exception("Unexpected error in banner image upload: %s", str(e))
            return Response({'error': 'Image upload failed. Server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminBannerAssetListView(APIView):
    """
    POST /api/admin/promotional-banners/{id}/assets/
    """
    def post(self, request, pk):
        is_admin, _ = _check_admin(request)
        if not is_admin:
            return err_resp

        banner = get_object_or_404(PromotionalBanner, pk=pk)
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['banner'] = str(banner.id)

        serializer = PromotionalBannerAssetSerializer(data=data)
        if serializer.is_valid():
            asset = serializer.save()
            return Response(PromotionalBannerAssetSerializer(asset).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminBannerAssetDetailView(APIView):
    """
    DELETE /api/admin/promotional-banners/{id}/assets/{asset_id}/
    """
    def delete(self, request, pk, asset_id):
        is_admin, _ = _check_admin(request)
        if not is_admin:
            return err_resp

        asset = get_object_or_404(PromotionalBannerAsset, pk=asset_id, banner_id=pk)
        if asset.storage_path:
            delete_banner_storage_asset(asset.storage_path)

        asset.delete()
        return Response({'message': 'Banner asset deleted successfully.'}, status=status.HTTP_200_OK)
