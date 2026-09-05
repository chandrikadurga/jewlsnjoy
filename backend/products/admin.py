"""
Products admin configuration.

Currently configured for future database integration.
When Product models are added, register them here for Django Admin management.

Future admin classes:
    @admin.register(Product)
    class ProductAdmin(admin.ModelAdmin):
        list_display = ['name', 'price', 'category', 'in_stock']
        list_filter = ['category', 'in_stock', 'is_featured']
        search_fields = ['name', 'description']
        prepopulated_fields = {'slug': ('name',)}
"""

from django.contrib import admin

# Future: When Product model is created, uncomment and configure:
# from .models import Product, Category, ProductImage
#
# @admin.register(Product)
# class ProductAdmin(admin.ModelAdmin):
#     list_display = ['name', 'price', 'category', 'in_stock', 'is_featured', 'is_bestseller']
#     list_filter = ['category', 'in_stock', 'is_featured', 'is_bestseller']
#     search_fields = ['name', 'description', 'slug']
#     prepopulated_fields = {'slug': ('name',)}
#     list_editable = ['price', 'in_stock', 'is_featured', 'is_bestseller']
#     readonly_fields = ['created_at', 'updated_at']
