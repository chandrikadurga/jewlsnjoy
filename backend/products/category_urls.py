from django.urls import path
from products.views import CategoryListView

urlpatterns = [
    path('', CategoryListView.as_view(), name='category-list'),
]
