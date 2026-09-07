from django.urls import path
from .views import (
    RazorpayConfigView,
    RazorpayCreateOrderView,
    RazorpayVerifyPaymentView,
    RazorpayWebhookView,
)

app_name = 'payments'

urlpatterns = [
    path('config/', RazorpayConfigView.as_view(), name='payment-config'),
    path('create/', RazorpayCreateOrderView.as_view(), name='payment-create'),
    path('verify/', RazorpayVerifyPaymentView.as_view(), name='payment-verify'),
    path('webhook/', RazorpayWebhookView.as_view(), name='payment-webhook'),
]
