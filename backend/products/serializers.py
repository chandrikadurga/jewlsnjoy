"""
Django REST Framework serializers for Jewels N' Joys.
Full ModelSerializers for Category, Product, ProductImage, Order, and OrderItem.
"""

from rest_framework import serializers
from .models import Category, Product, ProductImage, Order, OrderItem


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image_url', 'product_count']

    def get_product_count(self, obj):
        return obj.products.count()


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'angle_number', 'is_primary', 'alt_text']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    image = serializers.CharField(source='primary_image_url', read_only=True)
    thumbnail = serializers.CharField(source='primary_image_url', read_only=True)
    style = serializers.JSONField(source='style_tags', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'price', 'original_price', 'discount_percent',
            'description', 'details', 'style_tags', 'style',
            'in_stock', 'stock_quantity', 'is_featured', 'is_bestseller',
            'primary_image_url', 'image', 'thumbnail', 'images',
            'created_at', 'updated_at',
        ]


class ProductListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    image = serializers.CharField(source='primary_image_url', read_only=True)
    thumbnail = serializers.CharField(source='primary_image_url', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    style = serializers.JSONField(source='style_tags', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'price', 'original_price', 'discount_percent',
            'in_stock', 'stock_quantity', 'is_featured', 'is_bestseller',
            'primary_image_url', 'image', 'thumbnail', 'images', 'style_tags', 'style',
        ]


class AdminProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'price', 'original_price',
            'description', 'details', 'style_tags',
            'in_stock', 'stock_quantity', 'is_featured', 'is_bestseller',
            'primary_image_url',
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'image_url', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'customer_email', 'customer_phone',
            'shipping_address', 'city', 'state', 'postal_code', 'country',
            'total_amount', 'payment_method', 'payment_status', 'status',
            'notes', 'created_at', 'updated_at', 'items',
        ]


class OrderCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=150)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    shipping_address = serializers.CharField()
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20)
    payment_method = serializers.CharField(max_length=50, default='Card')
    items = serializers.ListField(child=serializers.DictField())

    def create(self, validated_data):
        import uuid
        items_data = validated_data.pop('items')
        
        # Calculate total
        total = sum(float(item.get('price', 0)) * int(item.get('quantity', 1)) for item in items_data)
        
        order_num = f"ORD-{uuid.uuid4().hex[:6].upper()}"
        order = Order.objects.create(
            order_number=order_num,
            total_amount=total,
            **validated_data
        )

        for item in items_data:
            prod_id = item.get('id') or item.get('product_id')
            prod = Product.objects.filter(id=prod_id).first() if prod_id else None
            OrderItem.objects.create(
                order=order,
                product=prod,
                product_name=item.get('name', 'Jewellery Item'),
                price=item.get('price', 0),
                quantity=item.get('quantity', 1),
                image_url=item.get('image_url') or (prod.primary_image_url if prod else '/products/1/1.jpeg')
            )
        return order
