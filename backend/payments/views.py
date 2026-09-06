import json
import logging
import time
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
    create_cashfree_order,
    get_cashfree_order_payments,
    verify_webhook_signature,
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


class CashfreeConfigView(APIView):
    """
    GET /api/payments/config/
    Returns non-sensitive Cashfree public configuration.
    Secrets are NEVER returned to the browser.
    """
    def get(self, request):
        client_id = getattr(settings, 'CASHFREE_CLIENT_ID', '').strip()
        env = getattr(settings, 'CASHFREE_ENV', 'sandbox').strip().lower()
        return Response({
            'environment': env,
            'is_configured': bool(client_id),
        })


class CashfreeCreateOrderView(APIView):
    """
    POST /api/payments/create/
    Zero-Trust Endpoint:
    1. Authenticates customer via Supabase JWT if present (guest allowed if token absent).
    2. Strictly validates products & quantities against the database.
    3. Calculates authoritative totals server-side (frontend prices are ignored).
    4. Creates a pending Django Order & registers a Cashfree payment session.
    5. Returns payment_session_id for React Cashfree modal checkout.
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
        # Unique Cashfree Order ID containing internal order number and timestamp
        cashfree_order_id = f"{order_num}_{int(time.time())}"

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
            payment_method='Cashfree',
            payment_status='pending',
            status='order_placed',
            cashfree_order_id=cashfree_order_id,
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

        # ─── Call Cashfree REST API ───────────────────────────────────────────
        customer_payload = {
            'customer_id': verified_uid or validated_data['customer_email'],
            'customer_email': validated_data['customer_email'],
            'customer_phone': validated_data.get('customer_phone', ''),
            'customer_name': validated_data['customer_name'],
        }

        cf_result = create_cashfree_order(
            order_id=cashfree_order_id,
            order_amount=grand_total,
            customer_details=customer_payload,
            note=f"Order #{order_num} from Jewels 'n' Joys"
        )

        if not cf_result.get('success'):
            order.payment_status = 'failed'
            order.save(update_fields=['payment_status'])
            logger.error("Failed to create Cashfree order for %s: %s", order_num, cf_result.get('error'))
            return Response(
                {
                    'error': cf_result.get('error', 'Unable to initiate payment with Cashfree. Please check configuration.')
                },
                status=status.HTTP_502_BAD_GATEWAY
            )

        payment_session_id = cf_result.get('payment_session_id', '')
        order.cashfree_payment_session_id = payment_session_id
        order.save(update_fields=['cashfree_payment_session_id'])

        PaymentTransaction.objects.create(
            order=order,
            cashfree_order_id=cashfree_order_id,
            payment_session_id=payment_session_id,
            amount=grand_total,
            currency='INR',
            status='pending',
            payment_method='Cashfree',
            raw_response=cf_result.get('data', {}),
        )

        return Response({
            'order_number': order.order_number,
            'cashfree_order_id': cashfree_order_id,
            'payment_session_id': payment_session_id,
            'total_amount': float(grand_total),
            'currency': 'INR',
        }, status=status.HTTP_201_CREATED)


class CashfreeVerifyPaymentView(APIView):
    """
    POST /api/payments/verify/
    Verifies payment authoritatively directly against Cashfree PG servers.
    Zero-Trust Security:
    - Never trusts payment status sent from client browser.
    - Validates order ownership (prevents Customer A verifying Customer B's order).
    - Queries Cashfree API for actual captured payment, verifying amount & currency.
    - Atomically updates inventory upon verified success.
    """
    def post(self, request):
        auth_user = get_authenticated_supabase_user(request)
        verified_uid = auth_user['uid'] if auth_user else ''

        serializer = PaymentVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        order_number = serializer.validated_data['order_number']
        order = Order.objects.filter(order_number=order_number).first()

        if not order:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        # Order Ownership Check: If order is tied to a user, caller must match
        if order.user_id and order.user_id != verified_uid:
            # Return 404 to avoid leaking existence of orders
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        # If order already confirmed paid, return immediately (idempotent)
        if order.payment_status == 'paid':
            return Response({
                'verified': True,
                'payment_status': 'paid',
                'order': OrderSerializer(order).data,
            })

        cf_order_id = order.cashfree_order_id
        if not cf_order_id:
            return Response({
                'verified': False,
                'payment_status': order.payment_status,
                'message': 'No Cashfree order associated with this order.',
            }, status=status.HTTP_400_BAD_REQUEST)

        # Query Cashfree API directly for payments on this order
        payments = get_cashfree_order_payments(cf_order_id)
        successful_payment = None

        for p in payments:
            if p.get('payment_status') == 'SUCCESS':
                successful_payment = p
                break

        if successful_payment:
            payment_amount = Decimal(str(successful_payment.get('payment_amount', 0)))
            payment_currency = str(successful_payment.get('payment_currency', 'INR')).upper()
            cf_payment_id = str(successful_payment.get('cf_payment_id', ''))

            # Amount Validation: reject if paid amount doesn't match server order amount
            if payment_amount != order.total_amount or payment_currency != 'INR':
                logger.critical(
                    "Amount mismatch detected! Order %s expected %s %s, got %s %s",
                    order.order_number, order.total_amount, order.currency, payment_amount, payment_currency
                )
                order.payment_status = 'failed'
                order.save(update_fields=['payment_status'])
                return Response({
                    'verified': False,
                    'error': 'Payment amount mismatch. Verification failed.',
                }, status=status.HTTP_400_BAD_REQUEST)

            # Mark as paid and update inventory
            order.payment_status = 'paid'
            order.cashfree_payment_id = cf_payment_id
            order.save(update_fields=['payment_status', 'cashfree_payment_id', 'updated_at'])

            decrement_order_inventory(order)

            PaymentTransaction.objects.update_or_create(
                cashfree_order_id=cf_order_id,
                defaults={
                    'order': order,
                    'cashfree_payment_id': cf_payment_id,
                    'amount': payment_amount,
                    'currency': payment_currency,
                    'status': 'paid',
                    'payment_method': str(successful_payment.get('payment_group', 'Cashfree')),
                    'raw_response': successful_payment,
                }
            )

            logger.info("Order %s successfully verified as paid (CF Payment ID: %s)", order.order_number, cf_payment_id)

            return Response({
                'verified': True,
                'payment_status': 'paid',
                'order': OrderSerializer(order).data,
            })

        # Check if any payment explicitly failed
        failed_payment = next((p for p in payments if p.get('payment_status') == 'FAILED'), None)
        if failed_payment:
            order.payment_status = 'failed'
            order.save(update_fields=['payment_status', 'updated_at'])
            return Response({
                'verified': False,
                'payment_status': 'failed',
                'message': 'Payment failed. Please try again.',
            })

        return Response({
            'verified': False,
            'payment_status': order.payment_status,
            'message': 'Payment is still pending or was cancelled.',
        })


@method_decorator(csrf_exempt, name='dispatch')
class CashfreeWebhookView(APIView):
    """
    POST /api/payments/webhook/
    Asynchronous Cashfree Webhook Listener.
    Validates HMAC-SHA256 signature, logs event, and idempotently updates order & inventory.
    """
    def post(self, request):
        raw_body = request.body
        timestamp = request.headers.get('x-webhook-timestamp', '')
        signature = request.headers.get('x-webhook-signature', '')

        is_valid = verify_webhook_signature(timestamp, raw_body, signature)
        if not is_valid:
            logger.warning("Rejected invalid Cashfree webhook signature.")
            return Response({'error': 'Invalid webhook signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except json.JSONDecodeError:
            return Response({'error': 'Malformed JSON payload'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = payload.get('type', '')
        event_time = payload.get('event_time', '')
        data = payload.get('data', {})

        cf_order_data = data.get('order', {})
        cf_payment_data = data.get('payment', {})

        cf_order_id = cf_order_data.get('order_id') or data.get('order_id', '')
        cf_payment_id = str(cf_payment_data.get('cf_payment_id', ''))
        payment_status_str = cf_payment_data.get('payment_status', '')

        # Idempotency log
        event_id = f"{cf_order_id}_{cf_payment_id}_{event_type}"
        if WebhookLog.objects.filter(event_id=event_id, processed=True).exists():
            logger.info("Webhook event %s already processed. Skipping duplicate.", event_id)
            return Response({'status': 'already_processed'}, status=status.HTTP_200_OK)

        webhook_log = WebhookLog.objects.create(
            event_id=event_id,
            event_type=event_type,
            cashfree_order_id=cf_order_id,
            signature=signature,
            is_valid_signature=True,
            payload=payload,
        )

        order = Order.objects.filter(cashfree_order_id=cf_order_id).first()
        if not order and '_' in cf_order_id:
            # Fallback: extract base order number if formatted like ORD-XXXXXX_timestamp
            base_order_num = cf_order_id.rsplit('_', 1)[0]
            order = Order.objects.filter(order_number=base_order_num).first()

        if order:
            if payment_status_str == 'SUCCESS' or event_type == 'PAYMENT_SUCCESS_WEBHOOK':
                if order.payment_status != 'paid':
                    order.payment_status = 'paid'
                    order.cashfree_payment_id = cf_payment_id
                    order.save(update_fields=['payment_status', 'cashfree_payment_id', 'updated_at'])
                    decrement_order_inventory(order)
                    logger.info("Webhook marked Order %s as paid (CF: %s)", order.order_number, cf_payment_id)
            elif payment_status_str == 'FAILED' or event_type == 'PAYMENT_FAILED_WEBHOOK':
                if order.payment_status == 'pending':
                    order.payment_status = 'failed'
                    order.save(update_fields=['payment_status', 'updated_at'])
                    logger.info("Webhook marked Order %s as failed", order.order_number)

            webhook_log.processed = True
            webhook_log.save(update_fields=['processed'])

        return Response({'status': 'success'}, status=status.HTTP_200_OK)
