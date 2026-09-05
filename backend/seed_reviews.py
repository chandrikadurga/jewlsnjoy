import os
import sys
import random
from datetime import datetime, timedelta

sys.path.insert(0, r'c:\Users\srika\OneDrive\Documents\jewlsnjoy\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from products.models import Product, Review

REVIEWS_TEMPLATES = [
    {
        "author": "Ananya Sharma",
        "title": "Absolutely in love with the shine!",
        "comment": "Exceeded all my expectations! The 18K gold plating has such a warm, rich tone and doesn't look brassy at all. Worn it every day for 2 weeks with zero tarnish.",
        "rating": 5,
    },
    {
        "author": "Priyanka Desai",
        "title": "Waterproof & durable, highly recommend!",
        "comment": "I took this on my beach trip to Goa and wore it swimming. Still looks brand new! The craftsmanship is pristine and the packaging felt so luxurious.",
        "rating": 5,
    },
    {
        "author": "Rhea Kapoor",
        "title": "Stunning design & featherlight",
        "comment": "Got so many compliments at a family wedding! It feels very premium yet lightweight enough that you forget you're wearing it.",
        "rating": 5,
    },
    {
        "author": "Meera Joshi",
        "title": "Elegance defined",
        "comment": "The stones catch the light in the most beautiful subtle way. Very easy to style with both casual ethnic kurtas and western dresses.",
        "rating": 4,
    },
    {
        "author": "Divya Nair",
        "title": "Perfect gift piece",
        "comment": "Bought this as a birthday present for my sister and she was thrilled. The anti-tarnish guarantee gave me total peace of mind.",
        "rating": 5,
    },
]

created_count = 0
for prod in Product.objects.all():
    # create 2 to 4 reviews per product
    num = random.randint(2, 4)
    sample_templates = random.sample(REVIEWS_TEMPLATES, num)
    for t in sample_templates:
        Review.objects.create(
            product=prod,
            author_name=t["author"],
            rating=t["rating"],
            title=t["title"],
            comment=t["comment"],
            is_verified_buyer=True,
            helpful_count=random.randint(4, 28)
        )
        created_count += 1

print(f"Successfully seeded {created_count} reviews across {Product.objects.count()} products!")
