# Verified Purchase Review System

## Overview

The review system is now tied to **verified purchases only**. Customers can only review products they have actually purchased, and orders must be in shipped, out_for_delivery, or delivered status.

---

## Key Features

### ✅ Purchase Verification
- Reviews are linked to actual orders
- Only customers who purchased can review
- Order must be shipped/delivered to be eligible
- Automatic verification badge for verified purchases

### ✅ Duplicate Prevention
- One review per customer per product
- Enforced at database level with unique constraints
- Separate tracking for authenticated users and guest emails

### ✅ Review Moderation
- Admin can approve/disapprove reviews
- Bulk actions for managing multiple reviews
- Review statistics dashboard
- Option to auto-approve or manually moderate

### ✅ Authenticity
- No fake reviews possible
- Customer name pulled from order
- Email verification for guests
- User ID tracking for authenticated users

---

## API Endpoints

### **Public Endpoints**

#### 1. Get Product Reviews
```
GET /api/products/<product_id>/reviews/
```

**Response:**
```json
{
  "reviews": [
    {
      "id": 1,
      "author_name": "John Doe",
      "rating": 5,
      "title": "Excellent quality!",
      "comment": "The product exceeded my expectations...",
      "is_verified_buyer": true,
      "helpful_count": 12,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "statistics": {
    "total": 45,
    "average_rating": 4.6,
    "verified_count": 40,
    "distribution": {
      "5": 30,
      "4": 10,
      "3": 3,
      "2": 1,
      "1": 1
    }
  }
}
```

#### 2. Check Review Eligibility
```
GET /api/reviews/eligibility/<product_id>/
Authorization: Bearer <supabase_jwt_token>
```

**Response (Eligible):**
```json
{
  "eligible": true,
  "order_number": "ORD-ABC123",
  "product": {
    "id": 5,
    "name": "Gold Plated Necklace",
    "image": "/media/products/necklace.jpg"
  }
}
```

**Response (Not Eligible):**
```json
{
  "eligible": false,
  "reason": "No verified purchase found. Order must be shipped or delivered.",
  "hint": "You can only review products you have purchased."
}
```

#### 3. Create a Review

**For Authenticated Users:**
```
POST /api/reviews/create/
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json

{
  "product": 5,
  "rating": 5,
  "title": "Amazing product!",
  "comment": "Loved the quality and finish. Highly recommend!",
  "author_name": "Jane Smith"
}
```

**For Guest Users:**
```
POST /api/reviews/create/
Content-Type: application/json

{
  "product": 5,
  "rating": 4,
  "title": "Good value",
  "comment": "Nice product for the price.",
  "author_name": "Guest User",
  "email": "guest@example.com",
  "order_number": "ORD-ABC123"
}
```

**Success Response:**
```json
{
  "id": 42,
  "product": 5,
  "author_name": "Jane Smith",
  "rating": 5,
  "title": "Amazing product!",
  "comment": "Loved the quality and finish...",
  "is_verified_buyer": true,
  "is_approved": true,
  "created_at": "2026-09-20T14:30:00Z"
}
```

**Error Response (Already Reviewed):**
```json
{
  "error": "You have already reviewed this product",
  "existing_review_id": 35
}
```

**Error Response (Not Purchased):**
```json
{
  "error": "Purchase verification failed. You can only review products you have purchased.",
  "hint": "Order must be shipped or delivered to leave a review"
}
```

#### 4. Update Own Review
```
PUT /api/reviews/<review_id>/
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json

{
  "rating": 5,
  "title": "Updated title",
  "comment": "Updated comment after using it more..."
}
```

#### 5. Delete Own Review
```
DELETE /api/reviews/<review_id>/
Authorization: Bearer <supabase_jwt_token>
```

---

### **Admin Endpoints**

#### 1. Get All Reviews (Admin)
```
GET /api/reviews/admin/
Query Parameters:
  - approval_status: approved | pending
  - verified: true | false
  - product_id: <product_id>
  - search: <search_term>
```

**Response:**
```json
{
  "count": 156,
  "results": [
    {
      "id": 42,
      "product": 5,
      "order": 123,
      "user_id": "user-uuid-123",
      "author_name": "Jane Smith",
      "author_email": "jane@example.com",
      "rating": 5,
      "title": "Great product",
      "comment": "Loved it!",
      "is_verified_buyer": true,
      "is_approved": true,
      "created_at": "2026-09-20T10:00:00Z"
    }
  ]
}
```

#### 2. Get Review Statistics (Admin)
```
GET /api/reviews/admin/stats/
```

**Response:**
```json
{
  "total_reviews": 156,
  "approved_reviews": 150,
  "pending_reviews": 6,
  "verified_reviews": 145,
  "average_rating": 4.62,
  "top_products": [
    {
      "id": 12,
      "name": "Diamond Earrings",
      "avg_rating": 4.9,
      "review_count": 25
    }
  ],
  "recent_reviews": [...]
}
```

#### 3. Update Review (Admin)
```
PATCH /api/reviews/admin/<review_id>/
Content-Type: application/json

{
  "is_approved": true,
  "is_verified_buyer": true,
  "comment": "Edited comment...",
  "title": "Edited title",
  "rating": 4
}
```

#### 4. Delete Review (Admin)
```
DELETE /api/reviews/admin/<review_id>/
```

#### 5. Bulk Actions (Admin)
```
POST /api/reviews/admin/bulk-action/
Content-Type: application/json

{
  "review_ids": [1, 2, 3, 4, 5],
  "action": "approve"  // or "disapprove" or "delete"
}
```

**Response:**
```json
{
  "message": "5 reviews approved successfully"
}
```

---

## Database Schema

### Review Model

```python
class Review(models.Model):
    product = ForeignKey(Product)           # Product being reviewed
    order = ForeignKey(Order, null=True)    # Order that enables review
    user_id = CharField(max_length=64)      # Supabase user ID (if authenticated)
    author_name = CharField(max_length=120) # Display name
    author_email = EmailField()             # Email (for guest verification)
    rating = PositiveSmallIntegerField()    # 1-5 stars
    title = CharField(max_length=200)       # Review title
    comment = TextField()                   # Review content
    is_verified_buyer = BooleanField()      # Verified purchase badge
    is_approved = BooleanField()            # Admin moderation
    helpful_count = PositiveIntegerField()  # Upvote count
    created_at = DateTimeField()
    updated_at = DateTimeField()
    
    # Constraints:
    # - unique_authenticated_user_review: One review per user_id per product
    # - unique_guest_email_review: One review per email per product
```

---

## Integration Guide

### Frontend Implementation

#### 1. Display Reviews on Product Page

```javascript
// Fetch reviews with statistics
const response = await fetch(`/api/products/${productId}/reviews/`);
const { reviews, statistics } = await response.json();

// Display statistics
console.log(`Average: ${statistics.average_rating}⭐`);
console.log(`${statistics.verified_count} verified purchases`);

// Render reviews
reviews.forEach(review => {
  const verifiedBadge = review.is_verified_buyer ? '✓ Verified Purchase' : '';
  // Render review UI
});
```

#### 2. Check if User Can Review

```javascript
// For authenticated users
const checkEligibility = async (productId, token) => {
  const response = await fetch(`/api/reviews/eligibility/${productId}/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  
  if (data.eligible) {
    // Show "Write a Review" button
  } else {
    // Show reason: data.reason
  }
};
```

#### 3. Submit a Review

```javascript
// Authenticated user
const submitReview = async (reviewData, token) => {
  const response = await fetch('/api/reviews/create/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      product: productId,
      rating: 5,
      title: "Great product!",
      comment: "I love this product...",
      author_name: "John Doe"
    })
  });
  
  if (response.ok) {
    const review = await response.json();
    // Show success message
  } else {
    const error = await response.json();
    // Show error: error.error
  }
};

// Guest user with order number
const submitGuestReview = async (reviewData) => {
  const response = await fetch('/api/reviews/create/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      product: productId,
      rating: 4,
      title: "Good product",
      comment: "Worth the purchase",
      author_name: "Guest",
      email: "guest@example.com",
      order_number: "ORD-ABC123"
    })
  });
  
  return await response.json();
};
```

#### 4. Admin Review Management

```javascript
// Get pending reviews
const getPendingReviews = async () => {
  const response = await fetch('/api/reviews/admin/?approval_status=pending');
  const { results } = await response.json();
  return results;
};

// Approve review
const approveReview = async (reviewId) => {
  await fetch(`/api/reviews/admin/${reviewId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_approved: true })
  });
};

// Bulk approve
const bulkApprove = async (reviewIds) => {
  await fetch('/api/reviews/admin/bulk-action/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      review_ids: reviewIds,
      action: 'approve'
    })
  });
};
```

---

## Configuration

### Auto-Approve vs Manual Moderation

In `backend/products/views.py` → `ReviewCreateView`:

```python
# Auto-approve verified purchases
review = Review.objects.create(
    ...
    is_approved=True  # Change to False for manual moderation
)
```

### Order Status Requirements

Currently, reviews are allowed for orders with status:
- `delivered`
- `shipped`
- `out_for_delivery`

To change this, modify the query in `ReviewCreateView`:

```python
verified_order = Order.objects.filter(
    user_id=user_id,
    items__product=product,
    status__in=['delivered']  # Require only delivered orders
).first()
```

---

## Security Features

✅ **No Fake Reviews**: All reviews must be tied to real orders  
✅ **Duplicate Prevention**: Database-level unique constraints  
✅ **Purchase Verification**: Order must be shipped/delivered  
✅ **Email Verification**: Guest reviews verified by order email  
✅ **User Authentication**: JWT token verification for auth users  
✅ **Ownership Control**: Users can only edit/delete their own reviews  
✅ **Admin Moderation**: Optional manual approval before publication  

---

## Migration

The fraudulent `seed_reviews.py` script has been **deleted**.

All existing fake reviews have been **cleared** from the database.

The new system is now live with proper purchase verification! 🎉

---

## Testing

### Test Review Submission

1. **Place an order** as a user
2. **Mark order as delivered** in admin
3. **Try to submit review** - should succeed
4. **Try again** - should fail with "already reviewed" error
5. **Try without purchase** - should fail with "no verified purchase" error

### Test Admin Features

1. View all reviews: `/api/reviews/admin/`
2. Filter pending: `/api/reviews/admin/?approval_status=pending`
3. View stats: `/api/reviews/admin/stats/`
4. Bulk approve: Use bulk-action endpoint

---

## Support

For issues or questions about the review system:
- Email: jewelsnjoy25@gmail.com
- Phone: +91 7251070150
