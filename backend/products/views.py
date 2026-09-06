"""
Django REST API views for Jewels N' Joys.
Full-stack database queries for public storefront and admin dashboard.
"""

import json
import logging
import urllib.request
from decimal import Decimal
from django.conf import settings
from django.db.models import Sum, Q, Count
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

from .models import Category, Product, ProductImage, Order, OrderItem, Review
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductListSerializer,
    AdminProductWriteSerializer,
    OrderSerializer,
    OrderCreateSerializer,
    ReviewSerializer,
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

        serializer = ProductListSerializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })


class ProductDetailView(APIView):
    """
    GET /api/products/<id>/
    """
    def get(self, request, pk):
        try:
            product = Product.objects.select_related('category').prefetch_related('images').get(pk=pk)
            return Response(ProductSerializer(product).data)
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
            return Response(ProductSerializer(product).data)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)


class FeaturedProductsView(APIView):
    """
    GET /api/products/featured/
    """
    def get(self, request):
        products = Product.objects.filter(is_featured=True)[:8]
        return Response(ProductListSerializer(products, many=True).data)


class BestsellerProductsView(APIView):
    """
    GET /api/products/bestsellers/
    """
    def get(self, request):
        products = Product.objects.filter(is_bestseller=True)[:8]
        return Response(ProductListSerializer(products, many=True).data)


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
    Returns order tracking details for authenticated customer.
    Requires Bearer token matching Order.user_id.
    Always returns 404 NOT FOUND (never 403) on unauthorized or missing orders
    to avoid leaking whether an order number exists.
    """
    def get(self, request, order_number):
        auth_user = get_authenticated_supabase_user(request)
        if not auth_user or not auth_user.get('uid'):
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        user_uid = auth_user['uid']
        clean_num = order_number.strip()

        order = Order.objects.filter(order_number__iexact=clean_num, user_id=user_uid).prefetch_related('items').first()
        if not order:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response(OrderSerializer(order).data)



# ─── Admin Dashboard Views ────────────────────────────────────────────────────

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
        return Response(ProductSerializer(products, many=True).data)

    def post(self, request):
        data = request.data.copy()
        images_data = data.pop('images', None)
        
        # Category handling
        cat_id = data.get('category')
        if not cat_id and data.get('category_name'):
            cat, _ = Category.objects.get_or_create(name=data.get('category_name'))
            data['category'] = cat.id

        serializer = AdminProductWriteSerializer(data=data)
        if serializer.is_valid():
            product = serializer.save()
            
            # Set default primary image if none given
            if not product.primary_image_url:
                product.primary_image_url = f"/products/{product.id}/1.jpeg"
                product.save(update_fields=['primary_image_url'])

            # Add sample angle images
            if images_data and isinstance(images_data, list):
                for idx, img_url in enumerate(images_data):
                    ProductImage.objects.create(
                        product=product,
                        image_url=img_url,
                        angle_number=idx + 1,
                        is_primary=(idx == 0)
                    )
            elif not product.images.exists():
                for angle in range(1, 4):
                    ProductImage.objects.create(
                        product=product,
                        image_url=product.primary_image_url,
                        angle_number=angle,
                        is_primary=(angle == 1)
                    )

            return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminProductDetailView(APIView):
    """
    GET /api/admin/products/<id>/
    PUT /api/admin/products/<id>/
    PATCH /api/admin/products/<id>/
    DELETE /api/admin/products/<id>/
    """
    def get(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        return Response(ProductSerializer(product).data)

    def patch(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        serializer = AdminProductWriteSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            product = serializer.save()
            return Response(ProductSerializer(product).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        serializer = AdminProductWriteSerializer(product, data=request.data)
        if serializer.is_valid():
            product = serializer.save()
            return Response(ProductSerializer(product).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        product.delete()
        return Response({'message': 'Product deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


class AdminOrderListView(APIView):
    """
    GET /api/admin/orders/
    """
    def get(self, request):
        orders = Order.objects.prefetch_related('items').all()
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
        if 'notes' in request.data:
            order.notes = request.data.get('notes')
        order.save()
        return Response(OrderSerializer(order).data)


# ─── Razorpay Payment Integration ─────────────────────────────────────────────

from django.conf import settings
import uuid


class RazorpayCreateOrderView(APIView):
    """
    POST /api/payment/razorpay/create-order/
    Creates a Razorpay order or returns checkout configuration.
    """
    def post(self, request):
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'INR')
        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)

        amount_in_paise = int(round(float(amount) * 100))
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip()

        if key_id and key_secret:
            try:
                import razorpay
                client = razorpay.Client(auth=(key_id, key_secret))
                razorpay_order = client.order.create({
                    'amount': amount_in_paise,
                    'currency': currency,
                    'payment_capture': 1,
                    'notes': {
                        'merchant': "Jewels 'n' Joys"
                    }
                })
                return Response({
                    'order_id': razorpay_order['id'],
                    'amount': amount_in_paise,
                    'currency': currency,
                    'key': key_id,
                    'is_live': True,
                })
            except Exception as e:
                return Response({'error': f'Razorpay API error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Demo / Test compatibility mode when live keys are not yet configured in .env
            demo_order_id = f"order_demo_{uuid.uuid4().hex[:14]}"
            return Response({
                'order_id': demo_order_id,
                'amount': amount_in_paise,
                'currency': currency,
                'key': key_id or 'rzp_test_placeholder',
                'is_demo': True,
                'message': 'Razorpay compatible. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env for live gateway processing.'
            })


class RazorpayConfigView(APIView):
    """
    GET /api/payment/razorpay/config/
    Returns whether Razorpay is configured and the public Key ID.
    """
    def get(self, request):
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()
        return Response({
            'key': key_id,
            'is_configured': bool(key_id),
            'currency': 'INR'
        })

