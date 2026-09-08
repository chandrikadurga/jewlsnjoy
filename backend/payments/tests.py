import io
from decimal import Decimal
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from products.models import Order, OrderItem, Product
from payments.models import PaymentVerification
from payments.views import admin_signer

User = get_user_model()


def make_test_png(content=b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4'):
    return SimpleUploadedFile('screenshot.png', content, content_type='image/png')


class ManualUPIPaymentsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            username='storeadmin',
            email='admin@jewlsnjoy.com',
            password='AdminPassword123!'
        )
        self.admin_token = admin_signer.sign(f"{self.admin_user.id}:{self.admin_user.username}")

        # Create test product
        self.product = Product.objects.create(
            name='Luxury Solitaire Pendant',
            price=Decimal('1497.00'),
            stock_quantity=10,
            in_stock=True
        )

        # Create test customer order
        self.order = Order.objects.create(
            order_number='ORD-TEST-1001',
            user_id='cust_uid_12345',
            customer_name='Priya Sharma',
            customer_email='priya@example.com',
            customer_phone='+91 98765 43210',
            shipping_address='Flat 4B, Lotus Apartments',
            city='Mumbai',
            state='Maharashtra',
            postal_code='400050',
            total_amount=Decimal('1497.00'),
            payment_method='manual_upi',
            payment_status='pending',
            status='order_placed'
        )

        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_name=self.product.name,
            price=self.product.price,
            quantity=2,
            image_url='/products/1/1.jpeg'
        )

    def test_payment_config_endpoint(self):
        """Verify GET /api/payments/config/ returns active razorpay provider and public key info."""
        url = reverse('payments:payment-config')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data.get('active_provider'), 'razorpay')
        self.assertIn('razorpay', data)
        self.assertIn('key_id', data['razorpay'])

    @patch('payments.views.get_authenticated_supabase_user')
    @patch('payments.views.upload_payment_proof')
    def test_manual_upi_submit_success(self, mock_upload, mock_get_user):
        """Verify successful manual payment proof submission."""
        mock_get_user.return_value = {'uid': 'cust_uid_12345', 'email': 'priya@example.com'}
        mock_upload.return_value = 'supabase://payment-proofs/cust_uid_12345/ORD-TEST-1001/proof_test123.png'

        url = reverse('payments:manual-upi-submit')
        test_file = make_test_png()
        payload = {
            'order_number': 'ORD-TEST-1001',
            'transaction_id': 'UPI123456789012',
            'payment_screenshot': test_file,
        }

        res = self.client.post(url, payload, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('payment_status'), 'pending_verification')
        self.assertEqual(data.get('status'), 'awaiting_payment_verification')

        # Check database
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'pending_verification')
        self.assertEqual(self.order.status, 'awaiting_payment_verification')

        pv = PaymentVerification.objects.filter(order=self.order).first()
        self.assertIsNotNone(pv)
        self.assertEqual(pv.transaction_id, 'UPI123456789012')
        self.assertEqual(pv.status, 'pending_verification')
        self.assertEqual(pv.amount, Decimal('1497.00'))

    @patch('payments.views.get_authenticated_supabase_user')
    def test_manual_upi_submit_unauthorized_order(self, mock_get_user):
        """Ensure Customer A cannot submit proof for Customer B's order (returns 404)."""
        mock_get_user.return_value = {'uid': 'different_uid_67890', 'email': 'intruder@example.com'}

        url = reverse('payments:manual-upi-submit')
        test_file = make_test_png()
        payload = {
            'order_number': 'ORD-TEST-1001',
            'transaction_id': 'UPI999999999999',
            'payment_screenshot': test_file,
        }

        res = self.client.post(url, payload, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    @patch('payments.views.get_authenticated_supabase_user')
    def test_manual_upi_submit_duplicate_transaction(self, mock_get_user):
        """Ensure the same transaction ID cannot be claimed for two different orders."""
        mock_get_user.return_value = {'uid': 'cust_uid_12345', 'email': 'priya@example.com'}

        # Existing verified record on an unrelated order
        other_order = Order.objects.create(
            order_number='ORD-OTHER-9999',
            customer_name='Other User',
            customer_email='other@example.com',
            shipping_address='Address',
            city='Delhi',
            postal_code='110001',
            total_amount=Decimal('500.00'),
            payment_status='paid'
        )
        PaymentVerification.objects.create(
            order=other_order,
            transaction_id='DUPLICATE_UTR_123',
            payment_proof_path='supabase://test.png',
            amount=Decimal('500.00'),
            status='paid'
        )

        url = reverse('payments:manual-upi-submit')
        test_file = make_test_png()
        payload = {
            'order_number': 'ORD-TEST-1001',
            'transaction_id': 'DUPLICATE_UTR_123',
            'payment_screenshot': test_file,
        }

        res = self.client.post(url, payload, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already been recorded', res.json().get('error', ''))

    def test_admin_approval_and_idempotent_inventory_deduction(self):
        """Ensure administrator approval transitions order to confirmed/paid and decrements inventory exactly once."""
        pv = PaymentVerification.objects.create(
            order=self.order,
            user_id=self.order.user_id,
            transaction_id='UTR_VERIFY_101',
            payment_proof_path='supabase://proof.png',
            amount=self.order.total_amount,
            status='pending_verification'
        )

        initial_stock = self.product.stock_quantity  # 10
        ordered_qty = 2

        url = reverse('payments:admin-verifications-approve', kwargs={'pk': pv.id})
        headers = {'HTTP_X_ADMIN_TOKEN': self.admin_token}

        # First Approval Attempt
        res = self.client.post(url, {}, **headers)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'paid')
        self.assertEqual(self.order.status, 'confirmed')

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - ordered_qty)  # 8

        # Second Approval Attempt (Idempotent test)
        res2 = self.client.post(url, {}, **headers)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertIn('already approved', res2.json().get('message', ''))

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - ordered_qty)  # STILL 8, NOT deducted again!

    def test_admin_rejection(self):
        """Ensure administrator rejection sets rejected status and stores rejection reason."""
        pv = PaymentVerification.objects.create(
            order=self.order,
            user_id=self.order.user_id,
            transaction_id='UTR_INVALID_999',
            payment_proof_path='supabase://proof.png',
            amount=self.order.total_amount,
            status='pending_verification'
        )

        url = reverse('payments:admin-verifications-reject', kwargs={'pk': pv.id})
        headers = {'HTTP_X_ADMIN_TOKEN': self.admin_token}

        payload = {'reason': 'Payment amount did not match order total.'}
        res = self.client.post(url, payload, **headers)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        pv.refresh_from_db()
        self.assertEqual(pv.status, 'rejected')
        self.assertEqual(pv.rejection_reason, 'Payment amount did not match order total.')

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, 'rejected')


class RazorpayPaymentsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            name='Diamond Drop Earrings',
            price=Decimal('1200.00'),
            stock_quantity=5,
            in_stock=True
        )

    @patch('payments.views.create_razorpay_order')
    @patch('payments.views.get_authenticated_supabase_user')
    def test_razorpay_create_order_success(self, mock_get_user, mock_create_rzp):
        """Verify server-side Razorpay order creation computes authentic total and returns paise."""
        mock_get_user.return_value = {'uid': 'user_rzp_123', 'email': 'rzp@example.com'}
        mock_create_rzp.return_value = {
            'success': True,
            'razorpay_order_id': 'order_mock_123456',
            'amount': 135000,  # ₹1200 + ₹150 shipping = ₹1350 = 135000 paise
            'currency': 'INR',
            'data': {'id': 'order_mock_123456'}
        }

        url = reverse('payments:payment-create')
        payload = {
            'customer_name': 'Aarav Patel',
            'customer_email': 'aarav@example.com',
            'customer_phone': '+91 98765 00000',
            'shipping_address': 'MG Road',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'postal_code': '560001',
            'items': [{'id': self.product.id, 'quantity': 1}]
        }

        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('order_id'), 'order_mock_123456')
        self.assertEqual(data.get('amount'), 135000)
        self.assertEqual(data.get('currency'), 'INR')

        # Check DB Order
        order = Order.objects.filter(order_number=data['order_number']).first()
        self.assertIsNotNone(order)
        self.assertEqual(order.user_id, 'user_rzp_123')
        self.assertEqual(order.payment_status, 'pending')
        self.assertEqual(order.payment_method, 'Razorpay')
        self.assertEqual(order.razorpay_order_id, 'order_mock_123456')

    @patch('payments.views.fetch_razorpay_payment')
    @patch('payments.views.verify_razorpay_signature')
    @patch('payments.views.get_authenticated_supabase_user')
    def test_razorpay_verify_success_and_inventory_decrement(self, mock_get_user, mock_verify_sig, mock_fetch_payment):
        """Verify cryptographic signature check, authoritative payment status, and single inventory decrement."""
        mock_get_user.return_value = {'uid': 'user_rzp_123', 'email': 'rzp@example.com'}
        mock_verify_sig.return_value = True
        mock_fetch_payment.return_value = {
            'id': 'pay_mock_789',
            'status': 'captured',
            'amount': 120000,
            'currency': 'INR'
        }

        order = Order.objects.create(
            order_number='ORD-RZP-999',
            user_id='user_rzp_123',
            customer_name='Aarav Patel',
            customer_email='aarav@example.com',
            shipping_address='MG Road',
            city='Bengaluru',
            postal_code='560001',
            total_amount=Decimal('1200.00'),
            payment_method='Razorpay',
            payment_status='pending',
            razorpay_order_id='order_mock_123456'
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            price=self.product.price,
            quantity=1
        )

        initial_stock = self.product.stock_quantity  # 5

        url = reverse('payments:payment-verify')
        payload = {
            'order_number': 'ORD-RZP-999',
            'razorpay_order_id': 'order_mock_123456',
            'razorpay_payment_id': 'pay_mock_789',
            'razorpay_signature': 'valid_mock_signature'
        }

        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(data.get('verified'))
        self.assertEqual(data.get('payment_status'), 'paid')

        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(order.status, 'confirmed')
        self.assertEqual(order.razorpay_payment_id, 'pay_mock_789')

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - 1)  # 4

        # Verify idempotency on repeat request
        res_repeat = self.client.post(url, payload, format='json')
        self.assertEqual(res_repeat.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - 1)  # still 4, not double deducted!

    @patch('payments.views.verify_razorpay_signature')
    @patch('payments.views.get_authenticated_supabase_user')
    def test_razorpay_verify_invalid_signature_rejected(self, mock_get_user, mock_verify_sig):
        """Invalid cryptographic signature must reject payment and set order to failed."""
        mock_get_user.return_value = {'uid': 'user_rzp_123'}
        mock_verify_sig.return_value = False

        order = Order.objects.create(
            order_number='ORD-RZP-BADSIG',
            user_id='user_rzp_123',
            customer_name='Tamper Test',
            customer_email='tamper@example.com',
            shipping_address='Street',
            city='City',
            postal_code='123456',
            total_amount=Decimal('500.00'),
            payment_method='Razorpay',
            payment_status='pending',
            razorpay_order_id='order_tamper_1'
        )

        url = reverse('payments:payment-verify')
        payload = {
            'order_number': 'ORD-RZP-BADSIG',
            'razorpay_order_id': 'order_tamper_1',
            'razorpay_payment_id': 'pay_tamper_1',
            'razorpay_signature': 'invalid_forged_sig'
        }

        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.json().get('verified'))

        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'failed')

    @patch('payments.views.get_authenticated_supabase_user')
    def test_razorpay_verify_unauthorized_user_returns_404(self, mock_get_user):
        """Customer A cannot verify or manipulate Customer B's order (returns 404)."""
        mock_get_user.return_value = {'uid': 'intruder_uid_456'}

        Order.objects.create(
            order_number='ORD-PRIVATE-99',
            user_id='legitimate_owner_uid_123',
            customer_name='Owner',
            customer_email='owner@example.com',
            shipping_address='Street',
            city='City',
            postal_code='123456',
            total_amount=Decimal('1000.00'),
            payment_method='Razorpay',
            payment_status='pending'
        )

        url = reverse('payments:payment-verify')
        payload = {
            'order_number': 'ORD-PRIVATE-99',
            'razorpay_order_id': 'order_id_1',
            'razorpay_payment_id': 'pay_id_1',
            'razorpay_signature': 'sig'
        }

        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    @patch('payments.views.verify_razorpay_webhook_signature')
    def test_razorpay_webhook_payment_captured_and_idempotency(self, mock_verify_wh):
        """Webhook payment.captured confirms order and handles duplicate events idempotently."""
        mock_verify_wh.return_value = True

        order = Order.objects.create(
            order_number='ORD-WH-101',
            customer_name='Webhook Test',
            customer_email='wh@example.com',
            shipping_address='Street',
            city='City',
            postal_code='123456',
            total_amount=Decimal('1200.00'),
            payment_method='Razorpay',
            payment_status='pending',
            razorpay_order_id='order_wh_rzp_101'
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            price=self.product.price,
            quantity=1
        )

        initial_stock = self.product.stock_quantity  # 5

        webhook_payload = {
            'event': 'payment.captured',
            'event_id': 'evt_mock_001',
            'payload': {
                'payment': {
                    'entity': {
                        'id': 'pay_wh_captured_1',
                        'order_id': 'order_wh_rzp_101',
                        'amount': 120000,
                        'status': 'captured'
                    }
                }
            }
        }

        url = reverse('payments:payment-webhook')
        headers = {'HTTP_X_RAZORPAY_SIGNATURE': 'valid_webhook_signature'}

        # First webhook delivery
        res1 = self.client.post(url, webhook_payload, format='json', **headers)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(order.status, 'confirmed')

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - 1)  # 4

        # Duplicate webhook delivery (re-transmission)
        res2 = self.client.post(url, webhook_payload, format='json', **headers)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.json().get('status'), 'already_processed')

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - 1)  # STILL 4!

    @patch('payments.views.verify_razorpay_webhook_signature')
    def test_razorpay_webhook_invalid_signature_rejected(self, mock_verify_wh):
        """Webhook with invalid signature must be rejected with 400."""
        mock_verify_wh.return_value = False

        url = reverse('payments:payment-webhook')
        res = self.client.post(url, {'event': 'order.paid'}, format='json', HTTP_X_RAZORPAY_SIGNATURE='bad_sig')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cod_order_creation(self):
        """COD orders must be created with payment_status='pending', payment_method='Cash on Delivery (COD)'."""
        url = '/api/orders/'
        payload = {
            'customer_name': 'Kavita Singh',
            'customer_email': 'kavita@example.com',
            'customer_phone': '+91 99999 11111',
            'shipping_address': 'Sector 14',
            'city': 'Gurugram',
            'state': 'Haryana',
            'postal_code': '122001',
            'payment_method': 'Cash on Delivery (COD)',
            'total_amount': '1225.00',
            'items': [{'id': self.product.id, 'name': self.product.name, 'price': '1200.00', 'quantity': 1}]
        }

        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data.get('payment_status'), 'pending')
        self.assertEqual(data.get('payment_method'), 'Cash on Delivery (COD)')
        self.assertEqual(data.get('status'), 'confirmed')
