import { useState, useEffect } from 'react';
import {
  Sparkles,
  Megaphone,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Upload,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { adminApi, customizationApi } from '../../services/api';
import defaultHeroImg from '../../assets/hero-necklaces.png';
import defaultMysteryBoxImg from '../../assets/mystery-box-banner.jpg';
import { resolveStoragePath, isTemporaryUrl } from '../../utils/imageUtils';
import { broadcastCatalogUpdate } from '../../utils/catalogEvents';
import './AdminCustomizer.css';

const DEFAULT_STATE = {
  announcement_bar: {
    enabled: true,
    background_color: '#2B211D',
    text_color: '#F5EDE2',
    speed_seconds: 25,
    messages: [
      { id: '1', icon: '💳', text: 'COD and Prepaid all payment methods are available' },
      { id: '2', icon: '🎁', text: 'Free gifts on every order' },
      { id: '3', icon: '🚚', text: 'Free delivery on order above 999rs' },
    ],
  },
  hero: {
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
  },
};

export default function AdminCustomizer() {
  const [activeTab, setActiveTab] = useState('hero'); // 'hero' | 'announcements'
  const [config, setConfig] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSecondaryImage, setUploadingSecondaryImage] = useState(false);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);

  // Load customizations
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await customizationApi.getCustomization();
        if (data && typeof data === 'object') {
          setConfig((prev) => ({
            ...prev,
            announcement_bar: {
              ...prev.announcement_bar,
              ...(data.announcement_bar || {}),
            },
            hero: {
              ...prev.hero,
              ...(data.hero || {}),
            },
          }));
        }
      } catch (err) {
        console.error('Error fetching customizations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleHeroChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [field]: value,
      },
    }));
  };

  const handleAnnouncementChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      announcement_bar: {
        ...prev.announcement_bar,
        [field]: value,
      },
    }));
  };

  const handleAddMessage = () => {
    const newMsg = {
      id: Date.now().toString(),
      icon: '✨',
      text: 'Special festive offer on luxury handcrafted jewellery',
    };
    setConfig((prev) => ({
      ...prev,
      announcement_bar: {
        ...prev.announcement_bar,
        messages: [...(prev.announcement_bar.messages || []), newMsg],
      },
    }));
  };

  const handleUpdateMessage = (id, field, value) => {
    setConfig((prev) => ({
      ...prev,
      announcement_bar: {
        ...prev.announcement_bar,
        messages: (prev.announcement_bar.messages || []).map((msg) =>
          msg.id === id ? { ...msg, [field]: value } : msg
        ),
      },
    }));
  };

  const handleDeleteMessage = (id) => {
    setConfig((prev) => ({
      ...prev,
      announcement_bar: {
        ...prev.announcement_bar,
        messages: (prev.announcement_bar.messages || []).filter((msg) => msg.id !== id),
      },
    }));
  };

  // Primary Image Upload handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please select a valid image file (JPG, PNG, WEBP, GIF).' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Hero image exceeds the maximum 10MB limit.' });
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('product_id', 'banner');
      formData.append('image_type', 'hero');
      const res = await adminApi.uploadImage(formData);
      if (res?.url) {
        handleHeroChange('image_url', res.url);
        setFeedback({ type: 'success', message: 'Hero image uploaded to persistent cloud storage successfully!' });
      } else {
        throw new Error('No URL returned from server upload.');
      }
    } catch (err) {
      console.error('Failed to upload hero image:', err);
      const errMsg = err.response?.data?.error || err.message || 'Hero image upload failed.';
      setFeedback({
        type: 'error',
        message: `${errMsg} Your existing hero image has not been changed.`,
      });
    } finally {
      setUploadingImage(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Secondary Image Upload handler (Slide 2: Mystery Jewellery Box)
  const handleSecondaryImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please select a valid image file (JPG, PNG, WEBP, GIF).' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image exceeds the maximum 10MB limit.' });
      return;
    }

    try {
      setUploadingSecondaryImage(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('product_id', 'hero-secondary');
      formData.append('image_type', 'hero');
      const res = await adminApi.uploadImage(formData);
      if (res?.url) {
        handleHeroChange('secondary_image_url', res.url);
        setFeedback({ type: 'success', message: 'Secondary carousel image uploaded successfully!' });
      } else {
        throw new Error('No URL returned from server upload.');
      }
    } catch (err) {
      console.error('Failed to upload secondary image:', err);
      const errMsg = err.response?.data?.error || err.message || 'Secondary image upload failed.';
      setFeedback({
        type: 'error',
        message: `${errMsg} Existing image preserved.`,
      });
    } finally {
      setUploadingSecondaryImage(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (config.hero?.image_url && isTemporaryUrl(config.hero.image_url)) {
      setFeedback({
        type: 'error',
        message: 'Cannot save temporary preview as hero image. Please upload the image file to cloud storage.',
      });
      return;
    }
    if (config.hero?.secondary_image_url && isTemporaryUrl(config.hero.secondary_image_url)) {
      setFeedback({
        type: 'error',
        message: 'Cannot save temporary preview as secondary image. Please upload the image file to cloud storage.',
      });
      return;
    }

    try {
      setSaving(true);
      await customizationApi.updateCustomization(config);
      broadcastCatalogUpdate({ type: 'customization_updated' });
      setFeedback({ type: 'success', message: 'Store customizations published live to frontend & backend!' });
    } catch (err) {
      console.error('Error saving customizations:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to save changes. Please try again.',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Reset to default settings
  const handleResetToDefault = () => {
    if (window.confirm('Are you sure you want to reset all customizer settings back to factory defaults?')) {
      setConfig(DEFAULT_STATE);
      setFeedback({ type: 'success', message: 'Reset to default preview. Click "Save & Publish Changes" to apply.' });
    }
  };

  if (loading) {
    return (
      <div className="admin-customizer-loading">
        <div className="admin-customizer-spinner" />
        <p>Loading storefront customizer...</p>
      </div>
    );
  }

  const heroImageSrc = resolveStoragePath(config.hero.image_url) || defaultHeroImg;
  const secondaryImageSrc = resolveStoragePath(config.hero.secondary_image_url) || defaultMysteryBoxImg;

  return (
    <div className="admin-customizer-page">
      {/* Header bar */}
      <div className="admin-customizer-header">
        <div>
          <h2 className="admin-customizer-title">Storefront Visual Customizer</h2>
          <p className="admin-customizer-subtitle">
            Configure homepage hero banner, image carousel, and announcement ticker in real time
          </p>
        </div>

        <div className="admin-customizer-header__actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={handleResetToDefault}
            disabled={saving}
          >
            <RotateCcw size={15} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={15} />
            <span>{saving ? 'Publishing...' : 'Save & Publish Changes'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`admin-customizer-feedback admin-customizer-feedback--${feedback.type}`}
          role="alert"
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-customizer-tabs">
        <button
          type="button"
          className={`admin-customizer-tab ${activeTab === 'hero' ? 'admin-customizer-tab--active' : ''}`}
          onClick={() => setActiveTab('hero')}
        >
          <ImageIcon size={16} />
          <span>Hero Banner Section</span>
        </button>

        <button
          type="button"
          className={`admin-customizer-tab ${activeTab === 'announcements' ? 'admin-customizer-tab--active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          <Megaphone size={16} />
          <span>Top Announcement Bar</span>
        </button>
      </div>

      {/* Hero Tab Form */}
      {activeTab === 'hero' && (
        <div className="admin-customizer-card">
          <form className="admin-customizer-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <h3 className="admin-customizer-section-title">
              <Sparkles size={18} />
              Homepage Hero Content &amp; Imagery
            </h3>

            {/* Eyebrow Tag */}
            <div className="admin-customizer-field">
              <label>Eyebrow Tagline</label>
              <input
                type="text"
                className="admin-customizer-input"
                value={config.hero.eyebrow}
                onChange={(e) => handleHeroChange('eyebrow', e.target.value)}
                placeholder="e.g. HANDCRAFTED ELEGANCE"
              />
              <small>Displays as gold uppercase tagline above the main heading</small>
            </div>

            {/* Heading Breakdown */}
            <div className="admin-customizer-grid-3">
              <div className="admin-customizer-field">
                <label>Heading Prefix</label>
                <input
                  type="text"
                  className="admin-customizer-input"
                  value={config.hero.heading_prefix}
                  onChange={(e) => handleHeroChange('heading_prefix', e.target.value)}
                  placeholder="e.g. Jewellery That Tells"
                />
              </div>

              <div className="admin-customizer-field">
                <label>Accent / Highlight Word (Italic)</label>
                <input
                  type="text"
                  className="admin-customizer-input"
                  value={config.hero.heading_accent}
                  onChange={(e) => handleHeroChange('heading_accent', e.target.value)}
                  placeholder="e.g. Your"
                />
              </div>

              <div className="admin-customizer-field">
                <label>Heading Suffix</label>
                <input
                  type="text"
                  className="admin-customizer-input"
                  value={config.hero.heading_suffix}
                  onChange={(e) => handleHeroChange('heading_suffix', e.target.value)}
                  placeholder="e.g. Story"
                />
              </div>
            </div>

            {/* Description */}
            <div className="admin-customizer-field">
              <label>Hero Description</label>
              <textarea
                className="admin-customizer-textarea"
                rows={3}
                value={config.hero.description}
                onChange={(e) => handleHeroChange('description', e.target.value)}
                placeholder="e.g. Timeless, anti-tarnish pieces thoughtfully designed to elevate your everyday moments."
              />
            </div>

            {/* CTAs Grid */}
            <div className="admin-customizer-grid-2">
              <div className="admin-customizer-field">
                <label>Primary Button Label</label>
                <input
                  type="text"
                  className="admin-customizer-input"
                  value={config.hero.primary_cta_text}
                  onChange={(e) => handleHeroChange('primary_cta_text', e.target.value)}
                  placeholder="e.g. Explore Collection"
                />
              </div>

              <div className="admin-customizer-field">
                <label>Primary Button Link</label>
                <input
                  type="text"
                  className="admin-customizer-input"
                  value={config.hero.primary_cta_link}
                  onChange={(e) => handleHeroChange('primary_cta_link', e.target.value)}
                  placeholder="e.g. /shop"
                />
              </div>

              <div className="admin-customizer-field">
                <label>Secondary Button Label</label>
                <input
                  type="text"
                  className="admin-customizer-input"
                  value={config.hero.secondary_cta_text}
                  onChange={(e) => handleHeroChange('secondary_cta_text', e.target.value)}
                  placeholder="e.g. View Necklaces"
                />
              </div>

              <div className="admin-customizer-field">
                <label>Secondary Button Link</label>
                <input
                  type="text"
                  className="admin-customizer-input"
                  value={config.hero.secondary_cta_link}
                  onChange={(e) => handleHeroChange('secondary_cta_link', e.target.value)}
                  placeholder="e.g. /shop?category=Necklaces"
                />
              </div>
            </div>

            {/* Primary Hero Image Section */}
            <div className="admin-customizer-field">
              <label>Primary Hero Image (Slide 1: Gemstone Necklaces)</label>
              <div className="admin-customizer-image-box">
                <img
                  src={heroImageSrc}
                  alt="Hero Preview"
                  className="admin-customizer-preview-thumb"
                  onError={(e) => {
                    e.target.src = defaultHeroImg;
                  }}
                />

                <div className="admin-customizer-upload-controls">
                  <label className="admin-customizer-file-btn">
                    <Upload size={16} />
                    <span>{uploadingImage ? 'Uploading Image...' : 'Upload New Hero Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>

                  <div className="admin-customizer-field" style={{ marginTop: '0.25rem' }}>
                    <small>Or enter custom Image URL / Media Path:</small>
                    <input
                      type="text"
                      className="admin-customizer-input"
                      value={config.hero.image_url}
                      onChange={(e) => handleHeroChange('image_url', e.target.value)}
                      placeholder="e.g. /media/products/hero.jpg or https://..."
                    />
                  </div>

                  {config.hero.image_url && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={() => handleHeroChange('image_url', '')}
                      style={{ width: 'fit-content', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                    >
                      Reset to Default Star Necklaces Image
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Secondary Hero Image / Mystery Box Carousel Image */}
            <div className="admin-customizer-field" style={{ marginTop: '1.25rem' }}>
              <label>Secondary Carousel Image (Slide 2: Mystery Jewellery Box)</label>
              <div className="admin-customizer-image-box">
                <img
                  src={secondaryImageSrc}
                  alt="Secondary Hero Preview"
                  className="admin-customizer-preview-thumb"
                  style={{ objectFit: 'contain', background: '#faf6f0' }}
                  onError={(e) => {
                    e.target.src = defaultMysteryBoxImg;
                  }}
                />

                <div className="admin-customizer-upload-controls">
                  <label className="admin-customizer-file-btn">
                    <Upload size={16} />
                    <span>{uploadingSecondaryImage ? 'Uploading Image...' : 'Upload Mystery Box / Slide 2 Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSecondaryImageUpload}
                      disabled={uploadingSecondaryImage}
                    />
                  </label>

                  <div className="admin-customizer-field" style={{ marginTop: '0.25rem' }}>
                    <small>Or enter custom Image URL / Media Path:</small>
                    <input
                      type="text"
                      className="admin-customizer-input"
                      value={config.hero.secondary_image_url || ''}
                      onChange={(e) => handleHeroChange('secondary_image_url', e.target.value)}
                      placeholder="e.g. /banners/mystery-box-banner.jpg or https://..."
                    />
                  </div>

                  {config.hero.secondary_image_url && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={() => handleHeroChange('secondary_image_url', '')}
                      style={{ width: 'fit-content', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                    >
                      Reset to Default Mystery Box Flyer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div className="admin-customizer-live-preview">
              <span className="admin-customizer-section-title" style={{ fontSize: '0.92rem', marginBottom: '0.5rem' }}>
                <ExternalLink size={15} />
                Live Storefront Mockup Preview (Click dots to toggle carousel slides)
              </span>

              <div className="admin-customizer-preview-hero">
                <div className="admin-customizer-preview-hero-content">
                  <span className="admin-customizer-preview-hero-eyebrow">
                    {config.hero.eyebrow || 'Handcrafted Elegance'}
                  </span>
                  <h2 className="admin-customizer-preview-hero-heading">
                    {config.hero.heading_prefix}{' '}
                    <em>{config.hero.heading_accent}</em>{' '}
                    {config.hero.heading_suffix}
                  </h2>
                  <p className="admin-customizer-preview-hero-desc">
                    {config.hero.description}
                  </p>
                  <div className="admin-customizer-preview-hero-btns">
                    <span
                      style={{
                        padding: '8px 18px',
                        background: '#2B211D',
                        color: '#fff',
                        borderRadius: '999px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {config.hero.primary_cta_text} <ArrowRight size={13} />
                    </span>
                    <span
                      style={{
                        padding: '8px 18px',
                        background: 'transparent',
                        color: '#2B211D',
                        border: '1.5px solid #2B211D',
                        borderRadius: '999px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      {config.hero.secondary_cta_text}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="admin-customizer-preview-hero-img-wrap">
                    <img
                      src={previewSlideIdx === 0 ? heroImageSrc : secondaryImageSrc}
                      alt={config.hero.image_alt || 'Hero'}
                      className="admin-customizer-preview-hero-img"
                      style={previewSlideIdx === 1 ? { objectFit: 'contain', background: '#faf6f0' } : {}}
                      onError={(e) => {
                        e.target.src = previewSlideIdx === 0 ? defaultHeroImg : defaultMysteryBoxImg;
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewSlideIdx(0)}
                      style={{
                        width: previewSlideIdx === 0 ? '18px' : '8px',
                        height: '8px',
                        borderRadius: '4px',
                        background: previewSlideIdx === 0 ? '#d4af37' : 'rgba(194, 163, 112, 0.4)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.2s',
                      }}
                      title="Slide 1: Gemstone Necklaces"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewSlideIdx(1)}
                      style={{
                        width: previewSlideIdx === 1 ? '18px' : '8px',
                        height: '8px',
                        borderRadius: '4px',
                        background: previewSlideIdx === 1 ? '#d4af37' : 'rgba(194, 163, 112, 0.4)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.2s',
                      }}
                      title="Slide 2: Mystery Jewellery Box"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Announcement Bar Tab Form */}
      {activeTab === 'announcements' && (
        <div className="admin-customizer-card">
          <form className="admin-customizer-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <h3 className="admin-customizer-section-title">
              <Megaphone size={18} />
              Top Announcement Ticker Bar Settings
            </h3>

            {/* Toggle Row */}
            <div className="admin-customizer-toggle-row">
              <div className="admin-customizer-toggle-info">
                <h4>Announcement Bar Status</h4>
                <p>When enabled, this ticker displays at the very top of all store pages</p>
              </div>

              <label className="admin-customizer-switch">
                <input
                  type="checkbox"
                  checked={config.announcement_bar.enabled}
                  onChange={(e) => handleAnnouncementChange('enabled', e.target.checked)}
                />
                <span className="admin-customizer-slider" />
              </label>
            </div>

            {/* Colors & Speed Grid */}
            <div className="admin-customizer-grid-3">
              <div className="admin-customizer-field">
                <label>Background Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={config.announcement_bar.background_color}
                    onChange={(e) => handleAnnouncementChange('background_color', e.target.value)}
                    style={{ width: '42px', height: '38px', borderRadius: '6px', border: '1px solid #c2a370', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    type="text"
                    className="admin-customizer-input"
                    value={config.announcement_bar.background_color}
                    onChange={(e) => handleAnnouncementChange('background_color', e.target.value)}
                    placeholder="#2B211D"
                  />
                </div>
              </div>

              <div className="admin-customizer-field">
                <label>Text / Icon Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={config.announcement_bar.text_color}
                    onChange={(e) => handleAnnouncementChange('text_color', e.target.value)}
                    style={{ width: '42px', height: '38px', borderRadius: '6px', border: '1px solid #c2a370', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    type="text"
                    className="admin-customizer-input"
                    value={config.announcement_bar.text_color}
                    onChange={(e) => handleAnnouncementChange('text_color', e.target.value)}
                    placeholder="#F5EDE2"
                  />
                </div>
              </div>

              <div className="admin-customizer-field">
                <label>Scroll Duration ({config.announcement_bar.speed_seconds}s)</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="1"
                  value={config.announcement_bar.speed_seconds}
                  onChange={(e) => handleAnnouncementChange('speed_seconds', Number(e.target.value))}
                  style={{ marginTop: '0.5rem', accentColor: '#d4af37' }}
                />
                <small>Lower number = faster scrolling animation</small>
              </div>
            </div>

            {/* Announcement Messages Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(247,239,230,0.85)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Ticker Messages ({config.announcement_bar.messages.length})
              </label>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={handleAddMessage}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                <Plus size={14} />
                <span>Add Message</span>
              </button>
            </div>

            {/* Messages List */}
            <div className="admin-customizer-messages-list">
              {config.announcement_bar.messages.map((msg, idx) => (
                <div key={msg.id || idx} className="admin-customizer-message-item">
                  <div style={{ width: '70px' }}>
                    <input
                      type="text"
                      className="admin-customizer-input"
                      value={msg.icon}
                      onChange={(e) => handleUpdateMessage(msg.id, 'icon', e.target.value)}
                      placeholder="Emoji"
                      title="Emoji Icon"
                      style={{ textAlign: 'center', fontSize: '1.1rem' }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="admin-customizer-input"
                      value={msg.text}
                      onChange={(e) => handleUpdateMessage(msg.id, 'text', e.target.value)}
                      placeholder="e.g. Free shipping on orders over ₹999"
                    />
                  </div>

                  {config.announcement_bar.messages.length > 1 && (
                    <button
                      type="button"
                      className="admin-customizer-delete-btn"
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="Delete message"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Live Ticker Preview */}
            <div className="admin-customizer-live-preview">
              <span className="admin-customizer-section-title" style={{ fontSize: '0.92rem', marginBottom: '0.5rem' }}>
                <ExternalLink size={15} />
                Live Announcement Bar Preview
              </span>

              {config.announcement_bar.enabled ? (
                <div
                  className="admin-customizer-preview-banner"
                  style={{
                    background: config.announcement_bar.background_color,
                    color: config.announcement_bar.text_color,
                  }}
                >
                  {config.announcement_bar.messages.map((m, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>{m.icon}</span>
                      <span>{m.text}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.8rem',
                    textAlign: 'center',
                    background: '#241c16',
                    border: '1px dashed rgba(194, 163, 112, 0.3)',
                    borderRadius: '8px',
                    color: 'rgba(247, 239, 230, 0.5)',
                    fontSize: '0.85rem',
                  }}
                >
                  Announcement Bar is currently disabled. Toggle the switch above to display it.
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
