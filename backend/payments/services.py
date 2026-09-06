import base64
import hashlib
import hmac
import logging
import re
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def get_cashfree_base_url():
    """
    Returns the Cashfree PG API base URL based on environment setting.
    """
    env = getattr(settings, 'CASHFREE_ENV', 'sandbox').strip().lower()
    if env == 'production':
        return 'https://api.cashfree.com/pg'
    return 'https://sandbox.cashfree.com/pg'


def get_cashfree_headers():
    """
    Returns required Cashfree PG API headers.
    """
    client_id = getattr(settings, 'CASHFREE_CLIENT_ID', '').strip()
    client_secret = getattr(settings, 'CASHFREE_CLIENT_SECRET', '').strip()
    api_version = getattr(settings, 'CASHFREE_API_VERSION', '2023-08-01').strip() or '2023-08-01'

    return {
        'x-client-id': client_id,
        'x-client-secret': client_secret,
        'x-api-version': api_version,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


def sanitize_customer_id(uid, email=''):
    """
    Cashfree customer_id allows alphanumeric characters, hyphens, and underscores (max 50 chars).
    """
    raw_id = (uid or email or 'guest_customer').strip()
    clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', raw_id)[:50]
    return clean_id or 'customer_1'


def sanitize_phone(phone):
    """
    Cashfree expects a valid phone number (10 digits for Indian numbers).
    """
    digits = re.sub(r'[^\d]', '', str(phone or ''))
    if len(digits) >= 10:
        return digits[-10:]
    # Fallback to test phone if empty or invalid format in test environment
    return '9999999999'


def create_cashfree_order(order_id, order_amount, customer_details, return_url=None, note="Jewels 'n' Joys Order"):
    """
    Creates a Cashfree Payment Order via Cashfree PG REST API v2023-08-01.
    Returns:
        dict: {
            'success': bool,
            'cf_order_id': str,
            'order_id': str,
            'payment_session_id': str,
            'order_status': str,
            'data': dict,
            'error': str (if failed)
        }
    """
    client_id = getattr(settings, 'CASHFREE_CLIENT_ID', '').strip()
    client_secret = getattr(settings, 'CASHFREE_CLIENT_SECRET', '').strip()

    if not client_id or not client_secret:
        return {
            'success': False,
            'error': 'Cashfree credentials not configured in Django environment.',
        }

    base_url = get_cashfree_base_url()
    url = f"{base_url}/orders"
    headers = get_cashfree_headers()

    amount = round(float(order_amount), 2)
    cust_id = sanitize_customer_id(customer_details.get('customer_id'), customer_details.get('customer_email'))
    cust_phone = sanitize_phone(customer_details.get('customer_phone'))
    cust_email = customer_details.get('customer_email') or 'customer@jewlsnjoy.com'
    cust_name = customer_details.get('customer_name') or 'Valued Customer'

    payload = {
        'order_id': str(order_id),
        'order_amount': amount,
        'order_currency': 'INR',
        'customer_details': {
            'customer_id': cust_id,
            'customer_email': cust_email,
            'customer_phone': cust_phone,
            'customer_name': cust_name,
        },
        'order_note': note or "Jewels 'n' Joys Order",
    }

    if return_url:
        payload['order_meta'] = {
            'return_url': return_url
        }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        resp_json = response.json()

        if response.status_code in (200, 201):
            return {
                'success': True,
                'cf_order_id': str(resp_json.get('cf_order_id', '')),
                'order_id': resp_json.get('order_id', str(order_id)),
                'payment_session_id': resp_json.get('payment_session_id', ''),
                'order_status': resp_json.get('order_status', 'ACTIVE'),
                'data': resp_json,
            }
        else:
            error_msg = resp_json.get('message') or resp_json.get('error') or f"HTTP {response.status_code}"
            logger.error("Cashfree order creation error: %s - %s", response.status_code, resp_json)
            return {
                'success': False,
                'error': f"Cashfree API Error: {error_msg}",
                'data': resp_json,
            }
    except requests.RequestException as exc:
        logger.error("Cashfree API network connection failed: %s", str(exc))
        return {
            'success': False,
            'error': f"Cashfree connection failed: {str(exc)}",
        }


def get_cashfree_order_payments(cashfree_order_id):
    """
    Authoritatively queries Cashfree for all payments attempted on an order.
    GET /orders/{order_id}/payments
    Returns list of payment records or empty list if unavailable/failed.
    """
    base_url = get_cashfree_base_url()
    url = f"{base_url}/orders/{cashfree_order_id}/payments"
    headers = get_cashfree_headers()

    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                return data
            return []
        logger.warning("Cashfree get payments failed: %s - %s", response.status_code, response.text)
        return []
    except requests.RequestException as exc:
        logger.error("Cashfree query payments error: %s", str(exc))
        return []


def verify_webhook_signature(timestamp, raw_body_bytes, signature):
    """
    Verifies Cashfree webhook signature using HMAC-SHA256.
    Signature = Base64(HMAC-SHA256(timestamp + raw_body, secret_key))
    """
    if not timestamp or not signature:
        return False

    secret_key = (
        getattr(settings, 'CASHFREE_WEBHOOK_SECRET', '').strip() or
        getattr(settings, 'CASHFREE_CLIENT_SECRET', '').strip()
    )
    if not secret_key:
        logger.warning("Cashfree webhook verification attempted without secret key configured.")
        return False

    try:
        if isinstance(timestamp, str):
            timestamp_bytes = timestamp.encode('utf-8')
        else:
            timestamp_bytes = bytes(timestamp)

        data = timestamp_bytes + raw_body_bytes
        computed = hmac.new(secret_key.encode('utf-8'), data, hashlib.sha256).digest()
        computed_b64 = base64.b64encode(computed).decode('utf-8')

        return hmac.compare_digest(computed_b64, signature)
    except Exception as exc:
        logger.error("Webhook signature calculation exception: %s", str(exc))
        return False
