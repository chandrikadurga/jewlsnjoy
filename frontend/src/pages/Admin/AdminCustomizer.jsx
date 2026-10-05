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
  AlertCircle,
  Film,
  Video,
  ArrowUp,
  ArrowDown
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
  video_reels: {
    enabled: true,
    eyebrow: 'Jewellery in Motion',
    heading: "See Jewels 'n' Joys in Real Life",
    description: "Witness the mirror-like polish, waterproof resistance, and subtle movement of our handcrafted pieces.",
    videos: [
      {
        id: '1',
        src: '/videos/1.mp4',
        title: 'Signature Radiance',
        tag: '18K Gold Plated',
        desc: 'Crafted with premium PVD coating for everlasting warmth and brilliance.',
      },
      {
        id: '2',
        src: '/videos/2.mp4',
        title: 'Waterproof Perfection',
        tag: 'Anti-Tarnish',
        desc: 'Shower, swim, and live freely without losing your golden glow.',
      },
      {
        id: '3',
        src: '/videos/3.mp4',
        title: 'Handcrafted Artistry',
        tag: 'Bespoke Design',
        desc: 'Delicate stone settings designed for effortless everyday layering.',
      },
      {
        id: '4',
        src: '/videos/4.mp4',
        title: 'Unboxing The Joy',
        tag: 'Luxury Boxed',
        desc: 'Delivered in our signature keepsake box, ready to gift or treasure.',
      },
      {
        id: '5',
        src: '/videos/5.mp4',
        title: 'Everyday Sparkle',
        tag: 'Daily Luxury',
        desc: 'Effortless elegance designed to seamlessly complement your daily style.',
      },
    ],
  },
};

export default function AdminCustomizer() {
  const [activeTab, setActiveTab] = useState('hero'); // 'hero' | 'announcements' | 'reels'
  const [config, setConfig] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSecondaryImage, setUploadingSecondaryImage] = useState(false);
  const [uploadingVideoId, setUploadingVideoId] = useState(null);
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
            video_reels: {
              ...prev.video_reels,
              ...(data.video_reels || {}),
              videos: (data.video_reels?.videos && Array.isArray(data.video_reels.videos) && data.video_reels.videos.length > 0)
                ? data.video_reels.videos
                : prev.video_reels.videos,
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

  // Video Reels Section Handlers
  const handleReelsMetaChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      video_reels: {
        ...prev.video_reels,
        [field]: value,
      },
    }));
  };

  const handleUpdateVideo = (id, field, value) => {
    setConfig((prev) => ({
      ...prev,
      video_reels: {
        ...prev.video_reels,
        videos: (prev.video_reels?.videos || []).map((v) => (v.id === id ? { ...v, [field]: value } : v)),
      },
    }));
  };

  const handleAddVideo = () => {
    const newId = `reel-${Date.now().toString(36)}`;
    const newVideo = {
      id: newId,
      src: '',
      title: 'Signature Elegance',
      tag: 'New Reel',
      desc: 'Handcrafted luxury piece designed for effortless elegance.',
    };
    setConfig((prev) => ({
      ...prev,
      video_reels: {
        ...prev.video_reels,
        videos: [...(prev.video_reels?.videos || []), newVideo],
      },
    }));
  };

  const handleDeleteVideo = (id) => {
    if ((config.video_reels?.videos || []).length <= 1) {
      setFeedback({ type: 'error', message: 'You must keep at least 1 video reel.' });
      return;
    }
    setConfig((prev) => ({
      ...prev,
      video_reels: {
        ...prev.video_reels,
        videos: (prev.video_reels?.videos || []).filter((v) => v.id !== id),
      },
    }));
  };

  const handleMoveVideo = (idx, direction) => {
    const videosList = config.video_reels?.videos || [];
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= videosList.length) return;
    const newVideos = [...videosList];
    const temp = newVideos[idx];
    newVideos[idx] = newVideos[targetIdx];
    newVideos[targetIdx] = temp;
    setConfig((prev) => ({
      ...prev,
      video_reels: {
        ...prev.video_reels,
        videos: newVideos,
      },
    }));
  };

  const handleVideoUpload = async (id, file) => {
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|m4v|ogg)$/i)) {
      setFeedback({ type: 'error', message: 'Please select a valid video file (MP4, WebM, MOV).' });
      return;
    }
    if (file.size > 60 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Video exceeds the maximum 60MB limit.' });
      return;
    }

    try {
      setUploadingVideoId(id);
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', `reel-${id}`);

      const res = await adminApi.uploadVideo(formData);
      if (res?.url) {
        handleUpdateVideo(id, 'src', res.url);
        setFeedback({ type: 'success', message: 'Video uploaded to Supabase Storage successfully!' });
      } else {
        throw new Error('No URL returned from server upload.');
      }
    } catch (err) {
      console.error('Failed to upload video reel:', err);
      const errMsg = err.response?.data?.error || err.message || 'Video upload failed.';
      setFeedback({ type: 'error', message: errMsg });
    } finally {
      setUploadingVideoId(null);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleResetDefaultVideos = () => {
    setConfig((prev) => ({
      ...prev,
      video_reels: {
        ...prev.video_reels,
        videos: DEFAULT_STATE.video_reels.videos,
      },
    }));
    setFeedback({ type: 'success', message: 'Reset video reels to signature defaults.' });
    setTimeout(() => setFeedback(null), 4000);
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

        <button
          type="button"
          className={`admin-customizer-tab ${activeTab === 'reels' ? 'admin-customizer-tab--active' : ''}`}
          onClick={() => setActiveTab('reels')}
        >
          <Film size={16} />
          <span>Video Reels Section</span>
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
                  style={{ objectFit: 'cover' }}
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
                  <div className={`admin-customizer-preview-hero-img-wrap ${previewSlideIdx === 1 ? 'is-portrait' : ''}`}>
                    <img
                      src={previewSlideIdx === 0 ? heroImageSrc : secondaryImageSrc}
                      alt={config.hero.image_alt || 'Hero'}
                      className="admin-customizer-preview-hero-img"
                      style={{ objectFit: 'cover' }}
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

      {/* Video Reels Section Tab Form */}
      {activeTab === 'reels' && (
        <div className="admin-customizer-card">
          <form className="admin-customizer-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <h3 className="admin-customizer-section-title">
              <Film size={18} />
              Homepage Video Reels Showcase Settings
            </h3>

            {/* Enable/Disable Toggle */}
            <div className="admin-customizer-toggle-row">
              <div>
                <span className="admin-customizer-toggle-label">Enable Video Reels Section</span>
                <p className="admin-customizer-toggle-sub">
                  Display the interactive short-form video reels grid on the homepage between Reviews and Store Perks.
                </p>
              </div>
              <label className="admin-customizer-switch">
                <input
                  type="checkbox"
                  checked={config.video_reels?.enabled ?? true}
                  onChange={(e) => handleReelsMetaChange('enabled', e.target.checked)}
                />
                <span className="admin-customizer-slider round" />
              </label>
            </div>

            {/* Section Heading & Copy */}
            <div className="admin-customizer-grid">
              <div className="admin-customizer-field">
                <label>Section Eyebrow</label>
                <input
                  type="text"
                  className="admin-customizer-input"
                  value={config.video_reels?.eyebrow || ''}
                  onChange={(e) => handleReelsMetaChange('eyebrow', e.target.value)}
                  placeholder="e.g. Jewellery in Motion"
                />
              </div>

              <div className="admin-customizer-field">
                <label>Section Title</label>
                <input
                  type="text"
                  className="admin-customizer-input"
                  value={config.video_reels?.heading || ''}
                  onChange={(e) => handleReelsMetaChange('heading', e.target.value)}
                  placeholder="e.g. See Jewels 'n' Joys in Real Life"
                />
              </div>
            </div>

            <div className="admin-customizer-field">
              <label>Section Subtitle / Description</label>
              <textarea
                className="admin-customizer-textarea"
                rows={2}
                value={config.video_reels?.description || ''}
                onChange={(e) => handleReelsMetaChange('description', e.target.value)}
                placeholder="Brief description explaining the beauty of handcrafted pieces in motion..."
              />
            </div>

            {/* Videos List Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(247,239,230,0.85)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Video Reels ({(config.video_reels?.videos || []).length})
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={handleResetDefaultVideos}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  title="Reset to the 5 default signature video reels"
                >
                  <RotateCcw size={14} />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={handleAddVideo}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  <Plus size={14} />
                  <span>Add Video Reel</span>
                </button>
              </div>
            </div>

            {/* Videos List */}
            <div className="admin-customizer-reels-list">
              {(config.video_reels?.videos || []).map((video, idx) => (
                <div key={video.id || idx} className="admin-customizer-reel-item">
                  {/* Left: Video Preview Player */}
                  <div className="admin-customizer-reel-thumb-col">
                    <div className="admin-customizer-reel-video-box">
                      {video.src ? (
                        <video
                          src={resolveStoragePath(video.src)}
                          className="admin-customizer-reel-preview-video"
                          muted
                          playsInline
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <div className="admin-customizer-reel-placeholder">
                          <Film size={28} />
                          <span>No video yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Controls & Fields */}
                  <div className="admin-customizer-reel-fields-col">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span className="admin-customizer-reel-badge">Reel #{idx + 1}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="admin-customizer-btn-icon"
                          onClick={() => handleMoveVideo(idx, -1)}
                          disabled={idx === 0}
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-customizer-btn-icon"
                          onClick={() => handleMoveVideo(idx, 1)}
                          disabled={idx === (config.video_reels?.videos || []).length - 1}
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-customizer-delete-btn"
                          onClick={() => handleDeleteVideo(video.id)}
                          title="Delete reel"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Upload Controls */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <label className="admin-customizer-file-btn" style={{ padding: '0.4rem 0.85rem' }}>
                        <Upload size={14} />
                        <span>{uploadingVideoId === video.id ? 'Uploading to Supabase...' : 'Upload Video Reel'}</span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/m4v,video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoUpload(video.id, file);
                          }}
                          disabled={uploadingVideoId === video.id}
                        />
                      </label>
                      <small style={{ color: 'rgba(247, 239, 230, 0.6)', fontSize: '0.74rem' }}>
                        Upload MP4, WebM, or MOV up to 60MB from camera roll or files
                      </small>
                    </div>

                    <div className="admin-customizer-field" style={{ marginBottom: '0.6rem' }}>
                      <small style={{ color: 'rgba(247, 239, 230, 0.7)', fontSize: '0.75rem' }}>Video URL / Supabase CDN path:</small>
                      <input
                        type="text"
                        className="admin-customizer-input"
                        value={video.src || ''}
                        onChange={(e) => handleUpdateVideo(video.id, 'src', e.target.value)}
                        placeholder="e.g. https://...supabase.co/.../reel.mp4 or /videos/1.mp4"
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>

                    <div className="admin-customizer-grid" style={{ marginBottom: '0.6rem' }}>
                      <div className="admin-customizer-field">
                        <small style={{ color: 'rgba(247, 239, 230, 0.7)', fontSize: '0.75rem' }}>Reel Title:</small>
                        <input
                          type="text"
                          className="admin-customizer-input"
                          value={video.title || ''}
                          onChange={(e) => handleUpdateVideo(video.id, 'title', e.target.value)}
                          placeholder="e.g. Signature Radiance"
                        />
                      </div>
                      <div className="admin-customizer-field">
                        <small style={{ color: 'rgba(247, 239, 230, 0.7)', fontSize: '0.75rem' }}>Badge / Tag:</small>
                        <input
                          type="text"
                          className="admin-customizer-input"
                          value={video.tag || ''}
                          onChange={(e) => handleUpdateVideo(video.id, 'tag', e.target.value)}
                          placeholder="e.g. 18K Gold Plated"
                        />
                      </div>
                    </div>

                    <div className="admin-customizer-field">
                      <small style={{ color: 'rgba(247, 239, 230, 0.7)', fontSize: '0.75rem' }}>Description:</small>
                      <textarea
                        className="admin-customizer-textarea"
                        rows={2}
                        value={video.desc || ''}
                        onChange={(e) => handleUpdateVideo(video.id, 'desc', e.target.value)}
                        placeholder="e.g. Crafted with premium PVD coating for everlasting warmth..."
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Reels Mockup Preview */}
            <div className="admin-customizer-live-preview" style={{ marginTop: '1.5rem' }}>
              <span className="admin-customizer-section-title" style={{ fontSize: '0.92rem', marginBottom: '0.5rem' }}>
                <ExternalLink size={15} />
                Live Storefront Showcase Preview
              </span>

              {config.video_reels?.enabled !== false ? (
                <div style={{ background: '#f5ede2', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(198, 161, 91, 0.3)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c6934b', fontWeight: 600 }}>
                      {config.video_reels?.eyebrow || 'Jewellery in Motion'}
                    </span>
                    <h4 style={{ margin: '4px 0', fontSize: '1.1rem', color: '#2B211D', fontFamily: 'serif' }}>
                      {config.video_reels?.heading || "See Jewels 'n' Joys in Real Life"}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                      {config.video_reels?.description}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    {(config.video_reels?.videos || []).slice(0, 5).map((v, i) => (
                      <div
                        key={v.id || i}
                        style={{
                          aspectRatio: '9 / 16',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#0d0a09',
                          position: 'relative',
                          border: '1px solid rgba(198, 161, 91, 0.3)',
                        }}
                      >
                        {v.src && (
                          <video
                            src={resolveStoragePath(v.src)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            muted
                            loop
                            playsInline
                            autoPlay
                          />
                        )}
                        <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(13, 10, 9, 0.7)', borderRadius: '10px', padding: '2px 6px', fontSize: '0.62rem', color: '#d4b475', fontWeight: 600 }}>
                          {v.tag}
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem 0.5rem 0.5rem', background: 'linear-gradient(to top, rgba(13,10,9,0.95), transparent)', color: '#fff' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, margin: 0 }}>{v.title}</div>
                          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '0.8rem', textAlign: 'center', background: '#241c16', border: '1px dashed rgba(194, 163, 112, 0.3)', borderRadius: '8px', color: 'rgba(247, 239, 230, 0.5)', fontSize: '0.85rem' }}>
                  Video Reels section is currently disabled. Toggle the switch above to display it on the storefront.
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
