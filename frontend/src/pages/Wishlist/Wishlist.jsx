import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Sparkles } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { productApi } from '../../services/api';
import ProductCard from '../../components/ProductCard/ProductCard';
import './Wishlist.css';

export default function Wishlist() {
  const { wishlistIds, loading: wishlistLoading } = useWishlist();
  const { user, openAuthModal } = useAuth();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoadingProducts(true);

    productApi
      .getAll()
      .then((res) => {
        if (!isMounted) return;
        const allProds = res.results || [];
        setProducts(allProds);
      })
      .catch((err) => {
        console.error('Failed to load products for wishlist:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingProducts(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const wishlistedProducts = products.filter((p) =>
    wishlistIds.includes(Number(p.id))
  );

  const isLoading = wishlistLoading || loadingProducts;

  return (
    <div className="wishlist-page">
      <div className="container">
        {/* Header */}
        <div className="wishlist-header">
          <span className="eyebrow">Your Curated Pieces</span>
          <h1 className="wishlist-title">My Wishlist</h1>
          <p className="wishlist-subtitle">
            {wishlistIds.length > 0
              ? `You have saved ${wishlistIds.length} bespoke item${wishlistIds.length === 1 ? '' : 's'}`
              : 'Save your dream jewellery pieces to view or purchase anytime'}
          </p>
        </div>

        {/* Content */}
        {!user ? (
          <div className="wishlist-empty">
            <div className="wishlist-empty-icon">
              <Heart size={28} />
            </div>
            <h2>Sign in to view your saved pieces</h2>
            <p>
              Your wishlist syncs across all your devices once you sign in or create an account with Jewels 'n' Joys.
            </p>
            <button
              className="wishlist-explore-btn"
              onClick={() => openAuthModal('login')}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              Sign In to Jewels 'n' Joys <ArrowRight size={16} />
            </button>
          </div>
        ) : isLoading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: 'var(--color-muted)' }}>Loading your saved pieces...</p>
          </div>
        ) : wishlistedProducts.length === 0 ? (
          <div className="wishlist-empty">
            <div className="wishlist-empty-icon">
              <Sparkles size={28} />
            </div>
            <h2>Your wishlist is empty</h2>
            <p>
              Discover our timeless selection of waterproof, 18K gold-plated jewellery and click the heart icon on any piece to add it here.
            </p>
            <Link to="/shop" className="wishlist-explore-btn">
              Explore Collection <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlistedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
