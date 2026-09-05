import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Truck, RotateCcw, Star, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import { useFeaturedProducts, useBestsellers } from '../../hooks/useProducts';
import heroImg from '../../assets/products/1/3.jpeg';
import storyMainImg from '../../assets/products/3/2.jpeg';
import storyAccentImg from '../../assets/products/4/1.jpeg';
import './Home.css';

// Hero section
function Hero() {
  return (
    <section className="hero" aria-label="Hero">
      <div className="container">
        <div className="hero__inner">
          <div className="hero__content">
            <span className="eyebrow hero__eyebrow">Handcrafted Elegance</span>
            <h1 className="hero__heading">
              Jewellery That Tells<br className="hero__br" /><em>Your</em> Story
            </h1>
            <p className="hero__desc">
              Timeless, anti-tarnish pieces thoughtfully designed to elevate your everyday moments.
            </p>
            <div className="hero__cta">
              <Link to="/shop" className="btn btn-primary btn-lg" id="hero-shop-btn">
                Explore Collection
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
              <Link to="/shop?category=Necklaces" className="btn btn-secondary btn-lg" id="hero-categories-btn">
                View Necklaces
              </Link>
            </div>
          </div>

          <div className="hero__image-wrap">
            <img
              src={heroImg}
              alt="Emerald Luxe Tennis Necklace - Jewels 'n' Joys"
              className="hero__image"
            />
            <div className="hero__image-badge">
              <span>Anti-Tarnish • 18K Gold Plated</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Why Choose Us
const PILLARS = [
  { icon: Shield,      title: 'Premium Quality',      desc: 'Every piece is crafted with long-lasting PVD plating for durability.' },
  { icon: Truck,       title: 'Reliable Shipping',    desc: 'Dispatched in 1–3 working days with careful protective packaging.' },
  { icon: ShieldCheck, title: 'Damage Protection',    desc: 'Replacement support for damaged items reported within 24h with unboxing video.' },
  { icon: Star,        title: 'Thoughtful Design',    desc: 'Each piece is designed to feel elegant, personal, and timeless.' },
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
              src={storyMainImg}
              onError={(e) => { e.currentTarget.src = '/products/3/1.jpeg'; }}
              alt="Royal Pink Heart Crown Necklace"
              className="brand-story__img brand-story__img--main"
            />
            <img
              src={storyAccentImg}
              onError={(e) => { e.currentTarget.src = '/products/4/1.jpeg'; }}
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
            At Jewels &apos;n&apos; Joys, every piece begins with a simple belief — that elegance should
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

// Customer Reviews & Testimonials Section with Clickable Product Links
const HOME_REVIEWS = [
  {
    id: 1,
    author: 'Ananya Sharma',
    city: 'Mumbai',
    rating: 5,
    title: 'Zero tarnishing with daily wear!',
    comment: 'I bought the Emerald Luxe Tennis Necklace for daily styling. The 18K gold finish is warm and lustrous, and the emerald stones sparkle subtly in the sun. Truly waterproof!',
    productId: 1,
    productName: 'Emerald Luxe Tennis Necklace',
    productImage: '/products/1/3.jpeg',
    price: '₹799',
  },
  {
    id: 8,
    author: 'Priyanka Desai',
    city: 'Bengaluru',
    rating: 5,
    title: 'Breathtaking marquise crystals',
    comment: 'The Rainbow Bloom Ring is easily adjustable and fits comfortably without pinching. The colors are vivid and pair seamlessly with Indian and Western outfits.',
    productId: 8,
    productName: 'Rainbow Bloom Marquise Crystal Ring',
    productImage: '/products/8/2.jpeg',
    price: '₹499',
  },
  {
    id: 15,
    author: 'Rhea Kapoor',
    city: 'Delhi NCR',
    rating: 5,
    title: 'Featherlight & hypoallergenic',
    comment: 'I have sensitive skin that normally reacts to imitation jewelry, but these Hollow Heart Studs are completely irritation-free. I never take them off!',
    productId: 15,
    productName: 'Minimalist Hollow Heart Silhouette Studs',
    productImage: '/products/15/1.jpeg',
    price: '₹449',
  },
  {
    id: 21,
    author: 'Pooja Sharma',
    city: 'Pune',
    rating: 5,
    title: 'Pre-layered perfection',
    comment: 'The Dual Symphony Herringbone Necklace sits like liquid gold on the collarbones. Luxury packaging, fast 2-day delivery, and compliments from everyone.',
    productId: 21,
    productName: 'Dual Symphony Layered Herringbone Necklace',
    productImage: '/products/21/1.jpeg',
    price: '₹899',
  },
];

function CustomerReviewsSection() {
  return (
    <section className="section home-reviews" aria-labelledby="reviews-title">
      <div className="container">
        <div className="section-header">
          <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>What Our Customers Say</span>
          <h2 className="section-title" id="reviews-title">Loved by Thousands</h2>
          <p className="section-desc">
            Real experiences from verified buyers wearing Jewels &apos;n&apos; Joys every day.
          </p>
        </div>

        <div className="home-reviews__grid">
          {HOME_REVIEWS.map((rev) => (
            <article key={rev.id} className="home-review__card glass-panel">
              <div className="home-review__stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={15}
                    fill="#d4af37"
                    color="#d4af37"
                    strokeWidth={1.5}
                  />
                ))}
              </div>

              <h3 className="home-review__title">"{rev.title}"</h3>
              <p className="home-review__quote">{rev.comment}</p>

              <div className="home-review__author">
                <span className="home-review__author-name">{rev.author}</span>
                <span className="home-review__city">({rev.city})</span>
                <span className="badge badge-green home-review__badge">
                  <Check size={10} strokeWidth={3} />
                  Verified Buyer
                </span>
              </div>

              {/* Clickable link directly to the reviewed product */}
              <Link
                to={`/products/${rev.productId}`}
                className="home-review__product-link"
                title={`View ${rev.productName}`}
              >
                <img
                  src={rev.productImage}
                  alt={rev.productName}
                  className="home-review__product-thumb"
                  loading="lazy"
                />
                <div className="home-review__product-info">
                  <span className="home-review__product-name">{rev.productName}</span>
                  <span className="home-review__product-price">{rev.price}</span>
                </div>
                <span className="home-review__product-action">
                  View Piece <ArrowRight size={13} strokeWidth={2} />
                </span>
              </Link>
            </article>
          ))}
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

      {/* Verified Customer Reviews with Clickable Product Links */}
      <CustomerReviewsSection />

      <WhyChooseUs />
      <CTABanner />
    </div>
  );
}
