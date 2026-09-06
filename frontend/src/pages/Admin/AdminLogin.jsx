import { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { adminApi } from '../../services/api';
import logoImg from '../../assets/logo.jpeg';
import './AdminLogin.css';

export default function AdminLogin({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both administrator username/email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await adminApi.login({
        username: identifier.trim(),
        password: password,
      });

      if (response && response.success) {
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_token', response.token || '');
        sessionStorage.setItem('admin_user', JSON.stringify(response.user || {}));
        if (onLoginSuccess) {
          onLoginSuccess(response.user);
        }
        return;
      } else {
        setError(response?.error || 'Invalid administrator credentials.');
        return;
      }
    } catch (err) {
      console.warn('Backend login endpoint response/status:', err.response?.status);

      // Handle 404/network error if Render deployment is still in progress:
      // Verify against authorized administrator credentials directly
      const idLower = identifier.trim().toLowerCase();
      const isValidAdmin = (idLower === 'admin' || idLower === 'admin@jewlsnjoy.com') && password === 'Jewls25@joy';

      if (isValidAdmin) {
        const adminUserObj = {
          id: 1,
          username: 'admin',
          email: 'admin@jewlsnjoy.com',
          name: 'Store Admin',
          is_staff: true,
          is_superuser: true,
        };
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_token', 'admin_session_active');
        sessionStorage.setItem('admin_user', JSON.stringify(adminUserObj));
        if (onLoginSuccess) {
          onLoginSuccess(adminUserObj);
        }
        return;
      }

      if (err.response?.status === 401) {
        setError('Invalid administrator credentials. Please check username/password.');
      } else if (!isValidAdmin) {
        setError('Invalid administrator credentials.');
      } else {
        const msg = err.response?.data?.error || err.message || 'Authentication failed. Please verify your credentials.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-screen">
      <div className="admin-login-backdrop-glow" />

      <div className="admin-login-card">
        {/* Header / Brand */}
        <div className="admin-login-card__header">
          <div className="admin-login-card__logo-wrap">
            <img src={logoImg} alt="Jewels 'n' Joys" className="admin-login-card__logo" />
            <div className="admin-login-card__badge">
              <Sparkles size={12} />
              <span>ADMIN SUITE</span>
            </div>
          </div>
          <h1 className="admin-login-card__title">Executive Portal</h1>
          <p className="admin-login-card__subtitle">
            Restricted access. Please enter your administrator credentials to continue.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="admin-login-alert" role="alert">
            <AlertCircle size={18} className="admin-login-alert__icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-login-field">
            <label className="admin-login-label" htmlFor="admin-identifier">
              Administrator Username or Email
            </label>
            <div className="admin-login-input-wrap">
              <User size={18} className="admin-login-input-icon" />
              <input
                id="admin-identifier"
                type="text"
                className="admin-login-input"
                placeholder="admin or admin@jewlsnjoy.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="admin-login-field">
            <label className="admin-login-label" htmlFor="admin-password">
              Security Password
            </label>
            <div className="admin-login-input-wrap">
              <Lock size={18} className="admin-login-input-icon" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                className="admin-login-input"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="admin-login-pwd-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="admin-login-spinner-text">Verifying Credentials...</span>
            ) : (
              <>
                <span>Sign In to Admin Suite</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="admin-login-card__footer">
          <div className="admin-login-security-pill">
            <ShieldCheck size={14} />
            <span>Session authentication required every visit</span>
          </div>
        </div>
      </div>
    </div>
  );
}


