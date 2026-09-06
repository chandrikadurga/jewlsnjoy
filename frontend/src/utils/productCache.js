/**
 * Persistent product cache to eliminate visual flicker and stale fallback units on page refresh.
 * Keeps local product state synchronized with database modifications.
 */

const CACHE_KEY = 'jewlsnjoy_product_catalog_cache';
const SINGLE_CACHE_PREFIX = 'jewlsnjoy_prod_';

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
 */
export function cacheProductsList(products) {
  if (!Array.isArray(products) || products.length === 0) return;
  try {
    const map = getProductCacheMap();
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
