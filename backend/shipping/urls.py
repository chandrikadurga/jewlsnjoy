"""
URL configuration for Shipping and Logistics.
"""

from django.urls import path
from . import views

urlpatterns = [
    # Storefront / Public endpoints
    path('serviceability/', views.PincodeServiceabilityView.as_view(), name='shipping-serviceability'),
    path('orders/<str:order_number>/', views.CustomerOrderShipmentView.as_view(), name='customer-order-shipment'),

    # Admin actions
    path('admin/delhivery-status/', views.AdminDelhiveryStatusView.as_view(), name='admin-delhivery-status'),
    path('admin/orders/<int:order_id>/create/', views.AdminShipmentCreateView.as_view(), name='admin-shipment-create'),
    path('admin/orders/<int:order_id>/refresh/', views.AdminShipmentRefreshTrackingView.as_view(), name='admin-shipment-refresh'),
    path('admin/orders/<int:order_id>/label/', views.AdminShipmentLabelView.as_view(), name='admin-shipment-label'),
    path('admin/orders/<int:order_id>/pickup/', views.AdminShipmentPickupView.as_view(), name='admin-shipment-pickup'),
    path('admin/orders/<int:order_id>/update-delhivery-payment/', views.AdminShipmentUpdatePaymentView.as_view(), name='admin-shipment-update-payment'),
    path('admin/update-payment/', views.AdminDirectUpdatePaymentView.as_view(), name='admin-direct-update-payment'),
    path('admin/sync-all-cod-shipments/', views.AdminBulkSyncCodShipmentsView.as_view(), name='admin-sync-all-cod-shipments'),
]
