"""
Shipping and Logistics Data Models for Jewels 'n' Joys.
Maintains dedicated shipment records decoupled from Order/Payment lifecycles.
"""

from decimal import Decimal
from django.db import models
from django.utils import timezone


class Shipment(models.Model):
    """
    Logistics shipment record tied to a customer Order.
    Stores carrier identifiers (AWB), statuses, dimensions, and tracking timeline.
    """
    STATUS_CHOICES = [
        ('manifested', 'Manifested / Ready for Pickup'),
        ('in_transit', 'In Transit'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('rto_initiated', 'RTO Initiated'),
        ('rto_delivered', 'RTO Delivered'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Shipment Failed'),
    ]

    PAYMENT_MODE_CHOICES = [
        ('Prepaid', 'Prepaid'),
        ('COD', 'Cash on Delivery (COD)'),
    ]

    order = models.OneToOneField(
        'products.Order',
        on_delete=models.PROTECT,
        related_name='shipment',
        help_text="The customer order associated with this shipment."
    )
    provider = models.CharField(
        max_length=50,
        default='delhivery',
        db_index=True,
        help_text="Logistics carrier (e.g. 'delhivery')"
    )
    provider_order_id = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Carrier's internal order/upload reference ID."
    )
    provider_shipment_id = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Carrier's package or shipment identifier."
    )
    awb_number = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,
        help_text="Air Waybill / tracking number assigned by Delhivery."
    )
    tracking_number = models.CharField(
        max_length=100,
        blank=True,
        default=''
    )
    shipment_status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='manifested',
        db_index=True,
        help_text="Normalized shipment status."
    )
    provider_status = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Exact status string returned by Delhivery API."
    )
    provider_status_code = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text="Short status code from carrier scans (e.g. 'UD', 'DL')."
    )

    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        default='Prepaid'
    )
    cod_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Exact amount payable by customer at delivery (0.00 for prepaid)."
    )
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Operational carrier freight cost quoted by Delhivery."
    )

    weight_grams = models.PositiveIntegerField(
        default=200,
        help_text="Dead or volumetric weight in grams."
    )
    length_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal('10.0')
    )
    breadth_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal('10.0')
    )
    height_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal('5.0')
    )

    pickup_location = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Registered warehouse name in Delhivery One."
    )
    pickup_token_number = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Pickup request token number returned by Delhivery."
    )
    label_url = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text="URL to print or download Delhivery packing slip / barcode label."
    )
    tracking_url = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text="Public carrier tracking portal link."
    )

    # Safe structured provider payload (sensitive data stripped)
    provider_response = models.JSONField(
        default=dict,
        blank=True,
        help_text="Sanitized snapshot of carrier creation/tracking response."
    )
    tracking_events = models.JSONField(
        default=list,
        blank=True,
        help_text="List of normalized tracking checkpoint scans."
    )

    # NDR (Non-Delivery Report) fields
    ndr_status = models.CharField(max_length=50, blank=True, default='')
    ndr_reason = models.CharField(max_length=255, blank=True, default='')
    ndr_attempt_count = models.PositiveIntegerField(default=0)
    last_ndr_at = models.DateTimeField(null=True, blank=True)

    error_message = models.TextField(
        blank=True,
        default='',
        help_text="Last logged operational or carrier error message."
    )
    retry_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Shipment'
        verbose_name_plural = 'Shipments'

    def __str__(self):
        awb_display = self.awb_number or 'No AWB'
        return f"Shipment ({self.provider.upper()}) #{awb_display} for Order #{self.order.order_number}"

    @property
    def is_active(self):
        """Returns True if shipment is in progress and not cancelled or failed."""
        return self.shipment_status not in ('cancelled', 'failed')
