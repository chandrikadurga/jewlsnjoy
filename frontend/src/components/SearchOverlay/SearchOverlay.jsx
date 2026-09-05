import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import { FALLBACK_PRODUCTS } from '../../data/products';
import './SearchOverlay.css';

export default function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const matches = FALLBACK_PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.style.some((s) => s.toLowerCase().includes(q))
    );
    setResults(matches.slice(0, 6));
  }, [query]);

  const handleSelect = (product) => {
    navigate(`/products/${product.id}`);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="overlay search-overlay__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="search-overlay"
        role="dialog"
        aria-label="Search products"
        aria-modal="true"
      >
        <form className="search-overlay__form" onSubmit={handleSubmit}>
          <Search size={20} strokeWidth={1.5} className="search-overlay__icon" />
          <input
            ref={inputRef}
            type="search"
            className="search-overlay__input"
            placeholder="Search for jewellery…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="search-overlay__clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </form>

        {results.length > 0 && (
          <div className="search-overlay__results">
            <p className="search-overlay__results-label">
              {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </p>
            <ul className="search-overlay__list">
              {results.map((product) => (
                <li key={product.id}>
                  <button
                    className="search-overlay__result-item"
                    onClick={() => handleSelect(product)}
                  >
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      className="search-overlay__result-img"
                    />
                    <div className="search-overlay__result-info">
                      <span className="search-overlay__result-name">{product.name}</span>
                      <span className="search-overlay__result-price">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <ArrowRight size={16} strokeWidth={1.5} className="search-overlay__result-arrow" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {query.length >= 2 && results.length === 0 && (
          <div className="search-overlay__no-results">
            <p>No pieces found for &ldquo;{query}&rdquo;</p>
            <p className="search-overlay__no-results-hint">Try &ldquo;emerald&rdquo;, &ldquo;heart&rdquo;, or &ldquo;necklace&rdquo;</p>
          </div>
        )}
      </div>
    </>
  );
}
