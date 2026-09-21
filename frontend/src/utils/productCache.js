/**
 * Persistent product cache to eliminate visual flicker and stale fallback units on page refresh.
 * Keeps local product state synchronized with database modifications.
 * Version: v3 (auto-invalidates older cached product catalogs)
 */

const CACHE_KEY = 'jewlsnjoy_product_catalog_cache_v3';
const SINGLE_CACHE_PREFIX = 'jewlsnjoy_prod_v3_';

// Purge obsolete legacy cache keys on load
try {
  localStorage.removeItem('jewlsnjoy_product_catalog_cache');
  localStorage.removeItem('jewlsnjoy_product_catalog_cache_v2');
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith('jewlsnjoy_prod_') && !k.startsWith(SINGLE_CACHE_PREFIX)) {
      localStorage.removeItem(k);
    }
  });
} catch {
  // Ignore localStorage access restrictions
}

/**
 * Get all cached products mapped by ID and slug.
 */
export function getProductCacheMap() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

/**
 * Save a single product to cache and update catalog cache map.
 */
export function cacheProduct(product) {
  if (!product || !product.id) return;
  try {
    const map = getProductCacheMap();
    const enriched = { ...product, _fromLive: true };
    map[String(product.id)] = enriched;
    if (product.slug) {
      map[String(product.slug)] = enriched;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
    localStorage.setItem(`${SINGLE_CACHE_PREFIX}${product.id}`, JSON.stringify(enriched));
    if (product.slug) {
      localStorage.setItem(`${SINGLE_CACHE_PREFIX}${product.slug}`, JSON.stringify(enriched));
    }
  } catch (e) {
    // Ignore storage quota errors
  }
}

/**
 * Save an array of products to cache.
 * @param {Array} products - List of products to cache
 * @param {boolean} replaceAll - If true, replaces catalog cache completely (purges deleted products)
 */
export function cacheProductsList(products, replaceAll = false) {
  if (!Array.isArray(products) || products.length === 0) return;
  try {
    const map = replaceAll ? {} : getProductCacheMap();
    products.forEach((p) => {
      if (p && p.id) {
        const enriched = { ...p, _fromLive: true };
        map[String(p.id)] = enriched;
        if (p.slug) {
          map[String(p.slug)] = enriched;
        }
      }
    });
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch (e) {
    // Ignore storage quota errors
  }
}

/**
 * Remove a single product from all cache locations (map and single items).
 */
export function removeProductFromCache(idOrSlug) {
  if (!idOrSlug) return;
  try {
    const targetKey = String(idOrSlug);
    const map = getProductCacheMap();
    let foundId = null;
    let foundSlug = null;

    if (map[targetKey]) {
      foundId = map[targetKey].id;
      foundSlug = map[targetKey].slug;
      delete map[targetKey];
    }
    if (foundId && map[String(foundId)]) {
      delete map[String(foundId)];
    }
    if (foundSlug && map[String(foundSlug)]) {
      delete map[String(foundSlug)];
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
    localStorage.removeItem(`${SINGLE_CACHE_PREFIX}${targetKey}`);
    if (foundId) localStorage.removeItem(`${SINGLE_CACHE_PREFIX}${foundId}`);
    if (foundSlug) localStorage.removeItem(`${SINGLE_CACHE_PREFIX}${foundSlug}`);
  } catch (e) {
    // Ignore error
  }
}

/**
 * Remove multiple products from cache by IDs.
 */
export function removeProductsFromCache(ids = []) {
  if (!Array.isArray(ids)) return;
  ids.forEach(removeProductFromCache);
}

/**
 * Completely clear the product cache.
 */
export function clearProductCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(SINGLE_CACHE_PREFIX) || key.startsWith('jewlsnjoy_prod_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    // Ignore error
  }
}

/**
 * Get a single cached product by id or slug if available.
 */
export function getCachedProduct(idOrSlug) {
  if (!idOrSlug) return null;
  try {
    // Check single key first
    const direct = localStorage.getItem(`${SINGLE_CACHE_PREFIX}${idOrSlug}`);
    if (direct) {
      return JSON.parse(direct);
    }
    const map = getProductCacheMap();
    return map[String(idOrSlug)] || null;
  } catch {
    return null;
  }
}

/**
 * Get cached products array (if previously fetched from live API).
 */
export function getCachedProductsList() {
  try {
    const map = getProductCacheMap();
    const unique = Object.values(map).reduce((acc, curr) => {
      if (curr && curr.id && !acc.some((x) => x.id === curr.id)) {
        acc.push(curr);
      }
      return acc;
    }, []);
    return unique.length > 0 ? unique : null;
  } catch {
    return null;
  }
}
