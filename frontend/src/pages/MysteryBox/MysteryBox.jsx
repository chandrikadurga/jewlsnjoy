import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Gift, 
  Check, 
  Heart, 
  ShieldCheck, 
  Package, 
  ShoppingBag, 
  MessageCircle, 
  Star, 
  Info, 
  ChevronDown, 
  ChevronUp,
  ArrowRight,
  Gem,
  Award,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import mysteryBannerImg from '../../assets/mystery-box/mystery-pricing-banner.png';
import miniBoxPurpleImg from '../../assets/mystery-box/mini-box-purple.jpg';
import miniBoxPinkImg from '../../assets/mystery-box/mini-box-pink.jpg';
import miniBoxWhiteImg from '../../assets/mystery-box/mini-box-white.jpg';
import './MysteryBox.css';

// Tier Data Definitions
const TIERS = [
  {
    id: 'mini',
    name: 'Mini Box',
    badge: 'Starter Joy',
    tagline: 'Minimum 5 Products + Freebie',
    price: 699,
    originalPrice: 1499,
    accentColor: '#8B5CF6', // Purple/Lavender
    bgGradient: 'linear-gradient(135deg, rgba(237, 233, 254, 0.7) 0%, rgba(245, 243, 255, 0.9) 100%)',
    borderColor: '#C4B5FD',
    chipColor: '#7C3AED',
    chipBg: '#EDE9FE',
    defaultBoxColor: 'purple',
    itemsCount: 'Min. 5 Items',
    contents: [
      { count: '2', item: 'Necklaces (Pendants / Chains)' },
      { count: '1', item: 'Designer Ring' },
      { count: '1', item: 'Pair of Earrings' },
      { count: '1+', item: 'Surprise Freebie Included' },
    ],
    features: [
      'Jewellery Travel Organizer Box included',
      'Anti-Tarnish & Hypoallergenic daily wear pieces',
      'Freebie included in every box',
      'Basic Customization available (Gold / Silver tone preference)',
    ],
    recommendedFor: 'First-time buyers, everyday dainty styling, budget gifts',
  },
  {
    id: 'classic',
    name: 'Classic Box',
    badge: 'Most Popular ⭐',
    tagline: 'Minimum 8 Items + Jewellery Box + Freebie',
    price: 1299,
    originalPrice: 2799,
    accentColor: '#E07A5F', // Peach/Blush
    bgGradient: 'linear-gradient(135deg, rgba(254, 226, 226, 0.6) 0%, rgba(255, 237, 213, 0.8) 100%)',
    borderColor: '#FDBA74',
    chipColor: '#C2410C',
    chipBg: '#FFEDD5',
    isPopular: true,
    defaultBoxColor: 'pink',
    itemsCount: 'Min. 8 Items',
    contents: [
      { count: '3-4', item: 'Premium Necklaces & Pendants' },
      { count: '2', item: 'Rings (Solitaire / Stacking bands)' },
      { count: '2', item: 'Pairs of Earrings (Studs & Hoops)' },
      { count: '1', item: 'Curated Bracelet / Charm' },
      { count: '1+', item: 'Surprise Bonus Freebie' },
    ],
    features: [
      'Deluxe Velvet & Leatherette Travel Box included',
      'Anti-Tarnish, Waterproof & 18K Gold PVD Plated',
      'Balanced mix of everyday staples & statement accents',
      'Freebie gift included with special unboxing note',
      'Full Customization available (Metal preference & Ring size)',
    ],
    recommendedFor: 'Jewellery lovers, trendsetters, memorable anniversary/birthday gifts',
  },
  {
    id: 'premium',
    name: 'Premium Box',
    badge: 'Luxury Edit 👑',
    tagline: 'Minimum 10 Items + Jewellery Box + Freebie',
    price: 1699,
    originalPrice: 3999,
    accentColor: '#B45309', // Champagne Gold / Bronze
    bgGradient: 'linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, rgba(255, 251, 235, 0.9) 100%)',
    borderColor: '#FCD34D',
    chipColor: '#92400E',
    chipBg: '#FEF3C7',
    defaultBoxColor: 'white',
    itemsCount: 'Min. 10 Items',
    contents: [
      { count: '4+', item: 'Luxury Statement & Layering Necklaces' },
      { count: '2-3', item: 'Designer Cocktail & Daily Bands' },
      { count: '2-3', item: 'Premium Huggies, Drops & Hoops' },
      { count: '1-2', item: 'Chic Bangles / Cuban Link Bracelets' },
      { count: 'VIP', item: 'Exclusive Luxury Freebie + Surprise Gift' },
    ],
    features: [
      'Executive Travel Organizer with ring rolls & necklace hooks',
      'Heavy 18K Gold Plated anti-tarnish stainless steel pieces',
      'VIP Stylist Curation tailored to your personal aesthetic',
      'Deluxe surprise freebie with highest overall value',
      'Priority express packaging & personalized gifting note',
    ],
    recommendedFor: 'Ultimate jewellery indulgence, bridal trousseau, VIP luxury gifting',
  },
];

const COLOR_OPTIONS = [
  { id: 'purple', name: 'Lilac Lavender', hex: '#C8A7E4', image: miniBoxPurpleImg },
  { id: 'pink', name: 'Blush Peach', hex: '#F5B0A1', image: miniBoxPinkImg },
  { id: 'white', name: 'Pearl Ivory White', hex: '#F3EFEA', image: miniBoxWhiteImg },
];

const METAL_OPTIONS = [
  { id: 'gold', label: '18K Gold Tone', icon: '✨' },
  { id: 'silver', label: 'Silver / Platinum Tone', icon: '⚪' },
  { id: 'mix', label: 'Surprise Me / Mix of Both', icon: '💫' },
];

const VIBE_OPTIONS = [
  { id: 'minimal', label: 'Dainty & Minimal', desc: 'Subtle daily wear pieces' },
  { id: 'trendy', label: 'Trendy & Chic', desc: 'Current viral & stylish designs' },
  { id: 'statement', label: 'Bold & Statement', desc: 'Eye-catching standout pieces' },
];

const FAQS = [
  {
    q: 'What is inside the Mystery Jewellery Box?',
    a: 'Each mystery box is a hand-curated surprise collection of our best-selling, premium anti-tarnish jewellery pieces neatly arranged inside a multi-compartment travel organizer box. Depending on the tier you choose (Mini, Classic, or Premium), you will receive between 5 to 10+ jewellery pieces (necklaces, earrings, rings, bracelets) plus an extra surprise freebie!',
  },
  {
    q: 'Can I customize or mention my preferences?',
    a: 'Yes, absolutely! You can choose your preferred jewellery metal tone (Gold, Silver, or Mix), your preferred box color (Lilac Lavender, Blush Peach, or Pearl White), and even your style vibe. If you have specific preferences (such as ring size or pierced ears only), you can type them in the Customization Notes or message us directly on WhatsApp!',
  },
  {
    q: 'Is the jewellery anti-tarnish and skin-safe?',
    a: 'Yes, 100%! All Jewels \'n\' Joys jewellery is crafted with high-grade stainless steel with 18K gold PVD plating. It is waterproof, sweatproof, hypoallergenic, and nickel/lead-free — guaranteed not to turn your skin green or lose its shine.',
  },
  {
    q: 'Is the travel jewellery box included in the price?',
    a: 'Yes! The organizer box itself is included with every mystery box. It features necklace hooks, anti-tangle elastic pockets, ring rolls, and removable divider compartments to keep your precious jewellery safe and organized wherever you travel.',
  },
  {
    q: 'How does this compare to buying items individually?',
    a: 'Every mystery box is guaranteed to contain jewellery worth much more than what you pay. For example, our Mini Box (₹699) contains pieces worth ₹1,499+, the Classic Box (₹1299) contains pieces worth ₹2,799+, and the Premium Box (₹1699) contains items worth ₹3,999+! It is our best value offering.',
  },
  {
    q: 'Can I order this directly on WhatsApp or as a gift for someone?',
    a: 'Yes! You can order directly on the website with online payment / COD, or click "Order via WhatsApp" to chat with us directly. If you are gifting, let us know and we will include a complimentary handwritten gift card!',
  },
];

export default function MysteryBox() {
  const { addToCart } = useCart();

  // Active selections
  const [selectedTierId, setSelectedTierId] = useState('classic');
  const [selectedColorId, setSelectedColorId] = useState('pink');
  const [selectedMetal, setSelectedMetal] = useState('gold');
  const [selectedVibe, setSelectedVibe] = useState('minimal');
  const [customNotes, setCustomNotes] = useState('');
  const [openFaq, setOpenFaq] = useState(null);
  const [addedToast, setAddedToast] = useState(false);

  const activeTier = TIERS.find((t) => t.id === selectedTierId) || TIERS[1];
  const activeColor = COLOR_OPTIONS.find((c) => c.id === selectedColorId) || COLOR_OPTIONS[1];

  // Change tier handler — optionally sync recommended default color
  const handleTierSelect = (tierId) => {
    setSelectedTierId(tierId);
    const tier = TIERS.find((t) => t.id === tierId);
    if (tier && tier.defaultBoxColor) {
      setSelectedColorId(tier.defaultBoxColor);
    }
  };

  // Add to cart
  const handleAddToCart = () => {
    const productItem = {
      id: `mystery-box-${activeTier.id}`,
      name: `Mystery Jewellery Box - ${activeTier.name}`,
      category: 'Mystery Box',
      price: activeTier.price,
      original_price: activeTier.originalPrice,
      primary_image_url: activeColor.image,
      image: activeColor.image,
      in_stock: true,
      sku: `MB-${activeTier.id.toUpperCase()}`,
      description: `${activeTier.name}: ${activeTier.tagline}. Box Color: ${activeColor.name}. Metal Tone: ${selectedMetal}. Vibe: ${selectedVibe}. Notes: ${customNotes || 'None'}`,
    };

    const variant = {
      id: `${activeTier.id}-${activeColor.id}-${selectedMetal}`,
      label: `${activeTier.name} (${activeColor.name}, ${selectedMetal === 'gold' ? 'Gold Tone' : selectedMetal === 'silver' ? 'Silver Tone' : 'Mix Tone'})`,
      tier: activeTier.name,
      boxColor: activeColor.name,
      metal: selectedMetal,
      vibe: selectedVibe,
      notes: customNotes,
    };

    addToCart(productItem, 1, variant);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  // WhatsApp Order Link generator
  const getWhatsAppOrderUrl = () => {
    const phone = '917251070150';
    const metalLabel = METAL_OPTIONS.find((m) => m.id === selectedMetal)?.label || selectedMetal;
    const vibeLabel = VIBE_OPTIONS.find((v) => v.id === selectedVibe)?.label || selectedVibe;

    const message = `✨ Hello Jewels 'n' Joys! I would like to order a Mystery Jewellery Box:

🎁 Tier: ${activeTier.name} (₹${activeTier.price})
📦 Contents: ${activeTier.tagline}
🎨 Box Color: ${activeColor.name}
🌟 Metal Tone: ${metalLabel}
💫 Style Vibe: ${vibeLabel}
${customNotes ? `📝 Note: ${customNotes}\n` : ''}
Please confirm availability and let me know how to proceed with payment and shipping. Thank you!`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="mystery-page">
      {/* ─── Breadcrumb ─────────────────────────────────────────── */}
      <div className="mystery-breadcrumb-wrap">
        <div className="mystery-container">
          <nav className="mystery-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span className="mystery-breadcrumb__sep">/</span>
            <span className="mystery-breadcrumb__current">Mystery Jewellery Box</span>
          </nav>
        </div>
      </div>

      {/* ─── Hero Announcement Banner ────────────────────────────── */}
      <section className="mystery-hero-banner">
        <div className="mystery-container">
          <div className="mystery-hero-banner__inner">
            <div className="mystery-hero-banner__badge">
              <Sparkles size={14} />
              <span>LIMITED EDITION SURPRISE DROP</span>
              <Sparkles size={14} />
            </div>

            <h1 className="mystery-hero-banner__title">
              <span className="mystery-hero-banner__sparkle-left">✦</span>
              MYSTERY <span className="mystery-title-cursive">Jewellery Box</span>
              <span className="mystery-hero-banner__sparkle-right">✦</span>
            </h1>

            <p className="mystery-hero-banner__tagline">
              Every box contains jewellery worth more than what you pay.
            </p>
            <div className="mystery-hero-banner__subtag">
              BEST QUALITY AT AFFORDABLE PRICE
            </div>

            {/* Trust Badges Bar (Directly from flyer) */}
            <div className="mystery-trust-strip">
              <div className="mystery-trust-pill">
                <div className="mystery-trust-pill__icon diamond-icon">
                  <Gem size={20} />
                </div>
                <div className="mystery-trust-pill__text">
                  <strong>Premium Anti Tarnish</strong>
                  <span>Jewellery</span>
                </div>
              </div>

              <div className="mystery-trust-pill">
                <div className="mystery-trust-pill__icon shield-icon">
                  <ShieldCheck size={20} />
                </div>
                <div className="mystery-trust-pill__text">
                  <strong>Best Quality at</strong>
                  <span>Affordable Price</span>
                </div>
              </div>

              <div className="mystery-trust-pill">
                <div className="mystery-trust-pill__icon heart-icon">
                  <Heart size={20} />
                </div>
                <div className="mystery-trust-pill__text">
                  <strong>Handpicked with</strong>
                  <span>LOVE!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Three Tiers Showcase Section ────────────────────────── */}
      <section className="mystery-tiers-section" id="choose-box">
        <div className="mystery-container">
          <div className="mystery-section-head">
            <span className="mystery-section-badge">CHOOSE YOUR TIER</span>
            <h2 className="mystery-section-title">Three Irresistible Mystery Editions</h2>
            <p className="mystery-section-desc">
              Select the perfect box size for your collection or as an unforgettable gift. All boxes include a travel jewellery organizer case and surprise freebies!
            </p>
          </div>

          <div className="mystery-tier-cards-grid">
            {TIERS.map((tier) => {
              const isSelected = selectedTierId === tier.id;
              const savings = tier.originalPrice - tier.price;
              const savingsPercent = Math.round((savings / tier.originalPrice) * 100);

              return (
                <div
                  key={tier.id}
                  className={`mystery-tier-card ${isSelected ? 'mystery-tier-card--selected' : ''} ${tier.isPopular ? 'mystery-tier-card--popular' : ''}`}
                  onClick={() => handleTierSelect(tier.id)}
                  style={{
                    '--tier-accent': tier.accentColor,
                    '--tier-border': isSelected ? tier.accentColor : 'rgba(217, 204, 184, 0.5)',
                  }}
                >
                  {/* Popular or Tier badge */}
                  <div
                    className="mystery-tier-card__ribbon"
                    style={{ backgroundColor: tier.chipBg, color: tier.chipColor }}
                  >
                    {tier.badge}
                  </div>

                  <div className="mystery-tier-card__header">
                    <h3 className="mystery-tier-card__title">{tier.name}</h3>
                    <p className="mystery-tier-card__tagline">{tier.tagline}</p>
                  </div>

                  {/* Pricing Display */}
                  <div className="mystery-tier-card__pricing">
                    <div className="mystery-tier-card__price-wrap">
                      <span className="mystery-tier-card__symbol">💎</span>
                      <span className="mystery-tier-card__currency">₹</span>
                      <span className="mystery-tier-card__amount">{tier.price}</span>
                    </div>
                    <div className="mystery-tier-card__mrp">
                      <span className="mystery-tier-card__original">Worth ₹{tier.originalPrice}</span>
                      <span className="mystery-tier-card__discount">Save {savingsPercent}%</span>
                    </div>
                  </div>

                  {/* Items count chip */}
                  <div className="mystery-tier-card__items-chip">
                    <Package size={14} />
                    <span>{tier.itemsCount} + Freebie Gift</span>
                  </div>

                  {/* What is inside */}
                  <div className="mystery-tier-card__contents-list">
                    <div className="mystery-tier-card__contents-title">What&apos;s Inside:</div>
                    <ul>
                      {tier.contents.map((item, idx) => (
                        <li key={idx}>
                          <span className="mystery-tier-card__count-badge">{item.count}</span>
                          <span className="mystery-tier-card__content-name">{item.item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Highlights list */}
                  <div className="mystery-tier-card__features">
                    {tier.features.map((feat, idx) => (
                      <div key={idx} className="mystery-tier-card__feature-row">
                        <Check size={14} className="mystery-tier-card__check" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Select button */}
                  <button
                    type="button"
                    className={`mystery-tier-card__select-btn ${isSelected ? 'is-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTierSelect(tier.id);
                      const customizerEl = document.getElementById('customize-box');
                      if (customizerEl) {
                        customizerEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 size={16} /> Selected Tier
                      </>
                    ) : (
                      <>
                        Select {tier.name} <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Interactive Box Customizer & Order Section ────────── */}
      <section className="mystery-customizer-section" id="customize-box">
        <div className="mystery-container">
          <div className="mystery-customizer-card">
            <div className="mystery-customizer-grid">
              {/* Left Column: Live Box Preview */}
              <div className="mystery-customizer-visual">
                <div className="mystery-preview-badge">
                  <span>Selected: {activeTier.name} • ₹{activeTier.price}</span>
                </div>

                <div className="mystery-preview-image-container">
                  <img
                    src={activeColor.image}
                    alt={`${activeTier.name} in ${activeColor.name} Organizer`}
                    className="mystery-preview-image"
                  />
                  <div className="mystery-preview-tag">
                    <Sparkles size={12} />
                    <span>Real Box Unboxing View</span>
                  </div>
                </div>

                {/* Color swatches under preview */}
                <div className="mystery-swatches-box">
                  <span className="mystery-swatches-label">Choose Box Color:</span>
                  <div className="mystery-swatches-list">
                    {COLOR_OPTIONS.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        className={`mystery-swatch-item ${selectedColorId === col.id ? 'is-active' : ''}`}
                        onClick={() => setSelectedColorId(col.id)}
                        aria-label={`Select ${col.name}`}
                      >
                        <span
                          className="mystery-swatch-circle"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span className="mystery-swatch-name">{col.name}</span>
                        {selectedColorId === col.id && <Check size={12} className="mystery-swatch-check" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Micro guarantees */}
                <div className="mystery-preview-perks">
                  <div className="mystery-preview-perk">
                    <ShieldCheck size={16} />
                    <span>18K Gold PVD Anti-Tarnish</span>
                  </div>
                  <div className="mystery-preview-perk">
                    <Gift size={16} />
                    <span>Free Surprise Gift in Every Box</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Customization Controls & Order Actions */}
              <div className="mystery-customizer-controls">
                <div className="mystery-controls-head">
                  <span className="mystery-controls-subtitle">STEP-BY-STEP CUSTOMIZATION</span>
                  <h3 className="mystery-controls-title">Personalize Your {activeTier.name}</h3>
                  <p className="mystery-controls-desc">
                    Tell us what you love! Our in-house stylists will personally select pieces tailored to your chosen metal and vibe.
                  </p>
                </div>

                {/* Step 1: Switch Tier */}
                <div className="mystery-form-group">
                  <label className="mystery-form-label">
                    <span className="mystery-step-num">1</span>
                    Box Size &amp; Tier
                  </label>
                  <div className="mystery-tier-pills">
                    {TIERS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`mystery-tier-pill ${selectedTierId === t.id ? 'is-active' : ''}`}
                        onClick={() => handleTierSelect(t.id)}
                      >
                        <span className="mystery-tier-pill__name">{t.name}</span>
                        <span className="mystery-tier-pill__price">₹{t.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Metal Tone */}
                <div className="mystery-form-group">
                  <label className="mystery-form-label">
                    <span className="mystery-step-num">2</span>
                    Preferred Metal Tone
                  </label>
                  <div className="mystery-choice-grid">
                    {METAL_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`mystery-choice-card ${selectedMetal === m.id ? 'is-active' : ''}`}
                        onClick={() => setSelectedMetal(m.id)}
                      >
                        <span className="mystery-choice-icon">{m.icon}</span>
                        <span className="mystery-choice-label">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3: Style Vibe */}
                <div className="mystery-form-group">
                  <label className="mystery-form-label">
                    <span className="mystery-step-num">3</span>
                    Jewellery Aesthetic &amp; Vibe
                  </label>
                  <div className="mystery-vibe-grid">
                    {VIBE_OPTIONS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`mystery-vibe-card ${selectedVibe === v.id ? 'is-active' : ''}`}
                        onClick={() => setSelectedVibe(v.id)}
                      >
                        <div className="mystery-vibe-title">{v.label}</div>
                        <div className="mystery-vibe-desc">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 4: Notes & Requests */}
                <div className="mystery-form-group">
                  <label className="mystery-form-label" htmlFor="custom-notes">
                    <span className="mystery-step-num">4</span>
                    Special Requests or Gifting Notes (Optional)
                  </label>
                  <textarea
                    id="custom-notes"
                    className="mystery-textarea"
                    placeholder="e.g. Ring size 6, prefer hoop earrings over studs, or Gifting for my best friend's birthday!"
                    rows={2}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                  />
                </div>

                {/* Price Summary Strip */}
                <div className="mystery-price-summary">
                  <div className="mystery-price-summary__total">
                    <span className="mystery-price-summary__label">Total Price:</span>
                    <span className="mystery-price-summary__value">₹{activeTier.price}</span>
                    <span className="mystery-price-summary__strike">₹{activeTier.originalPrice}</span>
                  </div>
                  <div className="mystery-price-summary__savings">
                    You save ₹{activeTier.originalPrice - activeTier.price}!
                  </div>
                </div>

                {/* Actions: Add to Cart & WhatsApp Order */}
                <div className="mystery-actions-row">
                  <button
                    type="button"
                    className="mystery-btn-primary"
                    onClick={handleAddToCart}
                  >
                    <ShoppingBag size={18} />
                    <span>Add to Bag • ₹{activeTier.price}</span>
                  </button>

                  <a
                    href={getWhatsAppOrderUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mystery-btn-whatsapp"
                    title="Order directly on WhatsApp"
                  >
                    <MessageCircle size={18} />
                    <span>Order via WhatsApp</span>
                  </a>
                </div>

                {addedToast && (
                  <div className="mystery-toast" role="status">
                    <CheckCircle2 size={16} />
                    <span>{activeTier.name} added to your bag! Open bag to checkout.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Big Flyer Display Showcase ──────────────────────────── */}
      <section className="mystery-flyer-section">
        <div className="mystery-container">
          <div className="mystery-flyer-card">
            <div className="mystery-flyer-text">
              <span className="mystery-flyer-eyebrow">OFFICIAL FLYER &amp; PRICE GUIDE</span>
              <h2 className="mystery-flyer-heading">Handpicked With Love &amp; Care</h2>
              <p className="mystery-flyer-paragraph">
                Take a look at the official curated tiers. Every single mystery jewellery box is packed with high quality stainless steel jewellery designed to last years without tarnishing.
              </p>

              <div className="mystery-flyer-benefits">
                <div className="mystery-flyer-benefit-item">
                  <div className="mystery-flyer-benefit-icon">✨</div>
                  <div>
                    <strong>2x to 3x Value Guarantee</strong>
                    <p>Every single box contains jewellery with retail value far above the price paid.</p>
                  </div>
                </div>
                <div className="mystery-flyer-benefit-item">
                  <div className="mystery-flyer-benefit-icon">🛡️</div>
                  <div>
                    <strong>100% Anti-Tarnish Guarantee</strong>
                    <p>Sweatproof, perfume-safe, and water-resistant 18K gold PVD plating.</p>
                  </div>
                </div>
                <div className="mystery-flyer-benefit-item">
                  <div className="mystery-flyer-benefit-icon">🎁</div>
                  <div>
                    <strong>Travel Jewellery Case Included</strong>
                    <p>Keep your rings, necklaces, and earrings safely organized wherever you go.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mystery-flyer-img-wrap">
              <img
                src={mysteryBannerImg}
                alt="Mystery Jewellery Box Pricing & Tiers Flyer"
                className="mystery-flyer-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Detailed Comparison Table ───────────────────────────── */}
      <section className="mystery-comparison-section">
        <div className="mystery-container">
          <div className="mystery-section-head">
            <span className="mystery-section-badge">SIDE-BY-SIDE</span>
            <h2 className="mystery-section-title">Tier Comparison Chart</h2>
            <p className="mystery-section-desc">
              Compare features, item counts, and inclusions across all three boxes to pick the right one for you.
            </p>
          </div>

          <div className="mystery-table-wrapper">
            <table className="mystery-table">
              <thead>
                <tr>
                  <th className="mystery-table__feature-col">Feature / Inclusions</th>
                  <th className="mystery-table__tier-col">
                    <span className="mystery-table__tier-name">Mini Box</span>
                    <span className="mystery-table__tier-price">₹699</span>
                  </th>
                  <th className="mystery-table__tier-col popular-header">
                    <span className="mystery-table__popular-tag">MOST POPULAR</span>
                    <span className="mystery-table__tier-name">Classic Box</span>
                    <span className="mystery-table__tier-price">₹1299</span>
                  </th>
                  <th className="mystery-table__tier-col">
                    <span className="mystery-table__tier-name">Premium Box</span>
                    <span className="mystery-table__tier-price">₹1699</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Items Guaranteed</td>
                  <td><strong>Min. 5 Items</strong></td>
                  <td className="popular-cell"><strong>Min. 8 Items</strong></td>
                  <td><strong>Min. 10 Items</strong></td>
                </tr>
                <tr>
                  <td>Jewellery Organizer Box Included</td>
                  <td><Check size={18} className="mystery-table__check" /></td>
                  <td className="popular-cell"><Check size={18} className="mystery-table__check" /></td>
                  <td><Check size={18} className="mystery-table__check" /></td>
                </tr>
                <tr>
                  <td>Freebie Gift Included</td>
                  <td><Check size={18} className="mystery-table__check" /></td>
                  <td className="popular-cell"><Check size={18} className="mystery-table__check" /></td>
                  <td><Check size={18} className="mystery-table__check" /> (Deluxe)</td>
                </tr>
                <tr>
                  <td>Necklaces / Pendants</td>
                  <td>2 Necklaces</td>
                  <td className="popular-cell">3 - 4 Necklaces</td>
                  <td>4+ Luxury Pieces</td>
                </tr>
                <tr>
                  <td>Rings &amp; Bands</td>
                  <td>1 Ring</td>
                  <td className="popular-cell">2 Rings</td>
                  <td>2 - 3 Statement Rings</td>
                </tr>
                <tr>
                  <td>Earrings</td>
                  <td>1 Earring Pair</td>
                  <td className="popular-cell">2 Earring Pairs</td>
                  <td>2 - 3 Earring Pairs</td>
                </tr>
                <tr>
                  <td>Bracelets / Bangles</td>
                  <td>Optional / Bonus</td>
                  <td className="popular-cell">1 Curated Bracelet</td>
                  <td>1 - 2 Luxury Bangles/Chains</td>
                </tr>
                <tr>
                  <td>Customization (Metal &amp; Aesthetic)</td>
                  <td>Basic Options</td>
                  <td className="popular-cell">Full Customization</td>
                  <td>VIP Stylist Personalization</td>
                </tr>
                <tr>
                  <td>Estimated Retail Value</td>
                  <td>₹1,499+</td>
                  <td className="popular-cell">₹2,799+</td>
                  <td>₹3,999+</td>
                </tr>
                <tr>
                  <td>Action</td>
                  <td>
                    <button
                      type="button"
                      className="mystery-table__select-btn"
                      onClick={() => {
                        handleTierSelect('mini');
                        document.getElementById('customize-box')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Choose Mini (₹699)
                    </button>
                  </td>
                  <td className="popular-cell">
                    <button
                      type="button"
                      className="mystery-table__select-btn popular-btn"
                      onClick={() => {
                        handleTierSelect('classic');
                        document.getElementById('customize-box')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Choose Classic (₹1299)
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="mystery-table__select-btn"
                      onClick={() => {
                        handleTierSelect('premium');
                        document.getElementById('customize-box')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Choose Premium (₹1699)
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── How It Works (4 Steps) ─────────────────────────────── */}
      <section className="mystery-how-section">
        <div className="mystery-container">
          <div className="mystery-section-head">
            <span className="mystery-section-badge">SIMPLE &amp; FUN</span>
            <h2 className="mystery-section-title">How The Mystery Box Works</h2>
            <p className="mystery-section-desc">
              Experience the excitement of luxury unboxing in 4 seamless steps.
            </p>
          </div>

          <div className="mystery-steps-grid">
            <div className="mystery-step-card">
              <div className="mystery-step-badge">1</div>
              <h3 className="mystery-step-title">Choose Your Tier</h3>
              <p className="mystery-step-desc">
                Select between Mini (₹699), Classic (₹1299), or Premium (₹1699) depending on how many pieces you want.
              </p>
            </div>

            <div className="mystery-step-card">
              <div className="mystery-step-badge">2</div>
              <h3 className="mystery-step-title">Pick Color &amp; Style</h3>
              <p className="mystery-step-desc">
                Choose your travel box organizer color (Lavender, Peach, or Ivory) and select Gold or Silver tone preference.
              </p>
            </div>

            <div className="mystery-step-card">
              <div className="mystery-step-badge">3</div>
              <h3 className="mystery-step-title">Handpicked with Love</h3>
              <p className="mystery-step-desc">
                Our jewellery stylists hand-select complementary matching pieces and pack your surprise freebie gift with care.
              </p>
            </div>

            <div className="mystery-step-card">
              <div className="mystery-step-badge">4</div>
              <h3 className="mystery-step-title">Unbox The Joy</h3>
              <p className="mystery-step-desc">
                Delivered straight to your doorstep in luxury packaging. Reveal your gorgeous new sparkling treasures!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Accordion Section ──────────────────────────────── */}
      <section className="mystery-faq-section">
        <div className="mystery-container">
          <div className="mystery-section-head">
            <span className="mystery-section-badge">GOT QUESTIONS?</span>
            <h2 className="mystery-section-title">Frequently Asked Questions</h2>
            <p className="mystery-section-desc">
              Everything you need to know about ordering our Mystery Jewellery Boxes.
            </p>
          </div>

          <div className="mystery-faq-list">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`mystery-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="mystery-faq-question"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {isOpen && (
                    <div className="mystery-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Need help footer */}
          <div className="mystery-faq-footer">
            <p>Still have questions about our Mystery Boxes?</p>
            <a
              href="https://wa.me/917251070150?text=Hi%20Jewels%20'n'%20Joys!%20I%20have%20a%20question%20about%20the%20Mystery%20Jewellery%20Box."
              target="_blank"
              rel="noopener noreferrer"
              className="mystery-faq-chat-btn"
            >
              <MessageCircle size={16} />
              <span>Chat with us on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
