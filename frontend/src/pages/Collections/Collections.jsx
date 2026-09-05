import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Gem, Layers, Sparkles } from 'lucide-react';
import './Collections.css';

const SIGNATURE_COLLECTIONS = [
  {
    id: 'necklaces',
    name: 'Necklaces & Chains',
    tagline: '18K Gold PVD • Waterproof',
    desc: 'Liquid gold herringbone, statement pendants, chokers & solitaires.',
    count: '45+ Styles',
    image: '/products/1/3.jpeg',
    link: '/shop?category=Necklaces',
    featuredTag: 'Bestseller Edit',
  },
  {
    id: 'earrings',
    name: 'Statement & Daily Earrings',
    tagline: 'Hypoallergenic • Titanium Steel',
    desc: 'Hollow heart silhouettes, four-leaf clovers, huggies & drops.',
    count: '15+ Styles',
    image: '/products/15/1.jpeg',
    link: '/shop?category=Earrings',
    featuredTag: 'Sensitive Skin Safe',
  },
  {
    id: 'rings',
    name: 'Cocktail & Crystal Rings',
    tagline: 'Adjustable Comfort Fit',
    desc: 'Marquise-cut rainbow crystals, solitaire bands & cocktail rings.',
    count: '12+ Styles',
    image: '/products/8/2.jpeg',
    link: '/shop?category=Rings',
    featuredTag: 'Trending Now',
  },
  {
    id: 'layered',
    name: 'Royal Crown & Layered Sets',
    tagline: 'Fairytale Crystals & Layering',
    desc: 'Regal crown heart zircons, dual-strand herringbone & medallion sets.',
    count: '20+ Styles',
    image: '/products/6/2.jpeg',
    link: '/shop?style=Luxury',
    featuredTag: 'Curated Sets',
  },
];

const CURATED_LOOKS = [
  {
    id: 1,
    title: 'Emerald Luxe Tennis Necklace',
    price: '₹799',
    collection: 'Necklaces & Chains',
    image: '/products/1/3.jpeg',
    badge: '18K Gold Plated',
    link: '/products/1',
  },
  {
    id: 3,
    title: 'Royal Crown Pink Crystal Necklace',
    price: '₹649',
    collection: 'Royal Crown Series',
    image: '/products/3/2.jpeg',
    badge: 'Faceted Zircon',
    link: '/products/3',
  },
  {
    id: 8,
    title: 'Rainbow Bloom Marquise Crystal Ring',
    price: '₹499',
    collection: 'Cocktail Rings',
    image: '/products/8/2.jpeg',
    badge: 'Adjustable Band',
    link: '/products/8',
  },
  {
    id: 6,
    title: 'Emerald Solitaire Herringbone Set',
    price: '₹849',
    collection: 'Layered Sets',
    image: '/products/6/2.jpeg',
    badge: 'Dual Chain',
    link: '/products/6',
  },
  {
    id: 15,
    title: 'Minimalist Hollow Heart Studs',
    price: '₹449',
    collection: 'Daily Earrings',
    image: '/products/15/1.jpeg',
    badge: 'Featherlight',
    link: '/products/15',
  },
  {
    id: 2,
    title: 'Midnight Heart Pendant Necklace',
    price: '₹599',
    collection: 'Romantic Edits',
    image: '/products/2/2.jpeg',
    badge: 'Onyx Heart',
    link: '/products/2',
  },
];

export default function Collections() {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const displayedLooks = selectedFilter === 'all'
    ? CURATED_LOOKS
    : CURATED_LOOKS.filter(item => {
        if (selectedFilter === 'necklaces') return item.collection.includes('Necklaces') || item.collection.includes('Romantic');
        if (selectedFilter === 'earrings') return item.collection.includes('Earrings');
        if (selectedFilter === 'rings') return item.collection.includes('Rings');
        if (selectedFilter === 'sets') return item.collection.includes('Royal') || item.collection.includes('Layered');
        return true;
      });

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
            Thoughtfully designed jewellery edits created to inspire your style — from waterproof 18K gold daily staples to fairytale crown crystal statements.
          </p>
        </div>
      </section>

      {/* Signature Collection Cards with Luxury Photos */}
      <section className="collections-categories-section">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Signature Edits</span>
            <h2 className="section-title">Shop by Collection</h2>
            <p className="section-desc">
              Explore our themed edits crafted with long-lasting PVD plating and timeless elegance.
            </p>
          </div>

          <div className="collections-category-grid">
            {SIGNATURE_COLLECTIONS.map((col) => (
              <Link key={col.id} to={col.link} className="collections-cat-card">
                <div className="collections-cat-card__media">
                  <img
                    src={col.image}
                    alt={col.name}
                    className="collections-cat-card__img"
                    loading="lazy"
                  />
                  <span className="collections-cat-card__badge">{col.featuredTag}</span>
                  <span className="collections-cat-card__count">{col.count}</span>
                </div>
                <div className="collections-cat-card__info">
                  <span className="collections-cat-card__tagline">{col.tagline}</span>
                  <h3 className="collections-cat-card__title">{col.name}</h3>
                  <p className="collections-cat-card__desc">{col.desc}</p>
                  <span className="collections-cat-card__action">
                    Explore Collection <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Curated Highlights Showcase */}
      <section className="collections-showcase-section">
        <div className="container">
          <div className="collections-showcase-header">
            <div>
              <span className="eyebrow">Curated Pieces</span>
              <h2 className="section-title">Collection Highlights</h2>
            </div>

            <div className="collections-filter-tabs">
              <button
                type="button"
                className={`collections-filter-tab ${selectedFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('all')}
              >
                All Highlights
              </button>
              <button
                type="button"
                className={`collections-filter-tab ${selectedFilter === 'necklaces' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('necklaces')}
              >
                Necklaces
              </button>
              <button
                type="button"
                className={`collections-filter-tab ${selectedFilter === 'earrings' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('earrings')}
              >
                Earrings
              </button>
              <button
                type="button"
                className={`collections-filter-tab ${selectedFilter === 'rings' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('rings')}
              >
                Rings
              </button>
              <button
                type="button"
                className={`collections-filter-tab ${selectedFilter === 'sets' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('sets')}
              >
                Royal &amp; Sets
              </button>
            </div>
          </div>

          <div className="collections-looks-grid">
            {displayedLooks.map((item) => (
              <Link key={item.id} to={item.link} className="collections-look-card">
                <div className="collections-look-card__media">
                  <img src={item.image} alt={item.title} className="collections-look-card__img" />
                  <span className="collections-look-card__badge">{item.badge}</span>
                </div>
                <div className="collections-look-card__meta">
                  <span className="collections-look-card__collection">{item.collection}</span>
                  <h4 className="collections-look-card__title">{item.title}</h4>
                  <div className="collections-look-card__footer">
                    <span className="collections-look-card__price">{item.price}</span>
                    <span className="collections-look-card__cta">View Piece &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="collections-bottom-cta">
            <Link to="/shop" className="btn btn-primary btn-lg">
              View All 80+ Pieces in Shop
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      {/* Assurance Footer Bar - Fixed Text Contrast & Spacing */}
      <section className="collections-assurance-bar">
        <div className="container collections-assurance-inner">
          <div className="collections-assurance-item">
            <ShieldCheck size={20} className="assurance-icon" />
            <span className="assurance-text">Anti-Tarnish &amp; Waterproof PVD Plated</span>
          </div>
          <div className="collections-assurance-item">
            <Gem size={20} className="assurance-icon" />
            <span className="assurance-text">18K Gold Plated Titanium Stainless Steel</span>
          </div>
          <div className="collections-assurance-item">
            <Layers size={20} className="assurance-icon" />
            <span className="assurance-text">Dispatched in 1–3 Working Days</span>
          </div>
        </div>
      </section>
    </div>
  );
}
