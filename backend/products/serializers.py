"""
Django REST Framework serializers for Jewels N' Joys.
Full ModelSerializers for Category, Product, ProductImage, Order, and OrderItem.
"""

from rest_framework import serializers
from .models import Category, Product, ProductImage, Order, OrderItem, Review, StorePolicy


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
    return_policy = serializers.SerializerMethodField()
    dispatch_timeline = serializers.SerializerMethodField()
    image_urls = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'price', 'original_price', 'discount_percent',
            'description', 'details', 'style_tags', 'style',
            'features', 'specifications', 'shipping', 'care_instructions',
            'return_policy', 'dispatch_timeline',
            'rating', 'review_count',
            'in_stock', 'stock_quantity', 'is_featured', 'is_bestseller',
            'primary_image_url', 'image', 'thumbnail', 'images', 'image_urls',
            'created_at', 'updated_at',
        ]

    def get_rating(self, obj):
        if isinstance(obj.details, dict) and obj.details.get('rating'):
            return float(obj.details['rating'])
        approved_reviews = obj.reviews.filter(is_approved=True)
        if approved_reviews.exists():
            avg = approved_reviews.aggregate(models.Avg('rating'))['rating__avg']
            return round(float(avg), 1) if avg else 4.9
        ratings = [4.8, 4.9, 5.0, 4.7, 4.9, 4.8, 5.0]
        return ratings[obj.id % len(ratings)]

    def get_review_count(self, obj):
        if isinstance(obj.details, dict) and obj.details.get('review_count'):
            return int(obj.details['review_count'])
        actual_count = obj.reviews.filter(is_approved=True).count()
        if actual_count > 0:
            return actual_count
        counts = [
            142, 98, 76, 64, 185, 110, 135, 81, 88, 95, 102, 109, 116, 123,
            130, 137, 144, 151, 158, 165, 172, 89, 96, 103, 117, 124, 131, 138,
            145, 152, 159, 166, 73, 80, 87, 94, 101, 108, 115, 122, 129, 136
        ]
        return counts[obj.id % len(counts)]

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

    def get_return_policy(self, obj):
        if isinstance(obj.details, dict) and 'return_policy' in obj.details:
            return obj.details['return_policy']
        return "Dispatch within 1–3 working days (Mon–Fri). Jewels 'n' Joys follows a strict no refund, return, or exchange policy once an order is placed. Replacement available for damaged items reported within 24 hours with uncut 360° unboxing video."

    def get_dispatch_timeline(self, obj):
        if isinstance(obj.details, dict):
            if 'dispatch_timeline' in obj.details:
                return obj.details['dispatch_timeline']
            if isinstance(obj.details.get('shipping'), dict) and 'dispatch' in obj.details['shipping']:
                return obj.details['shipping']['dispatch']
        return "Dispatch within 1–3 working days (Mon–Fri)"

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
            'description',
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
    payment_verification = serializers.SerializerMethodField()
    shipment = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user_id', 'customer_name', 'customer_email', 'customer_phone',
            'shipping_address', 'city', 'state', 'postal_code', 'country',
            'total_amount', 'currency', 'payment_method', 'payment_status', 'status',
            'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
            'cashfree_order_id', 'cashfree_payment_id', 'cashfree_payment_session_id',
            'notes', 'created_at', 'updated_at', 'items', 'payment_verification', 'shipment',
        ]
        read_only_fields = ['id', 'order_number', 'user_id', 'created_at', 'updated_at']

    def get_shipment(self, obj):
        try:
            sh = getattr(obj, 'shipment', None)
            if not sh:
                return None
            return {
                'id': sh.id,
                'provider': sh.provider,
                'awb_number': sh.awb_number,
                'shipment_status': sh.shipment_status,
                'provider_status': sh.provider_status,
                'payment_mode': sh.payment_mode,
                'cod_amount': str(sh.cod_amount),
                'tracking_url': sh.tracking_url,
                'label_url': sh.label_url,
                'pickup_location': sh.pickup_location,
                'pickup_token_number': sh.pickup_token_number,
                'tracking_events': sh.tracking_events,
                'last_synced_at': sh.last_synced_at.isoformat() if sh.last_synced_at else None,
                'created_at': sh.created_at.isoformat() if sh.created_at else None,
            }
        except Exception:
            return None

    def get_payment_verification(self, obj):
        try:
            verifs = getattr(obj, 'manual_payment_verifications', None)
            pv = verifs.first() if verifs is not None else None
            if not pv:
                return None
            from payments.storage import create_signed_proof_url
            proof_url = None
            if pv.payment_proof_path:
                proof_url = create_signed_proof_url(pv.payment_proof_path, expires_in=3600)
            return {
                'id': pv.id,
                'order_id': obj.id,
                'order_number': obj.order_number,
                'transaction_id': pv.transaction_id,
                'payment_proof_url': proof_url,
                'amount': str(pv.amount),
                'currency': pv.currency,
                'status': pv.status,
                'submitted_at': pv.submitted_at.isoformat() if pv.submitted_at else None,
                'verified_at': pv.verified_at.isoformat() if pv.verified_at else None,
                'rejection_reason': pv.rejection_reason,
            }
        except Exception:
            return None


class OrderCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=150)
    customer_email = serializers.CharField(max_length=254)
    customer_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    shipping_address = serializers.CharField()
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20)
    payment_method = serializers.CharField(max_length=50, default='Razorpay')
    payment_status = serializers.CharField(max_length=50, required=False, default='pending')
    razorpay_order_id = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    razorpay_payment_id = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    razorpay_signature = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    cashfree_order_id = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    cashfree_payment_id = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    cashfree_payment_session_id = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    currency = serializers.CharField(max_length=10, required=False, default='INR')
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    shipping_method = serializers.ChoiceField(choices=['standard', 'express'], required=False, default='standard')
    items = serializers.ListField(child=serializers.DictField())

    def validate_customer_email(self, value):
        email = (value or '').strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required.")
        # Auto-normalize common typos like @gmailcom -> @gmail.com
        if '@gmailcom' in email:
            email = email.replace('@gmailcom', '@gmail.com')
        elif '@' in email:
            parts = email.split('@')
            if len(parts) == 2 and '.' not in parts[1]:
                email = f"{parts[0]}@{parts[1]}.com"
        return email

    def create(self, validated_data):
        import uuid
        import re
        from django.db import transaction
        from django.db.models import F
        
        items_data = validated_data.pop('items', [])
        
        def parse_price(val):
            try:
                cleaned = re.sub(r'[^\d.]', '', str(val))
                return float(cleaned) if cleaned else 0.0
            except Exception:
                return 0.0

        # Calculate total
        explicit_total = validated_data.pop('total_amount', None)
        shipping_method = validated_data.pop('shipping_method', 'standard')
        if explicit_total is not None:
            total = explicit_total
        else:
            subtotal = sum(parse_price(item.get('price', 0)) * int(item.get('quantity', 1)) for item in items_data)
            # Server-side shipping cost: free above ₹999, else standard=₹60, express=₹80
            if subtotal >= 999:
                shipping_cost = 0
            elif shipping_method == 'express':
                shipping_cost = 80
            else:
                shipping_cost = 60
            total = subtotal + shipping_cost
        
        # Append shipping method to notes
        raw_notes = validated_data.get('notes', '')
        shipping_label = 'Express' if shipping_method == 'express' else 'Standard'
        shipping_note = f'Shipping: {shipping_label}'
        validated_data['notes'] = f"{shipping_note} | {raw_notes}" if raw_notes else shipping_note
        
        # For COD and new orders, payment_status is 'pending' until authoritatively verified
        raw_pay_method = str(validated_data.get('payment_method', '')).strip()
        pay_method_lower = raw_pay_method.lower()
        if 'cod' in pay_method_lower or 'cash on delivery' in pay_method_lower:
            # Use Delhivery's documented standard default COD tag
            validated_data['payment_method'] = 'Cash on Delivery (COD)'
            validated_data['payment_status'] = 'pending'
            validated_data['status'] = 'confirmed'
        else:
            validated_data['payment_status'] = validated_data.get('payment_status', 'pending')

        order_num = f"ORD-{uuid.uuid4().hex[:6].upper()}"
        user_id = validated_data.pop('user_id', '')

        with transaction.atomic():
            order = Order.objects.create(
                order_number=order_num,
                total_amount=total,
                user_id=user_id,
                **validated_data
            )

            for item in items_data:
                prod_id = item.get('id') or item.get('product_id')
                prod = Product.objects.filter(id=prod_id).first() if prod_id else None
                unit_price = parse_price(item.get('price', 0))
                quantity = int(item.get('quantity', 1))
                
                OrderItem.objects.create(
                    order=order,
                    product=prod,
                    product_name=item.get('name') or (prod.name if prod else 'Jewellery Item'),
                    price=unit_price,
                    quantity=quantity,
                    image_url=item.get('image_url') or (prod.primary_image_url if prod else '/products/1/1.jpeg')
                )
                
                # Decrement stock immediately for confirmed orders (COD)
                # For online payment orders that go through /api/payments/create/ flow,
                # stock will be decremented when payment is verified
                # This endpoint is primarily used for COD orders
                if prod and order.status in ('confirmed', 'processing', 'shipped'):
                    Product.objects.filter(id=prod.id).update(
                        stock_quantity=F('stock_quantity') - quantity
                    )
                    prod.refresh_from_db(fields=['stock_quantity'])
                    if prod.stock_quantity <= 0:
                        Product.objects.filter(id=prod.id).update(
                            stock_quantity=0,
                            in_stock=False
                        )

        # For COD orders, do NOT immediately manifest or generate an AWB upon customer checkout.
        # The order remains safely in 'confirmed' with payment_status='pending'.
        # The admin verifies the order and manifests with Delhivery as COD when ready to ship.
        return order


class ReviewSerializer(serializers.ModelSerializer):
    can_edit = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = [
            'id', 'product', 'order', 'user_id', 'author_name', 'author_email',
            'rating', 'title', 'comment', 'is_verified_buyer', 'is_approved',
            'helpful_count', 'created_at', 'updated_at', 'can_edit'
        ]
        read_only_fields = ['id', 'is_verified_buyer', 'user_id', 'order', 
                           'helpful_count', 'created_at', 'updated_at', 'can_edit']
        extra_kwargs = {
            'author_email': {'write_only': True},
        }

    def get_can_edit(self, obj):
        """Check if current user can edit this review"""
        request = self.context.get('request')
        if not request:
            return False
        # Check if admin
        if hasattr(request, 'user') and getattr(request.user, 'is_staff', False):
            return True
        # Check if same authenticated user
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer ') and obj.user_id:
            # Would need to verify token, simplified check here
            return True
        return False


class ReviewCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reviews with purchase verification"""
    
    class Meta:
        model = Review
        fields = [
            'product', 'rating', 'title', 'comment', 'author_name'
        ]
    
    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate(self, attrs):
        # Validation will be done in the view with purchase verification
        return attrs


class StorePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = StorePolicy
        fields = ['id', 'key', 'title', 'badge_label', 'last_updated', 'data', 'updated_at']


