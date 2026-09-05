import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Layers, ShieldCheck, Gem } from 'lucide-react';
import './Collections.css';

const CURATED_COLLECTIONS = [
  {
    id: 'anti-tarnish-luxe',
    title: 'Anti-Tarnish Everyday Luxe',
    tagline: '18K Gold PVD • Waterproof • Titanium Steel',
    description: 'Our signature liquid-gold herringbone and flat snake chains designed to withstand water, sweat, and daily life without ever fading.',
    coverImage: '/products/1/3.jpeg',
    badge: 'Signature Bestseller',
    route: '/shop?category=Necklaces',
    itemCount: '24 Pieces',
    highlights: [
      { id: 1, name: 'Emerald Luxe Tennis Necklace', price: '₹799', img: '/products/1/3.jpeg' },
      { id: 21, name: 'Dual Symphony Herringbone', price: '₹899', img: '/products/21/1.jpeg' },
      { id: 4, name: 'Onyx Solitaire Medallion', price: '₹699', img: '/products/4/1.jpeg' },
    ],
  },
  {
    id: 'royal-crown-hearts',
    title: 'The Royal Crown & Heart Series',
    tagline: 'Faceted Zircons • Regal Motifs • Romantic Accents',
    description: 'Enchanting crown pendants and faceted heart zircons crafted for fairytale moments, romantic dates, and regal elegance.',
    coverImage: '/products/3/2.jpeg',
    badge: 'Editorial Favorite',
    route: '/shop?style=Romantic',
    itemCount: '16 Pieces',
    highlights: [
      { id: 3, name: 'Royal Crown Pink Crystal', price: '₹649', img: '/products/3/2.jpeg' },
      { id: 2, name: 'Midnight Heart Pendant', price: '₹599', img: '/products/2/2.jpeg' },
      { id: 15, name: 'Hollow Heart Studs', price: '₹449', img: '/products/15/1.jpeg' },
    ],
  },
  {
    id: 'emerald-solitaire',
    title: 'The Emerald & Solitaire Edit',
    tagline: 'Vivid Gemstones • High-Gloss Crystals • Opulence',
    description: 'Deep royal emerald greens and sparkling solitaires set against polished warm gold. The ultimate tribute to classic high jewellery.',
    coverImage: '/products/6/2.jpeg',
    badge: 'Luxury Edit',
    route: '/shop?style=Luxury',
    itemCount: '18 Pieces',
    highlights: [
      { id: 6, name: 'Emerald Statement Choker', price: '₹849', img: '/products/6/2.jpeg' },
      { id: 1, name: 'Emerald Luxe Tennis Necklace', price: '₹799', img: '/products/1/3.jpeg' },
      { id: 9, name: 'Princess Cut Solitaire Set', price: '₹749', img: '/products/9/1.jpeg' },
    ],
  },
  {
    id: 'crystal-rings',
    title: 'Marquise & Cocktail Rings',
    tagline: 'Adjustable Comfort • Multi-Color Crystals • Statement Bands',
    description: 'Sculpted bands crowned with marquise-cut rainbow crystals and delicate solitaire crowns. Designed to fit effortlessly with adjustable sizing.',
    coverImage: '/products/8/2.jpeg',
    badge: 'New Arrivals',
    route: '/shop?category=Rings',
    itemCount: '12 Pieces',
    highlights: [
      { id: 8, name: 'Rainbow Bloom Marquise Ring', price: '₹499', img: '/products/8/2.jpeg' },
      { id: 18, name: 'Emerald Halo Cocktail Ring', price: '₹549', img: '/products/18/1.jpeg' },
      { id: 24, name: 'Twisted Gold Solitaire Band', price: '₹479', img: '/products/24/1.jpeg' },
    ],
  },
  {
    id: 'earrings-gallery',
    title: 'Hypoallergenic Studs & Drops',
    tagline: 'Featherlight • Sensitive Skin Safe • Everyday Charm',
    description: 'Irritation-free titanium studs, elegant drops, and minimalist huggies. Crafted for sensitive ears and round-the-clock comfort.',
    coverImage: '/products/15/1.jpeg',
    badge: 'Daily Essentials',
    route: '/shop?category=Earrings',
    itemCount: '15 Pieces',
    highlights: [
      { id: 15, name: 'Hollow Heart Silhouette Studs', price: '₹449', img: '/products/15/1.jpeg' },
      { id: 14, name: 'Clover Bloom Drop Earrings', price: '₹499', img: '/products/14/1.jpeg' },
      { id: 13, name: 'Solitaire Crystal Huggies', price: '₹429', img: '/products/13/1.jpeg' },
    ],
  },
];

const CATEGORY_SHORTCUTS = [
  { name: 'All Necklaces', desc: 'Chains, pendants & chokers', link: '/shop?category=Necklaces', count: '45+ styles' },
  { name: 'Statement Earrings', desc: 'Studs, huggies & danglers', link: '/shop?category=Earrings', count: '15+ styles' },
  { name: 'Cocktail Rings', desc: 'Adjustable crystal rings', link: '/shop?category=Rings', count: '12+ styles' },
  { name: 'Bracelets & Bangles', desc: 'Liquid gold herringbone', link: '/shop?category=Bracelets', count: '8+ styles' },
];

export default function Collections() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredCollections = activeFilter === 'all'
    ? CURATED_COLLECTIONS
    : CURATED_COLLECTIONS.filter(c => c.id === activeFilter);

  return (
    <div className="collections-page">
      {/* Editorial Header */}
      <section className="collections-hero">
        <div className="container">
          <span className="eyebrow collections-hero__eyebrow">Curated Universes</span>
          <h1 className="collections-hero__title">
            Explore Signature<br /><em>Collections</em>
          </h1>
          <p className="collections-hero__subtitle">
            Thoughtfully assembled edits created to inspire your style — from waterproof 18K gold daily staples to fairytale crown crystal statements.
          </p>

          <div className="collections-hero__filter-chips">
            <button
              type="button"
              className={`collections-chip ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Edits ({CURATED_COLLECTIONS.length})
            </button>
            {CURATED_COLLECTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`collections-chip ${activeFilter === c.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(c.id)}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Collections Grid */}
      <section className="collections-grid-section">
        <div className="container">
          <div className="collections-list">
            {filteredCollections.map((col, idx) => (
              <article key={col.id} className={`collection-card ${idx % 2 !== 0 ? 'collection-card--reversed' : ''}`}>
                <div className="collection-card__media">
                  <img
                    src={col.coverImage}
                    alt={col.title}
                    className="collection-card__cover"
                    loading="lazy"
                  />
                  <span className="collection-card__badge">{col.badge}</span>
                  <span className="collection-card__count">{col.itemCount}</span>
                </div>

                <div className="collection-card__content">
                  <span className="collection-card__tagline">{col.tagline}</span>
                  <h2 className="collection-card__title">{col.title}</h2>
                  <p className="collection-card__desc">{col.description}</p>

                  {/* Highlights Mini Grid */}
                  <div className="collection-card__highlights">
                    <span className="collection-highlights__label">Featured in this edit:</span>
                    <div className="collection-highlights__grid">
                      {col.highlights.map((item) => (
                        <Link
                          key={item.id}
                          to={`/products/${item.id}`}
                          className="collection-highlight-item"
                          title={`View ${item.name}`}
                        >
                          <img
                            src={item.img}
                            alt={item.name}
                            className="collection-highlight-item__img"
                          />
                          <div className="collection-highlight-item__meta">
                            <span className="collection-highlight-item__name">{item.name}</span>
                            <span className="collection-highlight-item__price">{item.price}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="collection-card__actions">
                    <Link to={col.route} className="btn btn-primary btn-lg">
                      Explore Full Collection
                      <ArrowRight size={16} strokeWidth={2} />
                    </Link>
                    <Link to="/shop" className="btn btn-secondary btn-lg">
                      View All Jewellery
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Category Fast Navigation */}
      <section className="collections-categories-section section--beige">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Category Directory</span>
            <h2 className="section-title">Shop by Category</h2>
            <p className="section-desc">
              Looking for a specific piece? Dive straight into our full catalogues.
            </p>
          </div>

          <div className="collections-category-grid">
            {CATEGORY_SHORTCUTS.map((cat) => (
              <Link key={cat.name} to={cat.link} className="collections-cat-card">
                <div className="collections-cat-card__info">
                  <h3 className="collections-cat-card__title">{cat.name}</h3>
                  <p className="collections-cat-card__desc">{cat.desc}</p>
                  <span className="collections-cat-card__count">{cat.count}</span>
                </div>
                <span className="collections-cat-card__arrow">
                  <ArrowRight size={18} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Assurance Footer Bar */}
      <section className="collections-assurance-bar">
        <div className="container collections-assurance-inner">
          <div className="collections-assurance-item">
            <ShieldCheck size={20} className="assurance-icon" />
            <span>Anti-Tarnish &amp; Waterproof PVD Plated</span>
          </div>
          <div className="collections-assurance-item">
            <Gem size={20} className="assurance-icon" />
            <span>18K Gold Plated Titanium Stainless Steel</span>
          </div>
          <div className="collections-assurance-item">
            <Layers size={20} className="assurance-icon" />
            <span>Dispatched in 1–3 Working Days</span>
          </div>
        </div>
      </section>
    </div>
  );
}
