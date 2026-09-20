"""
URL routes for review endpoints.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Public review endpoints
    path('create/', views.ReviewCreateView.as_view(), name='review-create'),
    path('eligibility/<int:product_id>/', views.ReviewEligibilityView.as_view(), name='review-eligibility'),
    path('<int:pk>/', views.ReviewUpdateView.as_view(), name='review-update'),
    
    # Admin review management
    path('admin/', views.AdminReviewListView.as_view(), name='admin-review-list'),
    path('admin/stats/', views.AdminReviewStatsView.as_view(), name='admin-review-stats'),
    path('admin/bulk-action/', views.AdminReviewBulkActionView.as_view(), name='admin-review-bulk-action'),
    path('admin/<int:pk>/', views.AdminReviewDetailView.as_view(), name='admin-review-detail'),
]
