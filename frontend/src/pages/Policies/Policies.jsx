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

  useEffect(() => {
    setActiveTab(getInitialTab());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="policies-page">
      {/* Luxury Hero */}
      <section className="policies-hero">
        <div className="container">
          <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Transparency & Trust</span>
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
                <span className="policy-pill policy-pill--alert">Strict Policy</span>
                <span className="policy-date">
                  <Calendar size={13} /> Last Updated: 04-09-2026
                </span>
              </div>
              <h2 id="return-policy-title" className="policy-card__title">
                Return &amp; Refund Policy
              </h2>
              <p className="policy-card__intro">
                Thank you for shopping at <strong>Jewels &apos;n&apos; Joys</strong>.
              </p>
            </header>

            <div className="policy-callout policy-callout--warning">
              <AlertCircle size={22} className="policy-callout__icon" />
              <div>
                <h3 className="policy-callout__title">No Returns, Refunds, or Exchanges</h3>
                <p className="policy-callout__text">
                  We follow a <strong>strict no refund, return, or exchange policy</strong>. Once an order is placed, it cannot be canceled, modified, or returned.
                </p>
              </div>
            </div>

            <section className="policy-section">
              <h3 className="policy-section__heading">
                <Video size={18} color="var(--color-gold)" />
                Complaint &amp; Replacement Process
              </h3>
              <ul className="policy-checklist">
                <li>
                  <div className="policy-checklist__dot" />
                  <div>
                    <strong>24-Hour Reporting Window:</strong> If you receive a damaged or incorrect product, you must report the issue <strong>within 24 hours of delivery</strong>.
                  </div>
                </li>
                <li>
                  <div className="policy-checklist__dot" />
                  <div>
                    <strong>Mandatory 360° Unboxing Video:</strong> A <strong>full 360-degree unboxing video with no cuts or edits</strong> is mandatory to process any complaints. Without this video, we will not be able to assist you.
                  </div>
                </li>
                <li>
                  <div className="policy-checklist__dot" />
                  <div>
                    <strong>Approval &amp; Replacement:</strong> If your complaint is verified and approved, we may provide a <strong>replacement for the damaged product</strong>.
                  </div>
                </li>
              </ul>
            </section>

            <section className="policy-section policy-section--contact">
              <h3 className="policy-section__heading">Contact &amp; Resolution</h3>
              <p>
                For any concerns or issues, please reach out to our dedicated support desk:
              </p>
              <div className="policy-contact-grid">
                <a href="mailto:jewelsnjoy25@gmail.com" className="policy-contact-card">
                  <Mail size={18} color="var(--color-gold)" />
                  <div>
                    <span className="policy-contact-card__label">Email Support</span>
                    <span className="policy-contact-card__val">jewelsnjoy25@gmail.com</span>
                  </div>
                </a>
                <a href="https://wa.me/917251070150" target="_blank" rel="noopener noreferrer" className="policy-contact-card">
                  <Phone size={18} color="var(--color-gold)" />
                  <div>
                    <span className="policy-contact-card__label">WhatsApp Support</span>
                    <span className="policy-contact-card__val">7251070150</span>
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
                <span className="policy-pill policy-pill--secure">Data Protected</span>
                <span className="policy-date">
                  <Calendar size={13} /> Last Updated: 04-09-2026
                </span>
              </div>
              <h2 id="privacy-policy-title" className="policy-card__title">
                Privacy Policy
              </h2>
              <p className="policy-card__intro">
                At <strong>Jewels &apos;n&apos; Joys</strong>, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our website and make purchases.
              </p>
            </header>

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
                You hold the full right to access, update, or request the deletion of your personal records. To submit any data privacy request, please contact us directly at <a href="mailto:jewelsnjoy25@gmail.com" className="policy-link">jewelsnjoy25@gmail.com</a>.
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
                  <a href="mailto:jewelsnjoy25@gmail.com" className="policy-inline-link">
                    <Mail size={14} /> jewelsnjoy25@gmail.com
                  </a>
                  <a href="tel:7251070150" className="policy-inline-link">
                    <Phone size={14} /> 7251070150
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
                <span className="policy-pill policy-pill--delivery">All-India Delivery</span>
                <span className="policy-date">
                  <Calendar size={13} /> Last Updated: 04-09-2026
                </span>
              </div>
              <h2 id="shipping-policy-title" className="policy-card__title">
                Shipping Policy
              </h2>
              <p className="policy-card__intro">
                We take extreme care in packaging and dispatching your fine anti-tarnish jewelry safely to your doorstep.
              </p>
            </header>

            <section className="policy-section">
              <h3 className="policy-section__heading">Dispatch &amp; Delivery Timelines</h3>
              <div className="policy-timeline-grid">
                <div className="policy-timeline-card">
                  <Clock size={20} color="var(--color-gold)" />
                  <h4>1–3 Working Days</h4>
                  <p>Order processing &amp; dispatch from our warehouse.</p>
                </div>
                <div className="policy-timeline-card">
                  <Calendar size={20} color="var(--color-gold)" />
                  <h4>Monday – Friday</h4>
                  <p>Warehouse operates excluding public holidays.</p>
                </div>
                <div className="policy-timeline-card">
                  <Truck size={20} color="var(--color-gold)" />
                  <h4>5–7 Working Days</h4>
                  <p>Estimated transit time once shipped, based on location.</p>
                </div>
              </div>

              <ul className="policy-list" style={{ marginTop: '1.5rem' }}>
                <li>Orders are typically shipped within <strong>1–3 working days</strong> after placement.</li>
                <li>Our warehouse processes and dispatches orders from <strong>Monday to Friday</strong>, excluding public holidays.</li>
                <li>Once shipped, delivery takes approximately <strong>5–7 working days</strong>, depending on your delivery address and city.</li>
              </ul>
            </section>

            <section className="policy-section">
              <h3 className="policy-section__heading">Festive Season &amp; Unforeseen Delays</h3>
              <p>
                During peak festive seasons, national holidays, or unforeseen events (e.g., weather disruptions, regional courier transit bottlenecks), slight delivery delays may occur on the courier partner’s end.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                We sincerely apologize for any inconvenience caused and work closely with our courier logistics to ensure your jewelry arrives safely and as swiftly as possible.
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
                <a href="mailto:jewelsnjoy25@gmail.com" className="policy-contact-card">
                  <Mail size={18} color="var(--color-gold)" />
                  <div>
                    <span className="policy-contact-card__label">Email</span>
                    <span className="policy-contact-card__val">jewelsnjoy25@gmail.com</span>
                  </div>
                </a>
                <a href="https://wa.me/917251070150" target="_blank" rel="noopener noreferrer" className="policy-contact-card">
                  <Phone size={18} color="var(--color-gold)" />
                  <div>
                    <span className="policy-contact-card__label">WhatsApp</span>
                    <span className="policy-contact-card__val">7251070150</span>
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
