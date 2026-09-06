import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import { useProducts } from '../../hooks/useProducts';
import { FALLBACK_PRODUCTS } from '../../data/products';
import './Shop.css';

const CATEGORIES = ['All', 'Necklaces', 'Earrings', 'Rings', 'Bracelets'];
const STYLES     = ['Minimal', 'Luxury', 'Romantic', 'Floral', 'Everyday', 'Statement', 'Classic', 'Bridal', 'Vintage', 'Chic'];
const PRICE_RANGES = [
  { label: 'Under ₹500',   min: 0,    max: 500  },
  { label: '₹500–₹750',   min: 500,  max: 750  },
  { label: '₹750–₹1,000', min: 750,  max: 1000 },
  { label: 'Above ₹1,000', min: 1000, max: Infinity },
];
const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured'         },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating',     label: 'Top Rated'         },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [category,   setCategory]   = useState(searchParams.get('category') || 'All');
  const [style,      setStyle]       = useState('');
  const [priceRange, setPriceRange]  = useState(null);
  const [sort,       setSort]        = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery] = useState(searchParams.get('search') || '');

  // Fetch all products — client-side filtering
  const { products: allProducts, loading, error } = useProducts();

  // Use fallback if API fails
  const source = (error || allProducts.length === 0) ? FALLBACK_PRODUCTS : allProducts;

  const filtered = useMemo(() => {
    let list = [...source];

    // Immediately exclude out-of-stock items (units = 0 or marked in_stock = false)
    list = list.filter((p) => p.in_stock !== false && (p.stock_quantity === undefined || p.stock_quantity > 0));

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Category
    if (category && category !== 'All') {
      list = list.filter((p) => p.category === category);
    }

    // Style
    if (style) {
      list = list.filter((p) => p.style.includes(style));
    }

    // Price
    if (priceRange) {
      list = list.filter(
        (p) => p.price >= priceRange.min && p.price <= priceRange.max
      );
    }

    // Sort
    switch (sort) {
      case 'price_asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating':     list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'featured':
      default:
        list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
        break;
    }

    return list;
  }, [source, category, style, priceRange, sort, searchQuery]);

  const clearFilters = () => {
    setCategory('All');
    setStyle('');
    setPriceRange(null);
    setSort('featured');
  };

  const hasActiveFilters = category !== 'All' || style || priceRange;

  return (
    <div className="shop-page">
      {/* Page Header */}
      <div className="shop-page__hero">
        <div className="container">
          <span className="eyebrow">Our Collection</span>
          <h1 className="shop-page__title">
            {searchQuery ? `Results for "${searchQuery}"` : 'Shop'}
          </h1>
          <p className="shop-page__desc">
            Discover pieces designed to elevate every moment.
          </p>
        </div>
      </div>

      <div className="container shop-page__layout">
        {/* Sidebar Filters */}
        <aside className={`shop-filters${filtersOpen ? ' shop-filters--open' : ''}`} aria-label="Product filters">
          <div className="shop-filters__inner">
            <div className="shop-filters__header">
              <h2 className="shop-filters__title">Filters</h2>
              {hasActiveFilters && (
                <button className="shop-filters__clear" onClick={clearFilters}>
                  Clear all
                </button>
              )}
            </div>

            {/* Category */}
            <div className="shop-filter-group">
              <h3 className="shop-filter-group__title">Category</h3>
              <ul className="shop-filter-group__list">
                {CATEGORIES.map((cat) => (
                  <li key={cat}>
                    <button
                      className={`shop-filter-btn${category === cat ? ' shop-filter-btn--active' : ''}`}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price */}
            <div className="shop-filter-group">
              <h3 className="shop-filter-group__title">Price</h3>
              <ul className="shop-filter-group__list">
                {PRICE_RANGES.map((range) => (
                  <li key={range.label}>
                    <button
                      className={`shop-filter-btn${priceRange?.label === range.label ? ' shop-filter-btn--active' : ''}`}
                      onClick={() => setPriceRange(priceRange?.label === range.label ? null : range)}
                    >
                      {range.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Style */}
            <div className="shop-filter-group">
              <h3 className="shop-filter-group__title">Style</h3>
              <ul className="shop-filter-group__list">
                {STYLES.map((s) => (
                  <li key={s}>
                    <button
                      className={`shop-filter-btn${style === s ? ' shop-filter-btn--active' : ''}`}
                      onClick={() => setStyle(style === s ? '' : s)}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="shop-content">
          {/* Toolbar */}
          <div className="shop-toolbar">
            <div className="shop-toolbar__left">
              <button
                className="shop-toolbar__filter-toggle hide-desktop"
                onClick={() => setFiltersOpen(!filtersOpen)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal size={16} strokeWidth={1.5} />
                Filters
                {hasActiveFilters && <span className="shop-toolbar__filter-count">•</span>}
              </button>
              <p className="shop-toolbar__count">
                {filtered.length} piece{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="shop-toolbar__sort">
              <label htmlFor="sort-select" className="sr-only">Sort by</label>
              <div className="shop-sort-select">
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="shop-sort-select__input"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="shop-sort-select__icon" />
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="shop-active-filters">
              {category !== 'All' && (
                <button className="shop-filter-chip" onClick={() => setCategory('All')}>
                  {category} <X size={12} strokeWidth={2.5} />
                </button>
              )}
              {style && (
                <button className="shop-filter-chip" onClick={() => setStyle('')}>
                  {style} <X size={12} strokeWidth={2.5} />
                </button>
              )}
              {priceRange && (
                <button className="shop-filter-chip" onClick={() => setPriceRange(null)}>
                  {priceRange.label} <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}

          <ProductGrid
            products={filtered}
            loading={loading}
            error={null}
            emptyMessage="No pieces match your filters. Try removing some filters."
          />
        </div>
      </div>

      {/* Mobile filter backdrop */}
      {filtersOpen && (
        <div
          className="overlay"
          onClick={() => setFiltersOpen(false)}
          aria-hidden="true"
          style={{ zIndex: 500 }}
        />
      )}
    </div>
  );
}
