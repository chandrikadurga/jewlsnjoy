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
                href="https://www.instagram.com/jewelsnjoys?stkn=MXV0eXZlODBkd3p2eg=="
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                className="contact-social-circle"
                href="https://www.snapchat.com/add/arohi0770?share_id=lBy9FtFmH1A&locale=en-US"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Snapchat"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12.002 2c-3.792 0-6.22 2.825-6.22 6.012 0 .866.24 1.777.625 2.533-.178.077-.417.185-.694.316-.62.296-1.127.537-1.168.917-.034.315.176.621.57.834.615.333 1.472.484 1.96.53.076.425.26 1.157.659 1.748-.686.23-1.688.627-1.996 1.442-.142.378-.052.793.24 1.127.34.389.967.65 1.724.717.378.033.784-.007 1.189-.047.33-.033.666-.066 1.002-.023.468.06.944.408 1.482.802.73.535 1.58 1.159 2.628 1.159.006 0 .012 0 .018 0 1.047 0 1.897-.624 2.628-1.159.537-.394 1.014-.742 1.482-.802.336-.043.671-.01 1.002.023.405.04.811.08 1.189.047.757-.067 1.384-.328 1.724-.717.292-.334.382-.749.24-1.127-.308-.815-1.31-1.212-1.996-1.442.399-.591.583-1.323.659-1.748.488-.046 1.345-.197 1.96-.53.394-.213.604-.519.57-.834-.041-.38-.548-.621-1.168-.917-.277-.131-.516-.239-.694-.316.385-.756.625-1.667.625-2.533C18.222 4.825 15.794 2 12.002 2z" />
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
