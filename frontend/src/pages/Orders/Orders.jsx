import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Clock, Search, Truck, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { orderApi } from '../../services/api';
import './Orders.css';

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [trackError, setTrackError] = useState('');

  useEffect(() => {
    if (user) {
      setLoading(true);
      orderApi
        .getMyOrders()
        .then((data) => {
          setOrders(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error('Failed to load orders:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user]);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    const cleanId = trackInput.trim();
    if (!cleanId) {
      setTrackError('Please enter a valid Order ID (e.g., ORD-7D391A).');
      return;
    }
    setTrackError('');
    navigate(`/orders/${encodeURIComponent(cleanId)}`);
  };

  return (
    <div className="orders-page">
      <div className="container">
        {/* Page Header */}
        <div className="orders-header">
          <div>
            <span className="eyebrow">Order Tracking</span>
            <h1 className="orders-title">Track Your Order</h1>
            <p className="orders-subtitle">
              Enter your Order ID below to view live courier updates, Delhivery AWB status, and estimated delivery dates.
            </p>
          </div>
          {user && (
            <Link to="/account" className="account-track-link">
              Account Dashboard <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {/* Quick Order Lookup Form (Works for Guests and Registered Users) */}
        <div className="order-tracker-card">
          <form className="order-tracker-form" onSubmit={handleTrackSubmit}>
            <div className="order-tracker-input-group">
              <label htmlFor="order-track-input" className="order-tracker-label">
                Order ID / Reference Number
              </label>
              <div className="order-tracker-input-wrapper">
                <Search size={18} className="order-tracker-search-icon" />
                <input
                  id="order-track-input"
                  type="text"
                  className={`order-tracker-input ${trackError ? 'input-error' : ''}`}
                  placeholder="e.g. ORD-7D391A or 75"
                  value={trackInput}
                  onChange={(e) => {
                    setTrackInput(e.target.value);
                    if (trackError) setTrackError('');
                  }}
                  autoFocus={!user}
                />
              </div>
              {trackError && <p className="order-tracker-error">{trackError}</p>}
            </div>

            <button type="submit" className="order-tracker-submit-btn">
              <Truck size={18} />
              Track Shipment
            </button>
          </form>

          <div className="order-tracker-hints">
            <span className="order-hint-item">
              <ShieldCheck size={14} color="#c6a15b" /> No login required for tracking
            </span>
            <span className="order-hint-divider">•</span>
            <span className="order-hint-item">
              Find your Order ID in your order confirmation email, SMS, or WhatsApp
            </span>
          </div>
        </div>

        {/* User Not Logged In Notice */}
        {!user && !authLoading && (
          <div className="orders-guest-banner">
            <div className="orders-guest-info">
              <User size={20} className="orders-guest-icon" />
              <div>
                <h3 className="orders-guest-title">Have a Jewels 'n' Joys account?</h3>
                <p className="orders-guest-desc">
                  Sign in to view all your previous purchases, download tax invoices, and track saved delivery addresses in one place.
                </p>
              </div>
            </div>
            <Link to="/login?redirect=/orders" className="orders-guest-login-btn">
              Sign In to Account <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Authenticated User: Orders List */}
        {user && (
          <div className="orders-history-section">
            <div className="orders-history-header">
              <h2 className="orders-history-title">Your Order History</h2>
              <span className="orders-history-count">{orders.length} {orders.length === 1 ? 'order' : 'orders'}</span>
            </div>

            {loading ? (
              <div className="orders-loading-state">
                <Clock size={28} className="orders-spin-icon" />
                <p>Retrieving your order history...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="account-empty-state">
                <Package size={48} color="var(--color-muted)" strokeWidth={1.5} style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-brown)', margin: '0 0 0.5rem 0' }}>No Orders Found</h3>
                <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
                  You have not placed any orders under this account yet.
                </p>
                <Link to="/shop" className="order-track-btn" style={{ display: 'inline-flex' }}>
                  Explore Collection <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-card-header">
                      <div className="order-header-left">
                        <span className="order-number">{order.order_number}</span>
                        <span className="order-date">
                          Placed on{' '}
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className={`account-order-status-badge badge-${order.status}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="order-items-preview">
                      {order.items && order.items.map((item) => (
                        <div key={item.id} className="order-item-row">
                          <img
                            src={item.image_url || '/products/1/1.jpeg'}
                            alt={item.product_name}
                            className="order-item-thumb"
                            onError={(e) => {
                              e.target.src = '/products/1/1.jpeg';
                            }}
                          />
                          <div className="order-item-details">
                            <h4 className="order-item-name">{item.product_name}</h4>
                            <p className="order-item-meta">
                              Qty: {item.quantity} × ₹{Number(item.price).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="order-card-footer">
                      <div className="order-total-amount">
                        Total: ₹{Number(order.total_amount).toLocaleString('en-IN')}
                      </div>
                      <Link
                        to={`/orders/${encodeURIComponent(order.order_number)}`}
                        className="order-track-btn"
                      >
                        <Clock size={16} /> Track Order Progress
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
