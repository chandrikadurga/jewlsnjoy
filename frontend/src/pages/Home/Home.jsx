import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Check, ExternalLink, Play, Pause, Volume2, VolumeX, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import FAQSection from '../../components/FAQ/FAQSection';
import { useFeaturedProducts, useBestsellers } from '../../hooks/useProducts';
import { customizationApi } from '../../services/api';
import heroImg from '../../assets/hero-necklaces.png';
import storyMainImg from '../../assets/products/3/2.jpeg';
import storyAccentImg from '../../assets/products/4/1.jpeg';
import './Home.css';

// Default promo banners (fallback when nothing is configured)
const DEFAULT_PROMO_BANNERS = [
  {
    id: 'default-1',
    type: 'image_only',
    image_url: '/banners/promo_gemstones.png',
    heading: 'Handcrafted Gemstone Necklaces Collection',
    cta_link: '/shop?category=Necklaces',
    enabled: true,
  },
  {
    id: 'default-2',
    type: 'overlay',
    image_url: '/products/21/1.jpeg',
    eyebrow: 'Best Seller',
    heading: 'Layered Necklaces Everyone Loves',
    description: 'Pre-layered perfection in 18K gold — the #1 choice of our customers.',
    cta_text: 'View Collection',
    cta_link: '/shop?category=Necklaces',
    enabled: true,
  },
  {
    id: 'default-3',
    type: 'overlay',
    image_url: '/products/8/2.jpeg',
    eyebrow: 'Free Shipping',
    heading: 'Rings That Sparkle, Prices That Smile',
    description: 'Free delivery on orders above ₹999. Luxury meets affordability.',
    cta_text: 'Shop Rings',
    cta_link: '/shop?category=Rings',
    enabled: true,
  },
];

// Hero section
function Hero() {
  const [heroData, setHeroData] = useState(() => {
    try {
      const cached = localStorage.getItem('jewels_store_customization');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.hero) return parsed.hero;
      }
    } catch {}
    return {
      eyebrow: 'Handcrafted Elegance',
      heading_prefix: 'Jewellery That Tells',
      heading_accent: 'Your',
      heading_suffix: 'Story',
      description: 'Timeless, anti-tarnish pieces thoughtfully designed to elevate your everyday moments.',
      primary_cta_text: 'Explore Collection',
      primary_cta_link: '/shop',
      secondary_cta_text: 'View Necklaces',
      secondary_cta_link: '/shop?category=Necklaces',
      image_url: '',
      image_alt: "Handcrafted Gemstone Necklaces Collection - Jewels 'n' Joys",
    };
  });

  useEffect(() => {
    let isMounted = true;
    customizationApi.getCustomization().then((data) => {
      if (isMounted && data?.hero) {
        setHeroData(data.hero);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const imageSrc = heroData.image_url || heroImg;

  return (
    <section className="hero" aria-label="Hero">
      <div className="container">
        <div className="hero__inner">
          <div className="hero__content">
            <span className="eyebrow hero__eyebrow">{heroData.eyebrow || 'Handcrafted Elegance'}</span>
            <h1 className="hero__heading">
              {heroData.heading_prefix || 'Jewellery That Tells'}<br className="hero__br" />
              {heroData.heading_accent ? <em>{heroData.heading_accent} </em> : null}
              {heroData.heading_suffix || 'Story'}
            </h1>
            <p className="hero__desc">
              {heroData.description || 'Timeless, anti-tarnish pieces thoughtfully designed to elevate your everyday moments.'}
            </p>
            <div className="hero__cta">
              <Link to={heroData.primary_cta_link || '/shop'} className="btn btn-primary btn-lg" id="hero-shop-btn">
                {heroData.primary_cta_text || 'Explore Collection'}
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
              <Link to={heroData.secondary_cta_link || '/shop?category=Necklaces'} className="btn btn-secondary btn-lg" id="hero-categories-btn">
                {heroData.secondary_cta_text || 'View Necklaces'}
              </Link>
            </div>
          </div>

          <div className="hero__image-wrap">
            <img
              src={imageSrc}
              alt={heroData.image_alt || "Handcrafted Gemstone Necklaces Collection - Jewels 'n' Joys"}
              className="hero__image"
              onError={(e) => {
                if (e.target.src !== heroImg) {
                  e.target.src = heroImg;
                }
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Promo Banner Carousel — auto-rotates every N seconds
function PromoBannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const durationRef = useRef(5); // default 5 seconds per slide

  // Touch swipe refs for mobile gestures
  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);

  // Fetch banners from customization API
  useEffect(() => {
    let isMounted = true;
    customizationApi.getCustomization().then((data) => {
      if (isMounted && data?.promo_banners?.slides?.length > 0) {
        // Exclude disabled slides and any stale 'Festive Collection' slide
        const enabledSlides = data.promo_banners.slides
          .filter((s) => s.enabled !== false && !s.heading?.toLowerCase().includes('festive collection'));
        if (enabledSlides.length > 0) {
          setBanners(enabledSlides);
        } else {
          setBanners(DEFAULT_PROMO_BANNERS);
        }
        if (data.promo_banners.duration_seconds) {
          durationRef.current = data.promo_banners.duration_seconds;
        }
      } else {
        setBanners(DEFAULT_PROMO_BANNERS);
      }
    }).catch(() => {
      setBanners(DEFAULT_PROMO_BANNERS);
    });
    return () => { isMounted = false; };
  }, []);

  const goTo = useCallback((idx) => {
    setActiveIndex(idx);
    setProgress(0);
  }, []);

  const goNext = useCallback(() => {
    if (banners.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % banners.length);
    setProgress(0);
  }, [banners.length]);

  const goPrev = useCallback(() => {
    if (banners.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setProgress(0);
  }, [banners.length]);

  // Mobile swipe gestures
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left -> next picture
        goNext();
      } else {
        // Swiped right -> previous picture
        goPrev();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Auto-advance timer
  useEffect(() => {
    if (banners.length <= 1 || isPaused) {
      clearInterval(intervalRef.current);
      clearInterval(progressRef.current);
      return;
    }

    const duration = durationRef.current * 1000;
    const tick = 50; // progress update every 50ms

    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (tick / duration) * 100;
        return next >= 100 ? 100 : next;
      });
    }, tick);

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
      setProgress(0);
    }, duration);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(progressRef.current);
    };
  }, [banners.length, isPaused, activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    return () => {};
  }, [goNext, goPrev]);

  if (banners.length === 0) return null;

  return (
    <section
      className="promo-carousel"
      aria-label="Promotional Banners"
      id="promo-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="promo-carousel__track">
        {banners.map((banner, idx) => {
          const isActive = idx === activeIndex;
          const isOverlay = banner.type === 'overlay';

          return (
            <div
              key={banner.id || idx}
              className={`promo-carousel__slide ${isOverlay ? 'promo-carousel__slide--overlay' : 'promo-carousel__slide--image-only'} ${isActive ? 'promo-carousel__slide--active' : ''}`}
              aria-hidden={!isActive}
            >
              {isOverlay ? (
                <>
                  <img
                    src={banner.image_url}
                    alt=""
                    className="promo-carousel__bg"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                  <div className="promo-carousel__gradient" />
                  <div className="promo-carousel__overlay-content">
                    {banner.eyebrow && (
                      <span className="promo-carousel__overlay-eyebrow">{banner.eyebrow}</span>
                    )}
                    <h2 className="promo-carousel__overlay-heading">{banner.heading}</h2>
                    {banner.description && (
                      <p className="promo-carousel__overlay-desc">{banner.description}</p>
                    )}
                    {banner.cta_text && banner.cta_link && (
                      <Link to={banner.cta_link} className="promo-carousel__overlay-cta">
                        {banner.cta_text}
                        <ArrowRight size={15} strokeWidth={2.5} />
                      </Link>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {banner.cta_link ? (
                    <Link to={banner.cta_link} className="promo-carousel__link">
                      <img
                        src={banner.image_url}
                        alt={banner.heading || 'Promotional Banner'}
                        className="promo-carousel__bg"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                      />
                    </Link>
                  ) : (
                    <img
                      src={banner.image_url}
                      alt={banner.heading || 'Promotional Banner'}
                      className="promo-carousel__bg"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Prev / Next arrows */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            className="promo-carousel__arrow promo-carousel__arrow--prev"
            onClick={goPrev}
            aria-label="Previous banner"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="promo-carousel__arrow promo-carousel__arrow--next"
            onClick={goNext}
            aria-label="Next banner"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="promo-carousel__dots">
          {banners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`promo-carousel__dot ${idx === activeIndex ? 'promo-carousel__dot--active' : ''}`}
              onClick={() => goTo(idx)}
              aria-label={`Go to banner ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {banners.length > 1 && (
        <div
          className="promo-carousel__progress"
          style={{
            width: `${progress}%`,
            transitionDuration: isPaused ? '0s' : '50ms',
          }}
        />
      )}
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
  {
    id: 5,
    src: '/videos/5.mp4',
    title: 'Everyday Sparkle',
    tag: 'Daily Luxury',
    desc: 'Effortless elegance designed to seamlessly complement your daily style.',
  },
];

function ReelCard({ item }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Use IntersectionObserver to play video only when scrolled into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

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
      <PromoBannerCarousel />

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
      <FAQSection />
      <CTABanner />
    </div>
  );
}
