from django.urls import path
from .views import (
    PaymentConfigView,
    RazorpayCreateOrderView,
    RazorpayVerifyPaymentView,
    RazorpayWebhookView,
    ManualUPISubmitView,
    AdminPaymentVerificationListView,
    AdminPaymentApproveView,
    AdminPaymentRejectView,
)

app_name = 'payments'

urlpatterns = [
    # Gateway Configuration (Active: razorpay)
    path('config/', PaymentConfigView.as_view(), name='payment-config'),

    # Manual UPI Payment Submission
    path('manual-upi/submit/', ManualUPISubmitView.as_view(), name='manual-upi-submit'),

    # Admin Manual UPI Payment Reviews
    path('admin/verifications/', AdminPaymentVerificationListView.as_view(), name='admin-verifications-list'),
    path('admin/verifications/<int:pk>/approve/', AdminPaymentApproveView.as_view(), name='admin-verifications-approve'),
    path('admin/verifications/<int:pk>/reject/', AdminPaymentRejectView.as_view(), name='admin-verifications-reject'),

    # Razorpay Endpoints
    path('create/', RazorpayCreateOrderView.as_view(), name='payment-create'),
    path('verify/', RazorpayVerifyPaymentView.as_view(), name='payment-verify'),
    path('webhook/', RazorpayWebhookView.as_view(), name='payment-webhook'),
    path('razorpay/webhook/', RazorpayWebhookView.as_view(), name='payment-razorpay-webhook'),
]
