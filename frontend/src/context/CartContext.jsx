/**
 * Cart Context for Jewels N' Joys
 * 
 * Manages cart state with localStorage persistence.
 * Cart is intentionally frontend-only in this phase.
 * To add backend cart: replace localStorage with API calls in
 * addToCart / removeFromCart / updateQuantity / clearCart.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'jnj_cart';

function loadCartFromStorage() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCartToStorage(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Could not save cart to localStorage', e);
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCartFromStorage);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer  = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  /**
   * Add a product to cart. If it already exists (same id + variant), increment quantity.
   */
  const addToCart = useCallback((product, quantity = 1, variant = null) => {
    setItems((prev) => {
      const key = variant ? `${product.id}_${variant.id}` : String(product.id);
      const existing = prev.find((item) => item.key === key);

      if (existing) {
        return prev.map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prev,
        {
          key,
          product,
          variant,
          quantity,
        },
      ];
    });
    openDrawer();
  }, [openDrawer]);

  /**
   * Remove a cart item by key.
   */
  const removeFromCart = useCallback((key) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  /**
   * Update quantity of a cart item. Removes if quantity <= 0.
   */
  const updateQuantity = useCallback((key, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.key !== key));
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, quantity } : item))
    );
  }, []);

  /**
   * Clear entire cart.
   */
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Computed values
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const isEmpty = items.length === 0;

  const value = {
    items,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartItemCount,
    cartTotal,
    isEmpty,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
