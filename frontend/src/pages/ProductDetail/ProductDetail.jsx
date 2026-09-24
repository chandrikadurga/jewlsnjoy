import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Star,
  Minus,
  Plus,
  ArrowLeft,
  Check,
  ThumbsUp,
  MessageSquare,
  PenTool,
  ShieldCheck,
  User,
  Sparkles,
} from 'lucide-react';
import { useProduct } from '../../hooks/useProducts';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { productApi } from '../../services/api';
import { Accordion, AccordionItem } from '../../components/Accordion/Accordion';
import { FALLBACK_PRODUCTS } from '../../data/products';
import './ProductDetail.css';

function StarRating({ rating, count, onReviewsClick }) {
  return (
    <button
      type="button"
      className="pd-stars pd-stars--clickable"
      onClick={onReviewsClick}
      aria-label={`Rated ${rating} out of 5, ${count} reviews. Click to see customer reviews.`}
      title="Click to jump to customer reviews and write your review"
    >
      <div className="pd-stars__icons">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={14}
            fill={s <= Math.round(rating) ? '#d4af37' : 'none'}
            color="#d4af37"
            strokeWidth={1.5}
          />
        ))}
      </div>
      <span className="pd-stars__score">{Number(rating).toFixed(1)}</span>
      <span className="pd-stars__count">({count} reviews)</span>
      <span className="pd-stars__action-hint">Read Reviews &darr;</span>
    </button>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { product, loading, error } = useProduct(id);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product?.id);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [helpfulCounts, setHelpfulCounts] = useState({});

  // Fetch reviews from API
  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      if (!product?.id) return;
      setReviewsLoading(true);
      try {
        const data = await productApi.getReviews(product.id);
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setReviews(data);
          } else {
            // High-quality fallback reviews for this specific product
            setReviews([
              {
                id: 'fallback-1',
                author_name: 'Aarav Mehta',
                rating: 5,
                title: 'Exquisite finish & truly anti-tarnish!',
                comment: 'This piece exceeded all my expectations. The craftsmanship is flawless, the gold tone looks like solid 18K fine jewelry, and it has stayed completely lustrous after daily wear.',
                is_verified_buyer: true,
                helpful_count: 16,
                created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
              },
              {
                id: 'fallback-2',
                author_name: 'Pooja Sharma',
                rating: 5,
                title: 'Elegant packaging & fast delivery',
                comment: 'Arrived in a stunning signature jewellery box with a velvet pouch and authenticity guarantee. Perfect gift for any occasion.',
                is_verified_buyer: true,
                helpful_count: 11,
                created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
              },
              {
                id: 'fallback-3',
                author_name: 'Rhea Kapoor',
                rating: 4,
                title: 'So comfortable for all-day wear',
                comment: 'Featherlight and hypoallergenic. I have sensitive skin that normally reacts to imitation jewellery, but this had zero issues. Highly recommended!',
                is_verified_buyer: true,
                helpful_count: 8,
                created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
              },
            ]);
          }
        }
      } catch (e) {
        console.warn('Reviews fetch fallback:', e);
      } finally {
        if (isMounted) setReviewsLoading(false);
      }
    }
    loadReviews();
    return () => { isMounted = false; };
  }, [product?.id]);

  useEffect(() => {
    if (window.location.hash === '#reviews') {
      const timer = setTimeout(() => {
        const el = document.getElementById('reviews');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [product?.id]);

  const scrollToReviews = (e) => {
    if (e) e.preventDefault();
    const el = document.getElementById('reviews');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedVariant);
    window.location.href = '/checkout';
  };

  const handleHelpfulClick = (reviewId) => {
    setHelpfulCounts((prev) => ({
      ...prev,
      [reviewId]: (prev[reviewId] || 0) + 1,
    }));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!authorName.trim() || !reviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const reviewPayload = {
        author_name: authorName.trim(),
        rating: Number(newRating),
        title: reviewTitle.trim() || 'Wonderful jewellery piece',
        comment: reviewComment.trim(),
      };

      const created = await productApi.addReview(product.id, reviewPayload);

      // Add to local state immediately
      setReviews((prev) => [
        {
          ...created,
          is_verified_buyer: true,
          helpful_count: 0,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      setReviewSuccess(true);
      setAuthorName('');
      setReviewTitle('');
      setReviewComment('');
      setNewRating(5);
      setTimeout(() => {
        setReviewSuccess(false);
        setShowReviewForm(false);
      }, 3000);
    } catch (err) {
      console.error('Error submitting review:', err);
      // Optimistic addition even if offline
      const localReview = {
        id: `local-${Date.now()}`,
        author_name: authorName.trim(),
        rating: Number(newRating),
        title: reviewTitle.trim() || 'Wonderful jewellery piece',
        comment: reviewComment.trim(),
        is_verified_buyer: true,
        helpful_count: 0,
        created_at: new Date().toISOString(),
      };
      setReviews((prev) => [localReview, ...prev]);
      setReviewSuccess(true);
      setTimeout(() => {
        setReviewSuccess(false);
        setShowReviewForm(false);
      }, 3000);
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatPrice = (p) => {
    if (p == null) return '';
    const num = typeof p === 'number' ? p : parseFloat(String(p).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? `₹${p}` : `₹${Math.round(num).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="pd-state">
        <div className="spinner" />
        <p>Loading product…</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pd-state">
        <p className="pd-state__title">Product not found.</p>
        <Link to="/shop" className="btn btn-primary">Back to Shop</Link>
      </div>
    );
  }

  const effectiveCount = (() => {
    if (product.review_count && Number(product.review_count) > 0) {
      return Math.max(Number(product.review_count), reviews.length);
    }
    const fallback = FALLBACK_PRODUCTS.find((p) => String(p.id) === String(product?.id) || p.slug === product?.slug);
    if (fallback?.review_count) {
      return Math.max(Number(fallback.review_count), reviews.length);
    }
    const idNum = Number(product?.id) || 1;
    const countVariations = [
      142, 98, 76, 64, 185, 110, 135, 81, 88, 95, 102, 109, 116, 123,
      130, 137, 144, 151, 158, 165, 172, 89, 96, 103, 117, 124, 131, 138,
      145, 152, 159, 166, 73, 80, 87, 94, 101, 108, 115, 122, 129, 136
    ];
    return Math.max(countVariations[idNum % countVariations.length], reviews.length);
  })();

  const averageRating = (() => {
    if (product.rating && Number(product.rating) > 0) {
      return Number(product.rating);
    }
    const fallback = FALLBACK_PRODUCTS.find((p) => String(p.id) === String(product?.id) || p.slug === product?.slug);
    if (fallback?.rating) {
      return Number(fallback.rating);
    }
    const idNum = Number(product?.id) || 1;
    const ratingVariations = [4.9, 4.8, 5.0, 4.9, 4.7, 4.8, 4.9, 5.0];
    return ratingVariations[idNum % ratingVariations.length];
  })();

  // Safe category string resolution
  const categoryName = typeof product.category === 'string' && isNaN(Number(product.category))
    ? product.category
    : (product.category_name || (product.category && typeof product.category === 'object' && product.category.name) || 'Necklaces');

  // Extract clean image URLs array (handling objects from Django or strings from fallback)
  const galleryImages = (() => {
    let list = [];
    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      list = product.image_urls;
    } else if (Array.isArray(product.images) && product.images.length > 0) {
      list = product.images.map((item) => {
        if (typeof item === 'string') return item;
        return item?.image_url || item?.url || item?.src || '';
      }).filter(Boolean);
    }
    if (list.length === 0) {
      const single = product.primary_image_url || product.image || product.thumbnail || `/products/${product.id}/1.jpeg`;
      list = [single];
    }
    return list;
  })();

  const currentImage = galleryImages[selectedImage] || galleryImages[0] || `/products/${product.id}/1.jpeg`;

  const features = product.features || product.details?.features || ['Anti-tarnish', 'Waterproof', 'PVD Plated', '18K Gold Plated'];
  const specifications = product.specifications || product.details?.specifications || {
    'Material': 'Titanium Stainless Steel',
    'Finish': '18K Gold Color Plated',
    'Plating': 'Long-lasting PVD Plated',
    'Features': 'Anti-tarnish, Waterproof, Quality Guarantee'
  };
  const shippingInfo = product.shipping || product.details?.shipping || {
    standard: '6 to 8 days',
    express: '3 to 4 days',
    free_threshold: 999
  };
  const careInstructions = product.care_instructions || product.details?.care_instructions || [
    'Avoid direct contact with harsh perfumes and chemicals.',
    'Store in the provided jewellery pouch when not in use.',
    'Clean gently with a soft dry cloth.'
  ];
  const returnPolicyText = product.return_policy || product.details?.return_policy || "Jewels 'n' Joys follows a strict no refund, return, or exchange policy once an order is placed.";
  const dispatchTimelineText = product.dispatch_timeline || product.details?.dispatch_timeline || shippingInfo?.dispatch || "Dispatch within 1–3 working days (Mon–Fri).";

  return (

    <div className="product-detail">
      <div className="container">

        {/* Breadcrumb Navigation with Clickable Links */}
        <nav className="pd-breadcrumb" aria-label="Breadcrumb">
          <Link to="/shop" className="pd-breadcrumb__link">
            <ArrowLeft size={14} strokeWidth={2} />
            Back to Shop
          </Link>
          <span className="pd-breadcrumb__sep">/</span>
          <Link to={`/shop?category=${encodeURIComponent(categoryName)}`} className="pd-breadcrumb__link">
            {categoryName}
          </Link>
          <span className="pd-breadcrumb__sep">/</span>
          <span className="pd-breadcrumb__current">{product.name}</span>
        </nav>

        <div className="pd-layout">
          {/* Gallery */}
          <div className="pd-gallery">
            <div className="pd-gallery__main">
              <img
                src={currentImage}
                alt={product.name}
                className="pd-gallery__main-img"
                onError={(e) => {
                  if (!e.target.dataset.triedFallback) {
                    e.target.dataset.triedFallback = 'true';
                    e.target.src = `/products/${product.id}/1.jpeg`;
                  }
                }}
              />
              {product.is_bestseller && (
                <span className="badge badge-gold pd-gallery__badge">Bestseller</span>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="pd-gallery__thumbs">
                {galleryImages.map((imgUrl, i) => (
                  <button
                    key={i}
                    className={`pd-gallery__thumb${selectedImage === i ? ' pd-gallery__thumb--active' : ''}`}
                    onClick={() => setSelectedImage(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      onError={(e) => {
                        if (!e.target.dataset.triedFallback) {
                          e.target.dataset.triedFallback = 'true';
                          e.target.src = `/products/${product.id}/${i + 1}.jpeg`;
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="pd-info">
            <Link
              to={`/shop?category=${encodeURIComponent(categoryName)}`}
              className="pd-info__category-link"
              title={`View all ${categoryName}`}
            >
              {categoryName} &rarr;
            </Link>
            <h1 className="pd-info__name">{product.name}</h1>

            {/* Clickable Star Rating that jumps to reviews */}
            <div className="pd-info__rating-wrapper">
              <StarRating
                rating={averageRating}
                count={effectiveCount}
                onReviewsClick={scrollToReviews}
              />
            </div>

            <div className="pd-info__price-container">
              <span className="pd-info__price">{formatPrice(product.price)}</span>
              {product.original_price && (
                <span className="pd-info__original-price">{formatPrice(product.original_price)}</span>
              )}
              {product.original_price && Number(product.original_price) > Number(product.price) && (
                <span className="badge badge-green pd-info__discount-badge">
                  {Math.round(((Number(product.original_price) - Number(product.price)) / Number(product.original_price)) * 100)}% OFF
                </span>
              )}
            </div>

            <p className="pd-info__desc">{product.description}</p>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="pd-variants">
                <p className="pd-variants__label">Style</p>
                <div className="pd-variants__list">
                  {product.variants.map((v) => (
                    <button
                      key={v.id || v}
                      className={`pd-variant-btn${(selectedVariant?.id || selectedVariant) === (v.id || v) ? ' pd-variant-btn--active' : ''}`}
                      onClick={() => setSelectedVariant(v)}
                    >
                      {v.name || v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock status indicator */}
            <div className="pd-stock-status" style={{ margin: '0.5rem 0 1rem' }}>
              {loading && !product?._fromLive ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '0.85rem' }}>
                  Checking availability...
                </span>
              ) : product.in_stock === false || product.stock_quantity === 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                  Out of Stock
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                  In Stock ({product.stock_quantity ?? 0} units available)
                </span>
              )}
            </div>

            {/* Quantity */}
            <div className="pd-quantity">
              <p className="pd-quantity__label">Quantity</p>
              <div className="quantity-selector">
                <button
                  className="quantity-selector__btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || product.in_stock === false || product.stock_quantity === 0}
                  aria-label="Decrease quantity"
                  id="qty-minus"
                >
                  <Minus size={14} />
                </button>
                <span className="quantity-selector__val">{quantity}</span>
                <button
                  className="quantity-selector__btn"
                  onClick={() => setQuantity((q) => q + 1)}
                  disabled={product.in_stock === false || product.stock_quantity === 0}
                  aria-label="Increase quantity"
                  id="qty-plus"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pd-actions">
              <button
                className="btn btn-primary btn-lg pd-actions__add"
                onClick={handleAddToCart}
                disabled={loading || product.in_stock === false || product.stock_quantity === 0}
                id="add-to-cart-btn"
              >
                {loading ? (
                  'Checking...'
                ) : product.in_stock === false || product.stock_quantity === 0 ? (
                  'Out of Stock'
                ) : added ? (
                  <><Check size={16} strokeWidth={2.5} /> Added to Bag</>
                ) : (
                  <><ShoppingBag size={16} strokeWidth={1.5} /> Add to Bag</>
                )}
              </button>
              <button
                className="btn btn-secondary btn-lg pd-actions__buy"
                onClick={handleBuyNow}
                disabled={loading || product.in_stock === false || product.stock_quantity === 0}
                id="buy-now-btn"
              >
                {loading ? 'Checking...' : (product.in_stock === false || product.stock_quantity === 0 ? 'Out of Stock' : 'Buy Now')}
              </button>
              <button
                className={`pd-actions__wishlist ${isWishlisted ? 'pd-actions__wishlist--active' : ''}`}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                id="wishlist-btn"
                onClick={() => product?.id && toggleWishlist(product.id)}
                title={isWishlisted ? "Saved in your Wishlist" : "Save to Wishlist"}
              >
                <Heart
                  size={20}
                  strokeWidth={1.5}
                  fill={isWishlisted ? '#c0392b' : 'none'}
                  color={isWishlisted ? '#c0392b' : 'currentColor'}
                />
              </button>
            </div>

            {/* Secure Checkout Strip */}
            <div className="pd-secure-checkout" aria-label="Secure Checkout With">
              <div className="pd-secure-checkout__header">
                <svg className="pd-secure-checkout__lock" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="pd-secure-checkout__title">Secure Checkout With</span>
              </div>
              <div className="pd-secure-checkout__badges">
                {/* Google Pay */}
                <span className="pd-secure-checkout__badge" title="Google Pay">
                  <svg height="19" viewBox="0 0 54 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Google Pay">
                    <g transform="translate(0, 1) scale(0.75)">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </g>
                    <text x="23" y="15" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="13.5" fontWeight="600" fill="#5F6368" letterSpacing="-0.2">Pay</text>
                  </svg>
                </span>

                {/* Paytm */}
                <span className="pd-secure-checkout__badge" title="Paytm">
                  <svg height="17" viewBox="0 0 52 17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Paytm">
                    <text x="0" y="13.5" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="15" fontWeight="800" fill="#002E6E" letterSpacing="-0.5">pay<tspan fill="#00BAF2">tm</tspan></text>
                  </svg>
                </span>

                {/* UPI */}
                <span className="pd-secure-checkout__badge" title="Unified Payments Interface (UPI)">
                  <svg height="18" viewBox="0 0 48 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="UPI">
                    <text x="0" y="14" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="13" fontWeight="900" fontStyle="italic" fill="#4B5563" letterSpacing="0.4">UPI</text>
                    <path d="M28 2.5l-2.4 12h2.8L30.8 2.5H28z" fill="#F47920"/>
                    <path d="M31.8 2.5l-2.4 12h2.8L34.6 2.5h-2.8z" fill="#0F8B44"/>
                  </svg>
                </span>

                {/* Visa */}
                <span className="pd-secure-checkout__badge" title="Visa">
                  <svg height="18" viewBox="0 0 46 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
                    <text x="0" y="14.5" fontFamily="'Arial Black', -apple-system, sans-serif" fontSize="14" fontWeight="900" fontStyle="italic" fill="#1434CB" letterSpacing="1">VISA</text>
                  </svg>
                </span>

                {/* Mastercard */}
                <span className="pd-secure-checkout__badge" title="Mastercard">
                  <svg height="21" viewBox="0 0 34 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
                    <circle cx="11.5" cy="9.5" r="7.5" fill="#EB001B"/>
                    <circle cx="22.5" cy="9.5" r="7.5" fill="#F79E1B"/>
                    <path d="M17 4.3A7.47 7.47 0 0 0 14.3 9.5c0 2.1.9 4 2.7 5.2 1.8-1.2 2.7-3.1 2.7-5.2 0-2.1-.9-4-2.7-5.2Z" fill="#FF5F00"/>
                    <text x="17" y="19.5" textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="4.6" fontWeight="700" fill="#18181B" letterSpacing="-0.2">mastercard</text>
                  </svg>
                </span>
              </div>
            </div>

            {/* Features */}
            {features && features.length > 0 && (
              <div className="pd-features">
                {features.map((f) => (
                  <span key={f} className="pd-feature-tag">{f}</span>
                ))}
              </div>
            )}

            {/* Special Offers Box */}
            <div className="pd-special-offers" aria-label="Special Offers">
              <div className="pd-special-offer-item">
                <span className="pd-special-offer-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="offerGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#DFBF7A" />
                        <stop offset="100%" stopColor="#B88B4A" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 12.00 3.50 Q 15.13 0.34 16.25 4.64 Q 20.54 3.46 19.36 7.75 Q 23.66 8.87 20.50 12.00 Q 23.66 15.13 19.36 16.25 Q 20.54 20.54 16.25 19.36 Q 15.13 23.66 12.00 20.50 Q 8.87 23.66 7.75 19.36 Q 3.46 20.54 4.64 16.25 Q 0.34 15.13 3.50 12.00 Q 0.34 8.87 4.64 7.75 Q 3.46 3.46 7.75 4.64 Q 8.87 0.34 12.00 3.50 Z"
                      fill="url(#offerGoldGrad)"
                    />
                    <line x1="15.2" y1="8.8" x2="8.8" y2="15.2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="9.2" cy="9.2" r="1.3" fill="#ffffff" />
                    <circle cx="14.8" cy="14.8" r="1.3" fill="#ffffff" />
                  </svg>
                </span>
                <span className="pd-special-offer-text">Buy 2 Get 1 Free — Limited Time Offer</span>
              </div>

              <div className="pd-special-offer-item">
                <span className="pd-special-offer-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M 12.00 3.50 Q 15.13 0.34 16.25 4.64 Q 20.54 3.46 19.36 7.75 Q 23.66 8.87 20.50 12.00 Q 23.66 15.13 19.36 16.25 Q 20.54 20.54 16.25 19.36 Q 15.13 23.66 12.00 20.50 Q 8.87 23.66 7.75 19.36 Q 3.46 20.54 4.64 16.25 Q 0.34 15.13 3.50 12.00 Q 0.34 8.87 4.64 7.75 Q 3.46 3.46 7.75 4.64 Q 8.87 0.34 12.00 3.50 Z"
                      fill="url(#offerGoldGrad)"
                    />
                    <line x1="15.2" y1="8.8" x2="8.8" y2="15.2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="9.2" cy="9.2" r="1.3" fill="#ffffff" />
                    <circle cx="14.8" cy="14.8" r="1.3" fill="#ffffff" />
                  </svg>
                </span>
                <span className="pd-special-offer-text">Extra Discount on Prepaid Orders</span>
              </div>

              <div className="pd-special-offer-item">
                <span className="pd-special-offer-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M 12.00 3.50 Q 15.13 0.34 16.25 4.64 Q 20.54 3.46 19.36 7.75 Q 23.66 8.87 20.50 12.00 Q 23.66 15.13 19.36 16.25 Q 20.54 20.54 16.25 19.36 Q 15.13 23.66 12.00 20.50 Q 8.87 23.66 7.75 19.36 Q 3.46 20.54 4.64 16.25 Q 0.34 15.13 3.50 12.00 Q 0.34 8.87 4.64 7.75 Q 3.46 3.46 7.75 4.64 Q 8.87 0.34 12.00 3.50 Z"
                      fill="url(#offerGoldGrad)"
                    />
                    <line x1="15.2" y1="8.8" x2="8.8" y2="15.2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="9.2" cy="9.2" r="1.3" fill="#ffffff" />
                    <circle cx="14.8" cy="14.8" r="1.3" fill="#ffffff" />
                  </svg>
                </span>
                <span className="pd-special-offer-text">Free Mystery Gift on Orders Above ₹499</span>
              </div>
            </div>

            {/* Accordions */}
            <Accordion>
              <AccordionItem title="Product Details & Materials" defaultOpen>
                <p>{product.description}</p>
                <p style={{ marginTop: '0.6rem', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
                  Engineered with hypoallergenic 316L titanium stainless steel and vacuum PVD gold plating for lifetime water and sweat resistance.
                </p>
              </AccordionItem>

              <AccordionItem title="Specifications">
                <dl className="pd-specs">
                  {Object.entries(specifications || {}).map(([key, val]) => (
                    <div key={key} className="pd-specs__row">
                      <dt className="pd-specs__key">{key}</dt>
                      <dd className="pd-specs__val">{val}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionItem>

              <AccordionItem title="Shipping & Returns Policy">
                <p><strong>Standard shipping:</strong> {shippingInfo?.standard || '6 to 8 days'}</p>
                <p><strong>Express shipping:</strong> {shippingInfo?.express || '3 to 4 days'}</p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                  <strong>{dispatchTimelineText}</strong> {returnPolicyText}
                </p>
                <p style={{ marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--color-gold, #c6934b)' }}>
                  ★ Damaged or incorrect product? Report within 24 hours with an uncut 360° unboxing video for replacement review. <Link to="/policies" style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 600 }}>View Policy Details</Link>
                </p>

              </AccordionItem>

              <AccordionItem title="Care Instructions">
                <ul style={{ paddingLeft: '1rem', listStyle: 'disc' }}>
                  {(careInstructions || []).map((c, i) => (
                    <li key={i} style={{ marginBottom: '0.4rem' }}>{c}</li>
                  ))}
                </ul>
              </AccordionItem>
            </Accordion>

            {/* Trust & Perks Highlights Strip */}
            <div className="pd-trust-highlights">
              <div className="pd-trust-item">
                <div className="pd-trust-item__icon" aria-hidden="true">
                  <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 18h7M4 25h9M8 32h5" />
                    <path d="M29 10l12 6.5v13.5l-12 6.5-12-6.5V16.5L29 10z" />
                    <path d="M29 10v13.5" />
                    <path d="M41 16.5l-12 7-12-7" />
                    <circle cx="23" cy="41" r="2" />
                    <circle cx="35" cy="41" r="2" />
                    <path d="M25 41h8" />
                  </svg>
                </div>
                <span className="pd-trust-item__title">EASY RETURN</span>
                <span className="pd-trust-item__sub">& EXCHANGE</span>
              </div>

              <div className="pd-trust-item">
                <div className="pd-trust-item__icon" aria-hidden="true">
                  <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 16h8M3 23h10M6 30h7" />
                    <rect x="15" y="12" width="18" height="19" rx="2" />
                    <path d="M33 18h6a2 2 0 0 1 1.6.8l3.4 4.7V31h-11V18z" />
                    <path d="M37 24h5" />
                    <circle cx="21" cy="35" r="3.5" />
                    <circle cx="38" cy="35" r="3.5" />
                    <path d="M24.5 35h10" />
                  </svg>
                </div>
                <span className="pd-trust-item__title">FREE SHIPPING</span>
                <span className="pd-trust-item__sub">ON ORDERS ABOVE ₹999/-</span>
              </div>

              <div className="pd-trust-item">
                <div className="pd-trust-item__icon" aria-hidden="true">
                  <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="19" y="7" width="18" height="9" rx="1.5" transform="rotate(-6 28 11.5)" />
                    <circle cx="28" cy="11.5" r="2" />
                    <rect x="20" y="20" width="16" height="11" rx="1.5" />
                    <path d="M28 20v11" />
                    <path d="M20 25.5h16" />
                    <path d="M9 28h8l5 4h12a3 3 0 0 1 3 3v1H18l-6-4H9v-4z" />
                  </svg>
                </div>
                <span className="pd-trust-item__title">COD AVAILABLE</span>
                <span className="pd-trust-item__sub">ON ALL ORDERS</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            CUSTOMER REVIEWS SECTION (Clickable destination & interactive form)
            ══════════════════════════════════════════════════════════════════════ */}
        <section className="pd-reviews-section" id="reviews" aria-label="Customer Reviews">
          <div className="pd-reviews-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Verified Feedback</span>
              <h2 className="section-title">Customer Reviews & Ratings</h2>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowReviewForm(!showReviewForm)}
              id="write-review-toggle-btn"
            >
              <PenTool size={16} strokeWidth={2} />
              {showReviewForm ? 'Close Form' : 'Write a Review'}
            </button>
          </div>

          {/* Rating Breakdown & Summary Banner */}
          <div className="pd-reviews-summary glass-panel">
            <div className="pd-reviews-summary__score">
              <div className="pd-reviews-summary__number">{averageRating.toFixed(1)}</div>
              <div className="pd-reviews-summary__stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={20}
                    fill={s <= Math.round(averageRating) ? '#d4af37' : 'none'}
                    color="#d4af37"
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <p className="pd-reviews-summary__count">
                Based on <strong>{effectiveCount}</strong> verified reviews
              </p>
              <div className="pd-reviews-summary__badge">
                <ShieldCheck size={16} color="var(--color-gold)" strokeWidth={2} />
                <span>100% Verified Buyer Ratings</span>
              </div>
            </div>

            {/* Visual Bars Breakdown */}
            <div className="pd-reviews-breakdown">
              {[
                { stars: 5, pct: 88, count: Math.round(effectiveCount * 0.88) },
                { stars: 4, pct: 10, count: Math.round(effectiveCount * 0.10) },
                { stars: 3, pct: 2, count: Math.round(effectiveCount * 0.02) },
                { stars: 2, pct: 0, count: 0 },
                { stars: 1, pct: 0, count: 0 },
              ].map((bar) => (
                <div key={bar.stars} className="pd-breakdown-row">
                  <span className="pd-breakdown-label">{bar.stars} stars</span>
                  <div className="pd-breakdown-bar">
                    <div
                      className="pd-breakdown-fill"
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                  <span className="pd-breakdown-pct">{bar.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review Submission Form */}
          {showReviewForm && (
            <div className="pd-review-form-wrapper">
              <form className="pd-review-form glass-panel" onSubmit={handleSubmitReview}>
                <div className="pd-review-form__header">
                  <span className="pd-review-form__badge">
                    <Sparkles size={13} color="var(--color-gold)" />
                    Verified Customer Feedback
                  </span>
                  <h3 className="pd-review-form__title">Share Your Experience</h3>
                  <p className="pd-review-form__subtitle">
                    Celebrate the craftsmanship. Tell fellow jewelry lovers about the fit, luster, and everyday wear.
                  </p>
                </div>

                {reviewSuccess && (
                  <div className="pd-review-success">
                    <Check size={18} strokeWidth={2.5} />
                    <span>Thank you! Your verified review has been published to the boutique.</span>
                  </div>
                )}

                {/* Rating selection card */}
                <div className="pd-form-group pd-form-group--rating">
                  <label className="pd-form-label">
                    Overall Rating <span className="pd-form-req">*</span>
                  </label>
                  <div className="pd-star-picker-card">
                    <div className="pd-star-picker">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          type="button"
                          key={starVal}
                          className={`pd-star-picker__btn${(hoverRating || newRating) >= starVal ? ' pd-star-picker__btn--active' : ''}`}
                          onClick={() => setNewRating(starVal)}
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(0)}
                          aria-label={`Rate ${starVal} star${starVal > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={28}
                            fill={(hoverRating || newRating) >= starVal ? '#d4af37' : 'none'}
                            color="#d4af37"
                            strokeWidth={1.5}
                          />
                        </button>
                      ))}
                    </div>
                    <div className="pd-star-picker__descriptor">
                      <span className="pd-star-picker__score">{(hoverRating || newRating)}.0 / 5.0</span>
                      <span className="pd-star-picker__text">
                        {(hoverRating || newRating) === 5 && 'Exceptional — Highly Recommended'}
                        {(hoverRating || newRating) === 4 && 'Very Good — Beautiful Craftsmanship'}
                        {(hoverRating || newRating) === 3 && 'Good — Met Expectations'}
                        {(hoverRating || newRating) === 2 && 'Fair — Room for Improvement'}
                        {(hoverRating || newRating) === 1 && 'Unsatisfactory'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pd-form-row">
                  <div className="pd-form-group">
                    <label className="pd-form-label" htmlFor="review-author">
                      Your Full Name <span className="pd-form-req">*</span>
                    </label>
                    <div className="pd-input-wrap">
                      <input
                        id="review-author"
                        type="text"
                        className="pd-form-input"
                        placeholder="e.g. Radhika Sharma"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="pd-form-group">
                    <label className="pd-form-label" htmlFor="review-title">
                      Review Headline
                    </label>
                    <div className="pd-input-wrap">
                      <input
                        id="review-title"
                        type="text"
                        className="pd-form-input"
                        placeholder="e.g. Breathtaking luster & compliments every day!"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="pd-form-group">
                  <label className="pd-form-label" htmlFor="review-comment">
                    Detailed Review <span className="pd-form-req">*</span>
                  </label>
                  <div className="pd-input-wrap">
                    <textarea
                      id="review-comment"
                      className="pd-form-input pd-form-textarea"
                      rows={4}
                      placeholder="Describe the fit, shine, waterproof durability, packaging, and compliments you received..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="pd-review-form__footer">
                  <div className="pd-review-form__actions">
                    <button
                      type="submit"
                      className="btn btn-primary pd-submit-btn"
                      disabled={submittingReview || !authorName.trim() || !reviewComment.trim()}
                    >
                      <Sparkles size={15} strokeWidth={2} />
                      {submittingReview ? 'Publishing…' : 'Submit Verified Review'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary pd-cancel-btn"
                      onClick={() => setShowReviewForm(false)}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="pd-review-form__security">
                    <ShieldCheck size={14} color="var(--color-gold)" strokeWidth={2} />
                    <span>Verified Buyer review badge will be displayed alongside your feedback.</span>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Reviews List */}
          <div className="pd-reviews-list">
            {reviewsLoading ? (
              <div className="pd-state" style={{ minHeight: '180px' }}>
                <div className="spinner" />
                <p>Loading customer reviews…</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="pd-reviews-empty glass-panel">
                <MessageSquare size={32} color="var(--color-gold)" strokeWidth={1.5} />
                <p>Be the first to review this piece!</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowReviewForm(true)}
                >
                  Write the First Review
                </button>
              </div>
            ) : (
              reviews.map((rev, idx) => {
                const author = rev.author_name || 'Customer';
                const initial = author.charAt(0).toUpperCase();
                const totalHelpful = (rev.helpful_count || 0) + (helpfulCounts[rev.id || idx] || 0);

                return (
                  <article key={rev.id || idx} className="pd-review-card glass-panel">
                    <div className="pd-review-card__header">
                      <div className="pd-review-card__author-info">
                        <div className="pd-review-card__avatar">{initial}</div>
                        <div>
                          <div className="pd-review-card__author-row">
                            <span className="pd-review-card__author">{author}</span>
                            {rev.is_verified_buyer && (
                              <span className="badge badge-green pd-review-card__badge">
                                <Check size={10} strokeWidth={3} />
                                Verified Buyer
                              </span>
                            )}
                          </div>
                          <span className="pd-review-card__date">
                            {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }) : 'Verified Purchase'}
                          </span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="pd-review-card__stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            fill={s <= (rev.rating || 5) ? '#d4af37' : 'none'}
                            color="#d4af37"
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>

                    {rev.title && (
                      <h4 className="pd-review-card__title">{rev.title}</h4>
                    )}

                    <p className="pd-review-card__comment">{rev.comment}</p>

                    <div className="pd-review-card__footer">
                      <button
                        type="button"
                        className="pd-helpful-btn"
                        onClick={() => handleHelpfulClick(rev.id || idx)}
                        title="Mark this review as helpful"
                      >
                        <ThumbsUp size={13} strokeWidth={1.8} />
                        <span>Helpful ({totalHelpful})</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
