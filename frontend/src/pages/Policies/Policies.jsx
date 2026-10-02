import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Truck,
  Video,
  Clock,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  FileText,
  Lock,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { policyApi } from '../../services/api';
import './Policies.css';

export default function Policies() {
  const location = useLocation();

  // Determine active tab based on pathname
  const getInitialTab = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('privacy')) return 'privacy';
    if (path.includes('shipping')) return 'shipping';
    return 'return'; // default to return-policy
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [storePolicies, setStorePolicies] = useState(() => {
    try {
      const stored = localStorage.getItem('jewels_store_policies');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const loadPolicies = () => {
    policyApi
      .getPolicies()
      .then((res) => {
        if (res && typeof res === 'object') {
          setStorePolicies(res);
          try {
            localStorage.setItem('jewels_store_policies', JSON.stringify(res));
          } catch {}
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPolicies();

    const handleUpdate = (e) => {
      if (e?.detail && typeof e.detail === 'object') {
        setStorePolicies(e.detail);
      } else {
        try {
          const stored = localStorage.getItem('jewels_store_policies');
          if (stored) setStorePolicies(JSON.parse(stored));
        } catch {}
      }
    };

    window.addEventListener('store-policies-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('store-policies-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  useEffect(() => {
    setActiveTab(getInitialTab());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const returnRules = storePolicies?.return?.rules && Array.isArray(storePolicies.return.rules) && storePolicies.return.rules.length > 0
    ? storePolicies.return.rules
    : [
        {
          title: '24-Hour Reporting Window',
          text: `If you receive a damaged or incorrect product, you must report the issue within ${storePolicies?.return?.reporting_hours || 24} hours of delivery.`,
        },
        {
          title: 'Mandatory 360° Unboxing Video',
          text: storePolicies?.return?.unboxing_requirement || 'A full 360-degree unboxing video with no cuts or edits is mandatory to process any complaints. Without this video, we will not be able to assist you.',
        },
        {
          title: 'Approval & Replacement',
          text: 'If your complaint is verified and approved, we may provide a replacement for the damaged product.',
        },
      ];

  const returnPhoneClean = (storePolicies?.return?.support_phone || '917251070150').replace(/[^0-9]/g, '');
  const shippingPhoneClean = (storePolicies?.shipping?.support_phone || storePolicies?.return?.support_phone || '917251070150').replace(/[^0-9]/g, '');
  const privacyPhoneClean = (storePolicies?.privacy?.support_phone || storePolicies?.return?.support_phone || '917251070150').replace(/[^0-9]/g, '');

  return (
    <div className="policies-page">
      {/* Luxury Hero */}
      <section className="policies-hero">
        <div className="container">
          <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Transparency &amp; Trust</span>
          <h1 className="policies-hero__title">Store Policies</h1>
          <p className="policies-hero__desc">
            Please review our official Return &amp; Refund, Privacy, and Shipping terms before placing your order.
          </p>

          {/* Tab Navigation */}
          <div className="policies-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'return'}
              className={`policies-tab-btn ${activeTab === 'return' ? 'policies-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('return')}
            >
              <ShieldAlert size={16} />
              <span>Return &amp; Refund Policy</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'privacy'}
              className={`policies-tab-btn ${activeTab === 'privacy' ? 'policies-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <Lock size={16} />
              <span>Privacy Policy</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'shipping'}
              className={`policies-tab-btn ${activeTab === 'shipping' ? 'policies-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('shipping')}
            >
              <Truck size={16} />
              <span>Shipping Policy</span>
            </button>
          </div>
        </div>
      </section>

      {/* Policy Content Body */}
      <div className="container policies-content-wrap">
        {/* ══════════════════════════════════════════════════════════════
            1. RETURN & REFUND POLICY
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'return' && (
          <article className="policy-card glass-panel" aria-labelledby="return-policy-title">
            <header className="policy-card__header">
              <div className="policy-card__meta">
                <span className="policy-pill policy-pill--alert">
                  {storePolicies?.return?.badge_label || 'Strict Policy'}
                </span>
                <span className="policy-date">
                  <Calendar size={13} /> Last Updated: {storePolicies?.return?.last_updated || '04-09-2026'}
                </span>
              </div>
              <h2 id="return-policy-title" className="policy-card__title">
                {storePolicies?.return?.title || 'Return & Refund Policy'}
              </h2>
              <p className="policy-card__intro">
                {storePolicies?.return?.intro || "Thank you for shopping at Jewels 'n' Joys."}
              </p>
            </header>

            <div className="policy-callout policy-callout--warning">
              <AlertCircle size={22} className="policy-callout__icon" />
              <div>
                <h3 className="policy-callout__title">No Returns, Refunds, or Exchanges</h3>
                <p className="policy-callout__text">
                  {storePolicies?.return?.highlight_notice ||
                    'We follow a strict no refund, return, or exchange policy. Once an order is placed, it cannot be canceled, modified, or returned.'}
                </p>
              </div>
            </div>

            <section className="policy-section">
              <h3 className="policy-section__heading">
                <Video size={18} color="var(--color-gold)" />
                Complaint &amp; Replacement Process
              </h3>
              <ul className="policy-checklist">
                {returnRules.map((rule, idx) => (
                  <li key={idx}>
                    <div className="policy-checklist__dot" />
                    <div>
                      {rule.title && <strong>{rule.title}: </strong>}
                      <span>{rule.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="policy-section policy-section--contact">
              <h3 className="policy-section__heading">Contact &amp; Resolution</h3>
              <p>
                For any concerns or issues, please reach out to our dedicated support desk:
              </p>
              <div className="policy-contact-grid">
                <a href={`mailto:${storePolicies?.return?.support_email || 'jewelsnjoy25@gmail.com'}`} className="policy-contact-card">
                  <Mail size={18} color="var(--color-gold)" />
                  <div>
                    <span className="policy-contact-card__label">Email Support</span>
                    <span className="policy-contact-card__val">{storePolicies?.return?.support_email || 'jewelsnjoy25@gmail.com'}</span>
                  </div>
                </a>
                <a
                  href={`https://wa.me/${returnPhoneClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="policy-contact-card"
                >
                  <Phone size={18} color="var(--color-gold)" />
                  <div>
                    <span className="policy-contact-card__label">WhatsApp Support</span>
                    <span className="policy-contact-card__val">{storePolicies?.return?.support_phone || '+91 7251070150'}</span>
                  </div>
                </a>
              </div>

              <p className="policy-note">
                <Clock size={14} /> We will review your case and respond within <strong>48–72 hours</strong> with the best possible solution.
              </p>
            </section>

            <footer className="policy-card__footer">
              <p className="policy-closing">
                Thank you for understanding and supporting our policies!
              </p>
            </footer>
          </article>
        )}

        {/* ══════════════════════════════════════════════════════════════
            2. PRIVACY POLICY
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'privacy' && (
          <article className="policy-card glass-panel" aria-labelledby="privacy-policy-title">
            <header className="policy-card__header">
              <div className="policy-card__meta">
                <span className="policy-pill policy-pill--secure">
                  {storePolicies?.privacy?.badge_label || 'Data Protected'}
                </span>
                <span className="policy-date">
                  <Calendar size={13} /> Last Updated: {storePolicies?.privacy?.last_updated || '04-09-2026'}
                </span>
              </div>
              <h2 id="privacy-policy-title" className="policy-card__title">
                {storePolicies?.privacy?.title || 'Privacy Policy'}
              </h2>
              <p className="policy-card__intro">
                {storePolicies?.privacy?.intro ||
                  "At Jewels 'n' Joys, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our website and make purchases."}
              </p>
            </header>

            {storePolicies?.privacy?.summary && (
              <div className="policy-callout policy-callout--info" style={{ marginBottom: '1.75rem' }}>
                <ShieldCheck size={22} className="policy-callout__icon" />
                <div>
                  <h3 className="policy-callout__title">Privacy Commitment</h3>
                  <p className="policy-callout__text">{storePolicies.privacy.summary}</p>
                </div>
              </div>
            )}

            <section className="policy-section">
              <h3 className="policy-section__heading">1. Information We Collect</h3>
              <p>When you browse or shop on our website, we may collect the following information:</p>
              <ul className="policy-list">
                <li>
                  <strong>Personal Details:</strong> Name, email address, phone number, and shipping address.
                </li>
                <li>
                  <strong>Payment Information:</strong> We do not store payment details. All transactions are securely processed through trusted third-party payment gateways.
                </li>
                <li>
                  <strong>Browsing Data:</strong> IP address, device type, and website activity for analytics, performance, and fraud security purposes.
                </li>
              </ul>
            </section>

            <section className="policy-section">
              <h3 className="policy-section__heading">2. How We Use Your Information</h3>
              <p>We use your data strictly to:</p>
              <ul className="policy-list">
                <li>Process and fulfill your orders accurately.</li>
                <li>Provide prompt customer support and resolve inquiries.</li>
                <li>Continuously improve our website, curated jewelry collections, and digital services.</li>
                <li>Send updates regarding promotions, festive offers, and real-time order tracking (if you opt-in).</li>
              </ul>
            </section>

            <section className="policy-section">
              <h3 className="policy-section__heading">3. Data Protection &amp; Security</h3>
              <ul className="policy-list">
                <li>
                  We implement strict technical and operational security measures to safeguard your personal data from unauthorized access, misuse, alteration, or disclosure.
                </li>
                <li>
                  <strong>Never Sold or Rented:</strong> Your information is never sold, rented, or shared with third parties, except for essential service providers necessary to complete your order (e.g., trusted courier partners and encrypted payment gateways).
                </li>
              </ul>
            </section>

            <section className="policy-section">
              <h3 className="policy-section__heading">4. Cookies &amp; Tracking Technologies</h3>
              <ul className="policy-list">
                <li>We utilize cookies to enhance your browsing experience, remember bag items, and evaluate site traffic patterns.</li>
                <li>You can disable cookies in your browser preferences at any time, though certain boutique shopping features may require cookies to function optimally.</li>
              </ul>
            </section>

            <section className="policy-section">
              <h3 className="policy-section__heading">5. Third-Party Links</h3>
              <p>
                Our website may contain links to external sites or social media channels. We are not responsible for their independent privacy practices, and we encourage you to review their policies before providing personal details.
              </p>
            </section>

            <section className="policy-section">
              <h3 className="policy-section__heading">6. Your Rights</h3>
              <p>
                You hold the full right to access, update, or request the deletion of your personal records. To submit any data privacy request, please contact us directly at{' '}
                <a href={`mailto:${storePolicies?.privacy?.support_email || 'jewelsnjoy25@gmail.com'}`} className="policy-link">
                  {storePolicies?.privacy?.support_email || 'jewelsnjoy25@gmail.com'}
                </a>.
              </p>
            </section>

            <section className="policy-section">
              <h3 className="policy-section__heading">7. Policy Updates</h3>
              <p>
                We may periodically update this Privacy Policy. Any revisions will be published on this page accompanied by the updated revision date.
              </p>
              <div className="policy-contact-box">
                <p>
                  For any privacy-related questions or requests, reach out to us at:
                </p>
                <div className="policy-contact-inline">
                  <a href={`mailto:${storePolicies?.privacy?.support_email || 'jewelsnjoy25@gmail.com'}`} className="policy-inline-link">
                    <Mail size={14} /> {storePolicies?.privacy?.support_email || 'jewelsnjoy25@gmail.com'}
                  </a>
                  <a href={`tel:${privacyPhoneClean}`} className="policy-inline-link">
                    <Phone size={14} /> {storePolicies?.privacy?.support_phone || storePolicies?.return?.support_phone || '+91 7251070150'}
                  </a>
                </div>
              </div>
            </section>

            <footer className="policy-card__footer">
              <p className="policy-closing">
                Thank you for trusting Jewels &apos;n&apos; Joys!
              </p>
            </footer>
          </article>
        )}

        {/* ══════════════════════════════════════════════════════════════
            3. SHIPPING POLICY
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'shipping' && (
          <article className="policy-card glass-panel" aria-labelledby="shipping-policy-title">
            <header className="policy-card__header">
              <div className="policy-card__meta">
                <span className="policy-pill policy-pill--delivery">
                  {storePolicies?.shipping?.badge_label || 'All-India Delivery'}
                </span>
                <span className="policy-date">
                  <Calendar size={13} /> Last Updated: {storePolicies?.shipping?.last_updated || '04-09-2026'}
                </span>
              </div>
              <h2 id="shipping-policy-title" className="policy-card__title">
                {storePolicies?.shipping?.title || 'Shipping & Delivery Policy'}
              </h2>
              <p className="policy-card__intro">
                {storePolicies?.shipping?.intro ||
                  'We deliver our luxury jewellery pieces safely across all serviceable pin codes in India.'}
              </p>
            </header>

            <section className="policy-section">
              <h3 className="policy-section__heading">Dispatch &amp; Delivery Timelines</h3>
              <div className="policy-timeline-grid">
                <div className="policy-timeline-card">
                  <Clock size={20} color="var(--color-gold)" />
                  <h4>{storePolicies?.shipping?.dispatch_days || '1–3 Working Days'}</h4>
                  <p>Order processing &amp; dispatch from our warehouse.</p>
                </div>
                <div className="policy-timeline-card">
                  <Calendar size={20} color="var(--color-gold)" />
                  <h4>Standard Delivery</h4>
                  <p>{storePolicies?.shipping?.standard_delivery || '6 to 8 business days'} transit time once dispatched.</p>
                </div>
                <div className="policy-timeline-card">
                  <Truck size={20} color="var(--color-gold)" />
                  <h4>Express Delivery</h4>
                  <p>{storePolicies?.shipping?.express_delivery || '3 to 4 business days'} for priority serviceable routes.</p>
                </div>
              </div>

              <ul className="policy-list" style={{ marginTop: '1.5rem' }}>
                <li>Orders are typically dispatched within <strong>{storePolicies?.shipping?.dispatch_days || '1–3 working days'}</strong> after placement.</li>
                <li>Standard doorstep delivery takes approximately <strong>{storePolicies?.shipping?.standard_delivery || '6 to 8 business days'}</strong> depending on your city pin code.</li>
                <li>
                  {storePolicies?.shipping?.free_shipping_threshold ? (
                    <>Complimentary <strong>Free Shipping on all orders above ₹{storePolicies.shipping.free_shipping_threshold}/-</strong>.</>
                  ) : (
                    <>Complimentary <strong>Free Shipping on eligible orders</strong> across India.</>
                  )}
                </li>
                {storePolicies?.shipping?.partner_note && (
                  <li>{storePolicies.shipping.partner_note}</li>
                )}
              </ul>
            </section>

            <section className="policy-section">
              <h3 className="policy-section__heading">Festive Season &amp; Unforeseen Delays</h3>
              <p>
                During peak festive seasons, national holidays, or unforeseen events (e.g., weather disruptions, regional courier transit bottlenecks), slight delivery delays may occur on the courier partner’s end.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                We sincerely apologize for any inconvenience caused and work closely with our premier courier partners to ensure your jewelry arrives safely and as swiftly as possible.
              </p>
            </section>

            <section className="policy-section">
              <h3 className="policy-section__heading">Order Delays &amp; Unavailability</h3>
              <p>
                If any product in your order becomes unavailable or faces unexpected delays, we will notify you within <strong>1–2 working days via message/email</strong> to inform you of the situation and present possible alternatives or dispatch schedules.
              </p>
            </section>

            <section className="policy-section policy-section--contact">
              <h3 className="policy-section__heading">Questions Regarding Your Shipment?</h3>
              <p>
                For tracking assistance or address updates before dispatch, contact our concierge:
              </p>
              <div className="policy-contact-grid">
                <a href={`mailto:${storePolicies?.shipping?.support_email || 'jewelsnjoy25@gmail.com'}`} className="policy-contact-card">
                  <Mail size={18} color="var(--color-gold)" />
                  <div>
                    <span className="policy-contact-card__label">Email</span>
                    <span className="policy-contact-card__val">{storePolicies?.shipping?.support_email || 'jewelsnjoy25@gmail.com'}</span>
                  </div>
                </a>
                <a
                  href={`https://wa.me/${shippingPhoneClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="policy-contact-card"
                >
                  <Phone size={18} color="var(--color-gold)" />
                  <div>
                    <span className="policy-contact-card__label">WhatsApp</span>
                    <span className="policy-contact-card__val">{storePolicies?.shipping?.support_phone || '+91 7251070150'}</span>
                  </div>
                </a>
              </div>
            </section>

            <footer className="policy-card__footer">
              <p className="policy-closing">
                Thank you for your patience and for shopping with us!
              </p>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}
