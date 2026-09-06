from django.contrib import admin
from .models import PaymentTransaction, WebhookLog


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'cashfree_order_id', 'order', 'amount', 'currency',
        'status', 'cashfree_payment_id', 'payment_method', 'created_at'
    ]
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['cashfree_order_id', 'cashfree_payment_id', 'order__order_number']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = [
        'event_id', 'event_type', 'cashfree_order_id',
        'is_valid_signature', 'processed', 'created_at'
    ]
    list_filter = ['is_valid_signature', 'processed', 'created_at']
    search_fields = ['event_id', 'cashfree_order_id', 'event_type']
    readonly_fields = ['created_at']
