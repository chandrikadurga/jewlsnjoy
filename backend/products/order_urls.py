from django.urls import path
from . import views

urlpatterns = [
    path('', views.OrderCreateView.as_view(), name='order-create'),
    path('my-orders/', views.CustomerOrderListView.as_view(), name='customer-orders'),
    path('track/<str:order_number>/', views.CustomerOrderTrackView.as_view(), name='customer-order-track'),
]
