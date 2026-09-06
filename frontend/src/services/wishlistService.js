import { supabase } from './supabase';

export const wishlistService = {
  /**
   * Fetch all wishlist product IDs for the user
   */
  async getWishlist(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('product_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wishlist:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Add a product to the user's wishlist
   */
  async addToWishlist(userId, productId) {
    if (!userId || !productId) return null;
    const { data, error } = await supabase
      .from('wishlist_items')
      .upsert(
        { user_id: userId, product_id: Number(productId) },
        { onConflict: 'user_id, product_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
    return data;
  },

  /**
   * Remove a product from the user's wishlist
   */
  async removeFromWishlist(userId, productId) {
    if (!userId || !productId) return false;
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', Number(productId));

    if (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
    return true;
  },
};

export default wishlistService;
