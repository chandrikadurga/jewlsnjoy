import { supabase } from '../services/supabase';

/**
 * Cross-tab and real-time catalog event bus.
 * Notifies storefront pages whenever an admin modifies, toggles stock, or updates a product image.
 * Uses both local browser channels (for instant zero-latency same-browser updates)
 * and Supabase Realtime (for multi-device, multi-browser, cross-network synchronization).
 */

const CHANNEL_NAME = 'jewlsnjoy_catalog_channel';
const STORAGE_KEY = 'jewlsnjoy_catalog_updated';
const SUPABASE_CATALOG_CHANNEL = 'catalog_realtime';

export function broadcastCatalogUpdate(payload = {}) {
  const ts = Date.now().toString();

  // 1. Same-device localStorage
  try {
    localStorage.setItem(STORAGE_KEY, ts);
  } catch (e) {
    // Ignore localStorage failures (e.g. private browsing quota)
  }

  // 2. Same-window CustomEvent
  try {
    window.dispatchEvent(new CustomEvent('jewlsnjoy_catalog_updated', { detail: { timestamp: ts, ...payload } }));
  } catch (e) {}

  // 3. Same-browser cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'catalog_updated', timestamp: ts, ...payload });
      channel.close();
    }
  } catch (e) {}

  // 4. Supabase Realtime — synchronizes to OTHER laptops, phones, incognito tabs, and networks
  try {
    if (supabase) {
      const channel = supabase.channel(SUPABASE_CATALOG_CHANNEL);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'catalog_updated',
            payload: { timestamp: ts, ...payload },
          });
        }
      });
    }
  } catch (e) {
    // Graceful fallback if Supabase Realtime is temporarily unavailable
  }
}

export function subscribeToCatalogUpdates(callback) {
  if (typeof callback !== 'function') return () => {};

  let debounceTimer = null;
  const debouncedCallback = (payload) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      callback(payload);
    }, 100);
  };

  const onFocus = () => debouncedCallback();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') debouncedCallback();
  };
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) debouncedCallback();
  };
  const onCustom = (e) => debouncedCallback(e.detail);

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('storage', onStorage);
  window.addEventListener('jewlsnjoy_catalog_updated', onCustom);

  let bcChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bcChannel = new BroadcastChannel(CHANNEL_NAME);
      bcChannel.onmessage = (msg) => {
        if (msg.data?.type === 'catalog_updated') {
          debouncedCallback(msg.data);
        }
      };
    }
  } catch (e) {}

  // Supabase Realtime subscription for cross-device updates
  let sbChannel = null;
  try {
    if (supabase) {
      sbChannel = supabase
        .channel(SUPABASE_CATALOG_CHANNEL + '_' + Math.random().toString(36).substring(2, 7))
        .on('broadcast', { event: 'catalog_updated' }, (res) => {
          debouncedCallback(res.payload);
        })
        .subscribe();
    }
  } catch (e) {
    // Supabase Realtime connection failure fallback
  }

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('jewlsnjoy_catalog_updated', onCustom);
    if (bcChannel) {
      try {
        bcChannel.close();
      } catch (e) {}
    }
    if (sbChannel) {
      try {
        supabase.removeChannel(sbChannel);
      } catch (e) {}
    }
  };
}

// ─── Real-Time Order Event Bus ─────────────────────────────────
const ORDER_CHANNEL_NAME = 'jewlsnjoy_orders_channel';
const ORDER_STORAGE_KEY = 'jewlsnjoy_orders_updated';

export function broadcastOrderUpdate() {
  const ts = Date.now().toString();
  try {
    localStorage.setItem(ORDER_STORAGE_KEY, ts);
  } catch (e) {}

  try {
    window.dispatchEvent(new CustomEvent('jewlsnjoy_orders_updated', { detail: { timestamp: ts } }));
  } catch (e) {}

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(ORDER_CHANNEL_NAME);
      channel.postMessage({ type: 'orders_updated', timestamp: ts });
      channel.close();
    }
  } catch (e) {}
}

export function subscribeToOrderUpdates(callback) {
  if (typeof callback !== 'function') return () => {};

  let debounceTimer = null;
  const debouncedCallback = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      callback();
    }, 150);
  };

  const onFocus = () => debouncedCallback();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') debouncedCallback();
  };
  const onStorage = (e) => {
    if (e.key === ORDER_STORAGE_KEY) debouncedCallback();
  };
  const onCustom = () => debouncedCallback();

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('storage', onStorage);
  window.addEventListener('jewlsnjoy_orders_updated', onCustom);

  let channel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(ORDER_CHANNEL_NAME);
      channel.onmessage = (msg) => {
        if (msg.data?.type === 'orders_updated') {
          debouncedCallback();
        }
      };
    }
  } catch (e) {}

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('jewlsnjoy_orders_updated', onCustom);
    if (channel) {
      try {
        channel.close();
      } catch (e) {}
    }
  };
}

