import { useState, useEffect, useCallback } from 'react';
import { productApi } from '../services/api';
import { FALLBACK_PRODUCTS } from '../data/products';

function findFallbackProduct(idOrSlug) {
  if (!idOrSlug) return null;
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
  const [products, setProducts] = useState(() => filterFallbackProducts(params));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const paramsStr = JSON.stringify(params);

  const fetch = useCallback(async () => {
    const parsed = JSON.parse(paramsStr);
    const fallback = filterFallbackProducts(parsed);
    try {
      const data = await productApi.getAll(parsed);
      if (data && data.results && data.results.length > 0) {
        setProducts(data.results);
      } else {
        setProducts(fallback);
      }
    } catch (err) {
      setProducts(fallback);
      setError(null); // Keep fallback working gracefully
    } finally {
      setLoading(false);
    }
  }, [paramsStr]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { products, loading, error, refetch: fetch };
}

/**
 * Hook for fetching a single product by ID or slug.
 */
export function useProduct(idOrSlug) {
  const [product, setProduct] = useState(() => findFallbackProduct(idOrSlug));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!idOrSlug) return;
    let cancelled = false;

    async function fetch() {
      const fallback = findFallbackProduct(idOrSlug);
      if (!fallback) setLoading(true);

      try {
        let data;
        if (isNaN(Number(idOrSlug))) {
          data = await productApi.getBySlug(idOrSlug);
        } else {
          data = await productApi.getById(idOrSlug);
        }
        if (!cancelled && data) {
          setProduct(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          if (fallback) {
            setProduct(fallback);
            setError(null);
          } else {
            setError(err);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [idOrSlug]);

  return { product, loading, error };
}

/**
 * Hook for fetching featured products.
 */
export function useFeaturedProducts() {
  const [products, setProducts] = useState(() => FALLBACK_PRODUCTS.filter((p) => p.is_featured).slice(0, 8));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    productApi.getFeatured()
      .then((data) => {
        if (data && data.results && data.results.length > 0) {
          setProducts(data.results.slice(0, 8));
        }
      })
      .catch(() => {
        // Fallback is already loaded
      })
      .finally(() => setLoading(false));
  }, []);

  return { products, loading, error };
}

/**
 * Hook for fetching bestsellers.
 */
export function useBestsellers() {
  const [products, setProducts] = useState(() => FALLBACK_PRODUCTS.filter((p) => p.is_bestseller).slice(0, 8));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    productApi.getBestsellers()
      .then((data) => {
        if (data && data.results && data.results.length > 0) {
          setProducts(data.results.slice(0, 8));
        }
      })
      .catch(() => {
        // Fallback is already loaded
      })
      .finally(() => setLoading(false));
  }, []);

  return { products, loading, error };
}
