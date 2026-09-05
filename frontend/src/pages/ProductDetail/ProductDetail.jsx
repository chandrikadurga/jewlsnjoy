import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Minus, Plus, ArrowLeft, Check } from 'lucide-react';
import { useProduct } from '../../hooks/useProducts';
import { useCart } from '../../context/CartContext';
import { Accordion, AccordionItem } from '../../components/Accordion/Accordion';
import './ProductDetail.css';

function StarRating({ rating, count }) {
  return (
    <div className="pd-stars" aria-label={`Rated ${rating} out of 5, ${count} reviews`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          fill={s <= Math.round(rating) ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
      ))}
      <span className="pd-stars__count">({count} reviews)</span>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { product, loading, error } = useProduct(id);
  const { addToCart } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

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

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedVariant);
    window.location.href = '/checkout';
  };

  const formatPrice = (p) => `₹${p.toLocaleString('en-IN')}`;

  return (
    <div className="product-detail">
      <div className="container">

        {/* Breadcrumb */}
        <nav className="pd-breadcrumb" aria-label="Breadcrumb">
          <Link to="/shop" className="pd-breadcrumb__link">
            <ArrowLeft size={14} strokeWidth={2} />
            Back to Shop
          </Link>
        </nav>

        <div className="pd-layout">
          {/* Gallery */}
          <div className="pd-gallery">
            <div className="pd-gallery__main">
              <img
                src={product.images[selectedImage] || product.image}
                alt={product.name}
                className="pd-gallery__main-img"
              />
              {product.is_bestseller && (
                <span className="badge badge-gold pd-gallery__badge">Bestseller</span>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="pd-gallery__thumbs">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    className={`pd-gallery__thumb${selectedImage === i ? ' pd-gallery__thumb--active' : ''}`}
                    onClick={() => setSelectedImage(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="pd-info">
            <p className="pd-info__category">{product.category}</p>
            <h1 className="pd-info__name">{product.name}</h1>

            {product.rating && (
              <StarRating rating={product.rating} count={product.review_count} />
            )}

            <p className="pd-info__price">{formatPrice(product.price)}</p>
            {product.original_price && (
              <p className="pd-info__original-price">{formatPrice(product.original_price)}</p>
            )}

            <p className="pd-info__desc">{product.description}</p>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="pd-variants">
                <p className="pd-variants__label">Style</p>
                <div className="pd-variants__options">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      className={`pd-variant-btn${selectedVariant?.id === v.id ? ' pd-variant-btn--active' : ''}`}
                      onClick={() => setSelectedVariant(v)}
                      disabled={!v.in_stock}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="pd-qty">
              <p className="pd-qty__label">Quantity</p>
              <div className="pd-qty__controls">
                <button
                  className="pd-qty__btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <span className="pd-qty__value">{quantity}</span>
                <button
                  className="pd-qty__btn"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pd-actions">
              <button
                className={`btn btn-primary btn-lg pd-actions__add${added ? ' pd-actions__add--added' : ''}`}
                onClick={handleAddToCart}
                disabled={!product.in_stock}
                id="add-to-bag-btn"
              >
                {added ? (
                  <><Check size={16} strokeWidth={2.5} /> Added to Bag</>
                ) : (
                  <><ShoppingBag size={16} strokeWidth={1.5} /> Add to Bag</>
                )}
              </button>
              <button
                className="btn btn-secondary btn-lg pd-actions__buy"
                onClick={handleBuyNow}
                disabled={!product.in_stock}
                id="buy-now-btn"
              >
                Buy Now
              </button>
              <button
                className="pd-actions__wishlist"
                aria-label="Add to wishlist"
                id="wishlist-btn"
              >
                <Heart size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Features */}
            {product.features && (
              <div className="pd-features">
                {product.features.map((f) => (
                  <span key={f} className="pd-feature-tag">{f}</span>
                ))}
              </div>
            )}

            {/* Accordions */}
            <Accordion>
              <AccordionItem title="Product Details" defaultOpen>
                <p>{product.description}</p>
              </AccordionItem>

              <AccordionItem title="Specifications">
                <dl className="pd-specs">
                  {Object.entries(product.specifications || {}).map(([key, val]) => (
                    <div key={key} className="pd-specs__row">
                      <dt className="pd-specs__key">{key}</dt>
                      <dd className="pd-specs__val">{val}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionItem>

              <AccordionItem title="Shipping Information">
                <p><strong>Standard shipping:</strong> {product.shipping?.standard}</p>
                <p><strong>Express shipping:</strong> {product.shipping?.express}</p>
                <p style={{ marginTop: '0.5rem' }}>
                  Free standard shipping on orders above ₹{product.shipping?.free_threshold}.
                </p>
              </AccordionItem>

              <AccordionItem title="Care Instructions">
                <ul style={{ paddingLeft: '1rem', listStyle: 'disc' }}>
                  {(product.care_instructions || []).map((c, i) => (
                    <li key={i} style={{ marginBottom: '0.4rem' }}>{c}</li>
                  ))}
                </ul>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}
