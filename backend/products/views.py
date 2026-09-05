"""
Products API views for Jewels N' Joys.

Currently reads from mock_data.py.
To switch to database: replace `PRODUCTS` / `CATEGORIES` imports with
Django ORM queries and use ModelSerializer instead of plain Serializer.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .mock_data import PRODUCTS, CATEGORIES
from .serializers import ProductSerializer, ProductListSerializer, CategorySerializer


class ProductListView(APIView):
    """
    GET /api/products/
    Returns all products. Supports optional query params:
    - category: filter by category name
    - style: filter by style tag
    - featured: 'true' to return only featured products
    - bestseller: 'true' to return only bestsellers
    """

    def get(self, request):
        products = PRODUCTS.copy()

        # Filter by category
        category = request.query_params.get('category')
        if category:
            products = [p for p in products if p['category'].lower() == category.lower()]

        # Filter by style
        style = request.query_params.get('style')
        if style:
            products = [p for p in products if style.lower() in [s.lower() for s in p['style']]]

        # Filter featured
        featured = request.query_params.get('featured')
        if featured == 'true':
            products = [p for p in products if p['is_featured']]

        # Filter bestsellers
        bestseller = request.query_params.get('bestseller')
        if bestseller == 'true':
            products = [p for p in products if p['is_bestseller']]

        # Search
        search = request.query_params.get('search')
        if search:
            q = search.lower()
            products = [
                p for p in products
                if q in p['name'].lower()
                or q in p['description'].lower()
                or q in p['category'].lower()
                or any(q in s.lower() for s in p['style'])
            ]

        serializer = ProductListSerializer(products, many=True)
        return Response({
            'count': len(products),
            'results': serializer.data
        })


class ProductDetailView(APIView):
    """
    GET /api/products/<id>/
    Returns full product detail by ID.
    """

    def get(self, request, product_id):
        product = next((p for p in PRODUCTS if p['id'] == product_id), None)
        if not product:
            return Response(
                {'error': 'Product not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = ProductSerializer(product)
        return Response(serializer.data)


class ProductBySlugView(APIView):
    """
    GET /api/products/slug/<slug>/
    Returns full product detail by slug.
    """

    def get(self, request, slug):
        product = next((p for p in PRODUCTS if p['slug'] == slug), None)
        if not product:
            return Response(
                {'error': 'Product not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = ProductSerializer(product)
        return Response(serializer.data)


class CategoryListView(APIView):
    """
    GET /api/categories/
    Returns all product categories.
    """

    def get(self, request):
        serializer = CategorySerializer(CATEGORIES, many=True)
        return Response(serializer.data)


class FeaturedProductsView(APIView):
    """
    GET /api/products/featured/
    Returns featured products for homepage.
    """

    def get(self, request):
        featured = [p for p in PRODUCTS if p['is_featured']]
        serializer = ProductListSerializer(featured, many=True)
        return Response({
            'count': len(featured),
            'results': serializer.data
        })


class BestsellerProductsView(APIView):
    """
    GET /api/products/bestsellers/
    Returns bestseller products.
    """

    def get(self, request):
        bestsellers = [p for p in PRODUCTS if p['is_bestseller']]
        serializer = ProductListSerializer(bestsellers, many=True)
        return Response({
            'count': len(bestsellers),
            'results': serializer.data
        })
