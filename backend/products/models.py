"""
Database models for Jewels N' Joys.
Includes Category, Product, ProductImage (multi-angle photography), Order, and OrderItem.
"""

from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    image_url = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    category = models.ForeignKey(
        Category,
        related_name='products',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    description = models.TextField(blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    style_tags = models.JSONField(default=list, blank=True)
    
    in_stock = models.BooleanField(default=True)
    stock_quantity = models.PositiveIntegerField(default=25)
    is_featured = models.BooleanField(default=False)
    is_bestseller = models.BooleanField(default=False)
    
    # Primary image shortcut
    primary_image_url = models.CharField(max_length=500, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        # When stock_quantity is 0 or in_stock is False, keep them synchronized
        if self.stock_quantity == 0:
            self.in_stock = False
        elif not self.in_stock:
            self.stock_quantity = 0

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def discount_percent(self):
        if self.original_price and self.original_price > self.price:
            return round(((self.original_price - self.price) / self.original_price) * 100)
        return 0


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        related_name='images',
        on_delete=models.CASCADE
    )
    image_url = models.CharField(max_length=500)
    angle_number = models.PositiveSmallIntegerField(default=1)
    is_primary = models.BooleanField(default=False)
    alt_text = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['angle_number', 'id']

    def __str__(self):
        return f"{self.product.name} - Angle {self.angle_number}"


class Order(models.Model):
    STATUS_CHOICES = [
        ('order_placed', 'Order Placed'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('pending', 'Pending'),  # backward compatibility
    ]

    order_number = models.CharField(max_length=50, unique=True)
    user_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
    customer_name = models.CharField(max_length=150)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=30, blank=True, default='')
    
    shipping_address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, default='')
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='India')

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    ]

    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    payment_method = models.CharField(max_length=50, default='Cashfree')
    payment_status = models.CharField(max_length=50, choices=PAYMENT_STATUS_CHOICES, default='pending')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='order_placed')
    
    cashfree_order_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    cashfree_payment_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    cashfree_payment_session_id = models.CharField(max_length=255, blank=True, default='')

    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.order_number} - {self.customer_name}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        related_name='items',
        on_delete=models.CASCADE
    )
    product = models.ForeignKey(
        Product,
        related_name='order_items',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    product_name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image_url = models.CharField(max_length=500, blank=True, default='')

    def __str__(self):
        return f"{self.quantity}x {self.product_name} in #{self.order.order_number}"

    @property
    def subtotal(self):
        return self.price * self.quantity


class Review(models.Model):
    product = models.ForeignKey(
        Product,
        related_name='reviews',
        on_delete=models.CASCADE
    )
    author_name = models.CharField(max_length=120)
    rating = models.PositiveSmallIntegerField(default=5)
    title = models.CharField(max_length=200, blank=True, default='')
    comment = models.TextField()
    is_verified_buyer = models.BooleanField(default=True)
    helpful_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating}★ by {self.author_name} on {self.product.name}"

