"""
Serializers for Shipping and Logistics models.
"""

from rest_framework import serializers
from .models import Shipment


class ShipmentSummarySerializer(serializers.ModelSerializer):
    """
    Compact shipment summary embedded into storefront OrderSerializer
    so customers and admin see live tracking without separate calls.
    """
    class Meta:
        model = Shipment
        fields = [
            'id',
            'provider',
            'awb_number',
            'shipment_status',
            'provider_status',
            'payment_mode',
            'cod_amount',
            'tracking_url',
            'label_url',
            'created_at',
            'updated_at',
            'last_synced_at',
        ]
        read_only_fields = fields


class ShipmentDetailSerializer(serializers.ModelSerializer):
    """
    Full shipment detail including complete tracking timeline events.
    """
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer_name', read_only=True)

    class Meta:
        model = Shipment
        fields = [
            'id',
            'order',
            'order_number',
            'customer_name',
            'provider',
            'provider_order_id',
            'provider_shipment_id',
            'awb_number',
            'tracking_number',
            'shipment_status',
            'provider_status',
            'provider_status_code',
            'payment_mode',
            'cod_amount',
            'shipping_cost',
            'weight_grams',
            'length_cm',
            'breadth_cm',
            'height_cm',
            'pickup_location',
            'pickup_token_number',
            'label_url',
            'tracking_url',
            'tracking_events',
            'error_message',
            'created_at',
            'updated_at',
            'last_synced_at',
        ]
        read_only_fields = fields


class ServiceabilityCheckSerializer(serializers.Serializer):
    """Input serializer for checking destination pincode serviceability."""
    pincode = serializers.CharField(max_length=10, required=True)
    payment_mode = serializers.ChoiceField(choices=['Prepaid', 'COD'], required=False, default='Prepaid')
    weight_grams = serializers.IntegerField(required=False, default=200, min_value=10, max_value=50000)


class AdminShipmentCreateSerializer(serializers.Serializer):
    """Input serializer for admin-triggered shipment creation."""
    weight_grams = serializers.IntegerField(required=False, default=200, min_value=10, max_value=50000)
    length_cm = serializers.FloatField(required=False, default=10.0, min_value=1.0)
    breadth_cm = serializers.FloatField(required=False, default=10.0, min_value=1.0)
    height_cm = serializers.FloatField(required=False, default=5.0, min_value=1.0)
