"""
Django REST API views for Jewels N' Joys.
Full-stack database queries for public storefront and admin dashboard.
"""

import os
import json
import logging
import uuid
import urllib.request
from decimal import Decimal
from pathlib import Path
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.db.models import Sum, Q, Count
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

admin_signer = TimestampSigner(salt='jewlsnjoy-admin-auth')

logger = logging.getLogger(__name__)

from .models import Category, Product, ProductImage, Order, OrderItem, Review, StorePolicy
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductListSerializer,
    AdminProductWriteSerializer,
    OrderSerializer,
    OrderCreateSerializer,
    ReviewSerializer,
    StorePolicySerializer,
)


# ─── Public Storefront Views ──────────────────────────────────────────────────

class ProductListView(APIView):
    """
    GET /api/products/
    Returns all products from the database with category, style, featured, bestseller, and search filtering.
    """
    def get(self, request):
        queryset = Product.objects.select_related('category').prefetch_related('images').all()

        # Category filter
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(
                Q(category__slug__iexact=category) | Q(category__name__iexact=category)
            )

        # Style filter
        style = request.query_params.get('style')
        if style:
            # JSONField style contains
            queryset = queryset.filter(style_tags__icontains=style)

        # Featured filter
        featured = request.query_params.get('featured')
        if featured == 'true':
            queryset = queryset.filter(is_featured=True)

        # Bestseller filter
        bestseller = request.query_params.get('bestseller')
        if bestseller == 'true':
            queryset = queryset.filter(is_bestseller=True)

        # Search filter
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(category__name__icontains=search)
            )

        # In-stock filter: only applied when explicitly specified via query param
        in_stock_param = request.query_params.get('in_stock')
        if in_stock_param == 'true':
            queryset = queryset.filter(in_stock=True, stock_quantity__gt=0)
        elif in_stock_param == 'false':
            queryset = queryset.filter(Q(in_stock=False) | Q(stock_quantity=0))

        serializer = ProductListSerializer(queryset, many=True)
        response = Response({
            'count': queryset.count(),
            'results': serializer.data
        })
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        return response


class ProductDetailView(APIView):
    """
    GET /api/products/<id>/
    """
    def get(self, request, pk):
        try:
            product = Product.objects.select_related('category').prefetch_related('images').get(pk=pk)
            response = Response(ProductSerializer(product).data)
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            response['Pragma'] = 'no-cache'
            return response
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)


class ProductReviewsView(APIView):
    """
    GET /api/products/<pk>/reviews/
    POST /api/products/<pk>/reviews/
    """
    def get(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        reviews = product.reviews.all()
        return Response(ReviewSerializer(reviews, many=True).data)

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['product'] = product.id
        serializer = ReviewSerializer(data=data)
        if serializer.is_valid():
            serializer.save(is_verified_buyer=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class ProductBySlugView(APIView):
    """
    GET /api/products/slug/<slug>/
    """
    def get(self, request, slug):
        try:
            product = Product.objects.select_related('category').prefetch_related('images').get(slug=slug)
            response = Response(ProductSerializer(product).data)
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            response['Pragma'] = 'no-cache'
            return response
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)


class FeaturedProductsView(APIView):
    """
    GET /api/products/featured/
    """
    def get(self, request):
        products = Product.objects.filter(is_featured=True)[:8]
        response = Response(ProductListSerializer(products, many=True).data)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        return response


class BestsellerProductsView(APIView):
    """
    GET /api/products/bestsellers/
    """
    def get(self, request):
        products = Product.objects.filter(is_bestseller=True)[:8]
        response = Response(ProductListSerializer(products, many=True).data)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        return response


class CategoryListView(APIView):
    """
    GET /api/categories/
    """
    def get(self, request):
        categories = Category.objects.all()
        return Response(CategorySerializer(categories, many=True).data)


def get_authenticated_supabase_user(request):
    """
    Extracts Bearer token from request Authorization header and verifies it with Supabase Auth API.
    Returns:
      {
        'uid': '<uuid>',
        'email': '<email>',
        'email_verified': True/False,
        'user_metadata': {...}
      }
    or None if unauthenticated / invalid.
    """
    auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None

    token = auth_header.split(' ', 1)[1].strip()
    if not token:
        return None

    supabase_url = getattr(settings, 'SUPABASE_URL', 'https://hlxffdtkghzednkpwxlb.supabase.co').rstrip('/')
    anon_key = getattr(settings, 'SUPABASE_ANON_KEY', '')

    user_endpoint = f"{supabase_url}/auth/v1/user"
    req = urllib.request.Request(
        user_endpoint,
        headers={
            'apikey': anon_key,
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                uid = data.get('id')
                if not uid:
                    return None
                email = (data.get('email') or '').strip().lower()
                email_confirmed_at = data.get('email_confirmed_at')
                email_verified = bool(email_confirmed_at)
                return {
                    'uid': str(uid),
                    'email': email,
                    'email_verified': email_verified,
                    'user_metadata': data.get('user_metadata', {})
                }
    except Exception as e:
        logger.warning("Supabase token verification failed: %s", str(e))
        return None

    return None


class OrderCreateView(APIView):
    """
    POST /api/orders/
    Called by storefront checkout to persist customer order.
    Zero-Trust Security: user_id is never accepted from the request body.
    Server extracts and verifies Supabase JWT if present; otherwise sets empty string for guest.
    """
    def post(self, request):
        auth_user = get_authenticated_supabase_user(request)
        verified_uid = auth_user['uid'] if auth_user else ''

        serializer = OrderCreateSerializer(data=request.data)
        if serializer.is_valid():
            order = serializer.save(user_id=verified_uid)
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomerOrderListView(APIView):
    """
    GET /api/orders/my-orders/
    Returns orders belonging to the authenticated customer.
    Requires verified Supabase Bearer token.
    Claims legacy unassigned orders (user_id='') ONLY IF the user's email is verified.
    """
    def get(self, request):
        auth_user = get_authenticated_supabase_user(request)
        if not auth_user or not auth_user.get('uid'):
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        user_uid = auth_user['uid']
        user_email = auth_user.get('email', '')
        email_verified = auth_user.get('email_verified', False)

        # Legacy order claiming: ONLY claim if customer's email is verified through Supabase
        if email_verified and user_email:
            Order.objects.filter(
                user_id='',
                customer_email__iexact=user_email
            ).update(user_id=user_uid)

        orders = Order.objects.filter(user_id=user_uid).prefetch_related('items').order_by('-created_at')
        return Response(OrderSerializer(orders, many=True).data)


class CustomerOrderTrackView(APIView):
    """
    GET /api/orders/track/<str:order_number>/
    Returns order tracking details by order_number or numeric order ID.
    Works for both guest customers and authenticated users without requiring login/signup.
    """
    def get(self, request, order_number):
        clean_num = str(order_number or '').strip()
        if not clean_num:
            return Response({'error': 'Order number is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup by order_number (e.g. ORD-XXXXXX), or by primary key ID if purely numeric
        order = Order.objects.filter(order_number__iexact=clean_num).prefetch_related('items').first()
        if not order and clean_num.isdigit():
            order = Order.objects.filter(pk=int(clean_num)).prefetch_related('items').first()

        if not order:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response(OrderSerializer(order).data)



# ─── Admin Authentication & Dashboard Views ───────────────────────────────────

class AdminLoginView(APIView):
    """
    POST /api/admin/login/
    Authenticates store administrator with username/email and password.
    Returns signed session token and admin profile.
    """
    def post(self, request):
        username_or_email = request.data.get('username') or request.data.get('email')
        password = request.data.get('password')

        if not username_or_email or not password:
            return Response(
                {'error': 'Username or email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        username_or_email = str(username_or_email).strip()
        User = get_user_model()
        user = None

        # If an email was provided, look up the username
        if '@' in username_or_email:
            user_obj = User.objects.filter(email__iexact=username_or_email).first()
            if user_obj:
                user = authenticate(request, username=user_obj.username, password=password)

        if not user:
            user = authenticate(request, username=username_or_email, password=password)

        if not user or not (user.is_staff or user.is_superuser):
            return Response(
                {'error': 'Invalid administrator credentials or unauthorized access.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate a signed timestamped token valid for 24h
        token_payload = f"{user.id}:{user.username}"
        signed_token = admin_signer.sign(token_payload)

        return Response({
            'success': True,
            'token': signed_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'name': user.get_full_name() or user.username,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
            },
            'message': 'Admin authenticated successfully.'
        })


class AdminVerifyTokenView(APIView):
    """
    POST /api/admin/verify/
    Verifies admin session token validity.
    """
    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'valid': False, 'error': 'Token missing'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            val = admin_signer.unsign(token, max_age=86400)  # 24 hours
            parts = val.split(':', 1)
            user_id = parts[0]
            User = get_user_model()
            user = User.objects.filter(id=user_id, is_staff=True).first()
            if not user:
                return Response({'valid': False, 'error': 'Admin user not found'}, status=status.HTTP_401_UNAUTHORIZED)
            return Response({'valid': True, 'username': user.username, 'email': user.email})
        except (BadSignature, SignatureExpired):
            return Response({'valid': False, 'error': 'Session expired or invalid signature'}, status=status.HTTP_401_UNAUTHORIZED)


class AdminStatsView(APIView):
    """
    GET /api/admin/stats/
    Returns real-time aggregated metrics for the luxury admin dashboard.
    """
    def get(self, request):
        orders = Order.objects.all()
        products = Product.objects.all()

        total_revenue = orders.exclude(status='cancelled').aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        total_orders = orders.count()
        total_products = products.count()
        low_stock_count = products.filter(stock_quantity__lte=15).count()

        # Status breakdown
        status_counts = {
            'pending': orders.filter(status='pending').count(),
            'processing': orders.filter(status='processing').count(),
            'shipped': orders.filter(status='shipped').count(),
            'delivered': orders.filter(status='delivered').count(),
            'cancelled': orders.filter(status='cancelled').count(),
        }

        # Recent 5 orders
        recent_orders = OrderSerializer(orders.order_by('-created_at')[:5], many=True).data
        
        # Recent products
        recent_products = ProductListSerializer(products.order_by('-created_at')[:5], many=True).data

        return Response({
            'total_revenue': float(total_revenue),
            'total_orders': total_orders,
            'total_products': total_products,
            'low_stock_count': low_stock_count,
            'status_counts': status_counts,
            'recent_orders': recent_orders,
            'recent_products': recent_products,
        })


class AdminProductListView(APIView):
    """
    GET /api/admin/products/
    POST /api/admin/products/
    """
    def get(self, request):
        products = Product.objects.select_related('category').prefetch_related('images').all()
        search = request.query_params.get('search')
        if search:
            products = products.filter(
                Q(name__icontains=search) |
                Q(category__name__icontains=search)
            )
        response = Response(ProductSerializer(products, many=True).data)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        return response

    def post(self, request):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        images_data = data.pop('images', None)
        if images_data is None:
            images_data = data.pop('image_urls', None)
        primary_url = data.get('primary_image_url') or data.get('image')

        # Synchronize stock
        data = AdminProductDetailView()._sync_stock_data(None, data)

        # Merge product details (policies, specifications, care instructions)
        data['details'] = merge_product_details(data)

        # Category handling
        cat_id = data.get('category')
        if not cat_id and data.get('category_name'):
            cat, _ = Category.objects.get_or_create(name=data.get('category_name'))
            data['category'] = cat.id

        serializer = AdminProductWriteSerializer(data=data)
        if serializer.is_valid():
            product = serializer.save()

            if primary_url:
                product.primary_image_url = primary_url
                product.save(update_fields=['primary_image_url'])
            elif not product.primary_image_url:
                product.primary_image_url = f"/products/{product.id}/1.jpeg"
                product.save(update_fields=['primary_image_url'])

            sync_product_images(product, images_data, product.primary_image_url)

            response = Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        ids = request.data.get('ids') or request.query_params.getlist('id')
        if ids:
            Product.objects.filter(id__in=ids).delete()
            response = Response({'message': f'{len(ids)} products deleted successfully'}, status=status.HTTP_200_OK)
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            return response
        return Response({'error': 'No product IDs provided'}, status=status.HTTP_400_BAD_REQUEST)



def sync_product_images(product, images_data, primary_url=None):
    """
    Synchronizes ProductImage records and primary_image_url for a product.
    Supports list of string URLs or dicts {image_url: '...'}.
    """
    url_list = []
    if images_data is not None and isinstance(images_data, list):
        for item in images_data:
            if isinstance(item, str) and item.strip():
                url_list.append(item.strip())
            elif isinstance(item, dict) and item.get('image_url'):
                url_list.append(item['image_url'].strip())

    target_primary = primary_url or product.primary_image_url
    if not target_primary and url_list:
        target_primary = url_list[0]

    if target_primary and target_primary not in url_list:
        url_list.insert(0, target_primary)

    if url_list:
        ProductImage.objects.filter(product=product).delete()
        for idx, u in enumerate(url_list):
            ProductImage.objects.create(
                product=product,
                image_url=u,
                angle_number=idx + 1,
                is_primary=(u == target_primary or (not target_primary and idx == 0))
            )

    if target_primary and product.primary_image_url != target_primary:
        product.primary_image_url = target_primary
        product.save(update_fields=['primary_image_url'])


def merge_product_details(raw_data, existing_details=None):
    """
    Combines nested and flat policy, shipping, care instructions, and specs into details JSON.
    """
    details = dict(existing_details) if isinstance(existing_details, dict) else {}
    if 'details' in raw_data and isinstance(raw_data['details'], dict):
        details.update(raw_data['details'])

    # Merge top-level fields into details if provided
    for field in ['return_policy', 'dispatch_timeline', 'care_instructions', 'specifications', 'features', 'shipping']:
        if field in raw_data and raw_data[field] is not None:
            details[field] = raw_data[field]

    return details


class AdminProductDetailView(APIView):
    """
    GET /api/admin/products/<id>/
    PUT /api/admin/products/<id>/
    PATCH /api/admin/products/<id>/
    DELETE /api/admin/products/<id>/
    """
    def get(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        response = Response(ProductSerializer(product).data)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        return response

    def _sync_stock_data(self, product, raw_data):
        data = raw_data.copy() if hasattr(raw_data, 'copy') else dict(raw_data)
        if 'stock_quantity' in data:
            try:
                qty = int(data['stock_quantity'])
                if qty <= 0:
                    data['stock_quantity'] = 0
                    data['in_stock'] = False
                elif 'in_stock' not in data:
                    data['in_stock'] = True
            except (ValueError, TypeError):
                pass
        if data.get('in_stock') is False:
            data['stock_quantity'] = 0
        elif data.get('in_stock') is True:
            if 'stock_quantity' in data:
                try:
                    if int(data['stock_quantity']) <= 0:
                        data['stock_quantity'] = 10
                except (ValueError, TypeError):
                    pass
            elif product and product.stock_quantity <= 0:
                data['stock_quantity'] = 10
        return data

    def patch(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        data = self._sync_stock_data(product, request.data)
        data['details'] = merge_product_details(data, product.details)

        # Handle category if category_name given
        cat_id = data.get('category')
        if not cat_id and data.get('category_name'):
            cat, _ = Category.objects.get_or_create(name=data.get('category_name'))
            data['category'] = cat.id

        images_data = data.pop('images', None)
        if images_data is None:
            images_data = data.pop('image_urls', None)
        primary_url = data.get('primary_image_url') or data.get('image')

        serializer = AdminProductWriteSerializer(product, data=data, partial=True)
        if serializer.is_valid():
            product = serializer.save()
            sync_product_images(product, images_data, primary_url)
            response = Response(ProductSerializer(product).data)
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        data = self._sync_stock_data(product, request.data)
        data['details'] = merge_product_details(data, product.details)

        cat_id = data.get('category')
        if not cat_id and data.get('category_name'):
            cat, _ = Category.objects.get_or_create(name=data.get('category_name'))
            data['category'] = cat.id

        images_data = data.pop('images', None)
        if images_data is None:
            images_data = data.pop('image_urls', None)
        primary_url = data.get('primary_image_url') or data.get('image')

        serializer = AdminProductWriteSerializer(product, data=data)
        if serializer.is_valid():
            product = serializer.save()
            sync_product_images(product, images_data, primary_url)
            response = Response(ProductSerializer(product).data)
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        product.delete()
        response = Response({'message': 'Product deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        return response


class AdminImageUploadView(APIView):
    """
    POST /api/admin/upload-image/
    Uploads an image file or base64 image data to media/products/
    Returns: { 'url': '/media/products/...', 'filename': '...' }
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        file_obj = request.FILES.get('image') or request.FILES.get('file')
        if not file_obj:
            base64_data = request.data.get('image_data') or request.data.get('image')
            if base64_data and isinstance(base64_data, str) and 'base64,' in base64_data:
                import base64
                header, encoded = base64_data.split('base64,', 1)
                ext = '.jpg'
                if 'png' in header:
                    ext = '.png'
                elif 'webp' in header:
                    ext = '.webp'
                filename = f"prod_{uuid.uuid4().hex[:10]}{ext}"
                save_dir = Path(settings.MEDIA_ROOT) / 'products'
                save_dir.mkdir(parents=True, exist_ok=True)
                dest_path = save_dir / filename
                with open(dest_path, 'wb') as f:
                    f.write(base64.b64decode(encoded))
                return Response({'url': f"/media/products/{filename}", 'filename': filename}, status=status.HTTP_201_CREATED)
            return Response({'error': 'No image file or data provided'}, status=status.HTTP_400_BAD_REQUEST)

        filename = getattr(file_obj, 'name', 'product.jpg')
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            ext = '.jpg'

        safe_name = f"prod_{uuid.uuid4().hex[:10]}{ext}"
        save_dir = Path(settings.MEDIA_ROOT) / 'products'
        save_dir.mkdir(parents=True, exist_ok=True)
        dest_path = save_dir / safe_name

        with open(dest_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)

        return Response({'url': f"/media/products/{safe_name}", 'filename': safe_name}, status=status.HTTP_201_CREATED)


class AdminOrderListView(APIView):
    """
    GET /api/admin/orders/
    """
    def get(self, request):
        orders = Order.objects.prefetch_related('items', 'manual_payment_verifications').all().order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter and status_filter != 'all':
            orders = orders.filter(status=status_filter.lower())

        search = request.query_params.get('search')
        if search:
            orders = orders.filter(
                Q(order_number__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_email__icontains=search)
            )

        return Response(OrderSerializer(orders, many=True).data)


class AdminOrderDetailView(APIView):
    """
    GET /api/admin/orders/<id>/
    PATCH /api/admin/orders/<id>/
    """
    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        return Response(OrderSerializer(order).data)

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        new_status = request.data.get('status')
        if new_status:
            order.status = new_status
            pv_qs = getattr(order, 'manual_payment_verifications', None)
            if new_status == 'awaiting_payment_verification':
                order.payment_status = 'pending_verification'
                if pv_qs is not None:
                    pv_qs.all().update(status='pending_verification', rejection_reason='')
            elif new_status == 'confirmed':
                order.payment_status = 'paid'
                if pv_qs is not None:
                    pv_qs.all().update(status='paid', rejection_reason='')
            elif new_status == 'cancelled':
                if pv_qs is not None:
                    pv_qs.all().update(status='rejected')

        if 'notes' in request.data:
            order.notes = request.data.get('notes')
        order.save()
        return Response(OrderSerializer(order).data)


# ─── Store Policy Management Views ──────────────────────────────────────────

DEFAULT_POLICIES = {
    'return': {
        'key': 'return',
        'title': 'Return & Refund Policy',
        'badge_label': 'Strict Policy',
        'last_updated': '04-09-2026',
        'intro': "Thank you for shopping at Jewels 'n' Joys.",
        'highlight_notice': "We follow a strict no refund, return, or exchange policy. Once an order is placed, it cannot be canceled, modified, or returned.",
        'unboxing_requirement': "A full 360-degree unboxing video with no cuts or edits is mandatory to process any complaints. Without this video, we will not be able to assist you.",
        'reporting_hours': 24,
        'rules': [
            {"title": "24-Hour Reporting Window", "text": "If you receive a damaged or incorrect product, you must report the issue within 24 hours of delivery."},
            {"title": "Mandatory 360° Unboxing Video", "text": "A full 360-degree unboxing video with no cuts or edits is mandatory to process any complaints. Without this video, we will not be able to assist you."},
            {"title": "Approval & Replacement", "text": "If your complaint is verified and approved, we may provide a replacement for the damaged product."}
        ],
        'support_email': 'jewelsnjoy25@gmail.com',
        'support_phone': '+91 7251070150',
    },
    'shipping': {
        'key': 'shipping',
        'title': 'Shipping & Delivery Policy',
        'badge_label': 'Fast & Reliable',
        'last_updated': '04-09-2026',
        'intro': "We deliver our luxury jewellery pieces safely across all serviceable pin codes in India.",
        'dispatch_days': '1–3 working days (Mon–Fri)',
        'standard_delivery': '6 to 8 business days',
        'express_delivery': '3 to 4 business days',
        'free_shipping_threshold': 999,
        'partner_note': 'Orders dispatched via premier courier services with tracking provided on order confirmation.',
        'support_email': 'jewelsnjoy25@gmail.com',
        'support_phone': '+91 7251070150',
    },
    'privacy': {
        'key': 'privacy',
        'title': 'Privacy Policy',
        'badge_label': 'Data Protected',
        'last_updated': '04-09-2026',
        'intro': "Your privacy and personal data are respected and safeguarded at Jewels 'n' Joys.",
        'summary': "We use customer names, shipping addresses, and contact details strictly for order fulfillment, dispatch updates, and customer support. We never sell your personal data.",
        'support_email': 'jewelsnjoy25@gmail.com',
    }
}


class StorePolicyView(APIView):
    """
    GET /api/policies/
    Public view returning store policies with defaults if not configured in DB.
    """
    def get(self, request):
        policies = {}
        for key, default_data in DEFAULT_POLICIES.items():
            db_pol = StorePolicy.objects.filter(key=key).first()
            if db_pol and db_pol.data:
                policies[key] = {**default_data, **db_pol.data, 'last_updated': db_pol.last_updated or default_data['last_updated']}
            else:
                policies[key] = default_data
        response = Response(policies)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        return response


class AdminStorePolicyView(APIView):
    """
    GET /api/admin/policies/
    POST / PUT / PATCH /api/admin/policies/
    Admin view for reading and updating site-wide policies.
    """
    def get(self, request):
        policies = {}
        for key, default_data in DEFAULT_POLICIES.items():
            db_pol = StorePolicy.objects.filter(key=key).first()
            if db_pol and db_pol.data:
                policies[key] = {**default_data, **db_pol.data, 'last_updated': db_pol.last_updated or default_data['last_updated']}
            else:
                policies[key] = default_data
        response = Response(policies)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        return response

    def post(self, request):
        payload = request.data
        updated_policies = {}

        if 'key' in payload and 'data' in payload:
            key = payload['key']
            data = payload['data']
            sp, _ = StorePolicy.objects.get_or_create(key=key)
            sp.title = payload.get('title', sp.title or DEFAULT_POLICIES.get(key, {}).get('title', ''))
            sp.badge_label = payload.get('badge_label', sp.badge_label or DEFAULT_POLICIES.get(key, {}).get('badge_label', ''))
            sp.last_updated = payload.get('last_updated', sp.last_updated or 'Today')
            sp.data = data
            sp.save()
            updated_policies[key] = {**DEFAULT_POLICIES.get(key, {}), **sp.data}
        else:
            for k, val in payload.items():
                if isinstance(val, dict):
                    sp, _ = StorePolicy.objects.get_or_create(key=k)
                    sp.title = val.get('title', sp.title or DEFAULT_POLICIES.get(k, {}).get('title', ''))
                    sp.badge_label = val.get('badge_label', sp.badge_label or DEFAULT_POLICIES.get(k, {}).get('badge_label', ''))
                    sp.last_updated = val.get('last_updated', sp.last_updated or 'Today')
                    sp.data = val
                    sp.save()
                    updated_policies[k] = {**DEFAULT_POLICIES.get(k, {}), **val}

        response = Response({'message': 'Policies updated successfully', 'policies': updated_policies})
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
        return response


