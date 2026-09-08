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
            'admin_login': '/api/admin/login/',
            'admin_verify': '/api/admin/verify/',
            'admin_stats': '/api/admin/stats/',
            'admin_products': '/api/admin/products/',
            'admin_orders': '/api/admin/orders/',
            'django_admin': '/admin/',
            'shipping_serviceability': '/api/shipping/serviceability/',
            'shipping_order_track': '/api/shipping/orders/<order_number>/',
        }
    })


from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', api_root, name='api-index'),
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/products/', include('products.urls')),
    path('api/categories/', include('products.category_urls')),
    path('api/orders/', include('products.order_urls')),
    path('api/payments/', include('payments.urls')),
    path('api/shipping/', include('shipping.urls')),
    path('api/admin/', include('products.admin_urls')),
]

import posixpath
import re
from pathlib import Path
from django.urls import re_path
from django.views.static import serve
from django.http import HttpResponse, Http404


def safe_media_serve(request, path):
    """
    Serves uploaded media files. If a file is missing from local disk
    (e.g., ephemeral Render container wiped after redeployment),
    checks if it belongs to a payment proof and returns a stylized SVG receipt
    displaying the verified UTR, order number, and payment details instead of a 404.
    """
    clean_path = posixpath.normpath(path).lstrip('/')
    fullpath = Path(settings.MEDIA_ROOT) / clean_path
    if fullpath.is_file():
        return serve(request, clean_path, document_root=settings.MEDIA_ROOT)

    filename = Path(clean_path).name
    try:
        from payments.models import PaymentVerification
        pv = PaymentVerification.objects.filter(payment_proof_path__icontains=filename).select_related('order').first()
        if not pv and 'ORD-' in clean_path:
            m = re.search(r'(ORD-[A-Za-z0-9]+)', clean_path)
            if m:
                pv = PaymentVerification.objects.filter(order__order_number__iexact=m.group(1)).select_related('order').first()

        if pv:
            order_num = pv.order.order_number if pv.order else 'N/A'
            utr = pv.transaction_id or 'Not Provided'
            amount = f"₹{float(pv.amount):,.2f}" if pv.amount else 'N/A'
            status_label = pv.status.upper()
            customer = pv.order.customer_name if pv.order else 'Customer'
            sub_date = pv.submitted_at.strftime('%d %b %Y, %I:%M %p') if pv.submitted_at else 'Recent'

            svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="650" height="440" viewBox="0 0 650 440">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14110e"/>
      <stop offset="100%" stop-color="#1e1814"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#c2a370"/>
    </linearGradient>
  </defs>
  <rect width="650" height="440" fill="url(#bg)" rx="16"/>
  <rect x="20" y="20" width="610" height="400" fill="none" stroke="url(#gold)" stroke-width="1.5" rx="12" stroke-dasharray="6,4"/>
  
  <text x="325" y="62" text-anchor="middle" fill="url(#gold)" font-size="20" font-family="'Cinzel', Georgia, serif" font-weight="bold" letter-spacing="3">JEWELS 'N' JOYS</text>
  <text x="325" y="86" text-anchor="middle" fill="#d5c4b1" font-size="12" font-family="sans-serif" letter-spacing="1.5">MANUAL UPI PAYMENT RECEIPT</text>
  
  <line x1="50" y1="106" x2="600" y2="106" stroke="#c2a370" stroke-opacity="0.25" stroke-width="1"/>
  
  <text x="70" y="148" fill="#a89988" font-size="13" font-family="sans-serif">Order Reference:</text>
  <text x="250" y="148" fill="#f7efe6" font-size="15" font-family="monospace" font-weight="bold">{order_num}</text>
  
  <text x="70" y="190" fill="#a89988" font-size="13" font-family="sans-serif">Customer Name:</text>
  <text x="250" y="190" fill="#f7efe6" font-size="14" font-family="sans-serif">{customer}</text>
  
  <text x="70" y="232" fill="#a89988" font-size="13" font-family="sans-serif">Customer UPI Reference / UTR:</text>
  <text x="250" y="232" fill="#4ade80" font-size="16" font-family="monospace" font-weight="bold">{utr}</text>
  
  <text x="70" y="274" fill="#a89988" font-size="13" font-family="sans-serif">Order Amount:</text>
  <text x="250" y="274" fill="#c2a370" font-size="16" font-family="sans-serif" font-weight="bold">{amount}</text>
  
  <text x="70" y="316" fill="#a89988" font-size="13" font-family="sans-serif">Verification Status:</text>
  <text x="250" y="316" fill="#f7efe6" font-size="13" font-family="sans-serif" font-weight="bold">{status_label}</text>

  <text x="70" y="354" fill="#a89988" font-size="13" font-family="sans-serif">Submission Date:</text>
  <text x="250" y="354" fill="#f7efe6" font-size="13" font-family="sans-serif">{sub_date}</text>
  
  <line x1="50" y1="380" x2="600" y2="380" stroke="#c2a370" stroke-opacity="0.25" stroke-width="1"/>
  
  <text x="325" y="405" text-anchor="middle" fill="#8d7f72" font-size="11" font-family="sans-serif">Direct Bank UPI Payment Record • Verified in Store Admin</text>
</svg>'''
            return HttpResponse(svg, content_type='image/svg+xml')
    except Exception:
        pass

    raise Http404("The requested resource was not found on this server.")


urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', safe_media_serve),
]
