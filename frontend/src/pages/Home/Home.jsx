import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Check, ExternalLink, Play, Pause, Volume2, VolumeX, Sparkles } from 'lucide-react';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import { useFeaturedProducts, useBestsellers } from '../../hooks/useProducts';
import heroImg from '../../assets/hero-necklaces.png';
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
              alt="Handcrafted Gemstone Necklaces Collection - Jewels 'n' Joys"
              className="hero__image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Store Perks & Promises Banner (Easy Return, Free Shipping, COD)
function StorePerks() {
  return (
    <section className="section section--perks why-us" aria-label="Store Benefits & Promises">
      <div className="container">
        <div className="home-perks-banner">
          <div className="home-perk-item">
            <div className="home-perk-icon" aria-hidden="true">
              <svg width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18h7M4 25h9M8 32h5" />
                <path d="M29 10l12 6.5v13.5l-12 6.5-12-6.5V16.5L29 10z" />
                <path d="M29 10v13.5" />
                <path d="M41 16.5l-12 7-12-7" />
                <circle cx="23" cy="41" r="2" />
                <circle cx="35" cy="41" r="2" />
                <path d="M25 41h8" />
              </svg>
            </div>
            <h3 className="home-perk-title">EASY RETURN</h3>
            <p className="home-perk-sub">& EXCHANGE</p>
          </div>

          <div className="home-perk-item">
            <div className="home-perk-icon" aria-hidden="true">
              <svg width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 16h8M3 23h10M6 30h7" />
                <rect x="15" y="12" width="18" height="19" rx="2" />
                <path d="M33 18h6a2 2 0 0 1 1.6.8l3.4 4.7V31h-11V18z" />
                <path d="M37 24h5" />
                <circle cx="21" cy="35" r="3.5" />
                <circle cx="38" cy="35" r="3.5" />
                <path d="M24.5 35h10" />
              </svg>
            </div>
            <h3 className="home-perk-title">FREE SHIPPING</h3>
            <p className="home-perk-sub">ON ORDERS ABOVE ₹999/-</p>
          </div>

          <div className="home-perk-item">
            <div className="home-perk-icon" aria-hidden="true">
              <svg width="42" height="42" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="19" y="7" width="18" height="9" rx="1.5" transform="rotate(-6 28 11.5)" />
                <circle cx="28" cy="11.5" r="2" />
                <rect x="20" y="20" width="16" height="11" rx="1.5" />
                <path d="M28 20v11" />
                <path d="M20 25.5h16" />
                <path d="M9 28h8l5 4h12a3 3 0 0 1 3 3v1H18l-6-4H9v-4z" />
              </svg>
            </div>
            <h3 className="home-perk-title">COD AVAILABLE</h3>
            <p className="home-perk-sub">ON ALL ORDERS</p>
          </div>
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

// Video Showcase Section (Reels)
const REEL_VIDEOS = [
  {
    id: 1,
    src: '/videos/1.mp4',
    title: 'Signature Radiance',
    tag: '18K Gold Plated',
    desc: 'Crafted with premium PVD coating for everlasting warmth and brilliance.',
  },
  {
    id: 2,
    src: '/videos/2.mp4',
    title: 'Waterproof Perfection',
    tag: 'Anti-Tarnish',
    desc: 'Shower, swim, and live freely without losing your golden glow.',
  },
  {
    id: 3,
    src: '/videos/3.mp4',
    title: 'Handcrafted Artistry',
    tag: 'Bespoke Design',
    desc: 'Delicate stone settings designed for effortless everyday layering.',
  },
  {
    id: 4,
    src: '/videos/4.mp4',
    title: 'Unboxing The Joy',
    tag: 'Luxury Boxed',
    desc: 'Delivered in our signature keepsake box, ready to gift or treasure.',
  },
];

function ReelCard({ item }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <div className="home-reel-card" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={item.src}
        className="home-reel-video"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      />

      {/* Top Overlay Badge & Sound Toggle */}
      <div className="home-reel-top">
        <span className="home-reel-tag">
          <Sparkles size={11} /> {item.tag}
        </span>
        <button
          type="button"
          className="home-reel-mute-btn"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          title={isMuted ? 'Click to unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      {/* Paused Overlay Indicator */}
      {!isPlaying && (
        <div className="home-reel-paused-overlay">
          <div className="home-reel-play-icon">
            <Play size={24} fill="currentColor" />
          </div>
        </div>
      )}

      {/* Bottom Information */}
      <div className="home-reel-bottom">
        <h3 className="home-reel-title">{item.title}</h3>
        <p className="home-reel-desc">{item.desc}</p>
      </div>
    </div>
  );
}

function VideoReelsSection() {
  return (
    <section className="section home-reels-section" aria-labelledby="reels-title">
      <div className="container">
        <div className="section-header">
          <span className="eyebrow">Jewellery in Motion</span>
          <h2 className="section-title" id="reels-title">
            See Jewels &apos;n&apos; Joys in Real Life
          </h2>
          <p className="section-desc">
            Witness the mirror-like polish, waterproof resistance, and subtle movement of our handcrafted pieces.
          </p>
        </div>

        <div className="home-reels-grid">
          {REEL_VIDEOS.map((item) => (
            <ReelCard key={item.id} item={item} />
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
            products={(featured || []).slice(0, 8)}
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
            products={(bestsellers || []).slice(0, 8)}
            loading={bsLoading}
            error={bsError}
          />
        </div>
      </section>

      {/* Verified Customer Reviews with Clickable Product Links */}
      <CustomerReviewsSection />

      {/* Video Reels Section — inserted right between CustomerReviewsSection and StorePerks */}
      <VideoReelsSection />

      <StorePerks />
      <CTABanner />
    </div>
  );
}
