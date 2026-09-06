import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Package, User, LogOut, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { orderApi } from '../../services/api';
import './Account.css';

export default function Account() {
  const { user, profile, updateProfile, signOut, loading: authLoading } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/account', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setPhone(user.user_metadata?.phone || '');
    }
  }, [profile, user]);

  useEffect(() => {
    if (user) {
      setLoadingOrders(true);
      orderApi
        .getMyOrders()
        .then((data) => {
          setOrders(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error('Failed to load customer orders:', err);
        })
        .finally(() => {
          setLoadingOrders(false);
        });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await updateProfile({ fullName, phone });
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      setProfileMsg(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="account-page">
        <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
          <p>Loading your account details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="container">
        {/* Header */}
        <div className="account-header">
          <div>
            <span className="eyebrow">Customer Account</span>
            <h1 className="account-greeting">
              Hello, {fullName || user?.email?.split('@')[0] || 'Valued Customer'}
            </h1>
            <p className="account-email-sub">{user?.email}</p>
          </div>
          <button className="account-signout-btn" onClick={handleSignOut}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Stats Grid */}
        <div className="account-stats-grid">
          <Link to="/wishlist" className="account-stat-card">
            <div className="account-stat-icon">
              <Heart size={24} />
            </div>
            <div className="account-stat-info">
              <h3>{wishlistCount}</h3>
              <p>Saved in Wishlist</p>
            </div>
          </Link>

          <Link to="/orders" className="account-stat-card">
            <div className="account-stat-icon">
              <Package size={24} />
            </div>
            <div className="account-stat-info">
              <h3>{orders.length}</h3>
              <p>Total Orders</p>
            </div>
          </Link>

          <div className="account-stat-card" style={{ cursor: 'default' }}>
            <div className="account-stat-icon">
              <ShieldCheck size={24} />
            </div>
            <div className="account-stat-info">
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-green)' }}>Verified</h3>
              <p>Jewels 'n' Joys Member</p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="account-content-grid">
          {/* Profile Column */}
          <div className="account-panel">
            <h2 className="account-panel-title">
              <User size={20} color="var(--color-gold)" /> Personal Information
            </h2>
            {profileMsg && (
              <div
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  backgroundColor: profileMsg.includes('success') ? '#f0fdf4' : '#fdf2f2',
                  color: profileMsg.includes('success') ? '#166534' : '#9b3c3c',
                }}
              >
                {profileMsg}
              </div>
            )}
            <form className="account-profile-form" onSubmit={handleProfileSubmit}>
              <div className="account-profile-field">
                <label>Email Address</label>
                <input type="text" value={user?.email || ''} disabled />
              </div>
              <div className="account-profile-field">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="account-profile-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="account-profile-save-btn"
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          {/* Recent Orders Column */}
          <div className="account-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h2 className="account-panel-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                <Clock size={20} color="var(--color-gold)" /> Recent Orders
              </h2>
              {orders.length > 0 && (
                <Link to="/orders" className="account-track-link">
                  View All Orders <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {loadingOrders ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Loading recent orders...</p>
            ) : orders.length === 0 ? (
              <div className="account-empty-state">
                <Package size={40} strokeWidth={1.5} color="var(--color-muted)" />
                <p>You haven't placed any orders yet.</p>
                <Link to="/shop" className="account-track-link">
                  Explore our Collection
                </Link>
              </div>
            ) : (
              <div className="account-orders-preview">
                {orders.slice(0, 3).map((ord) => (
                  <div key={ord.id} className="account-order-item">
                    <div className="account-order-main">
                      <span className="account-order-num">{ord.order_number}</span>
                      <span className="account-order-date">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className={`account-order-status-badge badge-${ord.status}`}>
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="account-order-actions">
                      <span className="account-order-total">
                        ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                      </span>
                      <Link
                        to={`/orders/${encodeURIComponent(ord.order_number)}`}
                        className="account-track-link"
                      >
                        Track Order <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
