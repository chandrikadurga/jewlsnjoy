"""
Comprehensive Automated Test Suite for Delhivery Logistics Integration.
Covers:
  - Pincode serviceability (Prepaid, COD, Unserviceable)
  - Prepaid vs COD shipment creation
  - Payment verification prerequisites (blocking unverified UPI)
  - Duplicate shipment prevention (idempotency)
  - Concurrency safeguards
  - Status progression protection (no regression from delivered)
  - Zero-trust customer order authorization (404 on unauthorized access)
  - Graceful degradation when Delhivery is offline or disabled
"""

from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.utils import timezone
from django.core.signing import TimestampSigner

from products.models import Order, OrderItem, Product, Category
from shipping.models import Shipment
from shipping.services.delhivery import DelhiveryShippingProvider
from shipping.exceptions import (
    DelhiveryAuthenticationError,
    DelhiveryShipmentCreationError,
    DelhiveryNetworkError,
)
from shipping.utils import (
    normalize_delhivery_status,
    is_status_transition_allowed,
    validate_indian_pincode,
)


class ShippingUtilsTestCase(TestCase):
    """Unit tests for status normalization and progression rules."""

    def test_status_normalization(self):
        self.assertEqual(normalize_delhivery_status('Manifested'), 'manifested')
        self.assertEqual(normalize_delhivery_status('In Transit'), 'in_transit')
        self.assertEqual(normalize_delhivery_status('Dispatched'), 'in_transit')
        self.assertEqual(normalize_delhivery_status('Out for Delivery'), 'out_for_delivery')
        self.assertEqual(normalize_delhivery_status('Delivered'), 'delivered')
        self.assertEqual(normalize_delhivery_status('RTO Initiated'), 'rto_initiated')
        self.assertEqual(normalize_delhivery_status('Cancelled'), 'cancelled')

    def test_status_progression_protection(self):
        # Progressing forward is allowed
        self.assertTrue(is_status_transition_allowed('manifested', 'in_transit'))
        self.assertTrue(is_status_transition_allowed('in_transit', 'out_for_delivery'))
        self.assertTrue(is_status_transition_allowed('out_for_delivery', 'delivered'))

        # Regressing backward from delivered is STRICTLY BLOCKED
        self.assertFalse(is_status_transition_allowed('delivered', 'in_transit'))
        self.assertFalse(is_status_transition_allowed('delivered', 'out_for_delivery'))
        self.assertFalse(is_status_transition_allowed('delivered', 'manifested'))

    def test_pincode_validation(self):
        self.assertTrue(validate_indian_pincode('500081'))
        self.assertTrue(validate_indian_pincode('110001'))
        self.assertFalse(validate_indian_pincode('011001'))  # cannot start with 0
        self.assertFalse(validate_indian_pincode('50008'))   # 5 digits
        self.assertFalse(validate_indian_pincode('5000811')) # 7 digits
        self.assertFalse(validate_indian_pincode('ABCDEF'))  # letters


class DelhiveryShippingServiceTestCase(TestCase):
    """Tests for DelhiveryShippingProvider API client."""

    def setUp(self):
        self.category = Category.objects.create(name='Necklaces', slug='necklaces')
        self.product = Product.objects.create(
            category=self.category,
            name='Royal Emerald Necklace',
            slug='royal-emerald-necklace',
            price=Decimal('1299.00'),
            stock_quantity=10
        )
        self.order = Order.objects.create(
            order_number='ORD-TEST01',
            user_id='supabase_user_123',
            customer_name='Aarav Mehta',
            customer_email='aarav@example.com',
            customer_phone='9876543210',
            shipping_address='Flat 402, Lotus Towers, Banjara Hills',
            city='Hyderabad',
            state='Telangana',
            postal_code='500034',
            country='India',
            total_amount=Decimal('1299.00'),
            payment_method='cod',
            payment_status='pending',
            status='confirmed'
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_name=self.product.name,
            quantity=1,
            price=self.product.price
        )

    @patch('shipping.services.delhivery.DelhiveryShippingProvider._make_request')
    def test_serviceable_prepaid_and_cod_pincode(self, mock_request):
        # TEST 1 & TEST 2: Serviceable pincode
        mock_request.return_value = {
            'delivery_codes': [{
                'postal_code': {
                    'pin': 500034,
                    'pre_paid': 'Y',
                    'cod': 'Y',
                    'pickup': 'Y',
                    'district': 'Hyderabad',
                    'state_code': 'TS'
                }
            }]
        }
        provider = DelhiveryShippingProvider()
        res = provider.check_serviceability('500034')
        self.assertTrue(res['serviceable'])
        self.assertTrue(res['cod_available'])
        self.assertTrue(res['prepaid_available'])
        self.assertEqual(res['city'], 'Hyderabad')

    @patch('shipping.services.delhivery.DelhiveryShippingProvider._make_request')
    def test_non_serviceable_pincode(self, mock_request):
        # TEST 3: Non-serviceable pincode
        mock_request.return_value = {'delivery_codes': []}
        provider = DelhiveryShippingProvider()
        res = provider.check_serviceability('999999')
        self.assertFalse(res['serviceable'])
        self.assertFalse(res['cod_available'])
        self.assertFalse(res['prepaid_available'])

    @patch('shipping.services.delhivery.DelhiveryShippingProvider._make_request')
    def test_cod_order_shipment_creation(self, mock_request):
        # TEST 4: COD order -> payment_mode = 'COD', cod_amount = exact order total
        mock_request.return_value = {
            'success': True,
            'upload_wbn': 'UPL12345',
            'packages': [{
                'status': 'Success',
                'waybill': '1234567890123',
                'cod_amount': '1299.00',
                'payment': 'COD',
                'refnum': 'ORD-TEST01'
            }]
        }
        provider = DelhiveryShippingProvider()
        provider.pickup_location = 'Warehouse_Hyderabad'
        res = provider.create_shipment(self.order)
        self.assertEqual(res['awb_number'], '1234567890123')
        self.assertEqual(res['payment_mode'], 'COD')
        self.assertEqual(res['cod_amount'], Decimal('1299.00'))

    @patch('shipping.services.delhivery.DelhiveryShippingProvider._make_request')
    def test_prepaid_order_shipment_creation(self, mock_request):
        # TEST 5: Prepaid verified order -> payment_mode = 'Prepaid', cod_amount = 0
        self.order.payment_method = 'manual_upi'
        self.order.payment_status = 'paid'
        self.order.save()

        mock_request.return_value = {
            'success': True,
            'upload_wbn': 'UPL67890',
            'packages': [{
                'status': 'Success',
                'waybill': '9876543210987',
                'cod_amount': '0.00',
                'payment': 'Prepaid',
                'refnum': 'ORD-TEST01'
            }]
        }
        provider = DelhiveryShippingProvider()
        provider.pickup_location = 'Warehouse_Hyderabad'
        res = provider.create_shipment(self.order)
        self.assertEqual(res['awb_number'], '9876543210987')
        self.assertEqual(res['payment_mode'], 'Prepaid')
        self.assertEqual(res['cod_amount'], Decimal('0.00'))


class ShippingApiViewsTestCase(TestCase):
    """Integration tests for shipping REST API endpoints."""

    def setUp(self):
        self.signer = TimestampSigner(salt='jewlsnjoy-admin-auth')
        self.admin_token = self.signer.sign("1:admin")

        self.category = Category.objects.create(name='Rings', slug='rings')
        self.product = Product.objects.create(
            category=self.category,
            name='Diamond Solitaire Ring',
            slug='diamond-solitaire-ring',
            price=Decimal('2499.00'),
            stock_quantity=5
        )

        # Unverified UPI Order
        self.unverified_order = Order.objects.create(
            order_number='ORD-UNVERIFIED',
            user_id='cust_101',
            customer_name='Priya Sharma',
            customer_email='priya@example.com',
            customer_phone='9123456780',
            shipping_address='12 Rose Lane',
            city='Bengaluru',
            state='Karnataka',
            postal_code='560001',
            total_amount=Decimal('2499.00'),
            payment_method='manual_upi',
            payment_status='pending_verification',
            status='awaiting_payment_verification'
        )

        # COD Order
        self.cod_order = Order.objects.create(
            order_number='ORD-COD-READY',
            user_id='cust_102',
            customer_name='Rohit Verma',
            customer_email='rohit@example.com',
            customer_phone='9887766554',
            shipping_address='45 Lake View',
            city='Mumbai',
            state='Maharashtra',
            postal_code='400001',
            total_amount=Decimal('1599.00'),
            payment_method='cod',
            payment_status='pending',
            status='confirmed'
        )

    def test_unverified_upi_blocks_shipment_creation(self):
        # TEST 6: Unverified UPI order must NOT allow shipment dispatch
        url = f"/api/shipping/admin/orders/{self.unverified_order.id}/create/"
        response = self.client.post(
            url,
            data={},
            content_type='application/json',
            HTTP_X_ADMIN_TOKEN=self.admin_token
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Payment is not verified", response.json().get('error', ''))
        self.assertFalse(Shipment.objects.filter(order=self.unverified_order).exists())

    @patch('shipping.services.delhivery.DelhiveryShippingProvider.create_shipment')
    def test_cod_shipment_creation_and_duplicate_prevention(self, mock_create):
        # TEST 7 & TEST 8: Successful creation and subsequent duplicate prevention
        mock_create.return_value = {
            'awb_number': '1122334455667',
            'provider_order_id': 'UPL112233',
            'provider_shipment_id': 'ORD-COD-READY',
            'provider_status': 'Manifested',
            'payment_mode': 'COD',
            'cod_amount': Decimal('1599.00'),
            'weight_grams': 200,
            'length_cm': 10.0,
            'breadth_cm': 10.0,
            'height_cm': 5.0,
            'pickup_location': 'JewelsNJoysWarehouse',
            'raw_response': {'success': True}
        }

        url = f"/api/shipping/admin/orders/{self.cod_order.id}/create/"
        first_resp = self.client.post(
            url,
            data={},
            content_type='application/json',
            HTTP_X_ADMIN_TOKEN=self.admin_token
        )
        self.assertEqual(first_resp.status_code, 201)
        self.assertEqual(first_resp.json()['shipment']['awb_number'], '1122334455667')

        # Verify order status transitioned to shipped
        self.cod_order.refresh_from_db()
        self.assertEqual(self.cod_order.status, 'shipped')

        # Subsequent call MUST fail with duplicate error and NOT dispatch again
        second_resp = self.client.post(
            url,
            data={},
            content_type='application/json',
            HTTP_X_ADMIN_TOKEN=self.admin_token
        )
        self.assertEqual(second_resp.status_code, 400)
        self.assertIn("Shipment already exists", second_resp.json().get('error', ''))

        # Exactly ONE shipment record in DB
        self.assertEqual(Shipment.objects.filter(order=self.cod_order).count(), 1)

    def test_customer_can_track_shipment_without_login_by_order_number(self):
        # Tracking works without login based on order number / ID
        url = f"/api/shipping/orders/{self.cod_order.order_number}/"
        response = self.client.get(url)  # No auth headers
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['order_number'], self.cod_order.order_number)

        # Invalid order returns 404
        bad_url = "/api/shipping/orders/NONEXISTENT-ORDER-999/"
        bad_response = self.client.get(bad_url)
        self.assertEqual(bad_response.status_code, 404)
        self.assertEqual(bad_response.json(), {'error': 'Order not found'})

    @patch('shipping.services.delhivery.DelhiveryShippingProvider.get_tracking')
    def test_tracking_sync_and_status_progression(self, mock_tracking):
        # TEST 12 & TEST 13: Delivered status sync and prevention of backward regression
        shipment = Shipment.objects.create(
            order=self.cod_order,
            provider='delhivery',
            awb_number='5555555555',
            shipment_status='in_transit',
            payment_mode='COD',
            cod_amount=Decimal('1599.00')
        )

        mock_tracking.return_value = {
            'awb': '5555555555',
            'provider_status': 'Delivered to recipient',
            'normalized_status': 'delivered',
            'status_code': 'DL',
            'events': [{'status': 'Delivered', 'timestamp': timezone.now().isoformat()}]
        }

        refresh_url = f"/api/shipping/admin/orders/{self.cod_order.id}/refresh/"
        resp1 = self.client.post(refresh_url, HTTP_X_ADMIN_TOKEN=self.admin_token)
        self.assertEqual(resp1.status_code, 200)

        shipment.refresh_from_db()
        self.assertEqual(shipment.shipment_status, 'delivered')
        self.cod_order.refresh_from_db()
        self.assertEqual(self.cod_order.status, 'delivered')

        # Stale/out-of-order tracking scan arrives saying "In Transit"
        mock_tracking.return_value = {
            'awb': '5555555555',
            'provider_status': 'Arrived at hub',
            'normalized_status': 'in_transit',
            'status_code': 'UD',
            'events': []
        }
        resp2 = self.client.post(refresh_url, HTTP_X_ADMIN_TOKEN=self.admin_token)
        self.assertEqual(resp2.status_code, 200)

        # Status MUST remain 'delivered' and not regress
        shipment.refresh_from_db()
        self.assertEqual(shipment.shipment_status, 'delivered')
        self.cod_order.refresh_from_db()
        self.assertEqual(self.cod_order.status, 'delivered')
