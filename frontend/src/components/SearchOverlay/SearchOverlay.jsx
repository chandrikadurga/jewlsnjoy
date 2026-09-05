import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, Sparkles, TrendingUp, Tag } from 'lucide-react';
import { FALLBACK_PRODUCTS } from '../../data/products';
import { productApi } from '../../services/api';
import './SearchOverlay.css';

const TRENDING_SEARCHES = [
  'Necklaces',
  'Cocktail Rings',
  'Emerald',
  'Waterproof Gold',
  'Heart Pendants',
  'Stud Earrings',
  'Layered Sets',
  'Four-Leaf Clover',
];

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getWordVariants(word) {
  const w = word.toLowerCase().trim();
  if (!w) return [];
  const set = new Set([w]);
  if (w.endsWith('ies') && w.length > 4) {
    set.add(w.slice(0, -3) + 'y');
  } else if (w.endsWith('es') && w.length > 3) {
    set.add(w.slice(0, -2));
  } else if (w.endsWith('s') && w.length > 2) {
    set.add(w.slice(0, -1));
  } else {
    set.add(w + 's');
  }
  return Array.from(set);
}

function highlightMatches(text, tokens) {
  if (!text || !tokens || tokens.length === 0) return text;

  const allVariants = [];
  tokens.forEach((t) => {
    if (t.length >= 2) {
      allVariants.push(...getWordVariants(t));
    } else if (t.length === 1) {
      allVariants.push(t);
    }
  });

  if (allVariants.length === 0) return text;
  allVariants.sort((a, b) => b.length - a.length);

  try {
    const regex = new RegExp(`(${allVariants.map((v) => escapeRegex(v)).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (regex.test(part)) {
        regex.lastIndex = 0;
        return (
          <mark key={i} className="search-highlight">
            {part}
          </mark>
        );
      }
      return part;
    });
  } catch {
    return text;
  }
}

export default function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState(FALLBACK_PRODUCTS);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const navigate = useNavigate();

  // Fetch updated catalog on mount
  useEffect(() => {
    let isMounted = true;
    productApi
      .getAll()
      .then((data) => {
        if (isMounted && data?.results && data.results.length > 0) {
          setAllProducts(data.results);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Focus input on open & reset state on close
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 80);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Clean and tokenize query
  const searchTokens = useMemo(() => {
    return query
      .toLowerCase()
      .trim()
      .split(/[\s,–—\-]+/)
      .filter((t) => t.length > 0);
  }, [query]);

  // High-precision search scoring engine
  const { results, totalMatches } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { results: [], totalMatches: 0 };
    }

    const scored = [];

    for (const p of allProducts) {
      const name = (p.name || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const desc = (p.description || p.short_description || '').toLowerCase();
      const style = (Array.isArray(p.style) ? p.style.join(' ') : p.style || '').toLowerCase();
      const features = (Array.isArray(p.features) ? p.features.join(' ') : '').toLowerCase();
      const specs = p.specifications ? Object.values(p.specifications).join(' ').toLowerCase() : '';

      let score = 0;

      // 1. EXACT PHRASE MATCHES
      if (name === q) {
        score += 3000;
      } else if (name.startsWith(q)) {
        score += 1500;
      } else if (name.includes(q)) {
        score += 600;
      }

      // Exact category matching
      if (category === q) {
        score += 1200;
      } else if (category.startsWith(q)) {
        score += 600;
      }

      // 2. TOKEN-LEVEL HIGH PRECISION MATCHING
      let tokensMatchedInName = 0;
      let tokensMatchedTotal = 0;

      for (const token of searchTokens) {
        const variants = getWordVariants(token);
        const escapedVariants = variants.map((v) => escapeRegex(v)).join('|');
        const wordRegex = new RegExp(`\\b(${escapedVariants})\\b`, 'i');

        // Check name
        const isNameWord = wordRegex.test(name);
        // Prefix matching for typing (e.g. "rin" -> "ring")
        const isNamePrefix = variants.some((v) =>
          name.split(/\s+/).some((word) => word.startsWith(v))
        );

        if (isNameWord) {
          score += 400;
          tokensMatchedInName++;
          tokensMatchedTotal++;
        } else if (isNamePrefix) {
          score += 200;
          tokensMatchedInName++;
          tokensMatchedTotal++;
        } else if (token.length >= 4 && variants.some((v) => name.includes(v))) {
          // Only allow substring matching in name for words >= 4 chars (prevents "ring" in "herringbone")
          score += 80;
          tokensMatchedTotal++;
        }

        // Check Category (e.g. "Necklaces", "Rings", "Earrings", "Bracelets")
        const isCategoryWord = wordRegex.test(category);
        const isCategoryPrefix = variants.some((v) => category.startsWith(v));
        if (isCategoryWord) {
          score += 500;
          tokensMatchedTotal++;
        } else if (isCategoryPrefix) {
          score += 300;
          tokensMatchedTotal++;
        }

        // Check Style (e.g. "Luxury", "Minimal", "Statement", "Romantic")
        if (wordRegex.test(style) || variants.some((v) => style.startsWith(v))) {
          score += 180;
          tokensMatchedTotal++;
        }

        // Check Features & Specifications (e.g. "Waterproof", "PVD", "18K Gold", "Onyx", "Pearl")
        if (wordRegex.test(features) || wordRegex.test(specs) || variants.some((v) => features.includes(v))) {
          score += 150;
          tokensMatchedTotal++;
        }

        // Check Description (lower weight)
        if (token.length >= 4 && (wordRegex.test(desc) || variants.some((v) => desc.includes(v)))) {
          score += 40;
          tokensMatchedTotal++;
        }
      }

      // Bonus if all query tokens appear in the product title
      if (searchTokens.length > 1 && tokensMatchedInName === searchTokens.length) {
        score += 800;
      }

      // Disqualify items that matched zero relevant tokens
      if (tokensMatchedTotal === 0 && score < 100) {
        continue;
      }

      // Multi-word search penalty if none of the tokens were in the name or category
      if (searchTokens.length > 1 && tokensMatchedInName === 0 && !category.includes(q)) {
        score -= 200;
      }

      if (score > 40) {
        // Minor quality tiebreakers
        if (p.is_bestseller) score += 15;
        if (p.is_featured) score += 10;
        if (p.rating) score += p.rating;

        scored.push({ product: p, score });
      }
    }

    // Sort descending by exact relevance score
    scored.sort((a, b) => b.score - a.score);

    return {
      results: scored.slice(0, 6).map((s) => s.product),
      totalMatches: scored.length,
    };
  }, [allProducts, query, searchTokens]);

  // Reset keyboard selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const handleSelect = (product) => {
    navigate(`/products/${product.id}`);
    onClose();
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (selectedIndex >= 0 && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
      return;
    }
    if (query.trim()) {
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      }
    }
  };

  if (!isOpen) return null;

  const defaultBestsellers = allProducts.filter((p) => p.is_bestseller).slice(0, 3);

  return (
    <>
      <div className="overlay search-overlay__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="search-overlay"
        role="dialog"
        aria-label="Search products"
        aria-modal="true"
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Header */}
        <form className="search-overlay__form" onSubmit={handleSubmit}>
          <Search size={20} strokeWidth={1.8} className="search-overlay__icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-overlay__input"
            placeholder="Search necklaces, rings, earrings, gold..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
            autoComplete="off"
            spellCheck="false"
          />
          {query ? (
            <button
              type="button"
              className="search-overlay__clear"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={15} strokeWidth={2} />
            </button>
          ) : (
            <span className="search-overlay__esc-hint hide-mobile">ESC to close</span>
          )}
        </form>

        {/* Results Body */}
        <div className="search-overlay__content" ref={resultsContainerRef}>
          {/* Active Search Results */}
          {query.trim().length > 0 && results.length > 0 && (
            <div className="search-overlay__results">
              <div className="search-overlay__results-header">
                <span className="search-overlay__results-label">
                  Found {totalMatches} {totalMatches === 1 ? 'piece' : 'pieces'} for &ldquo;{query.trim()}&rdquo;
                </span>
                <span className="search-overlay__results-tip hide-mobile">
                  Use ↑ ↓ to navigate, Enter to select
                </span>
              </div>

              <ul className="search-overlay__list" role="listbox">
                {results.map((product, idx) => (
                  <li key={product.id} role="option" aria-selected={selectedIndex === idx}>
                    <button
                      type="button"
                      className={`search-overlay__result-item ${selectedIndex === idx ? 'active' : ''}`}
                      onClick={() => handleSelect(product)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <img
                        src={product.thumbnail || product.image}
                        alt={product.name}
                        className="search-overlay__result-img"
                        loading="lazy"
                      />
                      <div className="search-overlay__result-info">
                        <div className="search-overlay__result-top">
                          <span className="search-overlay__result-category">
                            {product.category}
                          </span>
                          {product.is_bestseller && (
                            <span className="search-overlay__result-pill">Bestseller</span>
                          )}
                        </div>
                        <span className="search-overlay__result-name">
                          {highlightMatches(product.name, searchTokens)}
                        </span>
                        <span className="search-overlay__result-price">
                          ₹{Number(product.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <ArrowRight size={16} strokeWidth={1.8} className="search-overlay__result-arrow" />
                    </button>
                  </li>
                ))}
              </ul>

              {totalMatches > results.length && (
                <div className="search-overlay__view-more">
                  <button
                    type="button"
                    className="search-overlay__view-more-btn"
                    onClick={handleSubmit}
                  >
                    View all {totalMatches} results in Shop
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No Results Found State */}
          {query.trim().length > 0 && results.length === 0 && (
            <div className="search-overlay__no-results">
              <div className="search-overlay__no-results-icon">
                <Search size={28} strokeWidth={1.4} />
              </div>
              <p className="search-overlay__no-results-title">
                No exact pieces found for &ldquo;{query}&rdquo;
              </p>
              <p className="search-overlay__no-results-hint">
                Try searching for a general keyword like <em>rings</em>, <em>emerald</em>, <em>necklace</em>, or <em>earrings</em>.
              </p>
              <div className="search-overlay__trending-chips search-overlay__trending-chips--center">
                {TRENDING_SEARCHES.slice(0, 5).map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="search-trending-chip"
                    onClick={() => {
                      setQuery(term);
                      inputRef.current?.focus();
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty Query Default State: Trending Searches & Bestseller Suggestions */}
          {query.trim().length === 0 && (
            <div className="search-overlay__default-state">
              <div className="search-overlay__trending-section">
                <div className="search-overlay__section-title">
                  <TrendingUp size={14} className="search-overlay__section-icon" />
                  <span>Popular Searches</span>
                </div>
                <div className="search-overlay__trending-chips">
                  {TRENDING_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      className="search-trending-chip"
                      onClick={() => {
                        setQuery(term);
                        inputRef.current?.focus();
                      }}
                    >
                      <Tag size={12} className="search-chip-icon" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {defaultBestsellers.length > 0 && (
                <div className="search-overlay__bestsellers-section">
                  <div className="search-overlay__section-title">
                    <Sparkles size={14} className="search-overlay__section-icon" />
                    <span>Trending Pieces</span>
                  </div>
                  <div className="search-overlay__bestsellers-list">
                    {defaultBestsellers.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="search-overlay__mini-card"
                        onClick={() => handleSelect(product)}
                      >
                        <img
                          src={product.thumbnail || product.image}
                          alt={product.name}
                          className="search-overlay__mini-img"
                        />
                        <div className="search-overlay__mini-info">
                          <span className="search-overlay__mini-name">{product.name}</span>
                          <span className="search-overlay__mini-price">
                            ₹{Number(product.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
