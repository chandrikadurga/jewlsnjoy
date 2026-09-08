import hashlib
import hmac
import logging
from decimal import Decimal
from django.conf import settings
import razorpay

logger = logging.getLogger(__name__)


def get_razorpay_client():
    """
    Initializes and returns the official Razorpay Python Client.
    Credentials are read from Django settings (populated via environment variables).
    """
    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip().strip('\'"')
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip().strip('\'"')

    if not key_id or not key_secret:
        logger.error("Razorpay API credentials missing from Django settings (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).")
        return None

    try:
        return razorpay.Client(auth=(key_id, key_secret))
    except Exception as exc:
        logger.error("Failed to initialize Razorpay Client: %s", str(exc))
        return None


def create_razorpay_order(order_number, order_amount, customer_details, notes=None):
    """
    Creates a Razorpay Order server-side via the official Razorpay SDK.
    The amount is authoritatively converted to paise (safe integer).
    
    Returns:
        dict: {
            'success': bool,
            'razorpay_order_id': str,
            'amount': int (in paise),
            'currency': str,
            'data': dict,
            'error': str (if failed)
        }
    """
    client = get_razorpay_client()
    if not client:
        return {
            'success': False,
            'error': 'Razorpay gateway credentials are not configured on the server.',
        }

    # Authoritative calculation of amount in paise (1 INR = 100 paise)
    amount_decimal = Decimal(str(order_amount))
    amount_in_paise = int(round(amount_decimal * 100))

    if amount_in_paise <= 0:
        return {
            'success': False,
            'error': 'Invalid order amount for Razorpay order creation.',
        }

    order_payload = {
        'amount': amount_in_paise,
        'currency': 'INR',
        'receipt': str(order_number)[:40],
        'notes': {
            'order_number': str(order_number),
            'customer_name': str(customer_details.get('customer_name', ''))[:50],
            'customer_email': str(customer_details.get('customer_email', ''))[:50],
            'customer_phone': str(customer_details.get('customer_phone', ''))[:30],
        }
    }
    if notes and isinstance(notes, dict):
        order_payload['notes'].update(notes)

    try:
        razorpay_order = client.order.create(data=order_payload)
        rzp_order_id = razorpay_order.get('id', '')

        if not rzp_order_id:
            logger.error("Razorpay order creation returned no ID: %s", razorpay_order)
            return {
                'success': False,
                'error': 'Razorpay order creation did not return an order ID.',
                'data': razorpay_order,
            }

        logger.info("Created Razorpay Order %s for Order #%s (₹%s = %s paise)", 
                    rzp_order_id, order_number, order_amount, amount_in_paise)

        return {
            'success': True,
            'razorpay_order_id': rzp_order_id,
            'amount': amount_in_paise,
            'currency': razorpay_order.get('currency', 'INR'),
            'data': razorpay_order,
        }
    except Exception as exc:
        logger.error("Razorpay order creation exception for %s: %s", order_number, str(exc))
        return {
            'success': False,
            'error': f"Failed to create Razorpay order: {str(exc)}",
        }


def verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
    """
    Authoritatively verifies the Razorpay payment signature using RAZORPAY_KEY_SECRET.
    Signature = HMAC-SHA256(order_id + '|' + payment_id, key_secret)
    """
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip()
    if not key_secret:
        logger.error("RAZORPAY_KEY_SECRET not configured. Cannot verify payment signature.")
        return False

    if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
        logger.warning("Missing required fields for Razorpay signature verification.")
        return False

    try:
        client = get_razorpay_client()
        if client:
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature,
            })
            return True
    except razorpay.errors.SignatureVerificationError:
        logger.warning("Razorpay utility signature verification failed for order %s / payment %s",
                       razorpay_order_id, razorpay_payment_id)
        return False
    except Exception as exc:
        logger.warning("Razorpay SDK verification exception, falling back to manual HMAC: %s", str(exc))

    # Cryptographic HMAC-SHA256 fallback
    try:
        payload = f"{razorpay_order_id}|{razorpay_payment_id}".encode('utf-8')
        generated_signature = hmac.new(
            key_secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(generated_signature, razorpay_signature)
    except Exception as exc:
        logger.error("HMAC signature verification failed with exception: %s", str(exc))
        return False


def fetch_razorpay_payment(razorpay_payment_id):
    """
    Authoritatively queries Razorpay API directly for the payment details.
    Ensures payment amount, status, currency, and order_id match our database.
    """
    client = get_razorpay_client()
    if not client:
        return None

    try:
        payment = client.payment.fetch(razorpay_payment_id)
        return payment
    except Exception as exc:
        logger.error("Failed to fetch Razorpay payment %s: %s", razorpay_payment_id, str(exc))
        return None


def verify_razorpay_webhook_signature(raw_body_bytes, signature):
    """
    Verifies Razorpay webhook signature using the configured RAZORPAY_WEBHOOK_SECRET.
    Signature = HMAC-SHA256(raw_request_body, webhook_secret)
    """
    webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '').strip()

    if not webhook_secret or not signature:
        logger.warning("Webhook verification attempted without RAZORPAY_WEBHOOK_SECRET or signature.")
        return False

    client = get_razorpay_client()
    if client:
        try:
            raw_body_str = raw_body_bytes.decode('utf-8') if isinstance(raw_body_bytes, bytes) else str(raw_body_bytes)
            client.utility.verify_webhook_signature(raw_body_str, signature, webhook_secret)
            return True
        except razorpay.errors.SignatureVerificationError:
            logger.warning("Razorpay utility webhook signature check failed.")
            return False
        except Exception as exc:
            logger.warning("Razorpay SDK webhook verification exception, using direct HMAC: %s", str(exc))

    try:
        body = raw_body_bytes if isinstance(raw_body_bytes, bytes) else raw_body_bytes.encode('utf-8')
        generated = hmac.new(
            webhook_secret.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(generated, signature)
    except Exception as exc:
        logger.error("Webhook HMAC verification exception: %s", str(exc))
        return False

