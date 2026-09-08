from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db import transaction
from .models import PaymentTransaction, WebhookLog, PaymentVerification
from .storage import create_signed_proof_url
from .views import decrement_order_inventory


@admin.register(PaymentVerification)
class PaymentVerificationAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order', 'transaction_id', 'amount',
        'screenshot_thumb', 'status', 'submitted_at', 'verified_at', 'verified_by'
    ]
    list_filter = ['status', 'submitted_at', 'verified_at']
    search_fields = [
        'transaction_id', 'order__order_number',
        'order__customer_name', 'order__customer_email', 'order__customer_phone'
    ]
    readonly_fields = [
        'order', 'user_id', 'payment_method', 'amount', 'currency',
        'transaction_id', 'payment_proof_path', 'screenshot_preview',
        'submitted_at', 'verified_at', 'verified_by', 'created_at', 'updated_at'
    ]
    actions = ['approve_selected_payments', 'reject_selected_payments']

    def screenshot_thumb(self, obj):
        if not obj.payment_proof_path:
            return "No Screenshot"
        signed_url = create_signed_proof_url(obj.payment_proof_path, expires_in=3600)
        if signed_url:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener noreferrer">'
                '<img src="{}" style="height: 48px; width: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #c2a370;" title="Click to view full screenshot" />'
                '</a>',
                signed_url, signed_url
            )
        return "Unavailable"
    screenshot_thumb.short_description = "Proof Image"

    def screenshot_link(self, obj):
        if not obj.payment_proof_path:
            return "No Screenshot"
        signed_url = create_signed_proof_url(obj.payment_proof_path, expires_in=3600)
        if signed_url:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener noreferrer" style="font-weight:600; color:#c6a15b;">Open Screenshot ↗</a>',
                signed_url
            )
        return "Unavailable"
    screenshot_link.short_description = "Proof Image"

    def screenshot_preview(self, obj):
        if not obj.payment_proof_path:
            return "No screenshot file recorded."
        signed_url = create_signed_proof_url(obj.payment_proof_path, expires_in=3600)
        if signed_url:
            return format_html(
                '<div style="margin: 10px 0;">'
                '<a href="{}" target="_blank" rel="noopener noreferrer">'
                '<img src="{}" style="max-width: 480px; max-height: 480px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" alt="Payment Screenshot" />'
                '</a>'
                '<p style="font-size: 12px; color: #666; margin-top: 6px;">Click image to open full resolution in new tab.</p>'
                '</div>',
                signed_url, signed_url
            )
        return "Could not generate secure signed URL for screenshot."
    screenshot_preview.short_description = "Screenshot Preview"

    @admin.action(description="✓ Approve selected payments (Atomically updates order & inventory)")
    def approve_selected_payments(self, request, queryset):
        approved_count = 0
        already_paid_count = 0

        for pv in queryset:
            with transaction.atomic():
                # Lock rows to prevent race conditions
                verification = PaymentVerification.objects.select_for_update().get(id=pv.id)
                order = verification.order

                if verification.status == 'paid' and order.payment_status == 'paid':
                    already_paid_count += 1
                    continue

                verification.status = 'paid'
                verification.rejection_reason = ''
                verification.verified_at = timezone.now()
                verification.verified_by = request.user
                verification.save(update_fields=['status', 'rejection_reason', 'verified_at', 'verified_by', 'updated_at'])

                order.payment_status = 'paid'
                order.status = 'confirmed'
                order.save(update_fields=['payment_status', 'status', 'updated_at'])

                # Decrement inventory exactly once
                decrement_order_inventory(order)
                approved_count += 1

        msg = f"Successfully verified and approved {approved_count} payment(s)."
        if already_paid_count:
            msg += f" ({already_paid_count} were already paid and skipped)."
        self.message_user(request, msg)

    @admin.action(description="✗ Reject selected payments")
    def reject_selected_payments(self, request, queryset):
        rejected_count = 0
        default_reason = "Transaction reference or payment screenshot could not be validated."

        for pv in queryset:
            with transaction.atomic():
                verification = PaymentVerification.objects.select_for_update().get(id=pv.id)
                order = verification.order

                verification.status = 'rejected'
                if not verification.rejection_reason:
                    verification.rejection_reason = default_reason
                verification.verified_at = timezone.now()
                verification.verified_by = request.user
                verification.save(update_fields=['status', 'rejection_reason', 'verified_at', 'verified_by', 'updated_at'])

                order.payment_status = 'rejected'
                order.save(update_fields=['payment_status', 'updated_at'])
                rejected_count += 1

        self.message_user(request, f"Marked {rejected_count} payment proof(s) as rejected.")


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order', 'razorpay_order_id', 'razorpay_payment_id',
        'amount', 'currency', 'status', 'payment_method', 'created_at'
    ]
    list_filter = ['status', 'currency', 'created_at', 'payment_method']
    search_fields = [
        'razorpay_order_id', 'razorpay_payment_id',
        'cashfree_order_id', 'cashfree_payment_id', 'order__order_number'
    ]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = [
        'event_id', 'event_type', 'razorpay_order_id',
        'is_valid_signature', 'processed', 'created_at'
    ]
    list_filter = ['is_valid_signature', 'processed', 'created_at']
    search_fields = [
        'event_id', 'razorpay_order_id', 'razorpay_payment_id',
        'cashfree_order_id', 'event_type'
    ]
    readonly_fields = ['created_at']
