import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Truck,
  Video,
  Clock,
  Mail,
  Phone,
  Calendar,
  Save,
  Sparkles,
  AlertCircle,
  Lock,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi, policyApi } from '../../services/api';
import './AdminPolicies.css';

const DEFAULT_POLICIES_STATE = {
  return: {
    key: 'return',
    title: 'Return & Refund Policy',
    badge_label: 'Strict Policy',
    last_updated: '04-09-2026',
    intro: "Thank you for shopping at Jewels 'n' Joys.",
    highlight_notice:
      'We follow a strict no refund, return, or exchange policy. Once an order is placed, it cannot be canceled, modified, or returned.',
    unboxing_requirement:
      'A full 360-degree unboxing video with no cuts or edits is mandatory to process any complaints. Without this video, we will not be able to assist you.',
    reporting_hours: 24,
    rules: [
      {
        title: '24-Hour Reporting Window',
        text: 'If you receive a damaged or incorrect product, you must report the issue within 24 hours of delivery.',
      },
      {
        title: 'Mandatory 360° Unboxing Video',
        text: 'A full 360-degree unboxing video with no cuts or edits is mandatory to process any complaints. Without this video, we will not be able to assist you.',
      },
      {
        title: 'Approval & Replacement',
        text: 'If your complaint is verified and approved, we may provide a replacement for the damaged product.',
      },
    ],
    support_email: 'jewelsnjoy25@gmail.com',
    support_phone: '+91 7251070150',
  },
  shipping: {
    key: 'shipping',
    title: 'Shipping & Delivery Policy',
    badge_label: 'Fast & Reliable',
    last_updated: '04-09-2026',
    intro: 'We deliver our luxury jewellery pieces safely across all serviceable pin codes in India.',
    dispatch_days: '1–3 working days (Mon–Fri)',
    standard_delivery: '6 to 8 business days',
    express_delivery: '3 to 4 business days',
    free_shipping_threshold: 999,
    partner_note: 'Orders dispatched via premier courier services with tracking provided on order confirmation.',
    support_email: 'jewelsnjoy25@gmail.com',
    support_phone: '+91 7251070150',
  },
  privacy: {
    key: 'privacy',
    title: 'Privacy Policy',
    badge_label: 'Data Protected',
    last_updated: '04-09-2026',
    intro: 'Your privacy and personal data are respected and safeguarded at Jewels \'n\' Joys.',
    summary:
      'We use customer names, shipping addresses, and contact details strictly for order fulfillment, dispatch updates, and customer support. We never sell your personal data.',
    support_email: 'jewelsnjoy25@gmail.com',
  },
};

export default function AdminPolicies() {
  const [activeTab, setActiveTab] = useState('return'); // 'return' | 'shipping' | 'privacy'
  const [policies, setPolicies] = useState(DEFAULT_POLICIES_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getStorePolicies();
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        setPolicies((prev) => ({
          ...prev,
          ...data,
        }));
      } else {
        const stored = localStorage.getItem('jewels_store_policies');
        if (stored) {
          try {
            setPolicies(JSON.parse(stored));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Failed to load server policies, using defaults:', err);
      const stored = localStorage.getItem('jewels_store_policies');
      if (stored) {
        try {
          setPolicies(JSON.parse(stored));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleReturnFieldChange = (field, val) => {
    setPolicies((prev) => ({
      ...prev,
      return: {
        ...prev.return,
        [field]: val,
      },
    }));
  };

  const handleShippingFieldChange = (field, val) => {
    setPolicies((prev) => ({
      ...prev,
      shipping: {
        ...prev.shipping,
        [field]: val,
      },
    }));
  };

  const handlePrivacyFieldChange = (field, val) => {
    setPolicies((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [field]: val,
      },
    }));
  };

  const handleRuleChange = (idx, field, val) => {
    setPolicies((prev) => {
      const rules = [...(prev.return.rules || [])];
      if (rules[idx]) {
        rules[idx] = { ...rules[idx], [field]: val };
      }
      return {
        ...prev,
        return: {
          ...prev.return,
          rules,
        },
      };
    });
  };

  const handleAddRule = () => {
    setPolicies((prev) => {
      const rules = [...(prev.return.rules || [])];
      rules.push({
        title: 'New Policy Clause',
        text: 'Enter the details of this policy requirement here...',
      });
      return {
        ...prev,
        return: {
          ...prev.return,
          rules,
        },
      };
    });
  };

  const handleRemoveRule = (idx) => {
    setPolicies((prev) => {
      const rules = (prev.return.rules || []).filter((_, i) => i !== idx);
      return {
        ...prev,
        return: {
          ...prev.return,
          rules,
        },
      };
    });
  };

  const handleSaveAll = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem('jewels_store_policies', JSON.stringify(policies));
      await adminApi.updateStorePolicies(policies);
      showFeedback('Store policies published & updated successfully!');
    } catch (err) {
      console.warn('Saved policies locally:', err);
      showFeedback('Policies saved locally.');
    } finally {
      setSaving(false);
    }
  };

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  if (loading) {
    return (
      <div className="admin-loading-state">
        <div className="spinner" />
        <p>Loading store policies...</p>
      </div>
    );
  }

  return (
    <div className="admin-policies-page">
      {feedback && (
        <div className="admin-feedback-toast">
          <Sparkles size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header Strip */}
      <div className="admin-policies-header">
        <div>
          <h2 className="admin-policies-title">Store-Wide Policies &amp; Compliance</h2>
          <p className="admin-policies-subtitle">
            Manage your store’s official Return &amp; Refund terms, unboxing video requirements, and shipping timelines.
          </p>
        </div>
        <div className="admin-policies-header__actions">
          <Link
            to="/policies"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn--secondary"
          >
            <ExternalLink size={15} />
            <span>Preview Live Page</span>
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleSaveAll}
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'Publishing...' : 'Publish Policy Changes'}</span>
          </button>
        </div>
      </div>

      {/* Policy Navigation Tabs */}
      <div className="admin-policies-tabs">
        <button
          type="button"
          className={`admin-policy-nav-tab ${activeTab === 'return' ? 'admin-policy-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('return')}
        >
          <ShieldAlert size={16} />
          <span>Return &amp; Refund Policy</span>
        </button>
        <button
          type="button"
          className={`admin-policy-nav-tab ${activeTab === 'shipping' ? 'admin-policy-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('shipping')}
        >
          <Truck size={16} />
          <span>Shipping &amp; Delivery Terms</span>
        </button>
        <button
          type="button"
          className={`admin-policy-nav-tab ${activeTab === 'privacy' ? 'admin-policy-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          <Lock size={16} />
          <span>Privacy &amp; Data Protection</span>
        </button>
      </div>

      {/* Policy Form Content */}
      <div className="admin-card admin-policy-content-card">
        {/* 1. RETURN & REFUND POLICY */}
        {activeTab === 'return' && (
          <div className="admin-policy-section">
            <div className="admin-policy-section__header">
              <ShieldAlert size={20} className="admin-gold-icon" />
              <div>
                <h3 className="admin-policy-section__title">Return, Refund &amp; Replacement Rules</h3>
                <p className="admin-policy-section__subtitle">
                  Configure strict no-return terms, the mandatory 360° unboxing video rule, and reporting timelines.
                </p>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Policy Page Title</label>
                <input
                  type="text"
                  value={policies.return.title || ''}
                  onChange={(e) => handleReturnFieldChange('title', e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label>Badge Highlight Label</label>
                <input
                  type="text"
                  value={policies.return.badge_label || ''}
                  onChange={(e) => handleReturnFieldChange('badge_label', e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label>Last Updated Date String</label>
                <input
                  type="text"
                  value={policies.return.last_updated || ''}
                  onChange={(e) => handleReturnFieldChange('last_updated', e.target.value)}
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label>Highlight Notice Banner (Top Alert Box)</label>
              <textarea
                rows={3}
                value={policies.return.highlight_notice || ''}
                onChange={(e) => handleReturnFieldChange('highlight_notice', e.target.value)}
                placeholder="We follow a strict no refund, return, or exchange policy..."
              />
            </div>

            <div className="admin-form-group">
              <label>Mandatory 360° Unboxing Video Rule</label>
              <textarea
                rows={2}
                value={policies.return.unboxing_requirement || ''}
                onChange={(e) => handleReturnFieldChange('unboxing_requirement', e.target.value)}
                placeholder="A full 360-degree unboxing video with no cuts is mandatory..."
              />
            </div>

            {/* Checklist / Clauses */}
            <div className="admin-policy-rules-box">
              <div className="admin-policy-rules-box__header">
                <h4>Complaint &amp; Replacement Clauses ({policies.return.rules?.length || 0})</h4>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-add-rule-btn"
                  onClick={handleAddRule}
                >
                  <Plus size={14} />
                  <span>Add Clause</span>
                </button>
              </div>

              <div className="admin-policy-rules-list">
                {(policies.return.rules || []).map((rule, idx) => (
                  <div key={idx} className="admin-policy-rule-row">
                    <div className="admin-policy-rule-inputs">
                      <input
                        type="text"
                        value={rule.title || ''}
                        onChange={(e) => handleRuleChange(idx, 'title', e.target.value)}
                        placeholder="Clause Title (e.g. 24-Hour Reporting Window)"
                        className="admin-policy-rule-title"
                      />
                      <textarea
                        rows={2}
                        value={rule.text || ''}
                        onChange={(e) => handleRuleChange(idx, 'text', e.target.value)}
                        placeholder="Detailed requirement..."
                        className="admin-policy-rule-text"
                      />
                    </div>
                    <button
                      type="button"
                      className="admin-icon-btn admin-icon-btn--delete"
                      onClick={() => handleRemoveRule(idx)}
                      title="Remove this clause"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Contacts */}
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Complaints Support Email</label>
                <input
                  type="email"
                  value={policies.return.support_email || ''}
                  onChange={(e) => handleReturnFieldChange('support_email', e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label>Complaints WhatsApp / Phone</label>
                <input
                  type="text"
                  value={policies.return.support_phone || ''}
                  onChange={(e) => handleReturnFieldChange('support_phone', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. SHIPPING & DELIVERY TERMS */}
        {activeTab === 'shipping' && (
          <div className="admin-policy-section">
            <div className="admin-policy-section__header">
              <Truck size={20} className="admin-gold-icon" />
              <div>
                <h3 className="admin-policy-section__title">Shipping &amp; Delivery Policies</h3>
                <p className="admin-policy-section__subtitle">
                  Configure dispatch timeframes, standard/express delivery durations, and tracking policies.
                </p>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Dispatch Window (Mon–Fri)</label>
                <input
                  type="text"
                  value={policies.shipping.dispatch_days || ''}
                  onChange={(e) => handleShippingFieldChange('dispatch_days', e.target.value)}
                  placeholder="1–3 working days (Mon–Fri)"
                />
              </div>

              <div className="admin-form-group">
                <label>Standard Delivery Transit Duration</label>
                <input
                  type="text"
                  value={policies.shipping.standard_delivery || ''}
                  onChange={(e) => handleShippingFieldChange('standard_delivery', e.target.value)}
                  placeholder="6 to 8 business days"
                />
              </div>

              <div className="admin-form-group">
                <label>Express Delivery Transit Duration</label>
                <input
                  type="text"
                  value={policies.shipping.express_delivery || ''}
                  onChange={(e) => handleShippingFieldChange('express_delivery', e.target.value)}
                  placeholder="3 to 4 business days"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Free Shipping Minimum Order Amount (₹)</label>
                <input
                  type="number"
                  value={policies.shipping.free_shipping_threshold ?? 999}
                  onChange={(e) => handleShippingFieldChange('free_shipping_threshold', Number(e.target.value))}
                  placeholder="999"
                />
              </div>

              <div className="admin-form-group">
                <label>Logistics Partner Note</label>
                <input
                  type="text"
                  value={policies.shipping.partner_note || ''}
                  onChange={(e) => handleShippingFieldChange('partner_note', e.target.value)}
                  placeholder="Dispatched via Delhivery, Blue Dart or trusted courier partners."
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label>Shipping Introduction / Overview</label>
              <textarea
                rows={3}
                value={policies.shipping.intro || ''}
                onChange={(e) => handleShippingFieldChange('intro', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* 3. PRIVACY POLICY */}
        {activeTab === 'privacy' && (
          <div className="admin-policy-section">
            <div className="admin-policy-section__header">
              <Lock size={20} className="admin-gold-icon" />
              <div>
                <h3 className="admin-policy-section__title">Customer Privacy &amp; Data Security</h3>
                <p className="admin-policy-section__subtitle">
                  Configure terms regarding customer personal data, shipping details, and support interactions.
                </p>
              </div>
            </div>

            <div className="admin-form-group">
              <label>Privacy Policy Overview</label>
              <textarea
                rows={4}
                value={policies.privacy.summary || ''}
                onChange={(e) => handlePrivacyFieldChange('summary', e.target.value)}
              />
            </div>

            <div className="admin-form-group">
              <label>Privacy Inquiries Email</label>
              <input
                type="email"
                value={policies.privacy.support_email || ''}
                onChange={(e) => handlePrivacyFieldChange('support_email', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Bottom Save Action */}
        <div className="admin-policies-save-bar">
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={handleSaveAll}
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'Publishing Changes...' : 'Save & Publish Policies'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
