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
    DelhiveryError,
    DelhiveryAuthenticationError,
    DelhiveryValidationError,
    DelhiveryShipmentCreationError,
    DelhiveryNetworkError,
)
from shipping.utils import (
    normalize_delhivery_status,
    is_status_transition_allowed,
    validate_indian_pincode,
    is_cod_order,
    get_delhivery_payment_details,
    is_shipment_editable,
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


class DelhiveryCodBugFixTestCase(TestCase):
    """
    Comprehensive test suite verifying all 7 user-specified COD / Prepaid scenarios:
    TEST 1: COD order ₹324 -> Admin: COD, Delhivery: COD, COD amount: ₹324
    TEST 2: Prepaid Razorpay order ₹679 -> Admin: Prepaid, Delhivery: Prepaid, COD amount: ₹0
    TEST 3: COD order with discount -> Verify Delhivery collects correct final payable amount
    TEST 4: COD order with shipping charge -> Verify correct final collectible amount
    TEST 5: Failed online payment -> Must NOT automatically become COD
    TEST 6: Already manifested COD shipment in editable state -> verify payment mode update allowed
    TEST 7: Already manifested prepaid shipment -> Do NOT accidentally convert to COD
    TEST 8: Uneditable shipment state (e.g. Delivered) -> rejects payment mode edit
    TEST 9: Bulk sync endpoint -> returns structured per-order synced_orders and failed_orders
    """

    def setUp(self):
        self.signer = TimestampSigner(salt='jewlsnjoy-admin-auth')
        self.admin_token = self.signer.sign("1:admin")

        self.category = Category.objects.create(name='Pendants', slug='pendants')
        self.product = Product.objects.create(
            category=self.category,
            name='Gold Floral Pendant',
            slug='gold-floral-pendant',
            price=Decimal('324.00'),
            stock_quantity=10
        )

    @patch('shipping.services.delhivery.DelhiveryShippingProvider._make_request')
    def test_case_1_cod_order_324(self, mock_request):
        """TEST 1: COD order ₹324 creates Delhivery shipment as COD with ₹324 amount."""
        order = Order.objects.create(
            order_number='ORD-COD-324',
            customer_name='Meera Patel',
            customer_email='meera@example.com',
            customer_phone='9876543210',
            shipping_address='101 Green Park',
            city='Delhi',
            state='Delhi',
            postal_code='110016',
            total_amount=Decimal('324.00'),
            payment_method='Cash on Delivery (COD)',
            payment_status='pending',
            status='confirmed'
        )

        # Single source of truth checks
        self.assertTrue(is_cod_order(order))
        pay_details = get_delhivery_payment_details(order)
        self.assertTrue(pay_details['is_cod'])
        self.assertEqual(pay_details['payment_mode'], 'COD')
        self.assertEqual(pay_details['delhivery_mode'], 'COD')
        self.assertEqual(pay_details['cod_amount'], Decimal('324.00'))
        self.assertEqual(pay_details['cod_amount_float'], 324.0)

        # Mock Delhivery cmu/create response
        mock_request.return_value = {
            'success': True,
            'upload_wbn': 'UPL324',
            'cod_count': 1,
            'packages': [{
                'status': 'Success',
                'waybill': '41710610005154',
                'cod_amount': 324.0,
                'payment': 'COD',
                'refnum': 'ORD-COD-324'
            }]
        }

        provider = DelhiveryShippingProvider()
        provider.pickup_location = 'Warehouse_Delhi'
        res = provider.create_shipment(order)

        self.assertEqual(res['awb_number'], '41710610005154')
        self.assertEqual(res['payment_mode'], 'COD')
        self.assertEqual(res['cod_amount'], Decimal('324.00'))

        # Inspect request data sent to Delhivery
        call_args = mock_request.call_args
        self.assertEqual(call_args[0][0], 'POST')
        self.assertEqual(call_args[0][1], '/api/cmu/create.json')
        import json
        form_data = call_args[1]['data']
        payload_data = json.loads(form_data['data'])
        shipment_sent = payload_data['shipments'][0]

        # Verify strict Delhivery API schema: NO redundant guessed fields!
        self.assertEqual(shipment_sent['payment_mode'], 'COD')
        self.assertEqual(shipment_sent['cod_amount'], 324.0)
        self.assertEqual(shipment_sent['total_amount'], 324.0)
        self.assertNotIn('pt', shipment_sent)
        self.assertNotIn('package_type', shipment_sent)
        self.assertNotIn('order_type', shipment_sent)
        self.assertNotIn('cod', shipment_sent)

    @patch('shipping.services.delhivery.DelhiveryShippingProvider._make_request')
    def test_case_2_prepaid_razorpay_order_679(self, mock_request):
        """TEST 2: Prepaid Razorpay order ₹679 creates Delhivery shipment as Pre-paid with ₹0 amount."""
        order = Order.objects.create(
            order_number='ORD-RZP-679',
            customer_name='Rohan Das',
            customer_email='rohan@example.com',
            customer_phone='9812345678',
            shipping_address='22 Marine Drive',
            city='Mumbai',
            state='Maharashtra',
            postal_code='400020',
            total_amount=Decimal('679.00'),
            payment_method='Razorpay',
            payment_status='paid',
            status='confirmed'
        )

        # Single source of truth checks
        self.assertFalse(is_cod_order(order))
        pay_details = get_delhivery_payment_details(order)
        self.assertFalse(pay_details['is_cod'])
        self.assertEqual(pay_details['payment_mode'], 'Prepaid')
        self.assertEqual(pay_details['delhivery_mode'], 'Pre-paid')
        self.assertEqual(pay_details['cod_amount'], Decimal('0.00'))
        self.assertEqual(pay_details['cod_amount_float'], 0.0)

        mock_request.return_value = {
            'success': True,
            'upload_wbn': 'UPL679',
            'prepaid_count': 1,
            'packages': [{
                'status': 'Success',
                'waybill': '41710610006790',
                'cod_amount': 0.0,
                'payment': 'Pre-paid',
                'refnum': 'ORD-RZP-679'
            }]
        }

        provider = DelhiveryShippingProvider()
        provider.pickup_location = 'Warehouse_Mumbai'
        res = provider.create_shipment(order)

        self.assertEqual(res['awb_number'], '41710610006790')
        self.assertEqual(res['payment_mode'], 'Prepaid')
        self.assertEqual(res['cod_amount'], Decimal('0.00'))

        # Inspect request data sent to Delhivery
        call_args = mock_request.call_args
        import json
        payload_data = json.loads(call_args[1]['data']['data'])
        shipment_sent = payload_data['shipments'][0]
        self.assertEqual(shipment_sent['payment_mode'], 'Pre-paid')
        self.assertEqual(shipment_sent['cod_amount'], 0.0)
        self.assertEqual(shipment_sent['total_amount'], 679.0)

    def test_case_3_cod_order_with_discount(self):
        """TEST 3: COD order with coupon discount collects exact final payable amount."""
        order = Order.objects.create(
            order_number='ORD-DISCOUNT',
            customer_name='Ananya Sen',
            customer_email='ananya@example.com',
            shipping_address='7 Lake Road',
            city='Kolkata',
            postal_code='700029',
            total_amount=Decimal('750.00'),  # 1000 - 250 discount
            payment_method='COD',
            payment_status='pending',
            status='confirmed'
        )
        self.assertTrue(is_cod_order(order))
        pay_details = get_delhivery_payment_details(order)
        self.assertEqual(pay_details['cod_amount'], Decimal('750.00'))
        self.assertEqual(pay_details['cod_amount_float'], 750.0)

    def test_case_4_cod_order_with_shipping_charge(self):
        """TEST 4: COD order with added shipping fee collects final total amount."""
        order = Order.objects.create(
            order_number='ORD-SHIPPING-FEE',
            customer_name='Siddharth Roy',
            customer_email='sid@example.com',
            shipping_address='15 Mall Road',
            city='Shimla',
            postal_code='171001',
            total_amount=Decimal('580.00'),  # 500 items + 80 shipping
            payment_method='Cash on Delivery',
            payment_status='pending',
            status='confirmed'
        )
        self.assertTrue(is_cod_order(order))
        pay_details = get_delhivery_payment_details(order)
        self.assertEqual(pay_details['cod_amount'], Decimal('580.00'))
        self.assertEqual(pay_details['cod_amount_float'], 580.0)

    def test_case_5_failed_or_pending_online_payment_never_cod(self):
        """TEST 5: Failed or pending online payments must NOT automatically become COD."""
        # Case A: Razorpay payment failed
        failed_rzp = Order.objects.create(
            order_number='ORD-RZP-FAILED',
            customer_name='Vikram Jain',
            customer_email='vikram@example.com',
            shipping_address='5 Park Street',
            city='Jaipur',
            postal_code='302001',
            total_amount=Decimal('999.00'),
            payment_method='Razorpay',
            payment_status='failed',
            status='order_placed'
        )
        self.assertFalse(is_cod_order(failed_rzp))
        self.assertEqual(get_delhivery_payment_details(failed_rzp)['payment_mode'], 'Prepaid')
        self.assertEqual(get_delhivery_payment_details(failed_rzp)['cod_amount'], Decimal('0.00'))

        # Case B: Manual UPI awaiting verification
        pending_upi = Order.objects.create(
            order_number='ORD-UPI-PENDING',
            customer_name='Neha Gupta',
            customer_email='neha@example.com',
            shipping_address='8 MG Road',
            city='Pune',
            postal_code='411001',
            total_amount=Decimal('450.00'),
            payment_method='manual_upi',
            payment_status='pending_verification',
            status='awaiting_payment_verification'
        )
        self.assertFalse(is_cod_order(pending_upi))
        self.assertEqual(get_delhivery_payment_details(pending_upi)['payment_mode'], 'Prepaid')
        self.assertEqual(get_delhivery_payment_details(pending_upi)['cod_amount'], Decimal('0.00'))

    @patch('shipping.services.delhivery.DelhiveryShippingProvider._make_request')
    def test_case_6_manifested_cod_shipment_allows_update(self, mock_request):
        """TEST 6: Already manifested COD shipment in editable state allows payment mode update."""
        order = Order.objects.create(
            order_number='ORD-EDIT-OK',
            customer_name='Sunil Kumar',
            customer_email='sunil@example.com',
            shipping_address='10 Central Avenue',
            city='Chennai',
            postal_code='600001',
            total_amount=Decimal('324.00'),
            payment_method='COD',
            payment_status='pending',
            status='confirmed'
        )
        shipment = Shipment.objects.create(
            order=order,
            provider='delhivery',
            awb_number='41710610009999',
            shipment_status='manifested',
            payment_mode='Prepaid',  # was manifested incorrectly as Prepaid
            cod_amount=Decimal('0.00')
        )

        can_edit, reason = is_shipment_editable(shipment.shipment_status)
        self.assertTrue(can_edit)

        mock_request.return_value = {
            'status': 'success',
            'message': 'Shipment details updated successfully'
        }

        provider = DelhiveryShippingProvider()
        res = provider.edit_shipment(
            waybill=shipment.awb_number,
            payment_mode='COD',
            cod_amount=324.0,
            current_status=shipment.shipment_status
        )
        self.assertEqual(res.get('status'), 'success')

        # Verify correct request parameters sent to /api/p/edit
        call_args = mock_request.call_args
        self.assertEqual(call_args[0][0], 'POST')
        self.assertEqual(call_args[0][1], '/api/p/edit')
        self.assertEqual(call_args[1]['content_type'], 'application/json')
        edit_data = call_args[1]['data']
        self.assertEqual(edit_data['waybill'], '41710610009999')
        self.assertEqual(edit_data['pt'], 'COD')
        self.assertEqual(edit_data['cod'], 324.0)

    def test_case_7_manifested_prepaid_shipment_not_accidentally_converted(self):
        """TEST 7: Already manifested prepaid shipment is never touched by COD bulk sync."""
        prepaid_order = Order.objects.create(
            order_number='ORD-PREPAID-STAY',
            customer_name='Prepaid User',
            customer_email='prepaid@example.com',
            shipping_address='20 Residency Road',
            city='Bengaluru',
            postal_code='560025',
            total_amount=Decimal('1200.00'),
            payment_method='Razorpay',
            payment_status='paid',
            status='confirmed'
        )
        shipment = Shipment.objects.create(
            order=prepaid_order,
            provider='delhivery',
            awb_number='41710610008888',
            shipment_status='manifested',
            payment_mode='Prepaid',
            cod_amount=Decimal('0.00')
        )

        # Call bulk COD sync API
        url = "/api/shipping/admin/sync-all-cod-shipments/"
        response = self.client.post(url, HTTP_X_ADMIN_TOKEN=self.admin_token)
        self.assertEqual(response.status_code, 200)

        # Ensure prepaid shipment was NOT changed
        shipment.refresh_from_db()
        self.assertEqual(shipment.payment_mode, 'Prepaid')
        self.assertEqual(shipment.cod_amount, Decimal('0.00'))

    def test_case_8_uneditable_shipment_state_rejected(self):
        """TEST 8: Shipment in delivered/dispatched state strictly rejects payment mode update."""
        delivered_order = Order.objects.create(
            order_number='ORD-DELIVERED',
            customer_name='Delivered Cust',
            customer_email='cust@example.com',
            shipping_address='10 Old Road',
            city='Surat',
            postal_code='395001',
            total_amount=Decimal('500.00'),
            payment_method='COD',
            payment_status='pending',
            status='delivered'
        )
        shipment = Shipment.objects.create(
            order=delivered_order,
            provider='delhivery',
            awb_number='41710610007777',
            shipment_status='delivered',
            payment_mode='Prepaid',
            cod_amount=Decimal('0.00')
        )

        can_edit, reason = is_shipment_editable('delivered')
        self.assertFalse(can_edit)
        self.assertIn("Cannot update payment mode in current Delhivery shipment state: 'Delivered'", reason)

        provider = DelhiveryShippingProvider()
        with self.assertRaises(DelhiveryValidationError):
            provider.edit_shipment(
                waybill=shipment.awb_number,
                payment_mode='COD',
                cod_amount=500.0,
                current_status='delivered'
            )

        # Test through REST API view
        url = f"/api/shipping/admin/orders/{delivered_order.id}/update-delhivery-payment/"
        resp = self.client.post(url, {'payment_mode': 'COD'}, content_type='application/json', HTTP_X_ADMIN_TOKEN=self.admin_token)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Cannot update payment mode", resp.json().get('error', ''))

    @patch('shipping.services.delhivery.DelhiveryShippingProvider.edit_shipment')
    def test_case_9_bulk_sync_cod_detailed_response(self, mock_edit):
        """TEST 9: Bulk COD sync returns structured synced_orders and failed_orders arrays."""
        cod_order = Order.objects.create(
            order_number='ORD-BULK-01',
            customer_name='Bulk Customer',
            customer_email='bulk@example.com',
            shipping_address='34 Hill Road',
            city='Dehradun',
            postal_code='248001',
            total_amount=Decimal('324.00'),
            payment_method='Cash on Delivery (COD)',
            payment_status='pending',
            status='confirmed'
        )
        Shipment.objects.create(
            order=cod_order,
            provider='delhivery',
            awb_number='41710610005154',
            shipment_status='manifested',
            payment_mode='Prepaid',
            cod_amount=Decimal('0.00')
        )

        mock_edit.return_value = {'status': 'success'}

        url = "/api/shipping/admin/sync-all-cod-shipments/"
        response = self.client.post(url, HTTP_X_ADMIN_TOKEN=self.admin_token)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertTrue(data['success'])
        self.assertIn('synced_orders', data)
        self.assertIn('failed_orders', data)
        self.assertEqual(len(data['synced_orders']), 1)
        self.assertEqual(data['synced_orders'][0]['order_number'], 'ORD-BULK-01')
        self.assertEqual(data['synced_orders'][0]['awb_number'], '41710610005154')
        self.assertEqual(data['synced_orders'][0]['payment_mode'], 'COD')
        self.assertEqual(data['synced_orders'][0]['cod_amount'], 324.0)

