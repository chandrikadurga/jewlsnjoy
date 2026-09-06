"""
Management command to seed initial products, images, and sample orders
from mock_data.py into the SQLite database.
Usage:
    python manage.py seed_catalog
"""

import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from products.models import Category, Product, ProductImage, Order, OrderItem
from products.mock_data import PRODUCTS, CATEGORIES


class Command(BaseCommand):
    help = 'Seeds database with categories, products, multi-angle images, and sample orders'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Beginning database seeding...'))

        # 1. Seed Categories
        category_map = {}
        for cat_data in CATEGORIES:
            cat, _ = Category.objects.update_or_create(
                slug=cat_data['slug'],
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data.get('description', ''),
                    'image_url': f"/products/{1 if cat_data['slug']=='necklaces' else 2}/1.jpeg",
                }
            )
            category_map[cat.name] = cat
            self.stdout.write(f"  Category: {cat.name}")

        # 2. Seed Products and ProductImages
        created_products = []
        for p_data in PRODUCTS:
            cat = category_map.get(p_data.get('category'))
            p_id = p_data['id']
            primary_url = f"/products/{p_id}/1.jpeg"

            existing = Product.objects.filter(id=p_id).first()
            if existing:
                existing.name = p_data['name']
                existing.category = cat
                existing.price = p_data['price']
                if p_data.get('original_price'):
                    existing.original_price = p_data['original_price']
                existing.description = p_data.get('description', existing.description)
                existing.primary_image_url = primary_url
                existing.save()
                prod = existing
            else:
                prod = Product.objects.create(
                    id=p_id,
                    name=p_data['name'],
                    slug=p_data.get('slug', f"product-{p_id}"),
                    category=cat,
                    price=p_data['price'],
                    original_price=p_data.get('original_price'),
                    description=p_data.get('description', ''),
                    details=p_data.get('details', {}),
                    style_tags=p_data.get('style', []),
                    in_stock=p_data.get('in_stock', True),
                    stock_quantity=random.randint(10, 45),
                    is_featured=p_data.get('is_featured', False),
                    is_bestseller=p_data.get('is_bestseller', False),
                    primary_image_url=primary_url,
                )
            created_products.append(prod)

            # Clear and rebuild images
            prod.images.all().delete()
            raw_images = p_data.get('images', [])
            if raw_images:
                for idx, img_val in enumerate(raw_images):
                    angle = idx + 1
                    if isinstance(img_val, dict):
                        angle = img_val.get('angle_number', angle)
                        url = img_val.get('image_url', f"/products/{p_id}/{angle}.jpeg")
                    else:
                        url = f"/products/{p_id}/{angle}.jpeg"
                    ProductImage.objects.create(
                        product=prod,
                        image_url=url,
                        angle_number=angle,
                        is_primary=(angle == 1),
                        alt_text=f"{prod.name} angle {angle}",
                    )
            else:
                # Default 3 angles
                for angle in range(1, 4):
                    ProductImage.objects.create(
                        product=prod,
                        image_url=f"/products/{p_id}/{angle}.jpeg",
                        angle_number=angle,
                        is_primary=(angle == 1),
                        alt_text=f"{prod.name} angle {angle}",
                    )

            self.stdout.write(f"  Product #{prod.id}: {prod.name} ({prod.images.count()} angles)")

        # 3. Seed Sample Orders
        Order.objects.filter(order_number__startswith='ORD-1094').delete()
        now = timezone.now()
        demo_orders = [
            {
                'order_number': 'ORD-10941',
                'customer_name': 'Aarav Mehta',
                'customer_email': 'aarav.mehta@example.com',
                'customer_phone': '+91 98201 44321',
                'shipping_address': 'Flat 402, Royal Palms, Bandra West',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'postal_code': '400050',
                'status': 'delivered',
                'payment_method': 'UPI',
                'created_at': now - timedelta(days=6),
                'items': [
                    (created_products[0], 1),  # Emerald Luxe Tennis
                    (created_products[1], 1),  # Midnight Heart
                ],
            },
            {
                'order_number': 'ORD-10942',
                'customer_name': 'Pooja Sharma',
                'customer_email': 'pooja.sharma@example.com',
                'customer_phone': '+91 97110 88912',
                'shipping_address': '74/B Defence Colony, Near Market',
                'city': 'New Delhi',
                'state': 'Delhi',
                'postal_code': '110024',
                'status': 'shipped',
                'payment_method': 'Credit Card',
                'created_at': now - timedelta(days=3),
                'items': [
                    (created_products[2], 2),  # Royal Crown Pink Crystal
                ],
            },
            {
                'order_number': 'ORD-10943',
                'customer_name': 'Rhea Kapoor',
                'customer_email': 'rhea.k@example.com',
                'customer_phone': '+91 99402 12345',
                'shipping_address': '12 Anna Nagar East',
                'city': 'Chennai',
                'state': 'Tamil Nadu',
                'postal_code': '600102',
                'status': 'processing',
                'payment_method': 'Net Banking',
                'created_at': now - timedelta(days=1),
                'items': [
                    (created_products[5], 1),  # Emerald Square Layered Duo
                ],
            },
            {
                'order_number': 'ORD-10944',
                'customer_name': 'Vikram Rathore',
                'customer_email': 'vikram.r@example.com',
                'customer_phone': '+91 94140 55678',
                'shipping_address': 'C-19 Malviya Nagar',
                'city': 'Jaipur',
                'state': 'Rajasthan',
                'postal_code': '302017',
                'status': 'pending',
                'payment_method': 'Cash on Delivery',
                'created_at': now - timedelta(hours=8),
                'items': [
                    (created_products[3], 1),  # Onyx Solitaire
                    (created_products[6], 1),  # Emerald Sovereign Choker
                ],
            },
            {
                'order_number': 'ORD-10945',
                'customer_name': 'Ananya Sen',
                'customer_email': 'ananya.sen@example.com',
                'customer_phone': '+91 98305 99120',
                'shipping_address': 'Tower 3, Apt 1104, South City',
                'city': 'Kolkata',
                'state': 'West Bengal',
                'postal_code': '700068',
                'status': 'pending',
                'payment_method': 'UPI',
                'created_at': now - timedelta(hours=2),
                'items': [
                    (created_products[4], 1),  # Reversible Four-Leaf Clover
                ],
            },
        ]

        for o_data in demo_orders:
            items_data = o_data.pop('items')
            created_date = o_data.pop('created_at')

            total = sum(p.price * qty for p, qty in items_data)
            order = Order.objects.create(
                **o_data,
                total_amount=total
            )
            # Overwrite auto_now_add with simulated past date
            Order.objects.filter(id=order.id).update(created_at=created_date)

            for prod, qty in items_data:
                OrderItem.objects.create(
                    order=order,
                    product=prod,
                    product_name=prod.name,
                    price=prod.price,
                    quantity=qty,
                    image_url=prod.primary_image_url
                )

            self.stdout.write(f"  Order #{order.order_number} for {order.customer_name} (Rs.{total})")

        self.stdout.write(self.style.SUCCESS('Database seeding completed successfully!'))
