"""
Product serializers for Jewels N' Joys API.

These serializers work with plain Python dicts (mock data phase).
When migrating to Django models, replace dict-based approach with
ModelSerializer pointing to your Product model — no API changes needed.
"""

from rest_framework import serializers


class ProductVariantSerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()
    in_stock = serializers.BooleanField()


class ProductShippingSerializer(serializers.Serializer):
    standard = serializers.CharField()
    express = serializers.CharField()
    free_threshold = serializers.IntegerField()


class ProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    price = serializers.IntegerField()
    original_price = serializers.IntegerField(allow_null=True)
    category = serializers.CharField()
    style = serializers.ListField(child=serializers.CharField())
    short_description = serializers.CharField()
    description = serializers.CharField()
    image = serializers.CharField()
    thumbnail = serializers.CharField()
    images = serializers.ListField(child=serializers.CharField())
    variants = ProductVariantSerializer(many=True)
    in_stock = serializers.BooleanField()
    is_featured = serializers.BooleanField()
    is_bestseller = serializers.BooleanField()
    rating = serializers.FloatField()
    review_count = serializers.IntegerField()
    features = serializers.ListField(child=serializers.CharField())
    specifications = serializers.DictField(child=serializers.CharField())
    shipping = ProductShippingSerializer()
    care_instructions = serializers.ListField(child=serializers.CharField())


class ProductListSerializer(serializers.Serializer):
    """Lightweight serializer for product list views."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    price = serializers.IntegerField()
    original_price = serializers.IntegerField(allow_null=True)
    category = serializers.CharField()
    style = serializers.ListField(child=serializers.CharField())
    short_description = serializers.CharField()
    image = serializers.CharField()
    thumbnail = serializers.CharField()
    in_stock = serializers.BooleanField()
    is_featured = serializers.BooleanField()
    is_bestseller = serializers.BooleanField()
    rating = serializers.FloatField()
    review_count = serializers.IntegerField()
    features = serializers.ListField(child=serializers.CharField())


class CategorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    count = serializers.IntegerField()
