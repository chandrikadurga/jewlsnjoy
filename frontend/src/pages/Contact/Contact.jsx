import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';
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

    // Console log only as requested
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
    <div className="contact-section-wrapper">
      <section className="contact-container w-full max-w-screen-md px-2">
        <h2 className="contact-title mt-4 mb-5 bg-gradient-to-br from-gray-300 via-blue-300 to-gray-700 bg-clip-text text-center text-4xl font-bold text-transparent md:text-6xl">
          Let&apos;s Get in Touch
        </h2>
        <p className="contact-subtitle text-muted-foreground mb-6 text-center">
          Fill out the form below and we&apos;ll get back to you as soon as possible.
        </p>
        <div
          className="contact-card bg-opacity-10 mx-auto mb-6 grid w-full items-start gap-12 rounded-lg border bg-white px-4 pt-10 pb-6 shadow shadow-slate-800 md:grid-cols-2 lg:px-12"
          style={{
            backgroundImage:
              'radial-gradient(164.75% 100% at 50% 0,#272f3c 0,#0b1224 48.73%)',
          }}
        >
          {state.submitted ? (
            <div className="contact-submitted-box">
              <div className="contact-submitted-icon">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
              <p className="text-slate-300 text-sm mb-6">
                Thank you for reaching out. We will review your message and respond within 24–48 hours.
              </p>
              <button
                type="button"
                className="contact-btn"
                onClick={() => setState({ name: '', email: '', message: '', errors: {}, submitting: false, submitted: false })}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form className="space-y-8 text-slate-300" onSubmit={handleSubmit}>
              <div className="space-y-4 text-lg form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={state.name}
                  onChange={handleChange}
                  className="bg-background flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm shadow-inner shadow-slate-800 outline-none hover:border-slate-600 hover:transition-all hover:outline-none focus:border-slate-500 focus:outline-none"
                  placeholder="Enter your name"
                  name="name"
                />
              </div>

              <div className="space-y-4 text-lg form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  placeholder="Enter your email"
                  type="email"
                  value={state.email}
                  onChange={handleChange}
                  className="hover:transition-al bg-background placeholder:text-muted-foreground flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm shadow-inner shadow-slate-800 outline-none file:text-sm file:font-medium hover:border-slate-400 hover:outline-none focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  name="email"
                  required
                />
                {state.errors && state.errors.email && (
                  <p className="mt-1 text-sm text-red-500">{state.errors.email}</p>
                )}
              </div>

              <div className="space-y-4 text-lg form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  className="bg-background ring-offset-background placeholder:text-muted-foreground mb-5 flex min-h-[100px] w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-800 outline-none hover:border-slate-400 hover:transition-all hover:outline-none focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  id="message"
                  placeholder="Enter your message"
                  name="message"
                  rows={4}
                  value={state.message}
                  onChange={handleChange}
                  required
                />
                {state.errors && state.errors.message && (
                  <p className="mt-1 text-sm text-red-500">{state.errors.message}</p>
                )}
              </div>

              <button
                className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-slate-800 to-slate-700 py-2 text-center font-medium text-white shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] transition-all duration-300 ease-in-out hover:from-slate-700 hover:to-slate-800 hover:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] contact-btn"
                type="submit"
                disabled={state.submitting}
              >
                {state.submitting ? 'Sending...' : 'Send'}
                <Send className="mx-2 inline h-4" />
              </button>
            </form>
          )}

          <div className="contact-info-panel">
            <h3 className="mb-10 text-2xl font-semibold text-slate-300">
              Connect with Us
            </h3>
            
            <div className="mb-12 flex gap-8 contact-item">
              <a
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 shadow-inner shadow-gray-800 hover:shadow-md hover:shadow-slate-500 hover:transition hover:duration-300 hover:ease-in-out icon-circle"
                href="mailto:jewelsnjoy25@gmail.com"
                aria-label="Email"
              >
                <Mail className="h-5 w-5 text-white" />
              </a>
              <div className="text-md text-slate-300">
                <p className="contact-label">Email to us at </p>
                <a href="mailto:jewelsnjoy25@gmail.com" className="contact-val">
                  jewelsnjoy25@gmail.com
                </a>
              </div>
            </div>

            <div className="mb-12 flex gap-8 contact-item">
              <a
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 shadow-inner shadow-gray-800 hover:shadow-md hover:shadow-slate-500 hover:transition hover:duration-300 hover:ease-in-out icon-circle"
                href="tel:7251070150"
                aria-label="Phone"
              >
                <Phone className="h-5 w-5 text-white" />
              </a>
              <div className="text-md text-slate-300">
                <p className="contact-label">Call us at </p>
                <a href="tel:7251070150" className="contact-val">
                  +91 7251070150
                </a>
              </div>
            </div>

            <div className="mb-12 flex gap-8 contact-item">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 px-2 shadow-inner shadow-gray-800 hover:shadow-md hover:shadow-slate-500 hover:transition hover:duration-300 hover:ease-in-out icon-circle"
              >
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div className="text-md text-slate-300">
                <p className="contact-label">Location at </p>
                <p className="contact-val">Techno Main Salt Lake, Sector-V, Kolkata-700091</p>
              </div>
            </div>

            <div className="flex space-x-12 py-7 social-row">
              <a
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-gray-800 hover:shadow-md hover:shadow-slate-500 hover:transition hover:duration-300 hover:ease-in-out icon-circle"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-gray-800 hover:shadow-md hover:shadow-slate-500 hover:transition hover:duration-300 hover:ease-in-out icon-circle"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-gray-800 hover:shadow-md hover:shadow-slate-500 hover:transition hover:duration-300 hover:ease-in-out icon-circle"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-gray-800 hover:shadow-md hover:shadow-slate-500 hover:transition hover:duration-300 hover:ease-in-out icon-circle"
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
