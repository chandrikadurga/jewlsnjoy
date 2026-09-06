from django.urls import path
from .views import (
    CashfreeConfigView,
    CashfreeCreateOrderView,
    CashfreeVerifyPaymentView,
    CashfreeWebhookView,
)

app_name = 'payments'

urlpatterns = [
    path('config/', CashfreeConfigView.as_view(), name='payment-config'),
    path('create/', CashfreeCreateOrderView.as_view(), name='payment-create'),
    path('verify/', CashfreeVerifyPaymentView.as_view(), name='payment-verify'),
    path('webhook/', CashfreeWebhookView.as_view(), name='payment-webhook'),
]
