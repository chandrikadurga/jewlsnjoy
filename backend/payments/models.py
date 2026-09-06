from django.db import models


class PaymentTransaction(models.Model):
    """
    Stores authoritative Cashfree payment transactions and webhook events.
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
    cashfree_order_id = models.CharField(max_length=100, db_index=True)
    cashfree_payment_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    payment_session_id = models.CharField(max_length=255, blank=True, default='')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, blank=True, default='')
    
    event_type = models.CharField(max_length=100, blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    raw_response = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"CF Txn {self.cashfree_order_id} ({self.status}) - ₹{self.amount}"


class WebhookLog(models.Model):
    """
    Stores raw incoming webhook payloads for idempotent verification and replay prevention.
    """
    event_id = models.CharField(max_length=120, blank=True, default='', db_index=True)
    event_type = models.CharField(max_length=100, blank=True, default='')
    cashfree_order_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    signature = models.CharField(max_length=255, blank=True, default='')
    is_valid_signature = models.BooleanField(default=False)
    processed = models.BooleanField(default=False)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Webhook {self.event_type} - {self.cashfree_order_id} (Processed: {self.processed})"
