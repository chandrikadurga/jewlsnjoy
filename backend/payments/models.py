from django.conf import settings
from django.db import models


class PaymentTransaction(models.Model):
    """
    Stores authoritative payment transactions and webhook events.
    Ensures complete idempotency and auditability across payment attempts.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    ]

    order = models.ForeignKey(
        'products.Order',
        related_name='payment_transactions',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    # Razorpay Transaction Identifiers
    razorpay_order_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, default='')

    # Historical Cashfree fields (preserved for backward compatibility)
    cashfree_order_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    cashfree_payment_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    payment_session_id = models.CharField(max_length=255, blank=True, default='')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, blank=True, default='Razorpay')
    
    event_type = models.CharField(max_length=100, blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    raw_response = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        txn_id = self.razorpay_order_id or self.cashfree_order_id or 'TXN'
        return f"Payment Txn {txn_id} ({self.status}) - ₹{self.amount}"


class PaymentVerification(models.Model):
    """
    Stores manual UPI / QR payment proof submissions and administrative reviews.
    Maintains a strict zero-trust audit trail:
    - Customer uploads proof -> pending_verification
    - Admin reviews & approves -> paid + confirmed
    - Admin rejects with reason -> rejected (customer can retry)
    """
    STATUS_CHOICES = [
        ('pending_verification', 'Pending Verification'),
        ('paid', 'Paid'),
        ('rejected', 'Rejected'),
    ]

    order = models.ForeignKey(
        'products.Order',
        related_name='manual_payment_verifications',
        on_delete=models.CASCADE
    )
    user_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
    payment_method = models.CharField(max_length=50, default='manual_upi')
    transaction_id = models.CharField(max_length=100, db_index=True)
    payment_proof_path = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending_verification')
    rejection_reason = models.TextField(blank=True, default='')
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='verified_manual_payments'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['transaction_id']),
            models.Index(fields=['status']),
            models.Index(fields=['user_id']),
        ]

    def __str__(self):
        return f"PaymentProof #{self.id} for Order {self.order.order_number} ({self.status}) - UTR: {self.transaction_id}"


class WebhookLog(models.Model):
    """
    Stores raw incoming webhook payloads for idempotent verification and replay prevention.
    """
    event_id = models.CharField(max_length=120, blank=True, default='', db_index=True)
    event_type = models.CharField(max_length=100, blank=True, default='')
    razorpay_order_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    cashfree_order_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    signature = models.CharField(max_length=255, blank=True, default='')
    is_valid_signature = models.BooleanField(default=False)
    processed = models.BooleanField(default=False)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        order_ref = self.razorpay_order_id or self.cashfree_order_id or 'N/A'
        return f"Webhook {self.event_type} - {order_ref} (Processed: {self.processed})"
