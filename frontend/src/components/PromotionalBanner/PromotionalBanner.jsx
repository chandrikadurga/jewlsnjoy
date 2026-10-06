import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Tag, ShieldCheck, Gift, Truck } from 'lucide-react';
import { usePromotionalBanner } from '../../hooks/usePromotionalBanner';
import { resolveStoragePath } from '../../utils/imageUtils';
import './PromotionalBanner.css';

/**
 * PromotionalBanner Component
 * 
 * Authoritative promotional hero/banner component for Jewels 'n' Joys storefront.
 * 
 * Features:
 * - Data-driven: 100% controlled by admin in Supabase Database without code changes
 * - Full-Image Mode & Composable Overlay Mode
 * - Dedicated desktop and mobile artwork with responsive <picture> loading
 * - Ticker sale ribbons for maximum promotional impact
 * - Prevents layout shift via aspect-ratio container
 * - Graceful loading, missing image, and error fallback states
 * - Reusable in Admin Live Preview mode via `customBanner` prop
 */
export default function PromotionalBanner({ customBanner, previewMode, onCtaClick }) {
  const hookData = usePromotionalBanner();
  const [imageError, setImageError] = useState(false);
  const [mobileImageError, setMobileImageError] = useState(false);

  // Use customBanner if passed (for Admin Live Preview), otherwise live hook data
  const banner = customBanner !== undefined ? customBanner : hookData.banner;
  const loading = customBanner !== undefined ? false : hookData.loading;

  // Loading skeleton state
  if (loading) {
    return (
      <section className="promo-banner-section promo-banner-section--loading" aria-label="Loading promotion">
        <div className="promo-banner-skeleton">
          <div className="promo-banner-skeleton__shimmer" />
          <div className="promo-banner-skeleton__content">
            <div className="promo-banner-skeleton__line promo-banner-skeleton__line--eyebrow" />
            <div className="promo-banner-skeleton__line promo-banner-skeleton__line--title" />
            <div className="promo-banner-skeleton__line promo-banner-skeleton__line--price" />
            <div className="promo-banner-skeleton__line promo-banner-skeleton__line--cta" />
          </div>
        </div>
      </section>
    );
  }

  // If no active campaign, gracefully hide or show nothing without breaking layout
  if (!banner || (banner.is_active === false && !customBanner)) {
    return null;
  }

  // Resolve media URLs
  const rawDesktop = banner.desktop_image_url || '';
  const rawMobile = banner.mobile_image_url || '';
  const desktopSrc = resolveStoragePath(rawDesktop) || rawDesktop;
  const mobileSrc = resolveStoragePath(rawMobile) || rawMobile;

  const hasDesktopImage = Boolean(desktopSrc && !imageError);
  const hasMobileImage = Boolean(mobileSrc && !mobileImageError);

  // Formatted supporting points
  const supportingLines = banner.supporting_text
    ? banner.supporting_text.split('\n').filter(Boolean)
    : [];

  const ctaDestination = banner.cta_url || '/shop';
  const ctaText = banner.cta_text || 'SHOP NOW';

  // Has overlay text to render on top of the image
  const hasOverlayText = Boolean(
    banner.title || banner.subtitle || banner.price_text || supportingLines.length > 0
  );

  return (
    <section
      className={`promo-banner-section ${previewMode ? `promo-banner-section--preview-${previewMode}` : ''}`}
      aria-label="Promotional Campaign Banner"
    >
      {/* Top Promotional Ribbon Ticker */}
      <div className="promo-ticker promo-ticker--top" aria-hidden="true">
        <div className="promo-ticker__track">
          {/* First copy */}
          <span className="promo-ticker__item">
            <Sparkles size={13} className="promo-ticker__icon" />
            EXCLUSIVE PROMOTIONAL CAMPAIGN
          </span>
          <span className="promo-ticker__divider">✦</span>
          <span className="promo-ticker__item">
            <Tag size={13} className="promo-ticker__icon" />
            {banner.name || 'LIMITED TIME LUXURY SPECIAL'}
          </span>
          <span className="promo-ticker__divider">✦</span>
          <span className="promo-ticker__item">
            <Truck size={13} className="promo-ticker__icon" />
            FREE EXPRESS SHIPPING ALL INDIA
          </span>
          <span className="promo-ticker__divider">✦</span>
          <span className="promo-ticker__item">
            <Gift size={13} className="promo-ticker__icon" />
            COMPLIMENTARY LUXURY GIFT WITH EVERY ORDER
          </span>
          <span className="promo-ticker__divider">✦</span>
          <span className="promo-ticker__item">
            <ShieldCheck size={13} className="promo-ticker__icon" />
            18K PVD GOLD • WATERPROOF • ANTI-TARNISH
          </span>
          <span className="promo-ticker__divider">✦</span>
          {/* Duplicate copy for seamless infinite loop */}
          <span className="promo-ticker__item">
            <Sparkles size={13} className="promo-ticker__icon" />
            EXCLUSIVE PROMOTIONAL CAMPAIGN
          </span>
          <span className="promo-ticker__divider">✦</span>
          <span className="promo-ticker__item">
            <Tag size={13} className="promo-ticker__icon" />
            {banner.name || 'LIMITED TIME LUXURY SPECIAL'}
          </span>
          <span className="promo-ticker__divider">✦</span>
          <span className="promo-ticker__item">
            <Truck size={13} className="promo-ticker__icon" />
            FREE EXPRESS SHIPPING ALL INDIA
          </span>
          <span className="promo-ticker__divider">✦</span>
          <span className="promo-ticker__item">
            <Gift size={13} className="promo-ticker__icon" />
            COMPLIMENTARY LUXURY GIFT WITH EVERY ORDER
          </span>
          <span className="promo-ticker__divider">✦</span>
          <span className="promo-ticker__item">
            <ShieldCheck size={13} className="promo-ticker__icon" />
            18K PVD GOLD • WATERPROOF • ANTI-TARNISH
          </span>
          <span className="promo-ticker__divider">✦</span>
        </div>
      </div>

      {/* Main Dominating Hero Banner Area */}
      <div className="promo-hero">
        {/* Banner Media Layer */}
        <div className="promo-hero__media-container">
          {hasDesktopImage ? (
            <picture className="promo-hero__picture">
              {hasMobileImage && (
                <source
                  media="(max-width: 768px)"
                  srcSet={mobileSrc}
                  onError={() => setMobileImageError(true)}
                />
              )}
              <img
                src={desktopSrc}
                alt={banner.title || banner.name || "Jewels 'n' Joys Promotional Banner"}
                className="promo-hero__img"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onError={() => setImageError(true)}
              />
            </picture>
          ) : (
            /* Fallback luxury stylized backdrop when artwork is loading or not uploaded */
            <div className="promo-hero__placeholder-bg">
              <div className="promo-hero__placeholder-sparkles" />
            </div>
          )}

          {/* Vignette & Contrast Gradients */}
          <div className="promo-hero__gradient-overlay" />
        </div>

        {/* Dynamic Composable Text & CTA Overlay */}
        {hasOverlayText && (
          <div className="promo-hero__content-container">
            <div className="container promo-hero__content-inner">
              <div className="promo-hero__card">
                {banner.title && (
                  <h1 className="promo-hero__title" id="promotional-banner-title">
                    {banner.title}
                  </h1>
                )}

                {banner.subtitle && (
                  <p className="promo-hero__subtitle">
                    {banner.subtitle}
                  </p>
                )}

                {banner.price_text && (
                  <div className="promo-hero__price-badge">
                    <span className="promo-hero__price-text">{banner.price_text}</span>
                  </div>
                )}

                {supportingLines.length > 0 && (
                  <ul className="promo-hero__perks">
                    {supportingLines.map((line, idx) => (
                      <li key={idx} className="promo-hero__perk-item">
                        <Sparkles size={14} className="promo-hero__perk-icon" />
                        <span>{line.replace(/^[+\-•*]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {ctaText && (
                  <div className="promo-hero__cta-wrap">
                    {ctaDestination.startsWith('http') ? (
                      <a
                        href={ctaDestination}
                        className="promo-hero__cta-btn"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onCtaClick}
                      >
                        <span>{ctaText}</span>
                        <ArrowRight size={17} strokeWidth={2.5} />
                      </a>
                    ) : (
                      <Link
                        to={ctaDestination}
                        className="promo-hero__cta-btn"
                        id="promotional-banner-cta"
                        onClick={onCtaClick}
                      >
                        <span>{ctaText}</span>
                        <ArrowRight size={17} strokeWidth={2.5} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* If image is full-image mode without overlay text, make the whole banner clickable */}
        {!hasOverlayText && ctaDestination && (
          <Link
            to={ctaDestination}
            className="promo-hero__full-click-link"
            aria-label={banner.name || 'View promotional collection'}
            onClick={onCtaClick}
          />
        )}
      </div>

      {/* Bottom Promotional Ticker / Trust Strip */}
      <div className="promo-ticker promo-ticker--bottom" aria-hidden="true">
        <div className="promo-ticker__track promo-ticker__track--reverse">
          {/* First copy */}
          <span className="promo-ticker__item">✦ EASY RETURN & EXCHANGE</span>
          <span className="promo-ticker__item">✦ CASH ON DELIVERY AVAILABLE</span>
          <span className="promo-ticker__item">✦ 100% NICKEL & LEAD FREE</span>
          <span className="promo-ticker__item">✦ LUXURY KEEPSAKE PACKAGING INCLUDED</span>
          <span className="promo-ticker__item">✦ THOUSANDS OF 5-STAR VERIFIED REVIEWS</span>
          {/* Duplicate copy for seamless infinite loop */}
          <span className="promo-ticker__item">✦ EASY RETURN & EXCHANGE</span>
          <span className="promo-ticker__item">✦ CASH ON DELIVERY AVAILABLE</span>
          <span className="promo-ticker__item">✦ 100% NICKEL & LEAD FREE</span>
          <span className="promo-ticker__item">✦ LUXURY KEEPSAKE PACKAGING INCLUDED</span>
          <span className="promo-ticker__item">✦ THOUSANDS OF 5-STAR VERIFIED REVIEWS</span>
        </div>
      </div>
    </section>
  );
}
