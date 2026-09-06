import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/account', { replace: true });
      }, 2000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update password. Your recovery link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">Account Security</span>
          <h1 className="auth-title">Set New Password</h1>
          <p className="auth-subtitle">
            Please choose a secure new password for your Jewels 'n' Joys account.
          </p>
        </div>

        {errorMessage && (
          <div className="auth-alert auth-alert-error">{errorMessage}</div>
        )}

        {success ? (
          <div className="auth-alert auth-alert-success" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-serif)' }}>Password Updated</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Redirecting to your account dashboard...</p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="new-password">New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="new-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Updating Password...' : 'Save New Password'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Remembered your credentials?
            <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
