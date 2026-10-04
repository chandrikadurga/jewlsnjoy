import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { bannerApi } from '../../services/bannerApi';
import BannerEditor from './BannerEditor';
import BannerPreviewModal from './BannerPreviewModal';
import './AdminBanners.css';

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editingBanner, setEditingBanner] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewingBanner, setPreviewingBanner] = useState(null);

  const [actionFeedback, setActionFeedback] = useState(null);
  const [deleteConfirmBanner, setDeleteConfirmBanner] = useState(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const data = await bannerApi.getAdminBanners(params);
      setBanners(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      console.error('Failed to fetch promotional banners:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const showFeedback = (msg, type = 'success') => {
    setActionFeedback({ msg, type });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handlePublish = async (banner) => {
    try {
      await bannerApi.publishBanner(banner.id);
      showFeedback(`Campaign '${banner.name}' published successfully.`);
      fetchBanners();
    } catch (err) {
      console.error('Publish error:', err);
      showFeedback('Failed to publish campaign.', 'error');
    }
  };

  const handleUnpublish = async (banner) => {
    try {
      await bannerApi.unpublishBanner(banner.id);
      showFeedback(`Campaign '${banner.name}' reverted to draft.`);
      fetchBanners();
    } catch (err) {
      console.error('Unpublish error:', err);
      showFeedback('Failed to unpublish campaign.', 'error');
    }
  };

  const handleDuplicate = async (banner) => {
    try {
      await bannerApi.duplicateBanner(banner.id);
      showFeedback(`Duplicated campaign '${banner.name}'.`);
      fetchBanners();
    } catch (err) {
      console.error('Duplicate error:', err);
      showFeedback('Failed to duplicate campaign.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmBanner) return;
    try {
      await bannerApi.deleteBanner(deleteConfirmBanner.id);
      showFeedback(`Campaign '${deleteConfirmBanner.name}' deleted.`);
      setDeleteConfirmBanner(null);
      fetchBanners();
    } catch (err) {
      console.error('Delete error:', err);
      showFeedback('Failed to delete campaign.', 'error');
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const newBanners = [...banners];
    const temp = newBanners[index];
    newBanners[index] = newBanners[targetIndex];
    newBanners[targetIndex] = temp;

    setBanners(newBanners);
    try {
      const ids = newBanners.map((b) => b.id);
      await bannerApi.reorderBanners(ids);
      showFeedback('Banner order updated.');
    } catch (err) {
      console.error('Reorder error:', err);
      fetchBanners();
    }
  };

  // ── If in Editor Mode ─────────────────────────────────────────────────────
  if (isCreating || editingBanner) {
    return (
      <BannerEditor
        banner={editingBanner}
        onSave={() => {
          setIsCreating(false);
          setEditingBanner(null);
          showFeedback('Promotional campaign saved successfully!');
          fetchBanners();
        }}
        onCancel={() => {
          setIsCreating(false);
          setEditingBanner(null);
        }}
      />
    );
  }

  // Calculate high-level metrics
  const activeBanner = banners.find((b) => b.status === 'published' && b.is_active);
  const scheduledCount = banners.filter((b) => b.status === 'scheduled').length;
  const draftCount = banners.filter((b) => b.status === 'draft').length;

  return (
    <div className="admin-banners-page">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div className={`admin-toast admin-toast--${actionFeedback.type}`}>
          {actionFeedback.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{actionFeedback.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-banners-header">
        <div>
          <span className="admin-banners-eyebrow">MARKETING & CAMPAIGNS</span>
          <h1 className="admin-banners-title">Promotional Banners</h1>
          <p className="admin-banners-subtitle">
            Configure homepage hero banners, seasonal sales, BYOS promotions, and artwork without touching code.
          </p>
        </div>

        <div className="admin-banners-header__actions">
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={18} />
            <span>Create Campaign Banner</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="admin-banners-metrics">
        <div className="admin-metric-card">
          <span className="admin-metric-card__label">Active Live Campaign</span>
          <div className="admin-metric-card__value-wrap">
            <span className="admin-metric-card__dot admin-metric-card__dot--active" />
            <h3 className="admin-metric-card__value">
              {activeBanner ? activeBanner.name : 'No Campaign Live'}
            </h3>
          </div>
          {activeBanner && (
            <span className="admin-metric-card__sub">
              Priority: {activeBanner.priority} • Title: "{activeBanner.title || 'N/A'}"
            </span>
          )}
        </div>

        <div className="admin-metric-card">
          <span className="admin-metric-card__label">Total Campaigns</span>
          <h3 className="admin-metric-card__number">{banners.length}</h3>
          <span className="admin-metric-card__sub">Authoritative Supabase database records</span>
        </div>

        <div className="admin-metric-card">
          <span className="admin-metric-card__label">Scheduled</span>
          <h3 className="admin-metric-card__number">{scheduledCount}</h3>
          <span className="admin-metric-card__sub">Upcoming scheduled marketing drops</span>
        </div>

        <div className="admin-metric-card">
          <span className="admin-metric-card__label">Drafts</span>
          <h3 className="admin-metric-card__number">{draftCount}</h3>
          <span className="admin-metric-card__sub">In-progress campaign artwork & copy</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-banners-filterbar">
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search campaigns by name, title, or hook..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-filter-tabs">
          {['all', 'published', 'scheduled', 'draft', 'archived'].map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              className={`admin-filter-tab ${statusFilter === statusKey ? 'admin-filter-tab--active' : ''}`}
              onClick={() => setStatusFilter(statusKey)}
            >
              {statusKey.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table / Cards */}
      {loading ? (
        <div className="admin-loading-state">
          <RefreshCw size={24} className="spin-icon" />
          <span>Loading promotional campaigns...</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="admin-empty-state">
          <Megaphone size={42} className="admin-empty-icon" />
          <h3>No Promotional Banners Found</h3>
          <p>Get started by creating your first promotional campaign banner.</p>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={16} />
            <span>Create Campaign Banner</span>
          </button>
        </div>
      ) : (
        <div className="admin-banner-list">
          {banners.map((item, index) => {
            const isCurrentlyActive = item.status === 'published' && item.is_active;

            return (
              <div
                key={item.id}
                className={`admin-banner-card ${isCurrentlyActive ? 'admin-banner-card--active' : ''}`}
              >
                {/* Thumbnail Preview Area */}
                <div className="admin-banner-card__thumb-col">
                  {item.desktop_image_url ? (
                    <div className="admin-banner-card__thumb-wrap">
                      <img
                        src={item.desktop_image_url}
                        alt={item.name}
                        className="admin-banner-card__thumb"
                      />
                      <div className="admin-banner-card__badges">
                        <span className="artwork-chip">Desktop</span>
                        {item.mobile_image_url && <span className="artwork-chip artwork-chip--mobile">Mobile</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="admin-banner-card__thumb-placeholder">
                      <Sparkles size={20} />
                      <span>Stylized Backdrop</span>
                    </div>
                  )}

                  {/* Ordering arrows */}
                  <div className="admin-banner-card__order-btns">
                    <button
                      type="button"
                      className="order-btn"
                      disabled={index === 0}
                      onClick={() => handleMoveOrder(index, 'up')}
                      title="Move higher priority"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="order-btn"
                      disabled={index === banners.length - 1}
                      onClick={() => handleMoveOrder(index, 'down')}
                      title="Move lower priority"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>

                {/* Details Col */}
                <div className="admin-banner-card__details-col">
                  <div className="admin-banner-card__header-line">
                    <h3 className="admin-banner-card__name">{item.name}</h3>

                    <div className="admin-banner-card__status-badges">
                      <span className={`status-badge status-badge--${item.status}`}>
                        {item.status.toUpperCase()}
                      </span>
                      {isCurrentlyActive && (
                        <span className="status-badge status-badge--live">
                          LIVE STOREFRONT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Campaign Copy Preview */}
                  <div className="admin-banner-card__copy-preview">
                    {item.title && <span className="copy-tag">Title: <strong>{item.title}</strong></span>}
                    {item.subtitle && <span className="copy-tag">Subtitle: <em>{item.subtitle}</em></span>}
                    {item.price_text && <span className="copy-tag copy-tag--gold">Offer: <strong>{item.price_text}</strong></span>}
                    {item.cta_text && <span className="copy-tag">CTA: [{item.cta_text} → {item.cta_url || '/shop'}]</span>}
                  </div>

                  {/* Scheduling and Priority Details */}
                  <div className="admin-banner-card__meta-line">
                    <span className="meta-pill">
                      Priority: <strong>{item.priority}</strong>
                    </span>
                    <span className="meta-pill">
                      Order: <strong>{item.display_order}</strong>
                    </span>
                    {item.start_at && (
                      <span className="meta-pill">
                        Starts: {new Date(item.start_at).toLocaleDateString()}
                      </span>
                    )}
                    {item.end_at && (
                      <span className="meta-pill">
                        Ends: {new Date(item.end_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons Col */}
                <div className="admin-banner-card__actions-col">
                  <button
                    type="button"
                    className="action-btn action-btn--preview"
                    onClick={() => setPreviewingBanner(item)}
                    title="Live multi-device preview"
                  >
                    <Eye size={15} />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    className="action-btn action-btn--edit"
                    onClick={() => setEditingBanner(item)}
                    title="Edit banner content and artwork"
                  >
                    <Edit2 size={15} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handleDuplicate(item)}
                    title="Duplicate campaign"
                  >
                    <Copy size={15} />
                    <span>Duplicate</span>
                  </button>

                  {item.status === 'published' ? (
                    <button
                      type="button"
                      className="action-btn action-btn--unpublish"
                      onClick={() => handleUnpublish(item)}
                      title="Unpublish to draft"
                    >
                      <span>Unpublish</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="action-btn action-btn--publish"
                      onClick={() => handlePublish(item)}
                      title="Publish to live storefront"
                    >
                      <span>Publish</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="action-btn action-btn--delete"
                    onClick={() => setDeleteConfirmBanner(item)}
                    title="Delete banner"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Preview Modal */}
      {previewingBanner && (
        <BannerPreviewModal
          banner={previewingBanner}
          isOpen={Boolean(previewingBanner)}
          onClose={() => setPreviewingBanner(null)}
        />
      )}

      {/* Delete Confirmation Modal (Safety Check) */}
      {deleteConfirmBanner && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div className="admin-modal-box__icon-wrap">
              <AlertTriangle size={28} className="warn-icon" />
            </div>
            <h3 className="admin-modal-box__title">Delete Promotional Campaign?</h3>
            <p className="admin-modal-box__desc">
              Are you sure you want to permanently delete{' '}
              <strong>"{deleteConfirmBanner.name}"</strong>?
            </p>
            {deleteConfirmBanner.status === 'published' && deleteConfirmBanner.is_active && (
              <div className="admin-modal-box__warning">
                ⚠️ <strong>CRITICAL WARNING:</strong> This campaign is currently published and active!
                Deleting it may immediately remove the current storefront promotion.
              </div>
            )}
            <div className="admin-modal-box__actions">
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => setDeleteConfirmBanner(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-admin btn-admin--danger"
                onClick={handleDeleteConfirm}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
