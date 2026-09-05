/**
 * Axios API service for Jewels N' Joys
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

// Product image map — maps placeholder API paths to local assets
const PRODUCT_IMAGE_MAP = {
  '/api/placeholder/product_1': '/src/assets/products/1/1.jpeg',
  '/api/placeholder/product_2': '/src/assets/products/2/1.jpeg',
  '/api/placeholder/product_3': '/src/assets/products/3/1.jpeg',
  '/api/placeholder/product_4': '/src/assets/products/4/1.jpeg',
  '/api/placeholder/product_5': '/src/assets/products/5/1.jpeg',
  '/api/placeholder/product_6': '/src/assets/products/6/1.jpeg',
  '/api/placeholder/product_7': '/src/assets/products/7/1.jpeg',
};

function resolveProductImage(imagePath) {
  if (!imagePath) return imagePath;
  if (PRODUCT_IMAGE_MAP[imagePath]) return PRODUCT_IMAGE_MAP[imagePath];
  const match = String(imagePath).match(/\/api\/placeholder\/product_(\d+)(?:\/(\d+))?/);
  if (match) {
    const id = match[1];
    const angle = match[2] || '1';
    return `/src/assets/products/${id}/${angle}.jpeg`;
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
};

// ─── Category API ──────────────────────────────────────────────

export const categoryApi = {
  getAll: async () => {
    const response = await api.get('/api/categories/');
    return response.data;
  },
};

export default api;
