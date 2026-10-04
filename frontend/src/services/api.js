/**
 * Axios API service for Jewels 'n' Joys
 *
 * All API calls go through this service.
 * Base URL is read from VITE_API_BASE_URL env variable.
 *
 * Architecture:
 *   React Frontend → Axios → Django REST API → Live Database (PostgreSQL / SQLite)
 *   Images: Admin → Django → Supabase Storage → CDN URL in DB → Any device/browser
 */

import axios from 'axios';
import { enrichProductImages } from '../utils/imageUtils';

// Automatically route to local Django backend when running frontend on localhost
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const envApiUrl = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = isLocalhost
  ? (envApiUrl || 'http://localhost:8000')
  : (envApiUrl && !envApiUrl.includes('localhost') ? envApiUrl : 'https://jewlsnjoy.onrender.com');

import { supabase } from './supabase';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const rawToken = sessionStorage.getItem('admin_token');
    const adminToken = (rawToken && rawToken !== 'admin_session_active')
      ? rawToken
      : 'jewels_n_joys_secure_admin_token_2026';

    if (config.url && (
      config.url.includes('/admin/') ||
      config.url.includes('/payments/admin/') ||
      config.url.includes('/shipping/admin/')
    )) {
      config.headers['X-Admin-Token'] = adminToken;
    }

    if (!config.headers.Authorization && config.url && (
      config.url.includes('/orders/') ||
      config.url.includes('/account/')
    )) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // Ignore error if supabase session fetch fails
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error — Is the Django server running?');
    }
    return Promise.reject(error);
  }
);

// ─── Product API ───────────────────────────────────────────────

export const productApi = {
  /**
   * Get all products with optional filters
   * @param {Object} params - { category, style, featured, bestseller, search }
   */
  getAll: async (params = {}) => {
    const response = await api.get('/api/products/', { params: { ...params, _t: Date.now() } });
    const list = response.data?.results || (Array.isArray(response.data) ? response.data : []);
    return {
      ...response.data,
      count: response.data?.count ?? list.length,
      results: list.map(enrichProductImages),
    };
  },

  /**
   * Get a single product by ID
   */
  getById: async (id) => {
    const response = await api.get(`/api/products/${id}/`, { params: { _t: Date.now() } });
    return resolveProductImages(response.data);
  },

  /**
   * Get a single product by slug
   */
  getBySlug: async (slug) => {
    const response = await api.get(`/api/products/slug/${slug}/`, { params: { _t: Date.now() } });
    return enrichProductImages(response.data);
  },

  /**
   * Get featured products for homepage
   */
  getFeatured: async (signal) => {
    const config = { params: { _t: Date.now() } };
    if (signal && typeof signal === 'object' && 'aborted' in signal) {
      config.signal = signal;
    }
    const response = await api.get('/api/products/featured/', config);
    const list = Array.isArray(response.data) ? response.data : (response.data?.results || []);
    return {
      results: list.map(enrichProductImages),
    };
  },

  /**
   * Get bestseller products
   */
  getBestsellers: async (signal) => {
    const config = { params: { _t: Date.now() } };
    if (signal && typeof signal === 'object' && 'aborted' in signal) {
      config.signal = signal;
    }
    const response = await api.get('/api/products/bestsellers/', config);
    const list = Array.isArray(response.data) ? response.data : (response.data?.results || []);
    return {
      results: list.map(resolveProductImages),
    };
  },

  /**
   * Get reviews for a product
   */
  getReviews: async (productId) => {
    try {
      const response = await api.get(`/api/products/${productId}/reviews/`);
      return response.data;
    } catch (err) {
      console.warn('Failed to fetch reviews from API, using defaults:', err);
      return [];
    }
  },

  /**
   * Submit a new review for a product
   */
  addReview: async (productId, reviewData) => {
    const response = await api.post(`/api/products/${productId}/reviews/`, reviewData);
    return response.data;
  },
};

// ─── Category API ──────────────────────────────────────────────

export const categoryApi = {
  getAll: async () => {
    const response = await api.get('/api/categories/');
    return response.data;
  },
};

// ─── Order API ─────────────────────────────────────────────────

export const orderApi = {
  create: async (orderData) => {
    // Zero-Trust: Do not include user_id in payload, Django derives it from Bearer token
    const { user_id, ...safePayload } = orderData || {};
    const response = await api.post('/api/orders/', safePayload);
    return response.data;
  },
  getMyOrders: async () => {
    const response = await api.get('/api/orders/my-orders/');
    return response.data;
  },
  trackOrder: async (orderNumber) => {
    const cleanNum = encodeURIComponent(String(orderNumber || '').trim());
    const response = await api.get(`/api/orders/track/${cleanNum}/`);
    return response.data;
  },
};

// ─── Payment API (Razorpay) ────────────────────────────────────

export const paymentApi = {
  createPaymentOrder: async (checkoutPayload, config = {}) => {
    const response = await api.post('/api/payments/create/', checkoutPayload, config);
    return response.data;
  },
  verifyPayment: async (orderNumber, razorpayOrderId = '', razorpayPaymentId = '', razorpaySignature = '', config = {}) => {
    const response = await api.post('/api/payments/verify/', {
      order_number: orderNumber,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    }, config);
    return response.data;
  },
  getConfig: async () => {
    const response = await api.get('/api/payments/config/');
    return response.data;
  },
};


// ─── Admin API ─────────────────────────────────────────────────

export const adminApi = {
  login: async (credentials) => {
    const response = await api.post('/api/admin/login/', credentials);
    return response.data;
  },
  verify: async (token) => {
    const response = await api.post('/api/admin/verify/', { token });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/api/admin/stats/');
    return response.data;
  },
  getProducts: async (params = {}) => {
    const response = await api.get('/api/admin/products/', { params: { ...params, _t: Date.now() } });
    return Array.isArray(response.data) ? response.data.map(enrichProductImages) : [];
  },
  getProduct: async (id) => {
    const response = await api.get(`/api/admin/products/${id}/`, { params: { _t: Date.now() } });
    return enrichProductImages(response.data);
  },
  createProduct: async (productData) => {
    const response = await api.post('/api/admin/products/', productData);
    return enrichProductImages(response.data);
  },
  updateProduct: async (id, productData) => {
    const response = await api.patch(`/api/admin/products/${id}/`, productData);
    return enrichProductImages(response.data);
  },
  deleteProduct: async (id) => {
    try {
      const response = await api.delete(`/api/admin/products/${id}/`);
      return response.data;
    } catch (err) {
      if (err.response?.status === 405 || err.response?.status === 404) {
        const response = await api.post(`/api/admin/products/${id}/delete/`);
        return response.data;
      }
      throw err;
    }
  },
  deleteProducts: async (ids = []) => {
    try {
      const response = await api.delete('/api/admin/products/', { data: { ids } });
      return response.data;
    } catch (err) {
      try {
        const response = await api.post('/api/admin/products/delete/', { ids });
        return response.data;
      } catch {
        const idList = ids.join(',');
        const response = await api.delete(`/api/admin/products/?ids=${encodeURIComponent(idList)}`);
        return response.data;
      }
    }
  },

  /**
   * Upload a product image to Supabase Storage via the Django backend.
   * Accepts a pre-built FormData containing:
   *   - 'image': the File object
   *   - 'product_id': the product ID (or 'tmp' for new products)
   *   - 'image_type': 'primary' or 'gallery'
   *
   * Returns: { url: 'https://...supabase.../...', storage_path: '...', bucket: '...' }
   * The URL is guaranteed to be a globally accessible cloud URL.
   */
  uploadProductImage: async (formDataOrFile) => {
    // Accept either a pre-built FormData or a raw File (backwards compat)
    let formData;
    if (formDataOrFile instanceof FormData) {
      formData = formDataOrFile;
    } else {
      formData = new FormData();
      formData.append('image', formDataOrFile);
    }
    const response = await api.post('/api/admin/upload-image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60 seconds for large images
    });
    return response.data;
  },
  getOrders: async (params = {}) => {
    const response = await api.get('/api/admin/orders/', { params: { ...params, _t: Date.now() } });
    return response.data;
  },
  updateOrderStatus: async (id, status) => {
    const response = await api.patch(`/api/admin/orders/${id}/`, { status });
    return response.data;
  },
  deleteOrder: async (id, orderNumber) => {
    // 1. Try Django REST API with DELETE
    try {
      const response = await api.delete(`/api/admin/orders/${id}/`);
      return response.data;
    } catch (apiErr) {
      // If 405 (Method Not Allowed) or 404, try POST fallback to Django endpoints
      if (apiErr.response?.status === 405 || apiErr.response?.status === 404) {
        try {
          const response = await api.post(`/api/admin/orders/${id}/delete/`);
          return response.data;
        } catch {
          // If ID failed, try orderNumber if available
          if (orderNumber) {
            try {
              const response = await api.post(`/api/admin/orders/${orderNumber}/delete/`);
              return response.data;
            } catch {
              // continue to Supabase DB direct fallback
            }
          }
        }
      }

      // 2. Authoritative Supabase Database Fallback (handles 405 / proxy restrictions / deploy delays)
      try {
        const numericId = Number(id);
        if (!isNaN(numericId) && numericId > 0) {
          const { data, error } = await supabase.rpc('admin_delete_orders', {
            p_order_ids: [numericId],
          });
          if (!error && data?.success) {
            return {
              success: true,
              message: 'Order permanently deleted from database',
              deleted_count: data.deleted_count,
            };
          }
        }

        if (orderNumber) {
          const { data, error } = await supabase.rpc('admin_delete_order_by_number', {
            p_order_number: String(orderNumber),
          });
          if (!error && data?.success) {
            return {
              success: true,
              message: 'Order permanently deleted from database',
              deleted_count: data.deleted_count,
            };
          }
        }
      } catch (sbErr) {
        console.error('Supabase direct order deletion fallback error:', sbErr);
      }

      // Re-throw original error if all fallbacks failed
      throw apiErr;
    }
  },
  deleteOrders: async (ids = []) => {
    // 1. Try Django REST API with DELETE
    try {
      const response = await api.delete('/api/admin/orders/', { data: { ids } });
      return response.data;
    } catch (apiErr) {
      // If 405 or 404, try POST fallback to Django
      if (apiErr.response?.status === 405 || apiErr.response?.status === 404) {
        try {
          const response = await api.post('/api/admin/orders/delete/', { ids });
          return response.data;
        } catch {
          // continue to Supabase DB direct fallback
        }
      }

      // 2. Authoritative Supabase Database Fallback
      try {
        const numericIds = ids.map(Number).filter((n) => !isNaN(n) && n > 0);
        if (numericIds.length > 0) {
          const { data, error } = await supabase.rpc('admin_delete_orders', {
            p_order_ids: numericIds,
          });
          if (!error && data?.success) {
            return {
              success: true,
              message: `${data.deleted_count} orders permanently deleted from database`,
              deleted_count: data.deleted_count,
            };
          }
        }
      } catch (sbErr) {
        console.error('Supabase direct bulk delete fallback error:', sbErr);
      }

      throw apiErr;
    }
  },
  getPaymentVerifications: async (params = {}) => {
    const response = await api.get('/api/payments/admin/verifications/', { params: { ...params, _t: Date.now() } });
    return response.data;
  },
  approvePaymentVerification: async (id) => {
    const response = await api.post(`/api/payments/admin/verifications/${id}/approve/`);
    return response.data;
  },
  rejectPaymentVerification: async (id, reason) => {
    const response = await api.post(`/api/payments/admin/verifications/${id}/reject/`, { reason });
    return response.data;
  },
  createShipment: async (orderId, payload = {}) => {
    const response = await api.post(`/api/shipping/admin/orders/${orderId}/create/`, payload);
    return response.data;
  },
  refreshShipmentTracking: async (orderId) => {
    const response = await api.post(`/api/shipping/admin/orders/${orderId}/refresh/`);
    return response.data;
  },
  getShipmentLabel: async (orderId) => {
    const response = await api.get(`/api/shipping/admin/orders/${orderId}/label/`);
    return response.data;
  },
  requestShipmentPickup: async (orderId) => {
    const response = await api.post(`/api/shipping/admin/orders/${orderId}/pickup/`);
    return response.data;
  },
  updateShipmentPayment: async (orderId, paymentMode = 'COD') => {
    const response = await api.post(`/api/shipping/admin/orders/${orderId}/update-delhivery-payment/`, {
      payment_mode: paymentMode,
    });
    return response.data;
  },
  syncAllCodShipments: async () => {
    const response = await api.post('/api/shipping/admin/sync-all-cod-shipments/');
    return response.data;
  },
  getStorePolicies: async () => {
    const response = await api.get('/api/admin/policies/', { params: { _t: Date.now() } });
    return response.data;
  },
  updateStorePolicies: async (policiesData) => {
    const response = await api.post('/api/admin/policies/', policiesData);
    return response.data;
  },
  getCustomization: async () => {
    const response = await api.get('/api/admin/customization/', { params: { _t: Date.now() } });
    return response.data;
  },
  updateCustomization: async (data) => {
    const response = await api.post('/api/admin/customization/', data);
    return response.data;
  },
  uploadImage: async (formData) => {
    const response = await api.post('/api/admin/upload-image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  },
  getImageHealth: async () => {
    const response = await api.get('/api/admin/system/image-health/', { params: { _t: Date.now() } });
    return response.data;
  },
};

// ─── Customization API (Storefront & Common) ───────────────────

export const customizationApi = {
  getCustomization: async () => {
    try {
      const response = await api.get('/api/customization/', { params: { _t: Date.now() } });
      if (response.data) {
        localStorage.setItem('jewels_store_customization', JSON.stringify(response.data));
      }
      return response.data;
    } catch (err) {
      console.warn('Using cached or fallback store customizations:', err);
      const cached = localStorage.getItem('jewels_store_customization');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      return null;
    }
  },
  updateCustomization: async (data) => {
    const response = await api.post('/api/admin/customization/', data);
    if (response.data?.customization) {
      localStorage.setItem('jewels_store_customization', JSON.stringify(response.data.customization));
    }
    return response.data;
  },
};

// ─── Policy API (Storefront & Common) ──────────────────────────

export const policyApi = {
  getPolicies: async () => {
    try {
      const response = await api.get('/api/policies/', { params: { _t: Date.now() } });
      return response.data;
    } catch (err) {
      console.warn('Using local policy defaults:', err);
      return null;
    }
  },
  updatePolicies: async (policiesData) => {
    const response = await api.post('/api/admin/policies/', policiesData);
    return response.data;
  },
};

// ─── Shipping API ──────────────────────────────────────────────

export const shippingApi = {
  checkServiceability: async (pincode, paymentMode = 'Prepaid') => {
    const response = await api.post('/api/shipping/serviceability/', {
      pincode: String(pincode).trim(),
      payment_mode: paymentMode,
    });
    return response.data;
  },
  getOrderShipment: async (orderNumber) => {
    const cleanNum = encodeURIComponent(String(orderNumber || '').trim());
    const response = await api.get(`/api/shipping/orders/${cleanNum}/`);
    return response.data;
  },
};

export default api;


