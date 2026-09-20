# Frontend Review Integration Guide

Quick start guide for integrating the verified purchase review system into your React/Next.js frontend.

---

## 🎯 Quick Integration Checklist

- [ ] Display reviews on product pages
- [ ] Show review statistics (average, count, distribution)
- [ ] Add "Write Review" button (only for verified purchases)
- [ ] Create review submission form
- [ ] Allow users to edit/delete their reviews
- [ ] Build admin review moderation UI

---

## 1️⃣ Display Reviews on Product Page

### Fetch Reviews
```typescript
// lib/api/reviews.ts
export async function getProductReviews(productId: number) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/reviews/`
  );
  return response.json();
}

// Returns:
// {
//   reviews: Review[],
//   statistics: {
//     total: number,
//     average_rating: number,
//     verified_count: number,
//     distribution: { "5": 30, "4": 10, "3": 3, "2": 1, "1": 1 }
//   }
// }
```

### Display Component
```tsx
// components/ProductReviews.tsx
import { Star, CheckCircle } from 'lucide-react';

export default function ProductReviews({ productId }: { productId: number }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getProductReviews(productId).then(setData);
  }, [productId]);

  if (!data) return <div>Loading reviews...</div>;

  const { reviews, statistics } = data;

  return (
    <div className="space-y-6">
      {/* Review Statistics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <div className="text-5xl font-bold">{statistics.average_rating}</div>
          <div>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={i < Math.round(statistics.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                  size={24}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600">
              {statistics.total} reviews • {statistics.verified_count} verified purchases
            </p>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="mt-4 space-y-2">
          {[5, 4, 3, 2, 1].map(rating => (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-8">{rating}★</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{
                    width: `${(statistics.distribution[rating] / statistics.total) * 100}%`
                  }}
                />
              </div>
              <span className="text-sm text-gray-600 w-8">{statistics.distribution[rating]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{review.author_name}</h4>
                  {review.is_verified_buyer && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle size={14} />
                      Verified Purchase
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      size={16}
                    />
                  ))}
                  <span className="text-sm text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.title && (
                  <h5 className="font-medium mt-2">{review.title}</h5>
                )}
                <p className="text-gray-700 mt-2">{review.comment}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 2️⃣ Check Review Eligibility

### API Function
```typescript
// lib/api/reviews.ts
export async function checkReviewEligibility(
  productId: number,
  token: string
) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/reviews/eligibility/${productId}/`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
}

// Returns:
// { eligible: true, order_number: "ORD-ABC123", product: {...} }
// OR
// { eligible: false, reason: "No verified purchase found..." }
```

### Usage in Component
```tsx
// components/WriteReviewButton.tsx
export default function WriteReviewButton({ productId }: { productId: number }) {
  const { user, token } = useAuth(); // Your auth hook
  const [eligibility, setEligibility] = useState(null);

  useEffect(() => {
    if (token) {
      checkReviewEligibility(productId, token).then(setEligibility);
    }
  }, [productId, token]);

  if (!user) {
    return (
      <button onClick={() => router.push('/login')}>
        Sign in to review
      </button>
    );
  }

  if (!eligibility) return null;

  if (!eligibility.eligible) {
    return (
      <div className="text-sm text-gray-500">
        {eligibility.reason}
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push(`/products/${productId}/review`)}
      className="btn-primary"
    >
      Write a Review
    </button>
  );
}
```

---

## 3️⃣ Submit Review Form

### API Function
```typescript
// lib/api/reviews.ts
export async function submitReview(
  reviewData: {
    product: number;
    rating: number;
    title: string;
    comment: string;
    author_name: string;
  },
  token: string
) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/reviews/create/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit review');
  }

  return response.json();
}

// For guest users with order number
export async function submitGuestReview(reviewData: {
  product: number;
  rating: number;
  title: string;
  comment: string;
  author_name: string;
  email: string;
  order_number: string;
}) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/reviews/create/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit review');
  }

  return response.json();
}
```

### Form Component
```tsx
// components/ReviewForm.tsx
export default function ReviewForm({ productId, onSuccess }: Props) {
  const { user, token } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await submitReview({
        product: productId,
        rating,
        title,
        comment,
        author_name: user.name
      }, token);

      toast.success('Review submitted successfully!');
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rating Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => setRating(num)}
              className="focus:outline-none"
            >
              <Star
                className={num <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                size={32}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Review Title (Optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Amazing quality!"
          className="w-full px-4 py-2 border rounded-lg"
          maxLength={200}
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Your Review *
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this product..."
          className="w-full px-4 py-2 border rounded-lg h-32"
          required
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading || !comment}
        className="btn-primary w-full"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
```

---

## 4️⃣ Admin Review Management

### Fetch Admin Reviews
```typescript
// lib/api/admin/reviews.ts
export async function getAdminReviews(filters?: {
  approval_status?: 'approved' | 'pending';
  verified?: 'true' | 'false';
  product_id?: number;
  search?: string;
}) {
  const params = new URLSearchParams(filters as any);
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/reviews/admin/?${params}`,
    {
      headers: {
        // Add admin auth headers
      }
    }
  );
  return response.json();
}

export async function approveReview(reviewId: number) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/reviews/admin/${reviewId}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_approved: true })
    }
  );
  return response.json();
}

export async function bulkApprove(reviewIds: number[]) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/reviews/admin/bulk-action/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        review_ids: reviewIds,
        action: 'approve'
      })
    }
  );
  return response.json();
}

export async function getReviewStats() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/reviews/admin/stats/`
  );
  return response.json();
}
```

### Admin Dashboard Component
```tsx
// app/admin/reviews/page.tsx
export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getReviewStats().then(setStats);
    loadReviews();
  }, [filter]);

  const loadReviews = async () => {
    const filters = filter === 'pending' ? { approval_status: 'pending' } : {};
    const data = await getAdminReviews(filters);
    setReviews(data.results);
  };

  const handleApprove = async (reviewId: number) => {
    await approveReview(reviewId);
    loadReviews();
    toast.success('Review approved!');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Review Management</h1>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_reviews}</div>
              <div className="text-sm text-gray-600">Total Reviews</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending_reviews}
              </div>
              <div className="text-sm text-gray-600">Pending Approval</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.verified_reviews}
              </div>
              <div className="text-sm text-gray-600">Verified Purchases</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-2xl font-bold">{stats.average_rating}⭐</div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
        >
          All Reviews
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? 'btn-primary' : 'btn-secondary'}
        >
          Pending ({stats?.pending_reviews || 0})
        </button>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{review.author_name}</h4>
                  {review.is_verified_buyer && (
                    <span className="text-xs text-green-600">✓ Verified</span>
                  )}
                  <span className="text-sm text-gray-500">
                    {review.rating}⭐
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Product: {review.product_name}
                </p>
                <p className="mt-2">{review.comment}</p>
              </div>
              <div className="flex gap-2">
                {!review.is_approved && (
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="btn-sm btn-success"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => handleDelete(review.id)}
                  className="btn-sm btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎯 Key Points

### ✅ **Always check eligibility before showing "Write Review" button**
### ✅ **Display verified purchase badges prominently**
### ✅ **Show helpful error messages (e.g., "Purchase this product to review")**
### ✅ **Add loading states for better UX**
### ✅ **Toast notifications for success/error feedback**

---

## 🔐 Security Notes

- Always send Supabase JWT token in Authorization header for authenticated requests
- Never trust client-side eligibility checks - server validates everything
- Guest reviews require order_number + email for verification
- Admin endpoints should have proper authentication/authorization

---

## 📝 Type Definitions

```typescript
// types/review.ts
export interface Review {
  id: number;
  product: number;
  order: number | null;
  user_id: string;
  author_name: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_buyer: boolean;
  is_approved: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewStatistics {
  total: number;
  average_rating: number;
  verified_count: number;
  distribution: {
    "5": number;
    "4": number;
    "3": number;
    "2": number;
    "1": number;
  };
}

export interface ReviewEligibility {
  eligible: boolean;
  reason?: string;
  hint?: string;
  order_number?: string;
  product?: {
    id: number;
    name: string;
    image: string;
  };
}
```

---

## 🚀 Done!

You now have everything you need to integrate the verified purchase review system into your frontend. Happy coding! 🎉
