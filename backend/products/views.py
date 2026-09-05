"""
Django REST API views for Jewels N' Joys.
Full-stack database queries for public storefront and admin dashboard.
"""

from decimal import Decimal
from django.db.models import Sum, Q, Count
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

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


class OrderCreateView(APIView):
    """
    POST /api/orders/
    Called by storefront checkout to persist customer order.
    """
    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        if serializer.is_valid():
            order = serializer.save()
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
