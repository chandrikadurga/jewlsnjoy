/**
 * imageUtils.js — Centralized Product Image URL Resolver
 *
 * THE SINGLE SOURCE OF TRUTH for resolving product image URLs throughout the application.
 *
 * ALL components that display product images MUST use getProductImageUrl() from this file.
 * NEVER construct Supabase Storage URLs directly in React components.
 *
 * Architecture:
 *   Supabase Storage (product-images bucket)
 *       ↓
 *   Django API returns canonical URL in product.primary_image_url
 *       ↓
 *   getProductImageUrl(product) — this file
 *       ↓
 *   <img src={...} /> in any component
 *
 * This ensures:
 * - ONE URL construction strategy across the entire frontend
 * - Consistent fallback behavior
 * - Easy migration if storage provider changes (update only this file)
 * - No localhost/blob URLs ever reach production
 */

// ─── Supabase Config (read-only, public anon key only — never service role) ──

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hlxffdtkghzednkpwxlb.supabase.co';
const PRODUCT_IMAGES_BUCKET = 'product-images';

/**
 * Placeholder SVG shown when a product image is missing or fails to load.
 * This is a data URI so it never depends on a network request.
 */
export const PRODUCT_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f5f0eb'/%3E%3Ccircle cx='200' cy='160' r='50' fill='none' stroke='%23c2a370' stroke-width='2'/%3E%3Cpath d='M160 200 L200 160 L240 200' fill='none' stroke='%23c2a370' stroke-width='2'/%3E%3Ctext x='200' y='280' text-anchor='middle' fill='%23a89070' font-size='14' font-family='sans-serif'%3EImage Coming Soon%3C/text%3E%3C/svg%3E";

// ─── Core URL Resolver ────────────────────────────────────────────────────────

/**
 * Resolves a raw storage path or URL to a globally accessible public image URL.
 *
 * Handles:
 *   - Supabase canonical relative path: "products/42/primary-v3.jpg"
 *     → https://xxx.supabase.co/storage/v1/object/public/product-images/products/42/primary-v3.jpg
 *   - Already a full HTTPS URL: returned as-is (if not localhost)
 *   - Legacy /products/{id}/{n}.jpeg paths: returned as-is (external static assets on server)
 *   - Empty/null: returns ''
 *   - blob: URLs: returns '' (temporary, never store these)
 *   - localhost URLs: returns '' (not globally accessible)
 *
 * @param {string} rawPath - The raw image_url or storage_path from the API
 * @returns {string} - A globally accessible public URL, or '' if unresolvable
 */
export function resolveStoragePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';

  const trimmed = rawPath.trim();

  // Temporary browser-local URLs — must NEVER be displayed as permanent images
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:image')) {
    if (import.meta.env.DEV) {
      console.warn(
        '[imageUtils] Attempted to display a temporary blob/data URL as a product image. ' +
        'Upload the file first, then use the returned cloud URL.',
        trimmed.slice(0, 50)
      );
    }
    return '';
  }

  // Localhost URLs — only accessible on one machine
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
    if (import.meta.env.DEV) {
      console.warn('[imageUtils] Image URL references localhost — not globally accessible:', trimmed);
    }
    return '';
  }

  // Already a full HTTPS URL (e.g. Supabase CDN URL, or another cloud URL)
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }

  // Canonical Supabase Storage relative path: "products/{id}/..."
  // This is the preferred format stored in the database
  if (/^products\/\d+\//.test(trimmed)) {
    return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${trimmed}`;
  }

  // Legacy static asset path (served from frontend public/products/)
  // These are the original static photos bundled with the app
  if (trimmed.startsWith('/products/') || trimmed.startsWith('products/')) {
    // Keep as-is — these are static frontend assets
    return trimmed;
  }

  // Legacy /media/ path — local Django filesystem (not globally accessible in production)
  if (trimmed.startsWith('/media/')) {
    if (import.meta.env.DEV) {
      console.warn(
        '[imageUtils] Image uses a local /media/ path — not globally accessible in production. ' +
        'Re-upload this image through the admin panel:',
        trimmed
      );
    }
    // In dev mode, attempt to resolve against the backend
    if (import.meta.env.DEV) {
      return `http://localhost:8000${trimmed}`;
    }
    return '';
  }

  // Supabase internal URI format (used by some legacy references)
  if (trimmed.startsWith('supabase://')) {
    const withoutScheme = trimmed.replace('supabase://', '');
    const slashIdx = withoutScheme.indexOf('/');
    if (slashIdx > 0) {
      const bucket = withoutScheme.slice(0, slashIdx);
      const relPath = withoutScheme.slice(slashIdx + 1);
      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${relPath}`;
    }
    return '';
  }

  // Unknown format — return as-is and let the browser decide
  return trimmed;
}

// ─── Product Image Resolver ───────────────────────────────────────────────────

/**
 * Returns the best available globally-accessible image URL for a product.
 *
 * Priority order:
 *   1. product.primary_image_url (canonical database field)
 *   2. product.image (alias)
 *   3. product.thumbnail (alias)
 *   4. First image in product.images array
 *   5. First URL in product.image_urls array
 *   6. PRODUCT_IMAGE_PLACEHOLDER (never broken image icon)
 *
 * @param {Object} product - The product object from the API
 * @returns {string} - A globally accessible public URL
 */
export function getProductImageUrl(product) {
  if (!product) return PRODUCT_IMAGE_PLACEHOLDER;

  // Try each candidate in priority order
  const candidates = [
    product.primary_image_url,
    product.image,
    product.thumbnail,
  ];

  for (const candidate of candidates) {
    const resolved = resolveStoragePath(candidate);
    if (resolved) return resolved;
  }

  // Try images array
  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      const rawUrl = typeof img === 'string' ? img : img?.image_url;
      const resolved = resolveStoragePath(rawUrl);
      if (resolved) return resolved;
    }
  }

  // Try image_urls array
  if (Array.isArray(product.image_urls)) {
    for (const url of product.image_urls) {
      const resolved = resolveStoragePath(url);
      if (resolved) return resolved;
    }
  }

  return PRODUCT_IMAGE_PLACEHOLDER;
}

/**
 * Returns all globally-accessible image URLs for a product (for galleries/carousels).
 *
 * @param {Object} product - The product object from the API
 * @returns {string[]} - Array of globally accessible URLs, deduplicated, minimum length 1
 */
export function getProductImageUrls(product) {
  if (!product) return [PRODUCT_IMAGE_PLACEHOLDER];

  const seen = new Set();
  const urls = [];

  const addUrl = (raw) => {
    const resolved = resolveStoragePath(raw);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      urls.push(resolved);
    }
  };

  // Primary image first
  addUrl(product.primary_image_url);
  addUrl(product.image);
  addUrl(product.thumbnail);

  // Images array
  if (Array.isArray(product.images)) {
    product.images.forEach((img) => {
      const rawUrl = typeof img === 'string' ? img : img?.image_url;
      addUrl(rawUrl);
    });
  }

  // image_urls array
  if (Array.isArray(product.image_urls)) {
    product.image_urls.forEach(addUrl);
  }

  return urls.length > 0 ? urls : [PRODUCT_IMAGE_PLACEHOLDER];
}

/**
 * Returns the image URL for a specific product image object (ProductImage model).
 *
 * @param {Object|string} imageObj - Either a string URL or a ProductImage object {image_url, ...}
 * @returns {string} - A globally accessible public URL
 */
export function getImageObjUrl(imageObj) {
  if (!imageObj) return PRODUCT_IMAGE_PLACEHOLDER;
  const rawUrl = typeof imageObj === 'string' ? imageObj : imageObj.image_url;
  return resolveStoragePath(rawUrl) || PRODUCT_IMAGE_PLACEHOLDER;
}

// ─── Upload Utilities ─────────────────────────────────────────────────────────

/**
 * Returns true if a URL is a temporary browser-local reference (blob: or data:).
 * Temporary URLs must NEVER be saved to the database.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isTemporaryUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('blob:') || url.startsWith('data:');
}

/**
 * Returns true if a URL is a valid, globally accessible cloud-hosted image URL.
 * Used to validate that an upload actually succeeded before updating the DB.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isCloudUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('localhost') || url.includes('127.0.0.1')) return false;
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/media/')) return false;
  return url.startsWith('https://') || url.startsWith('http://');
}

/**
 * Returns true if a URL is a legacy local path that needs migration to cloud storage.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isLegacyLocalPath(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('/media/') ||
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.startsWith('C:\\') ||
    url.startsWith('C:/')
  );
}

// ─── Backwards-compatible resolveProductImages (for api.js) ──────────────────

/**
 * Enriches a product object with resolved image URLs.
 * Drop-in replacement for the resolveProductImages function in api.js.
 *
 * All image URLs in the returned product are globally accessible Supabase CDN URLs.
 *
 * @param {Object} product - Raw product from API response
 * @returns {Object} - Product with resolved image fields
 */
export function enrichProductImages(product) {
  if (!product) return product;

  const primaryUrl = getProductImageUrl(product);
  const allUrls = getProductImageUrls(product);

  // Resolve images array
  let resolvedImages = [];
  if (Array.isArray(product.images)) {
    resolvedImages = product.images.map((img) => {
      if (typeof img === 'string') {
        return resolveStoragePath(img) || PRODUCT_IMAGE_PLACEHOLDER;
      }
      if (img && typeof img === 'object') {
        return {
          ...img,
          image_url: resolveStoragePath(img.image_url) || PRODUCT_IMAGE_PLACEHOLDER,
        };
      }
      return img;
    });
  }

  if (resolvedImages.length === 0 && primaryUrl) {
    resolvedImages = [{ id: 1, image_url: primaryUrl, angle_number: 1, is_primary: true }];
  }

  return {
    ...product,
    image: primaryUrl,
    thumbnail: primaryUrl,
    primary_image_url: primaryUrl,
    images: resolvedImages,
    image_urls: allUrls,
  };
}
