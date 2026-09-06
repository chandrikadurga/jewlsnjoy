import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccessMessage('Password reset link sent! Please check your email inbox.');
    } catch (err) {
      setErrorMessage(err.message || 'Could not send reset link. Please verify your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">Account Recovery</span>
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Enter the email address associated with your Jewels 'n' Joys account.
          </p>
        </div>

        {errorMessage && (
          <div className="auth-alert auth-alert-error">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="auth-alert auth-alert-success">{successMessage}</div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="forgot-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="forgot-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Sending link...' : 'Send Recovery Link'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
