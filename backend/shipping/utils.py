"""
Shipping utility functions and status normalization.
Ensures strict status progression protection and input sanitization.
"""

import re
import logging
from decimal import Decimal

logger = logging.getLogger('shipping.utils')

# Progression hierarchy: higher number means further along in delivery lifecycle
STATUS_PROGRESSION_RANK = {
    'manifested': 10,
    'in_transit': 20,
    'out_for_delivery': 30,
    'delivered': 40,
    'rto_initiated': 25,
    'rto_delivered': 45,
    'cancelled': 50,
    'failed': 5,
}

# Raw Delhivery status text / code mapping to internal normalized status
DELHIVERY_STATUS_MAP = {
    'manifested': 'manifested',
    'open': 'manifested',
    'in transit': 'in_transit',
    'dispatched': 'in_transit',
    'pending': 'in_transit',
    'out for delivery': 'out_for_delivery',
    'delivered': 'delivered',
    'rto': 'rto_initiated',
    'dto': 'rto_initiated',
    'rto delivered': 'rto_delivered',
    'cancelled': 'cancelled',
    'closed': 'delivered',
}


def normalize_delhivery_status(raw_status: str) -> str:
    """
    Normalizes Delhivery provider status string into internal shipment status.
    Defaults to 'in_transit' for unknown active movement, or 'manifested' if new.
    """
    if not raw_status:
        return 'manifested'

    cleaned = str(raw_status).strip().lower()
    
    # Direct match
    if cleaned in DELHIVERY_STATUS_MAP:
        return DELHIVERY_STATUS_MAP[cleaned]

    # Substring heuristics based on Delhivery scan keywords
    if 'deliver' in cleaned and 'out' in cleaned:
        return 'out_for_delivery'
    if 'delivered' in cleaned:
        return 'delivered'
    if 'transit' in cleaned or 'dispatch' in cleaned or 'reached' in cleaned:
        return 'in_transit'
    if 'cancel' in cleaned:
        return 'cancelled'
    if 'rto' in cleaned or 'return' in cleaned:
        return 'rto_initiated'

    return 'in_transit'


def is_status_transition_allowed(current_status: str, new_status: str) -> bool:
    """
    Prevents stale API responses or out-of-order webhooks from regressing shipment status.
    For example: 'delivered' MUST NOT regress back to 'in_transit'.
    """
    if not current_status:
        return True
    if current_status == new_status:
        return True

    # Terminal states: cannot change once delivered or cancelled unless manual override
    if current_status in ('delivered', 'rto_delivered', 'cancelled'):
        return False

    current_rank = STATUS_PROGRESSION_RANK.get(current_status, 0)
    new_rank = STATUS_PROGRESSION_RANK.get(new_status, 0)

    # Allow transition if moving forward or sideways to an exception state
    return new_rank >= current_rank


def validate_indian_pincode(pincode: str) -> bool:
    """
    Validates standard 6-digit Indian postal code format.
    Cannot start with 0.
    """
    if not pincode:
        return False
    clean = str(pincode).strip()
    return bool(re.match(r'^[1-9][0-9]{5}$', clean))


def sanitize_phone_number(phone: str) -> str:
    """
    Strips country code and special characters to return 10-digit mobile number.
    """
    if not phone:
        return ''
    digits = re.sub(r'\D', '', str(phone))
    if len(digits) > 10 and digits.startswith('91'):
        digits = digits[2:]
    return digits[-10:] if len(digits) >= 10 else digits


def auto_dispatch_delhivery_shipment(order):
    """
    Automatically creates a Delhivery shipment manifest for a confirmed/paid order.
    Directly syncs the order to the Delhivery One dashboard and generates an AWB.
    Safe & non-blocking: logs any error without failing the order/payment transaction.
    """
    try:
        from django.conf import settings
        from django.utils import timezone
        from shipping.models import Shipment
        from shipping.services.delhivery import DelhiveryShippingProvider

        # Skip if order already has an active AWB manifested
        if hasattr(order, 'shipment') and order.shipment and order.shipment.awb_number:
            return order.shipment

        # Basic address validation
        if not order.shipping_address or not order.postal_code:
            logger.warning("Delhivery auto-dispatch skipped for order #%s: missing address/pincode.", order.order_number)
            return None

        if not validate_indian_pincode(order.postal_code):
            logger.warning("Delhivery auto-dispatch skipped for order #%s: invalid PIN %s.", order.order_number, order.postal_code)
            return None

        provider = DelhiveryShippingProvider()
        if not provider.api_token:
            logger.info("Delhivery auto-dispatch skipped for order #%s: DELHIVERY_API_TOKEN not configured.", order.order_number)
            return None

        creation_data = provider.create_shipment(order=order)
        awb = creation_data.get('awb_number', '')
        tracking_url = f"https://www.delhivery.com/track/package/{awb}" if awb else ''
        label_url = f"{provider.base_url}/api/p/packing_slip?wbns={awb}" if awb else ''

        shipment, _ = Shipment.objects.update_or_create(
            order=order,
            defaults={
                'provider': 'delhivery',
                'provider_order_id': creation_data.get('provider_order_id', ''),
                'provider_shipment_id': creation_data.get('provider_shipment_id', ''),
                'awb_number': awb,
                'tracking_number': awb,
                'shipment_status': 'manifested',
                'provider_status': creation_data.get('provider_status', 'Manifested'),
                'payment_mode': creation_data.get('payment_mode', 'Prepaid'),
                'cod_amount': creation_data.get('cod_amount', Decimal('0.00')),
                'weight_grams': creation_data.get('weight_grams', getattr(provider, 'default_weight_g', 200)),
                'length_cm': creation_data.get('length_cm', getattr(provider, 'default_length_cm', 10)),
                'breadth_cm': creation_data.get('breadth_cm', getattr(provider, 'default_breadth_cm', 10)),
                'height_cm': creation_data.get('height_cm', getattr(provider, 'default_height_cm', 5)),
                'pickup_location': creation_data.get('pickup_location', provider.pickup_location),
                'tracking_url': tracking_url,
                'label_url': label_url,
                'provider_response': creation_data.get('raw_response', {}),
                'last_synced_at': timezone.now(),
                'error_message': '',
            }
        )

        if order.status in ('confirmed', 'processing', 'order_placed', 'pending'):
            order.status = 'shipped'
            order.save(update_fields=['status', 'updated_at'])

        logger.info("Successfully auto-dispatched order #%s to Delhivery One with AWB: %s", order.order_number, awb)
        return shipment

    except Exception as exc:
        logger.warning("Delhivery auto-dispatch failed gracefully for order #%s: %s", getattr(order, 'order_number', 'unknown'), str(exc))
        return None

