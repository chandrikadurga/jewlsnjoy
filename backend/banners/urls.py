from django.urls import path
from . import views

urlpatterns = [
    path('active/', views.ActivePromotionalBannerView.as_view(), name='promotional-banner-active'),
    path('', views.StorefrontBannerListView.as_view(), name='promotional-banner-list'),
]
