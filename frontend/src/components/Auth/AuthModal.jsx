import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    authModalView,
    setAuthModalView,
    closeAuthModal,
    signIn,
    signUp,
    resetPassword,
    executePendingAction,
  } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isAuthModalOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (authModalView === 'login') {
        await signIn({
          email: formData.email,
          password: formData.password,
        });
        closeAuthModal();
        executePendingAction();
      } else if (authModalView === 'signup') {
        if (!formData.fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        await signUp({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
        });
        setSuccessMessage('Account created! You are now signed in.');
        setTimeout(() => {
          closeAuthModal();
          executePendingAction();
        }, 1200);
      } else if (authModalView === 'forgot') {
        await resetPassword(formData.email);
        setSuccessMessage('Password reset link sent to your email.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={closeAuthModal}>
      <div
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="auth-modal-close"
          onClick={closeAuthModal}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="auth-modal-header">
          <span className="auth-modal-tagline">JEWELS 'N' JOYS</span>
          <h2 className="auth-modal-title">
            {authModalView === 'login' && 'Welcome Back'}
            {authModalView === 'signup' && 'Create Your Account'}
            {authModalView === 'forgot' && 'Reset Password'}
          </h2>
          <p className="auth-modal-subtitle">
            {authModalView === 'login' && 'Sign in to save your favourites and track your orders.'}
            {authModalView === 'signup' && 'Join Jewels \'n\' Joys for bespoke jewellery shopping.'}
            {authModalView === 'forgot' && 'Enter your registered email to receive a recovery link.'}
          </p>
        </div>

        {errorMessage && (
          <div className="auth-modal-alert auth-modal-alert-error">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="auth-modal-alert auth-modal-alert-success">
            {successMessage}
          </div>
        )}

        <form className="auth-modal-form" onSubmit={handleSubmit}>
          {authModalView === 'signup' && (
            <>
              <div className="auth-modal-field">
                <label htmlFor="modal-fullName">Full Name</label>
                <div className="auth-modal-input-wrapper">
                  <User size={18} className="auth-modal-icon" />
                  <input
                    id="modal-fullName"
                    name="fullName"
                    type="text"
                    required
                    placeholder="Chandrika Durga"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="auth-modal-field">
                <label htmlFor="modal-phone">Phone Number (Optional)</label>
                <div className="auth-modal-input-wrapper">
                  <Phone size={18} className="auth-modal-icon" />
                  <input
                    id="modal-phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          <div className="auth-modal-field">
            <label htmlFor="modal-email">Email Address</label>
            <div className="auth-modal-input-wrapper">
              <Mail size={18} className="auth-modal-icon" />
              <input
                id="modal-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {authModalView !== 'forgot' && (
            <div className="auth-modal-field">
              <div className="auth-modal-field-header">
                <label htmlFor="modal-password">Password</label>
                {authModalView === 'login' && (
                  <button
                    type="button"
                    className="auth-modal-link-inline"
                    onClick={() => setAuthModalView('forgot')}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="auth-modal-input-wrapper">
                <Lock size={18} className="auth-modal-icon" />
                <input
                  id="modal-password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="auth-modal-submit-btn"
            disabled={loading}
          >
            {loading ? 'Processing...' : (
              <>
                {authModalView === 'login' && 'Sign In'}
                {authModalView === 'signup' && 'Create Account'}
                {authModalView === 'forgot' && 'Send Reset Link'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-modal-footer">
          {authModalView === 'login' && (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="auth-modal-toggle-btn"
                onClick={() => setAuthModalView('signup')}
              >
                Sign Up
              </button>
            </p>
          )}
          {authModalView === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-modal-toggle-btn"
                onClick={() => setAuthModalView('login')}
              >
                Sign In
              </button>
            </p>
          )}
          {authModalView === 'forgot' && (
            <p>
              Remember your password?{' '}
              <button
                type="button"
                className="auth-modal-toggle-btn"
                onClick={() => setAuthModalView('login')}
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
