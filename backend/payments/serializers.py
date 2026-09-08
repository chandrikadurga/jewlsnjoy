from rest_framework import serializers
from products.models import Product


class PaymentOrderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    product_id = serializers.IntegerField(required=False)
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate(self, data):
        pid = data.get('id') or data.get('product_id')
        if not pid:
            raise serializers.ValidationError("Product ID is required.")
        return data


class PaymentOrderCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a server-validated Razorpay payment order.
    Prices from client are strictly IGNORED; prices are queried directly from Django Product table.
    """
    customer_name = serializers.CharField(max_length=150)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    shipping_address = serializers.CharField()
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    postal_code = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=100, default='India')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    items = serializers.ListField(child=PaymentOrderItemSerializer(), min_length=1)

    def validate_customer_email(self, value):
        email = (value or '').strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required.")
        if '@gmailcom' in email:
            email = email.replace('@gmailcom', '@gmail.com')
        elif '@' in email:
            parts = email.split('@')
            if len(parts) == 2 and '.' not in parts[1]:
                email = f"{parts[0]}@{parts[1]}.com"
        return email


class PaymentVerifySerializer(serializers.Serializer):
    """
    Input serializer for server-side Razorpay payment verification.
    """
    order_number = serializers.CharField(max_length=100)
    razorpay_order_id = serializers.CharField(max_length=100)
    razorpay_payment_id = serializers.CharField(max_length=100)
    razorpay_signature = serializers.CharField(max_length=255)


class ManualUPISubmitSerializer(serializers.Serializer):
    """
    Validates customer manual UPI payment proof submission.
    Requires order_number, transaction/UTR reference ID, and screenshot file.
    """
    order_number = serializers.CharField(max_length=100, required=False)
    order_id = serializers.CharField(max_length=100, required=False)
    transaction_id = serializers.CharField(max_length=100)
    payment_screenshot = serializers.FileField()

    def validate_transaction_id(self, value):
        val = (value or '').strip()
        if not val or len(val) < 4:
            raise serializers.ValidationError("Please provide a valid UPI Transaction / UTR ID (at least 4 characters).")
        if len(val) > 100:
            raise serializers.ValidationError("Transaction ID cannot exceed 100 characters.")
        return val

    def validate(self, data):
        order_ref = (data.get('order_number') or data.get('order_id') or '').strip()
        if not order_ref:
            raise serializers.ValidationError({"order_number": "Order number or ID is required."})
        data['order_number'] = order_ref
        return data


class PaymentVerificationSerializer(serializers.ModelSerializer):
    """
    Public and admin representation of a PaymentVerification record.
    """
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer_name', read_only=True)
    customer_email = serializers.CharField(source='order.customer_email', read_only=True)

    class Meta:
        from .models import PaymentVerification
        model = PaymentVerification
        fields = [
            'id', 'order_number', 'customer_name', 'customer_email',
            'payment_method', 'transaction_id', 'amount', 'currency',
            'status', 'rejection_reason', 'submitted_at', 'verified_at'
        ]
        read_only_fields = fields
