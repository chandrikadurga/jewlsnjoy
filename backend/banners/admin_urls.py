from django.urls import path
from . import views

urlpatterns = [
    path('', views.AdminPromotionalBannerListView.as_view(), name='admin-promotional-banner-list'),
    path('upload-artwork/', views.AdminBannerImageUploadView.as_view(), name='admin-promotional-banner-upload'),
    path('reorder/', views.AdminPromotionalBannerReorderView.as_view(), name='admin-promotional-banner-reorder'),
    path('<uuid:pk>/', views.AdminPromotionalBannerDetailView.as_view(), name='admin-promotional-banner-detail'),
    path('<uuid:pk>/publish/', views.AdminPromotionalBannerPublishView.as_view(), name='admin-promotional-banner-publish'),
    path('<uuid:pk>/unpublish/', views.AdminPromotionalBannerUnpublishView.as_view(), name='admin-promotional-banner-unpublish'),
    path('<uuid:pk>/duplicate/', views.AdminPromotionalBannerDuplicateView.as_view(), name='admin-promotional-banner-duplicate'),
    path('<uuid:pk>/assets/', views.AdminBannerAssetListView.as_view(), name='admin-promotional-banner-assets'),
    path('<uuid:pk>/assets/<uuid:asset_id>/', views.AdminBannerAssetDetailView.as_view(), name='admin-promotional-banner-asset-detail'),
]
