"""
Root URL configuration for Jewels N' Joys backend.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def api_root(request):
    return JsonResponse({
        'message': "Jewels N' Joys API",
        'version': '1.0',
        'endpoints': {
            'products': '/api/products/',
            'product_detail': '/api/products/<id>/',
            'product_by_slug': '/api/products/slug/<slug>/',
            'featured': '/api/products/featured/',
            'bestsellers': '/api/products/bestsellers/',
            'categories': '/api/categories/',
            'admin': '/admin/',
        }
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root),
    path('api/products/', include('products.urls')),
    path('api/categories/', include('products.category_urls')),
]
