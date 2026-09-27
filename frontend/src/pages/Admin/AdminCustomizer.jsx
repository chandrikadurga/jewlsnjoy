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
  },
};

export default function AdminCustomizer() {
  const [activeTab, setActiveTab] = useState('hero'); // 'hero' | 'announcements'
  const [config, setConfig] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  // Image Upload handler
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      const res = await adminApi.uploadImage(formData);
      if (res?.url) {
        handleHeroChange('image_url', res.url);
        setFeedback({ type: 'success', message: 'Hero image uploaded successfully!' });
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      // Fallback: local FileReader object URL
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        handleHeroChange('image_url', uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
      setFeedback({ type: 'success', message: 'Image loaded into preview successfully' });
    } finally {
      setUploadingImage(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      await customizationApi.updateCustomization(config);
      setFeedback({ type: 'success', message: 'Store customizations published live to frontend & backend!' });
    } catch (err) {
      console.error('Error saving customizations:', err);
      // Save to localStorage fallback
      localStorage.setItem('jewels_store_customization', JSON.stringify(config));
      setFeedback({ type: 'success', message: 'Customizations updated locally & cached!' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all hero and announcement bar settings to luxury defaults?')) {
      setConfig(DEFAULT_STATE);
      setFeedback({ type: 'success', message: 'Reset to default luxury settings. Click Save to publish.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const heroImageSrc = config.hero.image_url || defaultHeroImg;

  if (loading) {
    return (
      <div className="admin-loading-state">
        <div className="admin-spinner" />
        <p>Loading Store Customizer...</p>
      </div>
    );
  }

  return (
    <div className="admin-customizer-page">
      {/* Header */}
      <div className="admin-customizer-header">
        <div>
          <h1 className="admin-customizer-title" style={{ fontFamily: 'Cinzel, serif', color: '#c2a370' }}>
            Storefront Customizer
          </h1>
          <p className="admin-customizer-subtitle">
            Manage the top Announcement Bar and Homepage Hero banner details in real time
          </p>
        </div>

        <div className="admin-customizer-header__actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={handleReset}
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
            style={{ background: '#d4af37', color: '#18130f', fontWeight: 600 }}
          >
            <Save size={16} />
            <span>{saving ? 'Publishing...' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            background: feedback.type === 'success' ? 'rgba(64, 84, 59, 0.35)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${feedback.type === 'success' ? '#40543B' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#a3e635' : '#fca5a5',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
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

            {/* Hero Image Section */}
            <div className="admin-customizer-field">
              <label>Hero Image</label>
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

            {/* Live Visual Preview */}
            <div className="admin-customizer-live-preview">
              <span className="admin-customizer-section-title" style={{ fontSize: '0.92rem', marginBottom: '0.5rem' }}>
                <ExternalLink size={15} />
                Live Storefront Mockup Preview
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

                <div className="admin-customizer-preview-hero-img-wrap">
                  <img
                    src={heroImageSrc}
                    alt={config.hero.image_alt || 'Hero'}
                    className="admin-customizer-preview-hero-img"
                  />
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

            {/* Color & Speed Styling */}
            <div className="admin-customizer-grid-3">
              <div className="admin-customizer-field">
                <label>Background Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={config.announcement_bar.background_color || '#2B211D'}
                    onChange={(e) => handleAnnouncementChange('background_color', e.target.value)}
                    style={{ width: '40px', height: '38px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    className="admin-customizer-input"
                    value={config.announcement_bar.background_color || '#2B211D'}
                    onChange={(e) => handleAnnouncementChange('background_color', e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-customizer-field">
                <label>Text Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={config.announcement_bar.text_color || '#F5EDE2'}
                    onChange={(e) => handleAnnouncementChange('text_color', e.target.value)}
                    style={{ width: '40px', height: '38px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    className="admin-customizer-input"
                    value={config.announcement_bar.text_color || '#F5EDE2'}
                    onChange={(e) => handleAnnouncementChange('text_color', e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-customizer-field">
                <label>Scroll Duration ({config.announcement_bar.speed_seconds || 25}s)</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={config.announcement_bar.speed_seconds || 25}
                  onChange={(e) => handleAnnouncementChange('speed_seconds', Number(e.target.value))}
                  style={{ marginTop: '0.5rem', accentColor: '#d4af37' }}
                />
              </div>
            </div>

            {/* Announcement Messages List */}
            <div className="admin-customizer-field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Announcement Messages</label>
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

              <div className="admin-customizer-messages-list">
                {(config.announcement_bar.messages || []).map((msg, idx) => (
                  <div key={msg.id || idx} className="admin-customizer-message-item">
                    <input
                      type="text"
                      className="admin-customizer-input admin-customizer-emoji-input"
                      value={msg.icon || '✦'}
                      onChange={(e) => handleUpdateMessage(msg.id, 'icon', e.target.value)}
                      title="Emoji or icon symbol"
                      placeholder="Icon"
                    />

                    <input
                      type="text"
                      className="admin-customizer-input admin-customizer-text-input"
                      value={msg.text}
                      onChange={(e) => handleUpdateMessage(msg.id, 'text', e.target.value)}
                      placeholder="Announcement notice text..."
                    />

                    <button
                      type="button"
                      className="admin-customizer-item-btn admin-customizer-item-btn--danger"
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="Remove message"
                      disabled={(config.announcement_bar.messages || []).length <= 1}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
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
                    backgroundColor: config.announcement_bar.background_color || '#2B211D',
                    color: config.announcement_bar.text_color || '#F5EDE2',
                  }}
                >
                  {(config.announcement_bar.messages || []).map((msg, i) => (
                    <span key={msg.id || i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{msg.icon}</span>
                      <span>{msg.text}</span>
                      {i < (config.announcement_bar.messages || []).length - 1 && (
                        <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>✦</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.75rem',
                    textAlign: 'center',
                    background: '#241c16',
                    border: '1px dashed rgba(194, 163, 112, 0.3)',
                    borderRadius: '6px',
                    color: 'rgba(247, 239, 230, 0.5)',
                    fontSize: '0.84rem',
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
