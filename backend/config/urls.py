"""
Root URL configuration for Jewels N' Joys backend.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from products.views import OrderCreateView


def api_root(request):
    return JsonResponse({
        'message': "Jewels 'n' Joys API",
        'version': '2.0',
        'endpoints': {
            'products': '/api/products/',
            'product_detail': '/api/products/<id>/',
            'product_by_slug': '/api/products/slug/<slug>/',
            'featured': '/api/products/featured/',
            'bestsellers': '/api/products/bestsellers/',
            'categories': '/api/categories/',
            'orders': '/api/orders/',
            'my_orders': '/api/orders/my-orders/',
            'track_order': '/api/orders/track/<order_number>/',
            'payments_create': '/api/payments/create/',
            'payments_verify': '/api/payments/verify/',
            'payments_webhook': '/api/payments/webhook/',
            'payments_config': '/api/payments/config/',
            'admin_stats': '/api/admin/stats/',
            'admin_products': '/api/admin/products/',
            'admin_orders': '/api/admin/orders/',
            'django_admin': '/admin/',
        }
    })


urlpatterns = [
    path('', api_root, name='api-index'),
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/products/', include('products.urls')),
    path('api/categories/', include('products.category_urls')),
    path('api/orders/', include('products.order_urls')),
    path('api/payments/', include('payments.urls')),
    path('api/admin/', include('products.admin_urls')),
]
