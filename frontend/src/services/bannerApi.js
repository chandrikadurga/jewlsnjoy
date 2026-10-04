/**
 * Promotional Banners API Service
 * 
 * Handles all storefront and administrative requests for promotional campaigns.
 * Communicates with Django REST backend and Supabase Storage.
 */

import api from './api';

export const bannerApi = {
  /**
   * Public Storefront: Get currently active promotional banner
   */
  getActiveBanner: async () => {
    try {
      const response = await api.get('/api/promotional-banners/active/', {
        params: { _t: Date.now() },
      });
      return response.data;
    } catch (err) {
      console.warn('[bannerApi] Error fetching active banner, falling back to null:', err.message);
      return { active: false, banner: null };
    }
  },

  /**
   * Public Storefront: Get all published banners
   */
  getAllActive: async () => {
    try {
      const response = await api.get('/api/promotional-banners/', {
        params: { _t: Date.now() },
      });
      return response.data;
    } catch (err) {
      console.warn('[bannerApi] Error fetching banner list:', err.message);
      return { count: 0, results: [] };
    }
  },

  /**
   * Admin: List all banners with optional search and status filter
   */
  getAdminBanners: async (params = {}) => {
    const response = await api.get('/api/admin/promotional-banners/', {
      params: { ...params, _t: Date.now() },
    });
    return response.data;
  },

  /**
   * Admin: Get single banner details
   */
  getAdminBanner: async (id) => {
    const response = await api.get(`/api/admin/promotional-banners/${id}/`, {
      params: { _t: Date.now() },
    });
    return response.data;
  },

  /**
   * Admin: Create new promotional banner
   */
  createBanner: async (data) => {
    const response = await api.post('/api/admin/promotional-banners/', data);
    return response.data;
  },

  /**
   * Admin: Update banner with optimistic concurrency protection
   */
  updateBanner: async (id, data) => {
    const response = await api.patch(`/api/admin/promotional-banners/${id}/`, data);
    return response.data;
  },

  /**
   * Admin: Delete banner
   */
  deleteBanner: async (id) => {
    const response = await api.delete(`/api/admin/promotional-banners/${id}/`);
    return response.data;
  },

  /**
   * Admin: Publish banner
   */
  publishBanner: async (id) => {
    const response = await api.post(`/api/admin/promotional-banners/${id}/publish/`);
    return response.data;
  },

  /**
   * Admin: Unpublish banner
   */
  unpublishBanner: async (id) => {
    const response = await api.post(`/api/admin/promotional-banners/${id}/unpublish/`);
    return response.data;
  },

  /**
   * Admin: Duplicate banner
   */
  duplicateBanner: async (id) => {
    const response = await api.post(`/api/admin/promotional-banners/${id}/duplicate/`);
    return response.data;
  },

  /**
   * Admin: Reorder banners
   */
  reorderBanners: async (bannerIds) => {
    const response = await api.patch('/api/admin/promotional-banners/reorder/', {
      banner_ids: bannerIds,
    });
    return response.data;
  },

  /**
   * Admin: Upload artwork to Supabase Storage
   * @param {FormData} formData - Contains 'image', 'banner_id', 'slot_type'
   */
  uploadArtwork: async (formData) => {
    const response = await api.post('/api/admin/promotional-banners/upload-artwork/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  },

  /**
   * Admin: Add layer asset
   */
  addAsset: async (bannerId, assetData) => {
    const response = await api.post(`/api/admin/promotional-banners/${bannerId}/assets/`, assetData);
    return response.data;
  },

  /**
   * Admin: Delete layer asset
   */
  deleteAsset: async (bannerId, assetId) => {
    const response = await api.delete(`/api/admin/promotional-banners/${bannerId}/assets/${assetId}/`);
    return response.data;
  },
};

export default bannerApi;
