import { useState, useEffect, useCallback } from 'react';
import { productApi } from '../services/api';
import { FALLBACK_PRODUCTS } from '../data/products';
import { subscribeToCatalogUpdates } from '../utils/catalogEvents';
import {
  getCachedProduct,
  cacheProduct,
  cacheProductsList,
  getCachedProductsList,
  getCachedFeaturedProducts,
  cacheFeaturedProducts,
  getCachedBestsellers,
  cacheBestsellers,
} from '../utils/productCache';

function getInitialProduct(idOrSlug) {
  if (!idOrSlug) return null;
  // 1. Check persistent live cache first
  const cached = getCachedProduct(idOrSlug);
  if (cached) return cached;

  // 2. Fall back to static dataset
  const numId = Number(idOrSlug);
  return (
    FALLBACK_PRODUCTS.find((p) => (!isNaN(numId) && p.id === numId) || p.slug === String(idOrSlug)) ||
    FALLBACK_PRODUCTS.find((p) => String(p.id) === String(idOrSlug)) ||
    null
  );
}

function filterFallbackProducts(params = {}) {
  let list = [...FALLBACK_PRODUCTS];
  if (params.category) {
    list = list.filter((p) => p.category.toLowerCase() === params.category.toLowerCase());
  }
  if (params.style) {
    list = list.filter((p) => p.style.some((s) => s.toLowerCase() === params.style.toLowerCase()));
  }
  if (params.featured === 'true' || params.featured === true) {
    list = list.filter((p) => p.is_featured);
  }
  if (params.bestseller === 'true' || params.bestseller === true) {
    list = list.filter((p) => p.is_bestseller);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }
  return list;
}

/**
 * Hook for fetching product list with optional filters/search.
 * Returns { products, loading, error, refetch }
 */
export function useProducts(params = {}) {
  const [products, setProducts] = useState(() => {
    const cached = getCachedProductsList();
    if (cached && cached.length > 0) {
      return cached;
    }
    return filterFallbackProducts(params);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paramsStr = JSON.stringify(params);

  const fetch = useCallback(async () => {
    const parsed = JSON.parse(paramsStr);
    const fallback = filterFallbackProducts(parsed);
    try {
      const data = await productApi.getAll(parsed);
      const rawList = data?.results || (Array.isArray(data) ? data : []);
      if (rawList.length > 0) {
        const isFullCatalog = !parsed.category && !parsed.style && !parsed.search && !parsed.featured && !parsed.bestseller;
        cacheProductsList(rawList, isFullCatalog);
        setProducts(rawList);
      } else {
        const cached = getCachedProductsList();
        setProducts(cached || fallback);
      }
    } catch (err) {
      const cached = getCachedProductsList();
      setProducts(cached || fallback);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [paramsStr]);

  useEffect(() => {
    fetch();
    const unsubscribe = subscribeToCatalogUpdates(() => {
      fetch();
    });
    return unsubscribe;
  }, [fetch]);

  return { products, loading, error, refetch: fetch };
}

/**
 * Hook for fetching a single product by ID or slug.
 */
export function useProduct(idOrSlug) {
  const [product, setProduct] = useState(() => getInitialProduct(idOrSlug));
  const [loading, setLoading] = useState(() => {
    const initial = getInitialProduct(idOrSlug);
    return !initial || !initial._fromLive;
  });
  const [error, setError] = useState(null);

  const fetchSingleProduct = useCallback(async (cancelledRef) => {
    if (!idOrSlug) return;
    const initial = getInitialProduct(idOrSlug);
    if (!initial || !initial._fromLive) {
      setLoading(true);
    }

    try {
      let data;
      if (isNaN(Number(idOrSlug))) {
        data = await productApi.getBySlug(idOrSlug);
      } else {
        data = await productApi.getById(idOrSlug);
      }
      if (!cancelledRef?.current && data) {
        const enriched = { ...data, _fromLive: true };
        cacheProduct(enriched);
        setProduct(enriched);
        setError(null);
      }
    } catch (err) {
      if (!cancelledRef?.current) {
        if (initial) {
          setProduct(initial);
          setError(null);
        } else {
          setError(err);
        }
      }
    } finally {
      if (!cancelledRef?.current) setLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    const cancelledRef = { current: false };
    fetchSingleProduct(cancelledRef);

    const unsubscribe = subscribeToCatalogUpdates(() => {
      fetchSingleProduct(cancelledRef);
    });

    return () => {
      cancelledRef.current = true;
      unsubscribe();
    };
  }, [fetchSingleProduct]);

  return { product, loading, error, refetch: () => fetchSingleProduct({ current: false }) };
}

/**
 * Hook for fetching featured products.
 * Guarantees stable deterministic ordering, race condition guards, and no flash/swap.
 */
export function useFeaturedProducts() {
  const [products, setProducts] = useState(() => {
    const cached = getCachedFeaturedProducts();
    return cached && cached.length > 0 ? cached : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCachedFeaturedProducts();
    return !(cached && cached.length > 0);
  });
  const [error, setError] = useState(null);

  const fetchFeatured = useCallback(async (signal) => {
    try {
      const data = await productApi.getFeatured(signal);
      if (signal?.aborted) return;
      const list = Array.isArray(data) ? data : (data?.results || []);
      if (list.length > 0) {
        // Deterministic sort by stable ID
        const sortedList = [...list].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
        cacheFeaturedProducts(sortedList);
        setProducts(sortedList.slice(0, 8));
      }
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      // If error and no products currently loaded, fallback stably
      setProducts((prev) => {
        if (prev.length > 0) return prev;
        return FALLBACK_PRODUCTS
          .filter((p) => p.is_featured)
          .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))
          .slice(0, 8);
      });
      setError(err);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchFeatured(controller.signal);

    const unsubscribe = subscribeToCatalogUpdates(() => {
      fetchFeatured(controller.signal);
    });

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [fetchFeatured]);

  return { products, loading, error, refetch: () => fetchFeatured() };
}

/**
 * Hook for fetching bestsellers.
 * Guarantees stable deterministic ordering, race condition guards, and no flash/swap.
 */
export function useBestsellers() {
  const [products, setProducts] = useState(() => {
    const cached = getCachedBestsellers();
    return cached && cached.length > 0 ? cached : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCachedBestsellers();
    return !(cached && cached.length > 0);
  });
  const [error, setError] = useState(null);

  const fetchBestsellers = useCallback(async (signal) => {
    try {
      const data = await productApi.getBestsellers(signal);
      if (signal?.aborted) return;
      const list = Array.isArray(data) ? data : (data?.results || []);
      if (list.length > 0) {
        // Deterministic sort by stable ID
        const sortedList = [...list].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
        cacheBestsellers(sortedList);
        setProducts(sortedList.slice(0, 8));
      }
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setProducts((prev) => {
        if (prev.length > 0) return prev;
        return FALLBACK_PRODUCTS
          .filter((p) => p.is_bestseller)
          .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))
          .slice(0, 8);
      });
      setError(err);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchBestsellers(controller.signal);

    const unsubscribe = subscribeToCatalogUpdates(() => {
      fetchBestsellers(controller.signal);
    });

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [fetchBestsellers]);

  return { products, loading, error, refetch: () => fetchBestsellers() };
}

