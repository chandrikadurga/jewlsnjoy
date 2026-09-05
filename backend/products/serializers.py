"""
Django REST Framework serializers for Jewels N' Joys.
Full ModelSerializers for Category, Product, ProductImage, Order, and OrderItem.
"""

from rest_framework import serializers
from .models import Category, Product, ProductImage, Order, OrderItem, Review


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
    category = serializers.CharField(source='category.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    image = serializers.CharField(source='primary_image_url', read_only=True)
    thumbnail = serializers.CharField(source='primary_image_url', read_only=True)
    style = serializers.JSONField(source='style_tags', read_only=True)
    features = serializers.SerializerMethodField()
    specifications = serializers.SerializerMethodField()
    shipping = serializers.SerializerMethodField()
    care_instructions = serializers.SerializerMethodField()
    image_urls = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'price', 'original_price', 'discount_percent',
            'description', 'details', 'style_tags', 'style',
            'features', 'specifications', 'shipping', 'care_instructions',
            'in_stock', 'stock_quantity', 'is_featured', 'is_bestseller',
            'primary_image_url', 'image', 'thumbnail', 'images', 'image_urls',
            'created_at', 'updated_at',
        ]

    def get_features(self, obj):
        if isinstance(obj.details, dict) and 'features' in obj.details:
            return obj.details['features']
        return ["Anti-tarnish", "Waterproof", "PVD Plated", "18K Gold Plated"]

    def get_specifications(self, obj):
        if isinstance(obj.details, dict) and 'specifications' in obj.details:
            return obj.details['specifications']
        return {
            "Material": "Titanium Stainless Steel",
            "Finish": "18K Gold Color Plated",
            "Plating": "Long-lasting PVD Plated",
            "Features": "Anti-tarnish, Waterproof, Quality Guarantee"
        }

    def get_shipping(self, obj):
        if isinstance(obj.details, dict) and 'shipping' in obj.details:
            return obj.details['shipping']
        return {"standard": "6 to 8 days", "express": "3 to 4 days", "free_threshold": 999}

    def get_care_instructions(self, obj):
        if isinstance(obj.details, dict) and 'care_instructions' in obj.details:
            return obj.details['care_instructions']
        return [
            "Avoid direct contact with harsh perfumes and chemicals.",
            "Store in the provided jewellery pouch when not in use.",
            "Clean gently with a soft dry cloth."
        ]

    def get_image_urls(self, obj):
        urls = [img.image_url for img in obj.images.all()]
        if not urls:
            urls = [obj.primary_image_url or f"/products/{obj.id}/1.jpeg"]
        return urls


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
            'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
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
    payment_method = serializers.CharField(max_length=50, default='UPI / Card')
    payment_status = serializers.CharField(max_length=50, required=False, default='Pending')
    razorpay_order_id = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    razorpay_payment_id = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    razorpay_signature = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    items = serializers.ListField(child=serializers.DictField())

    def create(self, validated_data):
        import uuid
        items_data = validated_data.pop('items')
        
        # Calculate total
        total = sum(float(item.get('price', 0)) * int(item.get('quantity', 1)) for item in items_data)
        
        # Determine payment status
        if validated_data.get('razorpay_payment_id'):
            validated_data['payment_status'] = 'Paid'

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


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            'id', 'product', 'author_name', 'rating', 'title',
            'comment', 'is_verified_buyer', 'helpful_count', 'created_at'
        ]
        read_only_fields = ['id', 'is_verified_buyer', 'helpful_count', 'created_at']

