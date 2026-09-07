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


class PaymentVerificationInline(admin.StackedInline):
    from payments.models import PaymentVerification
    from payments.storage import create_signed_proof_url
    model = PaymentVerification
    extra = 0
    can_delete = False
    readonly_fields = [
        'transaction_id', 'amount', 'currency', 'status',
        'rejection_reason', 'submitted_at', 'verified_at', 'verified_by',
        'screenshot_preview'
    ]

    def screenshot_preview(self, obj):
        from django.utils.html import format_html
        from payments.storage import create_signed_proof_url
        if not obj or not obj.payment_proof_path:
            return "No screenshot file recorded."
        signed_url = create_signed_proof_url(obj.payment_proof_path, expires_in=3600)
        if signed_url:
            return format_html(
                '<div style="margin: 10px 0;">'
                '<a href="{}" target="_blank" rel="noopener noreferrer">'
                '<img src="{}" style="max-width: 320px; max-height: 320px; border-radius: 6px; border: 1px solid #ddd;" alt="Payment Proof" />'
                '</a>'
                '<p style="font-size: 12px; margin-top: 4px;"><a href="{}" target="_blank" rel="noopener noreferrer">Open full image in new tab ↗</a></p>'
                '</div>',
                signed_url, signed_url, signed_url
            )
        return "Signed URL unavailable"
    screenshot_preview.short_description = "Proof Screenshot"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'customer_name', 'customer_email',
        'total_amount', 'payment_method', 'payment_status',
        'upi_transaction_id', 'shipping_awb_display', 'status', 'created_at'
    ]
    list_filter = ['status', 'payment_status', 'payment_method', 'created_at']
    search_fields = ['order_number', 'customer_name', 'customer_email', 'customer_phone']
    list_editable = ['status']
    
    def get_inlines(self, request, obj):
        from shipping.admin import ShipmentInline
        return [OrderItemInline, PaymentVerificationInline, ShipmentInline]

    readonly_fields = ['order_number', 'created_at', 'updated_at']

    def shipping_awb_display(self, obj):
        from django.utils.html import format_html
        sh = getattr(obj, 'shipment', None)
        if sh and sh.awb_number:
            return format_html(
                '<a href="/admin/shipping/shipment/{}/change/" title="Delhivery Status: {}"><strong>{}</strong></a>',
                sh.id, sh.get_shipment_status_display(), sh.awb_number
            )
        return "-"
    shipping_awb_display.short_description = "Delhivery AWB"

    def upi_transaction_id(self, obj):
        pvs = getattr(obj, 'manual_payment_verifications', None)
        pv = pvs.first() if pvs is not None else None
        if pv and pv.transaction_id:
            return pv.transaction_id
        return "-"
    upi_transaction_id.short_description = "UTR / Trans ID"

    def payment_proof_preview(self, obj):
        pvs = getattr(obj, 'manual_payment_verifications', None)
        pv = pvs.first() if pvs is not None else None
        if not pv or not pv.payment_proof_path:
            return "-"
        from payments.storage import create_signed_proof_url
        from django.utils.html import format_html
        signed_url = create_signed_proof_url(pv.payment_proof_path, expires_in=3600)
        if signed_url:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener noreferrer">'
                '<img src="{}" style="height: 40px; width: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #c2a370;" title="Click to view full payment proof" />'
                '</a>',
                signed_url, signed_url
            )
        return "-"
    payment_proof_preview.short_description = "Proof Image"
