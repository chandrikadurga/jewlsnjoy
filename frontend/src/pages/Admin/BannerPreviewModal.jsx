import { useState } from 'react';
import { X, Monitor, Tablet, Smartphone, Sparkles } from 'lucide-react';
import PromotionalBanner from '../../components/PromotionalBanner/PromotionalBanner';

/**
 * BannerPreviewModal
 * 
 * Renders an exact replica of the storefront promotional banner across
 * realistic Desktop (1920px), Tablet (768px), and Mobile (390px) viewports.
 * Uses the exact same <PromotionalBanner /> component as the storefront.
 */
export default function BannerPreviewModal({ banner, isOpen, onClose }) {
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'

  if (!isOpen || !banner) return null;

  return (
    <div className="banner-preview-overlay" role="dialog" aria-modal="true" aria-label="Banner Live Preview">
      <div className="banner-preview-modal">
        {/* Modal Header */}
        <div className="banner-preview-modal__header">
          <div className="banner-preview-modal__title-wrap">
            <span className="banner-preview-modal__badge">
              <Sparkles size={13} />
              LIVE STOREFRONT PREVIEW
            </span>
            <h2 className="banner-preview-modal__title">{banner.name || 'Campaign Preview'}</h2>
          </div>

          {/* Viewport Switcher */}
          <div className="banner-preview-viewport-toggle">
            <button
              type="button"
              className={`banner-preview-btn ${viewport === 'desktop' ? 'banner-preview-btn--active' : ''}`}
              onClick={() => setViewport('desktop')}
              title="Desktop View (1920px container)"
            >
              <Monitor size={16} />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              className={`banner-preview-btn ${viewport === 'tablet' ? 'banner-preview-btn--active' : ''}`}
              onClick={() => setViewport('tablet')}
              title="Tablet View (768px)"
            >
              <Tablet size={16} />
              <span>Tablet</span>
            </button>
            <button
              type="button"
              className={`banner-preview-btn ${viewport === 'mobile' ? 'banner-preview-btn--active' : ''}`}
              onClick={() => setViewport('mobile')}
              title="Mobile Smartphone View (390px)"
            >
              <Smartphone size={16} />
              <span>Mobile</span>
            </button>
          </div>

          <button
            type="button"
            className="banner-preview-modal__close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
        </div>

        {/* Missing Mobile Warning */}
        {viewport === 'mobile' && !banner.mobile_image_url && (
          <div className="banner-preview-warning">
            <span>⚠️ <strong>Notice:</strong> No dedicated mobile artwork uploaded. Desktop artwork will be used with responsive cropping on smartphone viewports.</span>
          </div>
        )}

        {/* Viewport Frame */}
        <div className="banner-preview-stage">
          <div className={`banner-preview-frame banner-preview-frame--${viewport}`}>
            <div className="banner-preview-frame__bar">
              <span className="banner-preview-frame__dot" />
              <span className="banner-preview-frame__dot" />
              <span className="banner-preview-frame__dot" />
              <span className="banner-preview-frame__url">
                https://jewlsnjoy.com • {viewport.toUpperCase()} SIMULATOR
              </span>
            </div>

            <div className="banner-preview-frame__content">
              <PromotionalBanner customBanner={banner} previewMode={viewport} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
