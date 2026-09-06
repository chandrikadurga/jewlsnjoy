/**
 * Wishlist Context for Jewels 'n' Joys
 * Supabase-backed persistent wishlist with guest intercept modal
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { wishlistService } from '../services/wishlistService';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user, openAuthModal } = useAuth();
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch wishlist whenever authenticated user changes
  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlistIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const items = await wishlistService.getWishlist(user.id);
      const idSet = new Set(items.map((item) => Number(item.product_id)));
      setWishlistIds(idSet);
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isInWishlist = useCallback(
    (productId) => {
      if (!productId) return false;
      return wishlistIds.has(Number(productId));
    },
    [wishlistIds]
  );

  const addToWishlist = useCallback(
    async (productId) => {
      if (!user) {
        openAuthModal('login', () => addToWishlist(productId));
        return false;
      }
      const numId = Number(productId);
      setWishlistIds((prev) => new Set([...prev, numId]));
      try {
        await wishlistService.addToWishlist(user.id, numId);
        return true;
      } catch (err) {
        // Rollback on error
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(numId);
          return next;
        });
        console.error('Failed to add item to wishlist:', err);
        return false;
      }
    },
    [user, openAuthModal]
  );

  const removeFromWishlist = useCallback(
    async (productId) => {
      if (!user) return false;
      const numId = Number(productId);
      setWishlistIds((prev) => {
        const next = new Set(prev);
        next.delete(numId);
        return next;
      });
      try {
        await wishlistService.removeFromWishlist(user.id, numId);
        return true;
      } catch (err) {
        // Rollback on error
        setWishlistIds((prev) => new Set([...prev, numId]));
        console.error('Failed to remove item from wishlist:', err);
        return false;
      }
    },
    [user]
  );

  const toggleWishlist = useCallback(
    async (productId) => {
      const numId = Number(productId);
      if (!user) {
        openAuthModal('login', () => {
          // Execute toggle after auth succeeds
          addToWishlist(numId);
        });
        return false;
      }

      if (wishlistIds.has(numId)) {
        return await removeFromWishlist(numId);
      } else {
        return await addToWishlist(numId);
      }
    },
    [user, wishlistIds, openAuthModal, addToWishlist, removeFromWishlist]
  );

  const value = {
    wishlistIds: Array.from(wishlistIds),
    wishlistCount: wishlistIds.size,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    fetchWishlist,
    loading,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
