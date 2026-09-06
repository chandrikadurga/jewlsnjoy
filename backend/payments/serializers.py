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
    Serializer for creating a server-validated Cashfree payment order.
    Prices from client are strictly IGNORED; prices are queried from Django Product table.
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
    Input serializer for server-side Cashfree payment verification.
    """
    order_number = serializers.CharField(max_length=100)
    cashfree_order_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
