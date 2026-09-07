"""
Django Admin integration for Shipping & Delhivery Logistics.
Provides safe manual shipment triggers, status sync, and label views.
"""

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils import timezone

from .models import Shipment
from .services.delhivery import DelhiveryShippingProvider
from .exceptions import DelhiveryError


class ShipmentInline(admin.StackedInline):
    model = Shipment
    extra = 0
    can_delete = False
    readonly_fields = [
        'provider', 'awb_number', 'shipment_status', 'provider_status',
        'payment_mode', 'cod_amount', 'label_link', 'tracking_link',
        'pickup_token_number', 'last_synced_at', 'created_at'
    ]
    fields = [
        ('provider', 'awb_number', 'shipment_status'),
        ('payment_mode', 'cod_amount'),
        ('label_link', 'tracking_link', 'pickup_token_number'),
        ('provider_status', 'last_synced_at', 'created_at'),
    ]

    def label_link(self, obj):
        if obj.label_url:
            return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">🖨️ View / Print Label</a>', obj.label_url)
        return "-"
    label_link.short_description = "Shipping Label"

    def tracking_link(self, obj):
        if obj.tracking_url:
            return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">📦 Track on Delhivery</a>', obj.tracking_url)
        return "-"
    tracking_link.short_description = "Tracking Link"


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = [
        'awb_display',
        'order_link',
        'provider',
        'shipment_status_badge',
        'payment_mode',
        'cod_amount',
        'pickup_location',
        'last_synced_at',
        'created_at',
    ]
    list_filter = ['shipment_status', 'provider', 'payment_mode', 'created_at']
    search_fields = [
        'awb_number',
        'order__order_number',
        'order__customer_name',
        'order__customer_phone',
        'pickup_token_number',
    ]
    readonly_fields = [
        'order', 'provider', 'awb_number', 'provider_order_id', 'provider_shipment_id',
        'tracking_url_display', 'label_url_display', 'provider_response',
        'tracking_events', 'created_at', 'updated_at', 'last_synced_at'
    ]
    actions = ['sync_tracking_action', 'request_pickup_action']

    def awb_display(self, obj):
        if obj.awb_number:
            return format_html('<strong>{}</strong>', obj.awb_number)
        return format_html('<span style="color: #999;">Pending AWB</span>')
    awb_display.short_description = "AWB Number"

    def order_link(self, obj):
        return format_html(
            '<a href="/admin/products/order/{}/change/">Order #{}</a>',
            obj.order.id, obj.order.order_number
        )
    order_link.short_description = "Order"

    def shipment_status_badge(self, obj):
        colors = {
            'manifested': '#3b82f6',
            'in_transit': '#eab308',
            'out_for_delivery': '#f97316',
            'delivered': '#22c55e',
            'cancelled': '#ef4444',
            'failed': '#dc2626',
        }
        color = colors.get(obj.shipment_status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">{}</span>',
            color, obj.get_shipment_status_display()
        )
    shipment_status_badge.short_description = "Status"

    def tracking_url_display(self, obj):
        if obj.tracking_url:
            return format_html('<a href="{}" target="_blank">Track on Delhivery</a>', obj.tracking_url)
        return "-"
    tracking_url_display.short_description = "Tracking URL"

    def label_url_display(self, obj):
        if obj.label_url:
            return format_html('<a href="{}" target="_blank">Print Label</a>', obj.label_url)
        return "-"
    label_url_display.short_description = "Label URL"

    @admin.action(description="🔄 Sync latest tracking from Delhivery")
    def sync_tracking_action(self, request, queryset):
        provider = DelhiveryShippingProvider()
        synced = 0
        errors = 0
        for shipment in queryset.filter(awb_number__gt=''):
            try:
                res = provider.get_tracking(shipment.awb_number)
                shipment.provider_status = res.get('provider_status', '')
                shipment.shipment_status = res.get('normalized_status', shipment.shipment_status)
                if res.get('events'):
                    shipment.tracking_events = res.get('events')
                shipment.last_synced_at = timezone.now()
                shipment.save()
                synced += 1
            except Exception as e:
                errors += 1

        if synced:
            messages.success(request, f"Successfully refreshed tracking for {synced} shipment(s).")
        if errors:
            messages.warning(request, f"Failed to sync {errors} shipment(s).")

    @admin.action(description="🚚 Schedule Delhivery Pickup")
    def request_pickup_action(self, request, queryset):
        provider = DelhiveryShippingProvider()
        success = 0
        for shipment in queryset.filter(awb_number__gt=''):
            try:
                res = provider.request_pickup(pickup_location=shipment.pickup_location, package_count=1)
                token = res.get('token_number', '')
                if token:
                    shipment.pickup_token_number = token
                    shipment.save(update_fields=['pickup_token_number'])
                success += 1
            except Exception as e:
                messages.error(request, f"Pickup request failed for AWB {shipment.awb_number}: {str(e)}")

        if success:
            messages.success(request, f"Scheduled pickup for {success} shipment(s).")
