import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function Signup() {
  const { signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/account';

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setErrorMessage('Please provide your full name.');
      return;
    }
    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone,
      });

      setSuccessMessage('Account created successfully! Welcome to Jewels \'n\' Joys.');
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">Customer Registration</span>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">
            Join Jewels 'n' Joys for personalized jewellery selections and seamless order tracking.
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
            <label htmlFor="signup-fullName">Full Name</label>
            <div className="auth-input-wrapper">
              <User size={18} className="auth-input-icon" />
              <input
                id="signup-fullName"
                name="fullName"
                type="text"
                required
                placeholder="Chandrika Durga"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-phone">Phone Number (Optional)</label>
            <div className="auth-input-wrapper">
              <Phone size={18} className="auth-input-icon" />
              <input
                id="signup-phone"
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="signup-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password (min. 6 characters)</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="signup-password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?
            <Link to={`/login${redirectPath !== '/account' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
