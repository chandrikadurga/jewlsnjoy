from django.urls import path
from . import views

urlpatterns = [
    path('', views.ProductListView.as_view(), name='product-list'),
    path('featured/', views.FeaturedProductsView.as_view(), name='featured-products'),
    path('bestsellers/', views.BestsellerProductsView.as_view(), name='bestseller-products'),
    path('slug/<str:slug>/', views.ProductBySlugView.as_view(), name='product-by-slug'),
    path('<int:pk>/', views.ProductDetailView.as_view(), name='product-detail'),
]
