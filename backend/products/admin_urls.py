from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.AdminLoginView.as_view(), name='admin-login'),
    path('verify/', views.AdminVerifyTokenView.as_view(), name='admin-verify'),
    path('stats/', views.AdminStatsView.as_view(), name='admin-stats'),
    path('products/', views.AdminProductListView.as_view(), name='admin-product-list'),
    path('products/<int:pk>/', views.AdminProductDetailView.as_view(), name='admin-product-detail'),
    path('orders/', views.AdminOrderListView.as_view(), name='admin-order-list'),
    path('orders/<int:pk>/', views.AdminOrderDetailView.as_view(), name='admin-order-detail'),
]
