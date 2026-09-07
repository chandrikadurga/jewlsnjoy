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
