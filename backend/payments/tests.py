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
        """Verify GET /api/payments/config/ returns active manual_upi provider and preserved gateway keys."""
        url = reverse('payments:payment-config')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data.get('active_provider'), 'manual_upi')
        self.assertIn('manual_upi', data)
        self.assertEqual(data['manual_upi']['upi_id'], '6395673529@pthdfc')
        self.assertIn('instructions', data['manual_upi'])
        self.assertIn('razorpay', data)

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
