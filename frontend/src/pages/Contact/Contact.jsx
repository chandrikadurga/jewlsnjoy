import { useState } from 'react';
import { Mail, Phone, MapPin, Check } from 'lucide-react';
import contactImg from '../../assets/products/2/1.jpeg';
import './Contact.css';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="contact-page">
      {/* Hero */}
      <div className="contact-hero">
        <div className="container">
          <span className="eyebrow">Get in Touch</span>
          <h1 className="contact-hero__title">Contact Us</h1>
          <p className="contact-hero__desc">
            We&apos;d love to hear from you. Reach out for orders, queries, or just to say hello.
          </p>
        </div>
      </div>

      <section className="section">
        <div className="container contact-layout">

          {/* Contact Info */}
          <div className="contact-info">
            <h2 className="contact-info__title">Reach Out</h2>
            <p className="contact-info__text">
              Whether you have a question about a piece, need help with an order,
              or simply want to know more about our collection — we&apos;re here to help.
            </p>

            <div className="contact-info__items">
              <div className="contact-info-item">
                <div className="contact-info-item__icon">
                  <Mail size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="contact-info-item__label">Email</p>
                  <a href="mailto:jewelsnjoy25@gmail.com" className="contact-info-item__value">
                    jewelsnjoy25@gmail.com
                  </a>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-item__icon">
                  <Phone size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="contact-info-item__label">WhatsApp &amp; Phone</p>
                  <a href="https://wa.me/917251070150" target="_blank" rel="noopener noreferrer" className="contact-info-item__value">
                    +91 7251070150
                  </a>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-item__icon">
                  <MapPin size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="contact-info-item__label">Support Hours</p>
                  <p className="contact-info-item__value">Mon–Fri (Response in 48–72 hrs)</p>
                </div>
              </div>
            </div>

            {/* Quick Policy Notice */}
            <div style={{
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '14px',
              padding: '16px',
              marginTop: '1.5rem',
              fontSize: '0.8125rem',
              lineHeight: '1.5'
            }}>
              <p style={{ fontWeight: 600, color: 'var(--color-brown)', marginBottom: '4px' }}>
                Replacement &amp; Complaint Notice:
              </p>
              <p style={{ color: 'var(--color-muted)', marginBottom: '8px' }}>
                Damaged/incorrect items must be reported within 24 hours of delivery with a mandatory 360° unboxing video with no cuts.
              </p>
              <div style={{ display: 'flex', gap: '12px', fontWeight: 600, color: 'var(--color-gold)' }}>
                <Link to="/return-policy" style={{ textDecoration: 'underline' }}>Return Policy</Link>
                <span>•</span>
                <Link to="/shipping-policy" style={{ textDecoration: 'underline' }}>Shipping Policy</Link>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-col">
            {submitted ? (
              <div className="contact-success">
                <div className="contact-success__icon">
                  <Check size={28} strokeWidth={2.5} />
                </div>
                <h2 className="contact-success__title">Message Sent!</h2>
                <p className="contact-success__text">
                  Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', message: '' }); }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit} noValidate>
                <h2 className="contact-form__title">Send a Message</h2>

                <div className="contact-form__field">
                  <label htmlFor="contact-name" className="contact-form__label">Full Name</label>
                  <input
                    id="contact-name" name="name" type="text" required
                    className="contact-form__input"
                    value={form.name} onChange={handleChange}
                    placeholder="Your name"
                  />
                </div>

                <div className="contact-form__field">
                  <label htmlFor="contact-email" className="contact-form__label">Email Address</label>
                  <input
                    id="contact-email" name="email" type="email" required
                    className="contact-form__input"
                    value={form.email} onChange={handleChange}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="contact-form__field">
                  <label htmlFor="contact-phone" className="contact-form__label">Phone Number (optional)</label>
                  <input
                    id="contact-phone" name="phone" type="tel"
                    className="contact-form__input"
                    value={form.phone} onChange={handleChange}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="contact-form__field">
                  <label htmlFor="contact-message" className="contact-form__label">Message</label>
                  <textarea
                    id="contact-message" name="message" required rows={5}
                    className="contact-form__input contact-form__textarea"
                    value={form.message} onChange={handleChange}
                    placeholder="Tell us how we can help…"
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-full" id="contact-submit-btn">
                  Send Message
                </button>
              </form>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}
