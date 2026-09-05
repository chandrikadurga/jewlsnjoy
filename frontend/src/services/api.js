/**
 * Axios API service for Jewels 'n' Joys
 * 
 * All API calls go through this service.
 * Base URL is read from VITE_API_BASE_URL env variable.
 * 
 * Architecture:
 *   React → Axios → Django REST API → Mock Data (now)
 *   React → Axios → Django REST API → PostgreSQL (later)
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Product image map — maps placeholder API paths to public assets
const PRODUCT_IMAGE_MAP = {
  '/api/placeholder/product_1': '/products/1/1.jpeg',
  '/api/placeholder/product_2': '/products/2/1.jpeg',
  '/api/placeholder/product_3': '/products/3/1.jpeg',
  '/api/placeholder/product_4': '/products/4/1.jpeg',
  '/api/placeholder/product_5': '/products/5/1.jpeg',
  '/api/placeholder/product_6': '/products/6/1.jpeg',
  '/api/placeholder/product_7': '/products/7/1.jpeg',
};

function resolveProductImage(imagePath) {
  if (!imagePath) return imagePath;
  if (PRODUCT_IMAGE_MAP[imagePath]) return PRODUCT_IMAGE_MAP[imagePath];
  const match = String(imagePath).match(/\/api\/placeholder\/product_(\d+)(?:\/(\d+))?/);
  if (match) {
    const id = match[1];
    const angle = match[2] || '1';
    return `/products/${id}/${angle}.jpeg`;
  }
  return imagePath;
}

function resolveProductImages(product) {
  if (!product) return product;
  return {
    ...product,
    image: resolveProductImage(product.image),
    thumbnail: resolveProductImage(product.thumbnail),
    images: product.images ? product.images.map(resolveProductImage) : [],
  };
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
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
    const response = await api.get('/api/products/', { params });
    return {
      ...response.data,
      results: response.data.results.map(resolveProductImages),
    };
  },

  /**
   * Get a single product by ID
   */
  getById: async (id) => {
    const response = await api.get(`/api/products/${id}/`);
    return resolveProductImages(response.data);
  },

  /**
   * Get a single product by slug
   */
  getBySlug: async (slug) => {
    const response = await api.get(`/api/products/slug/${slug}/`);
    return resolveProductImages(response.data);
  },

  /**
   * Get featured products for homepage
   */
  getFeatured: async () => {
    const response = await api.get('/api/products/featured/');
    return {
      ...response.data,
      results: response.data.results.map(resolveProductImages),
    };
  },

  /**
   * Get bestseller products
   */
  getBestsellers: async () => {
    const response = await api.get('/api/products/bestsellers/');
    return {
      ...response.data,
      results: response.data.results.map(resolveProductImages),
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
    const response = await api.post('/api/orders/', orderData);
    return response.data;
  },
};

// ─── Admin API ─────────────────────────────────────────────────

export const adminApi = {
  getStats: async () => {
    const response = await api.get('/api/admin/stats/');
    return response.data;
  },
  getProducts: async (params = {}) => {
    const response = await api.get('/api/admin/products/', { params });
    return Array.isArray(response.data) ? response.data.map(resolveProductImages) : [];
  },
  getProduct: async (id) => {
    const response = await api.get(`/api/admin/products/${id}/`);
    return resolveProductImages(response.data);
  },
  createProduct: async (productData) => {
    const response = await api.post('/api/admin/products/', productData);
    return resolveProductImages(response.data);
  },
  updateProduct: async (id, productData) => {
    const response = await api.patch(`/api/admin/products/${id}/`, productData);
    return resolveProductImages(response.data);
  },
  deleteProduct: async (id) => {
    const response = await api.delete(`/api/admin/products/${id}/`);
    return response.data;
  },
  getOrders: async (params = {}) => {
    const response = await api.get('/api/admin/orders/', { params });
    return response.data;
  },
  updateOrderStatus: async (id, status) => {
    const response = await api.patch(`/api/admin/orders/${id}/`, { status });
    return response.data;
  },
};

export default api;

