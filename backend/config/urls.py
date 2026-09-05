"""
Root URL configuration for Jewels N' Joys backend.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from products.views import OrderCreateView


def api_root(request):
    return JsonResponse({
        'message': "Jewels N' Joys API",
        'version': '2.0',
        'endpoints': {
            'products': '/api/products/',
            'product_detail': '/api/products/<id>/',
            'product_by_slug': '/api/products/slug/<slug>/',
            'featured': '/api/products/featured/',
            'bestsellers': '/api/products/bestsellers/',
            'categories': '/api/categories/',
            'orders': '/api/orders/',
            'admin_stats': '/api/admin/stats/',
            'admin_products': '/api/admin/products/',
            'admin_orders': '/api/admin/orders/',
            'django_admin': '/admin/',
        }
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root),
    path('api/products/', include('products.urls')),
    path('api/categories/', include('products.category_urls')),
    path('api/orders/', OrderCreateView.as_view(), name='order-create'),
    path('api/admin/', include('products.admin_urls')),
]
