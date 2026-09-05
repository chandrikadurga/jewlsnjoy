import ProductCard from '../ProductCard/ProductCard';
import './ProductGrid.css';

export default function ProductGrid({ products, loading, error, emptyMessage }) {
  if (loading) {
    return (
      <div className="product-grid__state">
        <div className="spinner" />
        <p className="product-grid__state-text">Loading our collection…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-grid__state">
        <p className="product-grid__state-title">We couldn&apos;t load the collection.</p>
        <p className="product-grid__state-text">Please try again in a moment.</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="product-grid__state">
        <p className="product-grid__state-title">No pieces found.</p>
        <p className="product-grid__state-text">
          {emptyMessage || 'Try adjusting your filters or search.'}
        </p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="product-grid__item fade-in-up"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
