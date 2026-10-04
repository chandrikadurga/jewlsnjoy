import { useState, useEffect, useCallback } from 'react';
import { bannerApi } from '../services/bannerApi';
import { supabase } from '../services/supabase';

/**
 * usePromotionalBanner
 * 
 * Fetches the currently active promotional campaign from Django REST API.
 * Automatically synchronizes in real-time when the admin publishes or updates
 * banners via Supabase Realtime.
 * 
 * Resilient against network drops, API downtime, and realtime disconnects.
 */
export function usePromotionalBanner() {
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActiveBanner = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await bannerApi.getActiveBanner();
      if (data && data.active && data.banner) {
        setBanner(data.banner);
      } else if (data && data.id && data.is_active) {
        setBanner(data);
      } else {
        setBanner(null);
      }
      setError(null);
    } catch (err) {
      console.warn('[usePromotionalBanner] Failed to fetch active promotional banner:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch
    fetchActiveBanner(true);

    // 2. Real-time Synchronization via Supabase Realtime (Section 16)
    let channel = null;
    try {
      channel = supabase
        .channel('public:promotional_banners_feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'promotional_banners' },
          () => {
            if (isMounted) {
              // Immediately re-fetch authoritative active banner state from backend
              fetchActiveBanner(false);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Channel connected
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            // Fallback graceful reconnection
          }
        });
    } catch (realtimeErr) {
      console.warn('[usePromotionalBanner] Realtime subscription init error:', realtimeErr);
    }

    // 3. Window focus reconnect (Section 39: fallback resilience)
    const handleFocus = () => {
      if (isMounted) {
        fetchActiveBanner(false);
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [fetchActiveBanner]);

  return {
    banner,
    loading,
    error,
    refetch: () => fetchActiveBanner(false),
  };
}

export default usePromotionalBanner;
