/**
 * Cross-tab and real-time catalog event bus.
 * Notifies storefront pages whenever an admin modifies, toggles stock, or deletes a product.
 */

const CHANNEL_NAME = 'jewlsnjoy_catalog_channel';
const STORAGE_KEY = 'jewlsnjoy_catalog_updated';

export function broadcastCatalogUpdate() {
  const ts = Date.now().toString();
  try {
    localStorage.setItem(STORAGE_KEY, ts);
  } catch (e) {
    // Ignore localStorage failures (e.g. private browsing quota)
  }

  try {
    window.dispatchEvent(new CustomEvent('jewlsnjoy_catalog_updated', { detail: { timestamp: ts } }));
  } catch (e) {
    // Ignore CustomEvent failures
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'catalog_updated', timestamp: ts });
      channel.close();
    }
  } catch (e) {
    // Ignore BroadcastChannel failures in older environments
  }
}

export function subscribeToCatalogUpdates(callback) {
  if (typeof callback !== 'function') return () => {};

  let debounceTimer = null;
  const debouncedCallback = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      callback();
    }, 100);
  };

  const onFocus = () => debouncedCallback();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') debouncedCallback();
  };
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) debouncedCallback();
  };
  const onCustom = () => debouncedCallback();

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('storage', onStorage);
  window.addEventListener('jewlsnjoy_catalog_updated', onCustom);

  let channel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (msg) => {
        if (msg.data?.type === 'catalog_updated') {
          debouncedCallback();
        }
      };
    }
  } catch (e) {
    // Ignore BroadcastChannel errors
  }

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('jewlsnjoy_catalog_updated', onCustom);
    if (channel) {
      try {
        channel.close();
      } catch (e) {}
    }
  };
}
