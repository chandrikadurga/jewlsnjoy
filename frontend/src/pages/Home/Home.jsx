import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Check, ExternalLink, Play, Pause, Volume2, VolumeX, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import FAQSection from '../../components/FAQ/FAQSection';
import { useFeaturedProducts, useBestsellers } from '../../hooks/useProducts';
import { customizationApi } from '../../services/api';
import { resolveStoragePath } from '../../utils/imageUtils';
import { subscribeToCatalogUpdates } from '../../utils/catalogEvents';
import heroImg from '../../assets/hero-necklaces.png';
import mysteryBoxImg from '../../assets/mystery-box-banner.jpg';
import storyMainImg from '../../assets/products/3/2.jpeg';
import storyAccentImg from '../../assets/products/4/1.jpeg';
import './Home.css';


// Hero section with swipeable image carousel
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
      secondary_image_url: '',
      secondary_image_alt: "Mystery Jewellery Box - Mini, Classic & Premium Boxes",
    };
  });

  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);
  const mouseStartXRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const loadHero = () => {
      customizationApi.getCustomization().then((data) => {
        if (isMounted && data?.hero) {
          setHeroData(data.hero);
        }
      }).catch(() => {});
    };
    loadHero();
    const unsub = subscribeToCatalogUpdates(() => loadHero());
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const primaryImg = resolveStoragePath(heroData.image_url) || heroImg;
  const secondaryImg = resolveStoragePath(heroData.secondary_image_url) || mysteryBoxImg;

  // Build slides from heroData.images if provided, or default to the two hero pictures
  const slides = (heroData.images && Array.isArray(heroData.images) && heroData.images.length > 0)
    ? heroData.images.map((item, idx) => ({
        id: item.id || `slide-${idx}`,
        src: resolveStoragePath(item.image_url || item.src) || (idx === 0 ? primaryImg : secondaryImg),
        alt: item.alt || (idx === 0 ? (heroData.image_alt || "Handcrafted Gemstone Necklaces Collection - Jewels 'n' Joys") : "Mystery Jewellery Box - Jewels 'n' Joys"),
        fit: item.fit || 'cover',
        isPortrait: item.isPortrait ?? (idx === 1),
        link: item.link || (idx === 1 ? '/shop' : heroData.primary_cta_link || '/shop'),
      }))
    : [
        {
          id: 'slide-1',
          src: primaryImg,
          alt: heroData.image_alt || "Handcrafted Gemstone Necklaces Collection - Jewels 'n' Joys",
          fit: 'cover',
          isPortrait: false,
          link: heroData.primary_cta_link || '/shop',
        },
        {
          id: 'slide-2',
          src: secondaryImg,
          alt: heroData.secondary_image_alt || "Mystery Jewellery Box - Mini, Classic & Premium Boxes",
          fit: 'cover',
          isPortrait: true,
          link: '/shop',
        },
      ];

  const [slideRatios, setSlideRatios] = useState({
    0: 1,
    1: 1047 / 1280,
  });

  const handleImageLoad = (idx, e) => {
    const nw = e.target?.naturalWidth;
    const nh = e.target?.naturalHeight;
    if (nw && nh && nh > 0) {
      const ratio = nw / nh;
      setSlideRatios((prev) => {
        if (Math.abs((prev[idx] || 0) - ratio) < 0.001) return prev;
        return { ...prev, [idx]: ratio };
      });
    }
  };

  const activeRatio = slideRatios[activeSlide] ?? (slides[activeSlide]?.isPortrait ? (1047 / 1280) : 1);

  const goNext = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Touch swipe support for mobile
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
        goNext();
      } else {
        goPrev();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Mouse drag support for desktop swipe
  const handleMouseDown = (e) => {
    mouseStartXRef.current = e.clientX;
    isDraggingRef.current = true;
    setIsPaused(true);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
  };

  const handleMouseUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsPaused(false);
    if (mouseStartXRef.current !== null) {
      const diff = mouseStartXRef.current - e.clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) goNext();
        else goPrev();
      }
    }
    mouseStartXRef.current = null;
  };

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

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

          <div className="hero__gallery-col">
            <div
              className={`hero__image-wrap hero__carousel-wrap ${slides[activeSlide]?.isPortrait ? 'hero__carousel-wrap--portrait' : ''}`}
              style={{
                '--hero-aspect-ratio': `${activeRatio}`,
                aspectRatio: `${activeRatio}`,
                maxWidth: activeRatio < 0.95 ? `${Math.round(520 * Math.max(activeRatio, 0.72))}px` : '520px',
              }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <div
                className="hero__carousel-track"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {slides.map((slide, idx) => (
                  <div key={slide.id || idx} className={`hero__carousel-slide ${slide.isPortrait ? 'hero__carousel-slide--portrait' : ''}`}>
                    {slide.link ? (
                      <Link to={slide.link} className="hero__carousel-link" tabIndex={idx === activeSlide ? 0 : -1}>
                        <img
                          src={slide.src}
                          alt={slide.alt || 'Jewels n Joys'}
                          className="hero__image"
                          loading={idx === 0 ? 'eager' : 'lazy'}
                          onLoad={(e) => handleImageLoad(idx, e)}
                          onError={(e) => {
                            if (idx === 0 && e.target.src !== heroImg) e.target.src = heroImg;
                            if (idx === 1 && e.target.src !== mysteryBoxImg) e.target.src = mysteryBoxImg;
                          }}
                        />
                      </Link>
                    ) : (
                      <img
                        src={slide.src}
                        alt={slide.alt || 'Jewels n Joys'}
                        className="hero__image"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        onLoad={(e) => handleImageLoad(idx, e)}
                        onError={(e) => {
                          if (idx === 0 && e.target.src !== heroImg) e.target.src = heroImg;
                          if (idx === 1 && e.target.src !== mysteryBoxImg) e.target.src = mysteryBoxImg;
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    className="hero__carousel-arrow hero__carousel-arrow--prev"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrev(); }}
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={20} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    className="hero__carousel-arrow hero__carousel-arrow--next"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNext(); }}
                    aria-label="Next slide"
                  >
                    <ChevronRight size={20} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>

            {/* Indicator Dots: placed cleanly below the card so no words or badges are ever blocked */}
            {slides.length > 1 && (
              <div className="hero__carousel-dots">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`hero__carousel-dot ${idx === activeSlide ? 'hero__carousel-dot--active' : ''}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveSlide(idx); }}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
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
        key={item.src}
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
  const [reelsConfig, setReelsConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('jewels_store_customization');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.video_reels) return parsed.video_reels;
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    let isMounted = true;
    const loadReels = () => {
      customizationApi.getCustomization().then((data) => {
        if (isMounted && data?.video_reels) {
          setReelsConfig(data.video_reels);
        }
      }).catch(() => {});
    };
    loadReels();
    const unsub = subscribeToCatalogUpdates(() => loadReels());
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  if (reelsConfig && reelsConfig.enabled === false) {
    return null;
  }

  const eyebrow = reelsConfig?.eyebrow || 'Jewellery in Motion';
  const heading = reelsConfig?.heading || "See Jewels 'n' Joys in Real Life";
  const description = reelsConfig?.description || "Witness the mirror-like polish, waterproof resistance, and subtle movement of our handcrafted pieces.";
  const rawVideos = reelsConfig?.videos && Array.isArray(reelsConfig.videos) && reelsConfig.videos.length > 0
    ? reelsConfig.videos
    : REEL_VIDEOS;

  const videos = rawVideos.map((item, idx) => ({
    ...item,
    id: item.id || `reel-${idx}`,
    src: resolveStoragePath(item.src || item.video_url || item.url) || item.src,
  }));

  return (
    <section className="section home-reels-section" aria-labelledby="reels-title">
      <div className="container">
        <div className="section-header">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="section-title" id="reels-title">
            {heading}
          </h2>
          <p className="section-desc">
            {description}
          </p>
        </div>

        <div className="home-reels-grid">
          {videos.map((item) => (
            <ReelCard key={item.id || item.src} item={item} />
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
      <FAQSection />
      <CTABanner />
    </div>
  );
}
