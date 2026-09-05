import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Truck, RotateCcw, Star } from 'lucide-react';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import { useFeaturedProducts, useBestsellers } from '../../hooks/useProducts';
import './Home.css';

// Hero section
function Hero() {
  return (
    <section className="hero" aria-label="Hero">
      <div className="container hero__inner">
        <div className="hero__content">
          <span className="eyebrow hero__eyebrow">The Art of Elegance</span>
          <h1 className="hero__heading">
            Timeless Elegance,<br className="hero__br" />
            Beautifully Yours
          </h1>
          <p className="hero__desc">
            Discover thoughtfully designed pieces that add a touch of sophistication to every moment.
          </p>
          <Link to="/shop" className="btn btn-primary btn-lg hero__cta">
            Explore Collection
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
        <div className="hero__image-wrap">
          <img
            src="/src/assets/products/1/1.jpeg"
            alt="Emerald Luxe Tennis Necklace — Jewels N' Joys hero piece"
            className="hero__image"
            loading="eager"
          />
          <div className="hero__image-badge">
            <Star size={12} fill="currentColor" strokeWidth={0} />
            <span>New Collection</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Why Choose Us
const PILLARS = [
  { icon: Shield,    title: 'Premium Quality',      desc: 'Every piece is crafted with long-lasting PVD plating for durability.' },
  { icon: Truck,     title: 'Fast Delivery',        desc: 'Express and standard shipping options across India.' },
  { icon: RotateCcw, title: 'Easy Returns',          desc: 'Hassle-free returns within 15 days of delivery.' },
  { icon: Star,      title: 'Thoughtful Design',    desc: 'Each piece is designed to feel elegant, personal, and timeless.' },
];

function WhyChooseUs() {
  return (
    <section className="section why-us" aria-labelledby="why-us-title">
      <div className="container">
        <div className="section-header">
          <span className="eyebrow">Why Choose Us</span>
          <h2 className="section-title" id="why-us-title">Crafted for You</h2>
        </div>
        <div className="why-us__grid">
          {PILLARS.map((pillar) => (
            <div className="why-us__card" key={pillar.title}>
              <div className="why-us__icon">
                <pillar.icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="why-us__card-title">{pillar.title}</h3>
              <p className="why-us__card-desc">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Brand Story
function BrandStory() {
  return (
    <section className="section brand-story" aria-labelledby="brand-story-title">
      <div className="container brand-story__inner">
        <div className="brand-story__image-col">
          <div className="brand-story__image-stack">
            <img
              src="/src/assets/products/3/1.jpeg"
              alt="Royal Pink Heart Crown Necklace"
              className="brand-story__img brand-story__img--main"
            />
            <img
              src="/src/assets/products/4/1.jpeg"
              alt="Onyx Solitaire Medallion Necklace"
              className="brand-story__img brand-story__img--accent"
            />
          </div>
        </div>
        <div className="brand-story__content">
          <span className="eyebrow">Our Story</span>
          <h2 className="section-title" id="brand-story-title">
            Jewellery that tells your story
          </h2>
          <div className="divider divider-left" aria-hidden="true" />
          <p className="brand-story__text">
            At Jewels N&apos; Joys, every piece begins with a simple belief — that elegance should
            feel effortless. We design jewellery that moves with you, from quiet mornings to
            celebratory evenings.
          </p>
          <p className="brand-story__text">
            Each necklace in our collection is thoughtfully designed to pair sophistication with
            everyday wearability. Our pieces feature long-lasting PVD plating, carefully selected
            decorative stones, and finishes built to endure.
          </p>
          <Link to="/about" className="btn btn-ghost">
            Learn More About Us
          </Link>
        </div>
      </div>
    </section>
  );
}

// CTA Banner
function CTABanner() {
  return (
    <section className="cta-banner" aria-labelledby="cta-title">
      <div className="container cta-banner__inner">
        <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Limited Collection</span>
        <h2 className="cta-banner__heading" id="cta-title">
          Find Your Perfect Piece
        </h2>
        <p className="cta-banner__desc">
          Browse our complete collection of thoughtfully designed jewellery.
        </p>
        <Link to="/shop" className="btn btn-primary btn-lg">
          Shop All Pieces
        </Link>
      </div>
    </section>
  );
}

// Main Home page
export default function Home() {
  const { products: featured, loading: featuredLoading, error: featuredError } = useFeaturedProducts();
  const { products: bestsellers, loading: bsLoading, error: bsError } = useBestsellers();

  return (
    <div className="home-page">
      <Hero />

      {/* Featured Collection */}
      <section className="section" aria-labelledby="featured-title">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">New Arrivals</span>
            <h2 className="section-title" id="featured-title">Featured Collection</h2>
            <p className="section-desc">
              Our most beloved pieces, crafted for every occasion.
            </p>
          </div>
          <ProductGrid
            products={featured}
            loading={featuredLoading}
            error={featuredError}
          />
          <div className="section-cta">
            <Link to="/shop" className="btn btn-secondary">
              View All Pieces
            </Link>
          </div>
        </div>
      </section>

      <BrandStory />

      {/* Best Sellers */}
      <section className="section section--beige" aria-labelledby="bestsellers-title">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Most Loved</span>
            <h2 className="section-title" id="bestsellers-title">Best Sellers</h2>
          </div>
          <ProductGrid
            products={bestsellers}
            loading={bsLoading}
            error={bsError}
          />
        </div>
      </section>

      <WhyChooseUs />
      <CTABanner />
    </div>
  );
}
