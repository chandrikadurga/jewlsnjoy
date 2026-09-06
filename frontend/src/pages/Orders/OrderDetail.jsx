import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { orderApi } from '../../services/api';
import './OrderDetail.css';

const TRACKING_STEPS = [
  { key: 'order_placed', label: 'Order Placed', icon: ShoppingBag },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Clock },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: Package },
];

function getStepIndex(status) {
  if (!status) return 0;
  const s = status.toLowerCase();
  if (s === 'pending' || s === 'order_placed') return 0;
  if (s === 'confirmed') return 1;
  if (s === 'processing') return 2;
  if (s === 'shipped') return 3;
  if (s === 'out_for_delivery') return 4;
  if (s === 'delivered') return 5;
  return 0;
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setNotFound(false);
    try {
      const data = await orderApi.trackOrder(orderId);
      setOrder(data);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 401 || err.response?.status === 403) {
        setNotFound(true);
      } else {
        console.error('Failed to load order:', err);
        setNotFound(true);
      }
    } finally {
      if (showSpinner) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=/orders/${encodeURIComponent(orderId || '')}`, { replace: true });
      return;
    }
    if (user && orderId) {
      fetchOrder(true);
    }
  }, [user, authLoading, orderId, navigate]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrder(false);
  };

  if (authLoading || loading) {
    return (
      <div className="order-detail-page">
        <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
          <p style={{ color: 'var(--color-muted)' }}>Retrieving order details...</p>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="account-empty-state" style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '4rem 2rem' }}>
            <AlertCircle size={48} color="var(--color-error, #9b3c3c)" strokeWidth={1.5} style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-brown)', margin: '0 0 0.5rem 0' }}>Order Not Found</h2>
            <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
              We could not find order <strong>#{orderId}</strong> under your verified account. Please verify the order number or check your orders list.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/orders" className="order-track-btn">
                View My Orders
              </Link>
              <Link to="/shop" className="account-signout-btn">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = getStepIndex(order.status);

  return (
    <div className="order-detail-page">
      <div className="container">
        {/* Header */}
        <div className="order-detail-header">
          <div>
            <Link to="/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-gold)', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', textDecoration: 'none' }}>
              <ArrowLeft size={16} /> Back to My Orders
            </Link>
            <h1 className="order-detail-title">Order #{order.order_number}</h1>
            <p className="order-detail-subtitle">
              Placed on{' '}
              {new Date(order.created_at).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="account-signout-btn"
            disabled={refreshing}
            title="Refresh latest status from server"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Status'}
          </button>
        </div>

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="order-cancelled-banner">
            <AlertCircle size={24} />
            <div>
              <strong style={{ display: 'block', fontSize: '1rem' }}>Order Cancelled</strong>
              <span>This order was cancelled. If you have questions or need a refund inquiry, please contact our support team.</span>
            </div>
          </div>
        )}

        {/* Visual Stepper */}
        {!isCancelled && (
          <div className="order-tracking-card">
            <div className="order-tracking-header">
              <h2 className="order-tracking-status-headline">
                Current Status:{' '}
                <span style={{ color: 'var(--color-gold)', textTransform: 'capitalize' }}>
                  {order.status.replace(/_/g, ' ')}
                </span>
              </h2>
              <span className={`account-order-status-badge badge-${order.status}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="order-stepper">
              {TRACKING_STEPS.map((step, idx) => {
                const IconComponent = step.icon;
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isPending = idx > currentStepIndex;

                let stateClass = 'is-pending';
                if (isCompleted) stateClass = 'is-completed';
                if (isCurrent) stateClass = 'is-current';

                return (
                  <div key={step.key} className={`order-step-item ${stateClass}`}>
                    <div className="order-step-icon-wrap">
                      <IconComponent size={20} />
                    </div>
                    <span className="order-step-label">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Two-Column Details */}
        <div className="order-detail-grid">
          {/* Order Items */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">Order Items</h3>
            <table className="order-detail-items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items && order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="order-detail-table-item">
                        <img
                          src={item.image_url || '/products/1/1.jpeg'}
                          alt={item.product_name}
                          onError={(e) => {
                            e.target.src = '/products/1/1.jpeg';
                          }}
                        />
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.9375rem', color: 'var(--color-brown)' }}>
                            {item.product_name}
                          </strong>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
                            ₹{Number(item.price).toLocaleString('en-IN')} each
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.9375rem', color: 'var(--color-brown)' }}>
                      {item.quantity}
                    </td>
                    <td style={{ fontSize: '0.9375rem', fontWeight: '600', color: 'var(--color-brown)' }}>
                      ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-brown)' }}>
                Total Paid
              </span>
              <span style={{ fontSize: '1.375rem', fontWeight: '700', color: 'var(--color-brown)', fontFamily: 'var(--font-serif)' }}>
                ₹{Number(order.total_amount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Shipping & Payment Summary */}
          <div className="order-detail-card">
            <h3 className="order-detail-card-title">Delivery & Payment</h3>
            <div className="order-info-list">
              <div className="order-info-row">
                <span>Customer</span>
                <span>{order.customer_name}</span>
              </div>
              <div className="order-info-row">
                <span>Email Address</span>
                <span>{order.customer_email}</span>
              </div>
              {order.customer_phone && (
                <div className="order-info-row">
                  <span>Contact Phone</span>
                  <span>{order.customer_phone}</span>
                </div>
              )}
              <div className="order-info-row">
                <span>Shipping Address</span>
                <span>
                  {order.shipping_address}<br />
                  {order.city}, {order.state} {order.postal_code}<br />
                  {order.country}
                </span>
              </div>
              <div className="order-info-row">
                <span>Payment Method</span>
                <span>{order.payment_method} ({order.payment_status})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
