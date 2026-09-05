import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import './ProductCard.css';

function StarRating({ rating, count, productId }) {
  const handleClick = (e) => {
    if (productId) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = `/products/${productId}#reviews`;
    }
  };

  return (
    <div
      className="product-card__stars-link"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title={`Rated ${rating} out of 5 (${count} reviews) — Click to view reviews`}
    >
      <div className="product-card__stars" aria-label={`Rated ${rating} out of 5, ${count} reviews`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
        ))}
        <span className="product-card__rating-count">({count})</span>
      </div>
    </div>
  );
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1, null);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Future: implement wishlist
  };

  const formatPrice = (price) => `₹${price.toLocaleString('en-IN')}`;

  return (
    <article className="product-card">
      <Link
        to={`/products/${product.id}`}
        className="product-card__link"
        aria-label={`View ${product.name}`}
      >
        {/* Image */}
        <div className="product-card__image-wrap">
          <img
            src={product.image}
            alt={product.name}
            className="product-card__image"
            loading="lazy"
          />
          {/* Badges */}
          <div className="product-card__badges">
            {product.is_bestseller && (
              <span className="badge badge-gold">Bestseller</span>
            )}
            {product.is_featured && !product.is_bestseller && (
              <span className="badge badge-green">Featured</span>
            )}
          </div>
          {/* Wishlist */}
          <button
            className="product-card__wishlist"
            onClick={handleWishlist}
            aria-label={`Add ${product.name} to wishlist`}
          >
            <Heart size={16} strokeWidth={1.5} />
          </button>

          {/* Quick action overlay */}
          <div className="product-card__overlay" aria-hidden="true">
            <button
              className="btn btn-primary btn-sm product-card__add-btn"
              onClick={handleAddToCart}
              tabIndex={-1}
            >
              <ShoppingBag size={14} strokeWidth={2} />
              Add to Bag
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="product-card__info">
          <p className="product-card__category">{product.category}</p>
          <h3 className="product-card__name">{product.name}</h3>
          <p className="product-card__desc">{product.short_description}</p>

          <StarRating
            rating={product.rating || 4.9}
            count={product.review_count || 48}
            productId={product.id}
          />

          <div className="product-card__price-row">
            <span className="product-card__price">{formatPrice(product.price)}</span>
            {product.original_price && (
              <span className="product-card__original-price">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>

          {/* Mobile add to cart */}
          <button
            className="btn btn-secondary btn-sm product-card__add-mobile"
            onClick={handleAddToCart}
          >
            Add to Bag
          </button>
        </div>
      </Link>
    </article>
  );
}
