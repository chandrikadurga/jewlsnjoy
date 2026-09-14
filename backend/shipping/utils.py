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


def is_cod_order(order) -> bool:
    """
    Single source of truth for determining whether an order is Cash on Delivery (COD).
    Uses the application's actual data model.
    An order is ONLY considered COD if:
    1. The customer's selected payment method explicitly indicates Cash on Delivery (COD).
    2. It is NOT an online payment method (e.g. Razorpay, UPI, Card, Net Banking).
    3. The payment status is NOT already marked as 'paid'.
    Failed, pending, or cancelled online payments are NEVER treated as COD.
    Supports both Django Order model instances and dictionary representations.
    """
    if not order:
        return False

    if isinstance(order, dict):
        pm = str(order.get('payment_method') or '').strip().lower()
        ps = str(order.get('payment_status') or '').strip().lower()
    else:
        pm = str(getattr(order, 'payment_method', '') or '').strip().lower()
        ps = str(getattr(order, 'payment_status', '') or '').strip().lower()

    if not pm:
        return False

    # Explicit online payment methods MUST NEVER be treated as COD
    online_indicators = (
        'razorpay',
        'manual_upi',
        'cashfree',
        'online',
        'card',
        'upi',
        'credit',
        'debit',
        'net banking',
        'netbanking',
        'wallet',
    )
    if any(ind in pm for ind in online_indicators):
        return False

    # If the order is already marked as 'paid', it does not require courier collection
    if ps in ('paid', 'refunded', 'partially_refunded'):
        return False

    # Check for COD keywords in payment_method
    cod_indicators = ('cod', 'cash on delivery', 'cash_on_delivery')
    return any(ind in pm for ind in cod_indicators)


def get_delhivery_payment_details(order) -> dict:
    """
    Centralized helper to map an Order to Delhivery payment configuration.
    Rules:
    - COD:
        is_cod = True
        payment_mode = "COD"
        delhivery_mode = "COD"
        cod_amount = exact collectible order total
    - Prepaid:
        is_cod = False
        payment_mode = "Prepaid"
        delhivery_mode = "Pre-paid"
        cod_amount = 0.00
    Payment method is the primary source; failed/unpaid online payments are NEVER COD.
    """
    is_cod = is_cod_order(order)

    if isinstance(order, dict):
        raw_total = order.get('total_amount', 0)
    else:
        raw_total = getattr(order, 'total_amount', 0)

    try:
        total_float = round(float(raw_total), 2)
        total_decimal = Decimal(str(total_float)).quantize(Decimal('0.01'))
    except (ValueError, TypeError):
        total_float = 0.0
        total_decimal = Decimal('0.00')

    if is_cod:
        return {
            'is_cod': True,
            'payment_mode': 'COD',
            'delhivery_mode': 'COD',
            'cod_amount': total_decimal,
            'cod_amount_float': total_float,
            'total_amount': total_decimal,
            'total_amount_float': total_float,
        }
    else:
        return {
            'is_cod': False,
            'payment_mode': 'Prepaid',
            'delhivery_mode': 'Pre-paid',
            'cod_amount': Decimal('0.00'),
            'cod_amount_float': 0.0,
            'total_amount': total_decimal,
            'total_amount_float': total_float,
        }


def is_shipment_editable(shipment_or_status) -> tuple:
    """
    Determines whether a Delhivery shipment's payment mode and COD amount can still be updated.
    Delhivery allows /api/p/edit only while the package is in editable states:
    Manifested, In Transit, Pending, or Scheduled.
    Once Dispatched, Delivered, Picked Up, RTO, or Cancelled, Delhivery locks the package.
    Returns: (is_editable: bool, reason_message: str)
    """
    if shipment_or_status is None:
        return True, ""

    # Extract status string
    status_str = ''
    if hasattr(shipment_or_status, 'shipment_status'):
        status_str = getattr(shipment_or_status, 'shipment_status', '') or ''
    elif isinstance(shipment_or_status, dict):
        status_str = shipment_or_status.get('shipment_status', '') or shipment_or_status.get('status', '')
    else:
        status_str = str(shipment_or_status)

    cleaned = status_str.strip().lower().replace(' ', '_')
    if not cleaned:
        return True, ""

    # Terminal or non-editable states in Delhivery lifecycle
    non_editable_states = {
        'delivered',
        'dispatched',
        'picked_up',
        'collected',
        'rto',
        'dto',
        'rto_initiated',
        'rto_delivered',
        'cancelled',
        'closed',
        'lost',
        'failed',
    }

    if cleaned in non_editable_states:
        display_status = status_str.replace('_', ' ').title()
        return False, f"Cannot update payment mode in current Delhivery shipment state: '{display_status}'. Only Manifested, In Transit, or Pending shipments can be modified."

    return True, ""


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

        pay_details = get_delhivery_payment_details(order)
        creation_data = provider.create_shipment(order=order)
        awb = creation_data.get('awb_number', '')
        tracking_url = f"https://www.delhivery.com/track/package/{awb}" if awb else ''
        label_url = f"{provider.base_url}/api/p/packing_slip?wbns={awb}" if awb else ''

        resolved_mode = creation_data.get('payment_mode') or pay_details['payment_mode']
        resolved_cod = creation_data.get('cod_amount', pay_details['cod_amount'])

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
                'payment_mode': resolved_mode,
                'cod_amount': resolved_cod,
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

        logger.info("Successfully auto-dispatched order #%s to Delhivery One with AWB: %s (Mode: %s, COD: %s)", order.order_number, awb, resolved_mode, resolved_cod)
        return shipment

    except Exception as exc:
        logger.warning("Delhivery auto-dispatch failed gracefully for order #%s: %s", getattr(order, 'order_number', 'unknown'), str(exc))
        return None

