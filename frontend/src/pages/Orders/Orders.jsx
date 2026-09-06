import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { orderApi } from '../../services/api';
import './Orders.css';

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/orders', { replace: true });
    }
  }, [authLoading, user, navigate]);

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

  if (authLoading || loading) {
    return (
      <div className="orders-page">
        <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
          <p style={{ color: 'var(--color-muted)' }}>Retrieving your order history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="container">
        {/* Header */}
        <div className="orders-header">
          <div>
            <span className="eyebrow">Order History</span>
            <h1 className="orders-title">My Orders</h1>
            <p className="orders-subtitle">
              Track delivery progress and review details of all your past purchases.
            </p>
          </div>
          <Link to="/account" className="account-track-link">
            Account Dashboard <ArrowRight size={14} />
          </Link>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="account-empty-state" style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '4rem 2rem' }}>
            <Package size={48} color="var(--color-muted)" strokeWidth={1.5} style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-brown)', margin: '0 0 0.5rem 0' }}>No Orders Found</h2>
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
    </div>
  );
}
