import json
import logging
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Order, OrderItem, Product
from products.serializers import OrderSerializer
from products.views import get_authenticated_supabase_user
from .models import PaymentTransaction, WebhookLog
from .serializers import PaymentOrderCreateSerializer, PaymentVerifySerializer
from .services import (
    create_razorpay_order,
    fetch_razorpay_payment,
    verify_razorpay_signature,
    verify_razorpay_webhook_signature,
)

logger = logging.getLogger(__name__)


def decrement_order_inventory(order):
    """
    Atomically decrements product stock quantities for a confirmed paid order.
    Ensures safe inventory reduction without going negative.
    """
    with transaction.atomic():
        for item in order.items.select_related('product').all():
            if item.product:
                Product.objects.filter(id=item.product.id).update(
                    stock_quantity=F('stock_quantity') - item.quantity
                )
                item.product.refresh_from_db(fields=['stock_quantity'])
                if item.product.stock_quantity <= 0:
                    Product.objects.filter(id=item.product.id).update(
                        stock_quantity=0,
                        in_stock=False
                    )


class RazorpayConfigView(APIView):
    """
    GET /api/payments/config/
    Returns non-sensitive Razorpay public configuration (key_id, environment).
    Secrets (RAZORPAY_KEY_SECRET) are NEVER returned to the browser.
    """
    def get(self, request):
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()
        env = getattr(settings, 'RAZORPAY_ENV', 'test').strip().lower()
        has_secret = bool(getattr(settings, 'RAZORPAY_KEY_SECRET', '').strip())

        return Response({
            'key_id': key_id,
            'environment': env,
            'is_configured': bool(key_id and has_secret),
        })


class RazorpayCreateOrderView(APIView):
    """
    POST /api/payments/create/
    Zero-Trust Endpoint:
    1. Authenticates customer via Supabase JWT (derives verified UID, guest allowed if token absent).
    2. Strictly validates products & stock availability against the Django database.
    3. Calculates authoritative totals server-side (frontend prices/amounts are strictly ignored).
    4. Creates a pending Django Order & registers a Razorpay order via Razorpay SDK (amount in paise).
    5. Returns order_id, amount in paise, currency, and public key_id for React Razorpay Checkout.
    """
    def post(self, request):
        auth_user = get_authenticated_supabase_user(request)
        verified_uid = auth_user['uid'] if auth_user else ''

        serializer = PaymentOrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        items_input = validated_data['items']

        # ─── Server-Side Product & Stock Validation ───────────────────────────
        subtotal = Decimal('0.00')
        order_items_to_create = []

        for item_data in items_input:
            prod_id = item_data.get('id') or item_data.get('product_id')
            qty = int(item_data.get('quantity', 1))

            try:
                product = Product.objects.get(id=prod_id)
            except Product.DoesNotExist:
                return Response(
                    {'error': f"Product with ID #{prod_id} was not found."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not product.in_stock or product.stock_quantity < qty:
                return Response(
                    {
                        'error': f"'{product.name}' is currently out of stock or requested quantity ({qty}) exceeds available stock ({product.stock_quantity})."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            item_price = product.price
            item_total = item_price * qty
            subtotal += item_total

            order_items_to_create.append({
                'product': product,
                'product_name': product.name,
                'price': item_price,
                'quantity': qty,
                'image_url': product.primary_image_url or (f"/products/{product.id}/1.jpeg"),
            })

        # ─── Server-Side Shipping & Total Calculation ─────────────────────────
        # Free delivery for orders >= ₹5000, otherwise flat ₹150 delivery
        shipping_cost = Decimal('0.00') if subtotal >= Decimal('5000.00') else Decimal('150.00')
        grand_total = subtotal + shipping_cost

        order_num = f"ORD-{uuid.uuid4().hex[:6].upper()}"

        # ─── Persist Django Order with Status "Pending" ─────────────────────────
        order = Order.objects.create(
            order_number=order_num,
            user_id=verified_uid,
            customer_name=validated_data['customer_name'],
            customer_email=validated_data['customer_email'],
            customer_phone=validated_data.get('customer_phone', ''),
            shipping_address=validated_data['shipping_address'],
            city=validated_data['city'],
            state=validated_data.get('state', ''),
            postal_code=validated_data['postal_code'],
            country=validated_data.get('country', 'India'),
            total_amount=grand_total,
            currency='INR',
            payment_method='Razorpay',
            payment_status='pending',
            status='order_placed',
            notes=validated_data.get('notes', ''),
        )

        for item_info in order_items_to_create:
            OrderItem.objects.create(
                order=order,
                product=item_info['product'],
                product_name=item_info['product_name'],
                price=item_info['price'],
                quantity=item_info['quantity'],
                image_url=item_info['image_url'],
            )

        # ─── Call Razorpay Order Creation API ─────────────────────────────────
        customer_payload = {
            'customer_email': validated_data['customer_email'],
            'customer_phone': validated_data.get('customer_phone', ''),
            'customer_name': validated_data['customer_name'],
        }

        rzp_result = create_razorpay_order(
            order_number=order_num,
            order_amount=grand_total,
            customer_details=customer_payload,
            notes={'order_number': order_num, 'customer_email': validated_data['customer_email']}
        )

        if not rzp_result.get('success'):
            order.payment_status = 'failed'
            order.save(update_fields=['payment_status'])
            logger.error("Failed to create Razorpay order for %s: %s", order_num, rzp_result.get('error'))
            return Response(
                {
                    'error': rzp_result.get('error', 'Unable to initiate payment with Razorpay. Please check gateway configuration.')
                },
                status=status.HTTP_502_BAD_GATEWAY
            )

        rzp_order_id = rzp_result.get('razorpay_order_id', '')
        amount_in_paise = rzp_result.get('amount', int(round(grand_total * 100)))

        order.razorpay_order_id = rzp_order_id
        order.save(update_fields=['razorpay_order_id'])

        PaymentTransaction.objects.create(
            order=order,
            razorpay_order_id=rzp_order_id,
            amount=grand_total,
            currency='INR',
            status='pending',
            payment_method='Razorpay',
            raw_response=rzp_result.get('data', {}),
        )

        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '').strip()

        return Response({
            'success': True,
            'order_number': order.order_number,
            'order_id': rzp_order_id,
            'razorpay_order_id': rzp_order_id,
            'amount': amount_in_paise,
            'currency': 'INR',
            'key_id': key_id,
            'total_amount': float(grand_total),
        }, status=status.HTTP_201_CREATED)


class RazorpayVerifyPaymentView(APIView):
    """
    POST /api/payments/verify/
    Verifies payment authoritatively against Razorpay:
    - Verifies cryptographic HMAC-SHA256 signature using RAZORPAY_KEY_SECRET.
    - Validates order ownership (prevents Customer A from manipulating Customer B's order).
    - Queries Razorpay API authoritatively for payment status, amount, and order matching.
    - Atomically updates order to 'paid' and decrements inventory exactly once.
    - Idempotent: safe against duplicate requests, network retries, and browser refreshes.
    """
    def post(self, request):
        auth_user = get_authenticated_supabase_user(request)
        verified_uid = auth_user['uid'] if auth_user else ''

        serializer = PaymentVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        order_number = validated['order_number']
        rzp_order_id = validated.get('razorpay_order_id') or validated.get('cashfree_order_id', '')
        rzp_payment_id = validated.get('razorpay_payment_id', '')
        rzp_signature = validated.get('razorpay_signature', '')

        order = Order.objects.filter(order_number=order_number).first()
        if not order:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        # Order Ownership Check: If order is associated with a customer UID, caller must match
        if order.user_id and order.user_id != verified_uid:
            # Return 404 to avoid leaking existence of orders
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        # Idempotent: If order is already confirmed paid, return success immediately
        if order.payment_status == 'paid':
            return Response({
                'verified': True,
                'payment_status': 'paid',
                'order': OrderSerializer(order).data,
            })

        # Match Razorpay Order ID with recorded order
        expected_rzp_order_id = order.razorpay_order_id
        if expected_rzp_order_id and rzp_order_id and expected_rzp_order_id != rzp_order_id:
            logger.critical("Order mismatch: Order %s expected Razorpay order %s, got %s",
                            order.order_number, expected_rzp_order_id, rzp_order_id)
            return Response({'error': 'Order reference mismatch. Verification failed.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # ─── 1. Verify Cryptographic Signature ────────────────────────────────
        is_signature_valid = verify_razorpay_signature(
            razorpay_order_id=rzp_order_id or expected_rzp_order_id,
            razorpay_payment_id=rzp_payment_id,
            razorpay_signature=rzp_signature,
        )

        if not is_signature_valid:
            logger.warning("Invalid Razorpay payment signature for order %s", order_number)
            order.payment_status = 'failed'
            order.save(update_fields=['payment_status', 'updated_at'])
            return Response({
                'verified': False,
                'error': 'Invalid payment signature. Verification failed.',
            }, status=status.HTTP_400_BAD_REQUEST)

        # ─── 2. Authoritative Fetch from Razorpay API ─────────────────────────
        payment_data = fetch_razorpay_payment(rzp_payment_id)
        if payment_data:
            payment_status = payment_data.get('status', '').lower()
            payment_amount_paise = int(payment_data.get('amount', 0))
            expected_amount_paise = int(round(order.total_amount * 100))
            payment_currency = payment_data.get('currency', 'INR').upper()

            # Amount validation
            if payment_amount_paise != expected_amount_paise or payment_currency != 'INR':
                logger.critical("Amount mismatch on %s: expected %s paise, got %s paise",
                                order.order_number, expected_amount_paise, payment_amount_paise)
                order.payment_status = 'failed'
                order.save(update_fields=['payment_status', 'updated_at'])
                return Response({
                    'verified': False,
                    'error': 'Payment amount mismatch. Verification failed.',
                }, status=status.HTTP_400_BAD_REQUEST)

            if payment_status not in ('captured', 'authorized'):
                order.payment_status = 'failed'
                order.save(update_fields=['payment_status', 'updated_at'])
                return Response({
                    'verified': False,
                    'payment_status': payment_status,
                    'error': f"Payment status is {payment_status}.",
                }, status=status.HTTP_400_BAD_REQUEST)

        # ─── 3. Mark as Paid and Decrement Inventory Exactly Once ─────────────
        with transaction.atomic():
            order.payment_status = 'paid'
            order.status = 'confirmed'
            order.razorpay_payment_id = rzp_payment_id
            order.razorpay_signature = rzp_signature
            if rzp_order_id and not order.razorpay_order_id:
                order.razorpay_order_id = rzp_order_id
            order.save(update_fields=['payment_status', 'status', 'razorpay_payment_id', 'razorpay_signature', 'razorpay_order_id', 'updated_at'])

            decrement_order_inventory(order)

        PaymentTransaction.objects.update_or_create(
            razorpay_order_id=rzp_order_id or order.razorpay_order_id,
            defaults={
                'order': order,
                'razorpay_payment_id': rzp_payment_id,
                'razorpay_signature': rzp_signature,
                'amount': order.total_amount,
                'currency': 'INR',
                'status': 'paid',
                'payment_method': 'Razorpay',
                'raw_response': payment_data or {'verified_by_signature': True},
            }
        )

        logger.info("Order %s successfully verified as paid (Razorpay Payment ID: %s)",
                    order.order_number, rzp_payment_id)

        return Response({
            'verified': True,
            'payment_status': 'paid',
            'order': OrderSerializer(order).data,
        })


@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    """
    POST /api/payments/webhook/
    Asynchronous Razorpay Webhook Listener.
    Validates HMAC-SHA256 signature, logs event, and idempotently updates order & inventory.
    """
    def post(self, request):
        raw_body = request.body
        signature = request.headers.get('x-razorpay-signature', '')

        is_valid = verify_razorpay_webhook_signature(raw_body, signature)
        if not is_valid:
            logger.warning("Rejected invalid Razorpay webhook signature.")
            return Response({'error': 'Invalid webhook signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except json.JSONDecodeError:
            return Response({'error': 'Malformed JSON payload'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = payload.get('event', '')
        event_id = payload.get('event_id') or ''
        payload_entity = payload.get('payload', {})

        payment_entity = payload_entity.get('payment', {}).get('entity', {})
        order_entity = payload_entity.get('order', {}).get('entity', {})

        rzp_order_id = payment_entity.get('order_id') or order_entity.get('id', '')
        rzp_payment_id = payment_entity.get('id', '')

        # Unique event idempotency check
        log_event_id = event_id or f"{rzp_order_id}_{rzp_payment_id}_{event_type}"
        if WebhookLog.objects.filter(event_id=log_event_id, processed=True).exists():
            logger.info("Webhook event %s already processed. Skipping duplicate.", log_event_id)
            return Response({'status': 'already_processed'}, status=status.HTTP_200_OK)

        webhook_log = WebhookLog.objects.create(
            event_id=log_event_id,
            event_type=event_type,
            razorpay_order_id=rzp_order_id,
            razorpay_payment_id=rzp_payment_id,
            signature=signature,
            is_valid_signature=True,
            payload=payload,
        )

        # Locate corresponding internal order
        order = None
        if rzp_order_id:
            order = Order.objects.filter(razorpay_order_id=rzp_order_id).first()

        if not order:
            order_num = payment_entity.get('notes', {}).get('order_number') or order_entity.get('receipt')
            if order_num:
                order = Order.objects.filter(order_number=order_num).first()

        if order:
            if event_type in ('payment.captured', 'order.paid'):
                if order.payment_status != 'paid':
                    with transaction.atomic():
                        order.payment_status = 'paid'
                        order.status = 'confirmed'
                        if rzp_payment_id:
                            order.razorpay_payment_id = rzp_payment_id
                        order.save(update_fields=['payment_status', 'status', 'razorpay_payment_id', 'updated_at'])
                        decrement_order_inventory(order)
                    logger.info("Webhook marked Order %s as paid (Razorpay: %s)", order.order_number, rzp_payment_id)
            elif event_type == 'payment.failed':
                if order.payment_status == 'pending':
                    order.payment_status = 'failed'
                    order.save(update_fields=['payment_status', 'updated_at'])
                    logger.info("Webhook marked Order %s as failed", order.order_number)

            webhook_log.processed = True
            webhook_log.save(update_fields=['processed'])

        return Response({'status': 'success'}, status=status.HTTP_200_OK)
