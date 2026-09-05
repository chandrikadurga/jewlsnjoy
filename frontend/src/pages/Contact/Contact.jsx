import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Check, Clock, ShieldCheck } from 'lucide-react';
import './Contact.css';

export default function Contact() {
  const [state, setState] = useState({
    name: '',
    email: '',
    message: '',
    errors: {},
    submitting: false,
    submitted: false,
  });

  const handleChange = (e) => {
    setState({
      ...state,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, submitting: true }));

    // Console log as requested
    console.log('Form submitted:', {
      name: state.name,
      email: state.email,
      message: state.message,
    });

    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        submitting: false,
        submitted: true,
      }));
    }, 400);
  };

  return (
    <div className="contact-theme-wrapper">
      <section className="contact-theme-container">
        <span className="eyebrow contact-theme-eyebrow">Personal Concierge</span>
        <h1 className="contact-theme-title">
          Let&apos;s Get in <em>Touch</em>
        </h1>
        <p className="contact-theme-subtitle">
          Fill out the form below and our customer care team will respond within 24–48 hours.
        </p>

        <div className="contact-theme-card">
          {state.submitted ? (
            <div className="contact-theme-success">
              <div className="contact-theme-success-icon">
                <Check size={28} strokeWidth={2.5} />
              </div>
              <h3 className="contact-theme-success-title">Message Received</h3>
              <p className="contact-theme-success-text">
                Thank you for reaching out to Jewels &apos;n&apos; Joys. We have received your note and will review your inquiry with care.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  setState({
                    name: '',
                    email: '',
                    message: '',
                    errors: {},
                    submitting: false,
                    submitted: false,
                  })
                }
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form className="contact-theme-form" onSubmit={handleSubmit}>
              <div className="contact-field-group">
                <label htmlFor="name" className="contact-field-label">
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={state.name}
                  onChange={handleChange}
                  className="contact-field-input"
                  placeholder="e.g. Ananya Sharma"
                  name="name"
                />
              </div>

              <div className="contact-field-group">
                <label htmlFor="email" className="contact-field-label">
                  Email Address
                </label>
                <input
                  id="email"
                  placeholder="e.g. ananya@example.com"
                  type="email"
                  value={state.email}
                  onChange={handleChange}
                  className="contact-field-input"
                  name="email"
                  required
                />
                {state.errors && state.errors.email && (
                  <p className="contact-field-error">{state.errors.email}</p>
                )}
              </div>

              <div className="contact-field-group">
                <label htmlFor="message" className="contact-field-label">
                  Message
                </label>
                <textarea
                  className="contact-field-input contact-field-textarea"
                  id="message"
                  placeholder="How can we assist you today? Ask about collections, orders, or styling advice..."
                  name="message"
                  rows={4}
                  value={state.message}
                  onChange={handleChange}
                  required
                />
                {state.errors && state.errors.message && (
                  <p className="contact-field-error">{state.errors.message}</p>
                )}
              </div>

              <button
                className="btn btn-primary contact-submit-btn"
                type="submit"
                disabled={state.submitting}
              >
                {state.submitting ? 'Sending Message...' : 'Send Message'}
                <Send size={15} strokeWidth={2} />
              </button>
            </form>
          )}

          <div className="contact-theme-info">
            <h2 className="contact-theme-info-title">Connect with Us</h2>
            <p className="contact-theme-info-intro">
              Whether you need help tracking an order, styling advice, or assistance with a replacement, we are always here.
            </p>

            <div className="contact-info-list">
              <div className="contact-info-row">
                <a
                  className="contact-icon-pill"
                  href="mailto:jewelsnjoy25@gmail.com"
                  aria-label="Email"
                >
                  <Mail size={18} />
                </a>
                <div className="contact-info-text">
                  <span className="contact-info-label">Email to us at</span>
                  <a href="mailto:jewelsnjoy25@gmail.com" className="contact-info-value">
                    jewelsnjoy25@gmail.com
                  </a>
                </div>
              </div>

              <div className="contact-info-row">
                <a
                  className="contact-icon-pill"
                  href="https://wa.me/917251070150"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Phone & WhatsApp"
                >
                  <Phone size={18} />
                </a>
                <div className="contact-info-text">
                  <span className="contact-info-label">Call &amp; WhatsApp</span>
                  <a href="tel:7251070150" className="contact-info-value">
                    +91 7251070150
                  </a>
                </div>
              </div>

              <div className="contact-info-row">
                <div className="contact-icon-pill" aria-label="Location">
                  <MapPin size={18} />
                </div>
                <div className="contact-info-text">
                  <span className="contact-info-label">Location at</span>
                  <p className="contact-info-value">Basant Vihar New Etah Chungi Near Redrose School Aligarh - 202001</p>
                </div>
              </div>
            </div>

            {/* Reassurance Callout */}
            <div className="contact-theme-reassurance">
              <div className="contact-reassurance-item">
                <Clock size={15} className="reassurance-icon" />
                <span>Response Time: 24–48 Hours</span>
              </div>
              <div className="contact-reassurance-item">
                <ShieldCheck size={15} className="reassurance-icon" />
                <span>100% Anti-Tarnish &amp; Waterproof Guarantee</span>
              </div>
            </div>

            {/* Social channels */}
            <div className="contact-social-row">
              <a
                className="contact-social-circle"
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                className="contact-social-circle"
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                className="contact-social-circle"
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                className="contact-social-circle"
                href="https://github.com/chandrikadurga/jewlsnjoy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Github"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
