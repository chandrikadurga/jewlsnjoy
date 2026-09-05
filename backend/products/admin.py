"""
Django Admin registration for Jewels N' Joys.
Includes Product with ProductImage inline, and Order with OrderItem inline.
"""

from django.contrib import admin
from .models import Category, Product, ProductImage, Order, OrderItem


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ['angle_number', 'image_url', 'is_primary', 'alt_text']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'category', 'price', 'original_price',
        'in_stock', 'stock_quantity', 'is_featured', 'is_bestseller', 'created_at'
    ]
    list_filter = ['category', 'in_stock', 'is_featured', 'is_bestseller']
    search_fields = ['name', 'description', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ['price', 'in_stock', 'stock_quantity', 'is_featured', 'is_bestseller']
    inlines = [ProductImageInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product_name', 'price', 'quantity', 'subtotal', 'image_url']

    def subtotal(self, obj):
        return obj.subtotal


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'customer_name', 'customer_email',
        'total_amount', 'status', 'payment_status', 'created_at'
    ]
    list_filter = ['status', 'payment_status', 'created_at']
    search_fields = ['order_number', 'customer_name', 'customer_email', 'customer_phone']
    list_editable = ['status']
    inlines = [OrderItemInline]
    readonly_fields = ['order_number', 'created_at', 'updated_at']
