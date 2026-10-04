import { useState, useRef } from 'react';
import {
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Save,
} from 'lucide-react';
import { bannerApi } from '../../services/bannerApi';
import BannerPreviewModal from './BannerPreviewModal';

const DEFAULT_BANNER = {
  name: '',
  title: '',
  subtitle: '',
  price_text: '',
  supporting_text: '',
  cta_text: 'SHOP NOW',
  cta_url: '/shop',
  desktop_image_url: '',
  mobile_image_url: '',
  background_image_url: '',
  status: 'draft',
  is_active: true,
  priority: 10,
  display_order: 0,
  start_at: '',
  end_at: '',
};

export default function BannerEditor({ banner, onSave, onCancel }) {
  const isEditing = Boolean(banner && banner.id);

  // Helper to convert ISO string to datetime-local format
  const formatDatetimeForInput = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState(() => {
    if (!banner) return DEFAULT_BANNER;
    return {
      ...DEFAULT_BANNER,
      ...banner,
      start_at: formatDatetimeForInput(banner.start_at),
      end_at: formatDatetimeForInput(banner.end_at),
      last_known_updated_at: banner.updated_at,
    };
  });

  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [desktopMeta, setDesktopMeta] = useState(null);
  const [mobileMeta, setMobileMeta] = useState(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const desktopFileInputRef = useRef(null);
  const mobileFileInputRef = useRef(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg(null);
  };

  // ── Artwork Upload Flow (Supabase Storage) ──────────────────────────────────
  const handleFileUpload = async (file, slotType = 'desktop') => {
    if (!file) return;

    // Validate size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(`Image size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit.`);
      return;
    }

    // Read dimensions for display
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const meta = {
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        dimensions: `${img.naturalWidth} × ${img.naturalHeight}px`,
      };
      if (slotType === 'desktop') setDesktopMeta(meta);
      else setMobileMeta(meta);
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;

    const uploadData = new FormData();
    uploadData.append('image', file);
    uploadData.append('banner_id', formData.id || 'tmp');
    uploadData.append('slot_type', slotType);

    if (slotType === 'desktop') setUploadingDesktop(true);
    else setUploadingMobile(true);

    try {
      const result = await bannerApi.uploadArtwork(uploadData);
      if (result && result.url) {
        if (slotType === 'desktop') {
          handleChange('desktop_image_url', result.url);
        } else {
          handleChange('mobile_image_url', result.url);
        }
      }
    } catch (err) {
      console.error('Artwork upload failed:', err);
      const apiErr = err.response?.data?.error || 'Image upload failed. Please try again.';
      setErrorMsg(apiErr);
    } finally {
      if (slotType === 'desktop') setUploadingDesktop(false);
      else setUploadingMobile(false);
    }
  };

  const handleDrop = (e, slotType) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file, slotType);
  };

  // ── Save / Publish Logic ───────────────────────────────────────────────────
  const handleSubmit = async (targetStatus) => {
    if (!formData.name.trim()) {
      setErrorMsg('Internal Campaign Name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setConcurrencyConflict(false);

    try {
      const payload = {
        ...formData,
        status: targetStatus || formData.status,
        is_active: targetStatus === 'published' ? true : formData.is_active,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        priority: parseInt(formData.priority, 10) || 10,
        display_order: parseInt(formData.display_order, 10) || 0,
      };

      let savedBanner;
      if (isEditing) {
        savedBanner = await bannerApi.updateBanner(banner.id, payload);
      } else {
        savedBanner = await bannerApi.createBanner(payload);
      }

      if (onSave) {
        onSave(savedBanner);
      }
    } catch (err) {
      console.error('Save failed:', err);
      if (err.response?.status === 409) {
        setConcurrencyConflict(true);
        setErrorMsg(
          'This banner was updated by another administrator. Please refresh the page before saving.'
        );
      } else {
        const errorData = err.response?.data;
        if (typeof errorData === 'object') {
          const firstKey = Object.keys(errorData)[0];
          const val = errorData[firstKey];
          setErrorMsg(`${firstKey}: ${Array.isArray(val) ? val.join(', ') : val}`);
        } else {
          setErrorMsg('An unexpected error occurred while saving the campaign.');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="banner-editor">
      {/* Editor Header */}
      <div className="banner-editor__header">
        <div>
          <span className="banner-editor__eyebrow">
            {isEditing ? 'EDIT CAMPAIGN' : 'NEW PROMOTIONAL CAMPAIGN'}
          </span>
          <h2 className="banner-editor__title">
            {formData.name || 'Untitled Campaign'}
          </h2>
        </div>

        <div className="banner-editor__actions">
          <button
            type="button"
            className="btn-admin btn-admin--secondary"
            onClick={() => setShowPreviewModal(true)}
          >
            <Eye size={16} />
            <span>Live Preview</span>
          </button>

          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn-admin btn-admin--secondary"
            onClick={() => handleSubmit('draft')}
            disabled={saving}
          >
            <Save size={16} />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={() => handleSubmit('published')}
            disabled={saving}
          >
            <CheckCircle2 size={16} />
            <span>Publish to Storefront</span>
          </button>
        </div>
      </div>

      {/* Error or Concurrency Alert Banner */}
      {errorMsg && (
        <div className={`banner-editor__alert ${concurrencyConflict ? 'banner-editor__alert--danger' : ''}`}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Editor Grid */}
      <div className="banner-editor__grid">
        {/* Left Column: Content & Copy */}
        <div className="banner-editor__col">
          {/* Section A: Campaign Metadata */}
          <div className="admin-card">
            <h3 className="admin-card__title">Campaign Information</h3>
            <div className="form-group">
              <label htmlFor="banner-name">Internal Campaign Name *</label>
              <input
                id="banner-name"
                type="text"
                className="admin-input"
                placeholder="e.g. BYOS ₹799 Weekend Flash Sale"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
              <span className="field-hint">Internal reference label for marketing team.</span>
            </div>

            <div className="form-row form-row--3">
              <div className="form-group">
                <label htmlFor="banner-status">Lifecycle Status</label>
                <select
                  id="banner-status"
                  className="admin-select"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="banner-priority">Priority (1–100)</label>
                <input
                  id="banner-priority"
                  type="number"
                  className="admin-input"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                />
                <span className="field-hint">Higher priority wins when multiple campaigns overlap.</span>
              </div>

              <div className="form-group">
                <label htmlFor="banner-active">Active State</label>
                <div className="admin-checkbox-wrap">
                  <input
                    id="banner-active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                  />
                  <label htmlFor="banner-active">Enabled</label>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Promotional Content & Copy */}
          <div className="admin-card">
            <h3 className="admin-card__title">Promotional Content & Messaging</h3>
            <div className="form-row form-row--2">
              <div className="form-group">
                <label htmlFor="banner-title">Main Heading / Title</label>
                <input
                  id="banner-title"
                  type="text"
                  className="admin-input"
                  placeholder="e.g. BYOS or DIWALI SPECIAL"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="banner-subtitle">Subtitle / Hook</label>
                <input
                  id="banner-subtitle"
                  type="text"
                  className="admin-input"
                  placeholder="e.g. pick any 3 at or Flat 50% OFF"
                  value={formData.subtitle}
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row form-row--2">
              <div className="form-group">
                <label htmlFor="banner-price">Price / Offer Badge</label>
                <input
                  id="banner-price"
                  type="text"
                  className="admin-input"
                  placeholder="e.g. ₹799/-"
                  value={formData.price_text}
                  onChange={(e) => handleChange('price_text', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="banner-cta-text">CTA Button Label</label>
                <input
                  id="banner-cta-text"
                  type="text"
                  className="admin-input"
                  placeholder="e.g. SHOP NOW"
                  value={formData.cta_text}
                  onChange={(e) => handleChange('cta_text', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="banner-cta-url">CTA Destination URL</label>
              <input
                id="banner-cta-url"
                type="text"
                className="admin-input"
                placeholder="e.g. /shop or /collections/byos"
                value={formData.cta_url}
                onChange={(e) => handleChange('cta_url', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="banner-supporting">Supporting Text / Offer Bullets (One per line)</label>
              <textarea
                id="banner-supporting"
                className="admin-textarea"
                rows={3}
                placeholder="+ free shipping&#10;+ free gift"
                value={formData.supporting_text}
                onChange={(e) => handleChange('supporting_text', e.target.value)}
              />
              <span className="field-hint">Rendered as elegant golden sparkle bullet points.</span>
            </div>
          </div>

          {/* Section E: Campaign Scheduling */}
          <div className="admin-card">
            <h3 className="admin-card__title">Campaign Scheduling (Timezone: Asia/Kolkata)</h3>
            <div className="form-row form-row--2">
              <div className="form-group">
                <label htmlFor="banner-start-at">Start Date & Time (Optional)</label>
                <input
                  id="banner-start-at"
                  type="datetime-local"
                  className="admin-input"
                  value={formData.start_at}
                  onChange={(e) => handleChange('start_at', e.target.value)}
                />
                <span className="field-hint">Campaign automatically activates at this timestamp.</span>
              </div>

              <div className="form-group">
                <label htmlFor="banner-end-at">End Date & Time (Optional)</label>
                <input
                  id="banner-end-at"
                  type="datetime-local"
                  className="admin-input"
                  value={formData.end_at}
                  onChange={(e) => handleChange('end_at', e.target.value)}
                />
                <span className="field-hint">Campaign automatically archives after this timestamp.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Desktop & Mobile Artwork */}
        <div className="banner-editor__col">
          {/* Desktop Artwork Card */}
          <div className="admin-card">
            <div className="admin-card__header-flex">
              <h3 className="admin-card__title">Desktop Artwork</h3>
              <span className="artwork-spec-pill">Recommended: 1920 × 700px • Max 10MB</span>
            </div>

            <div
              className={`artwork-dropzone ${uploadingDesktop ? 'artwork-dropzone--uploading' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 'desktop')}
              onClick={() => desktopFileInputRef.current?.click()}
            >
              <input
                ref={desktopFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files?.[0], 'desktop')}
              />

              {uploadingDesktop ? (
                <div className="artwork-dropzone__loading">
                  <RefreshCw size={24} className="spin-icon" />
                  <span>Uploading to Supabase Storage CDN...</span>
                </div>
              ) : formData.desktop_image_url ? (
                <div className="artwork-preview">
                  <img
                    src={formData.desktop_image_url}
                    alt="Desktop Banner Preview"
                    className="artwork-preview__img"
                  />
                  <div className="artwork-preview__overlay">
                    <span className="artwork-preview__change-label">Click or drop to replace image</span>
                  </div>
                </div>
              ) : (
                <div className="artwork-dropzone__empty">
                  <Upload size={32} className="artwork-dropzone__icon" />
                  <p className="artwork-dropzone__lead">DROP DESKTOP BANNER HERE</p>
                  <p className="artwork-dropzone__sub">or click to browse from device</p>
                  <span className="artwork-dropzone__types">WebP, JPG, PNG, AVIF supported</span>
                </div>
              )}
            </div>

            {formData.desktop_image_url && (
              <div className="artwork-meta-bar">
                <div className="artwork-meta-bar__info">
                  <span className="artwork-meta-bar__tag">Supabase CDN Cloud URL Active</span>
                  {desktopMeta && (
                    <span className="artwork-meta-bar__specs">
                      {desktopMeta.dimensions} • {desktopMeta.size}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="artwork-meta-bar__delete-btn"
                  onClick={() => handleChange('desktop_image_url', '')}
                  title="Remove desktop image"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Artwork Card */}
          <div className="admin-card">
            <div className="admin-card__header-flex">
              <h3 className="admin-card__title">Mobile Smartphone Artwork</h3>
              <span className="artwork-spec-pill">Recommended: 800 × 1000px (4:5 or 9:16)</span>
            </div>

            <div
              className={`artwork-dropzone artwork-dropzone--mobile ${uploadingMobile ? 'artwork-dropzone--uploading' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 'mobile')}
              onClick={() => mobileFileInputRef.current?.click()}
            >
              <input
                ref={mobileFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files?.[0], 'mobile')}
              />

              {uploadingMobile ? (
                <div className="artwork-dropzone__loading">
                  <RefreshCw size={24} className="spin-icon" />
                  <span>Uploading mobile artwork...</span>
                </div>
              ) : formData.mobile_image_url ? (
                <div className="artwork-preview artwork-preview--mobile">
                  <img
                    src={formData.mobile_image_url}
                    alt="Mobile Banner Preview"
                    className="artwork-preview__img"
                  />
                  <div className="artwork-preview__overlay">
                    <span className="artwork-preview__change-label">Click or drop to replace mobile image</span>
                  </div>
                </div>
              ) : (
                <div className="artwork-dropzone__empty">
                  <Upload size={28} className="artwork-dropzone__icon" />
                  <p className="artwork-dropzone__lead">DROP MOBILE BANNER HERE</p>
                  <p className="artwork-dropzone__sub">or click to browse</p>
                </div>
              )}
            </div>

            {!formData.mobile_image_url && (
              <div className="banner-editor__warning-box">
                <AlertTriangle size={15} />
                <span>No mobile artwork uploaded. Desktop artwork will be used with responsive cropping on mobile screens.</span>
              </div>
            )}

            {formData.mobile_image_url && (
              <div className="artwork-meta-bar">
                <div className="artwork-meta-bar__info">
                  <span className="artwork-meta-bar__tag">Mobile Artwork Configured</span>
                  {mobileMeta && (
                    <span className="artwork-meta-bar__specs">
                      {mobileMeta.dimensions} • {mobileMeta.size}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="artwork-meta-bar__delete-btn"
                  onClick={() => handleChange('mobile_image_url', '')}
                  title="Remove mobile image"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      <BannerPreviewModal
        banner={formData}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />
    </div>
  );
}
