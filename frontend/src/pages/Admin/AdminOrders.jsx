import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  ShoppingBag,
  Clock,
  RotateCcw,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Printer,
  X,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Check,
  Ban,
  Copy,
  ZoomIn,
  Image as ImageIcon,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import './AdminOrders.css';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [lightboxData, setLightboxData] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(null);
  const [shippingActionLoading, setShippingActionLoading] = useState(false);
  const [shippingFeedback, setShippingFeedback] = useState({ type: '', text: '' });

  const handleCopyUtr = (utr, e) => {
    if (e) e.stopPropagation();
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    showToast(`UTR copied: ${utr}`);
    setTimeout(() => setCopiedUtr(null), 2500);
  };

  const handleCreateShipment = async (orderId) => {
    setShippingActionLoading(true);
    setShippingFeedback({ type: '', text: '' });
    try {
      const res = await adminApi.createShipment(orderId);
      showToast(res.message || 'Delhivery shipment created successfully!');
      if (res.shipment) {
        setSelectedOrder(prev => ({
          ...prev,
          status: 'shipped',
          shipment: res.shipment
        }));
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'shipped', shipment: res.shipment } : o));
      }
      setShippingFeedback({ type: 'success', text: `Dispatched with AWB: ${res.shipment?.awb_number}` });
    } catch (err) {
      const errText = err.response?.data?.error || 'Failed to dispatch shipment with Delhivery.';
      setShippingFeedback({ type: 'error', text: errText });
      showToast(errText);
    } finally {
      setShippingActionLoading(false);
    }
  };

  const handleRefreshTracking = async (orderId) => {
    setShippingActionLoading(true);
    setShippingFeedback({ type: '', text: '' });
    try {
      const res = await adminApi.refreshShipmentTracking(orderId);
      showToast('Tracking updated from Delhivery!');
      if (res.shipment) {
        setSelectedOrder(prev => ({ ...prev, shipment: res.shipment }));
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, shipment: res.shipment } : o));
      }
    } catch (err) {
      const errText = err.response?.data?.error || 'Tracking sync failed.';
      setShippingFeedback({ type: 'error', text: errText });
    } finally {
      setShippingActionLoading(false);
    }
  };

  const handlePrintLabel = async (orderId) => {
    try {
      const res = await adminApi.getShipmentLabel(orderId);
      if (res.label_url) {
        window.open(res.label_url, '_blank', 'noopener,noreferrer');
      } else {
        showToast('Label URL not available from Delhivery.');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to fetch label.');
    }
  };

  const handleRequestPickup = async (orderId) => {
    setShippingActionLoading(true);
    try {
      const res = await adminApi.requestShipmentPickup(orderId);
      showToast(res.message || 'Pickup scheduled!');
      if (selectedOrder) {
        setSelectedOrder(prev => ({
          ...prev,
          shipment: { ...prev.shipment, pickup_token_number: res.token_number }
        }));
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to request pickup.');
    } finally {
      setShippingActionLoading(false);
    }
  };

  const [fetchError, setFetchError] = useState(null);

  const loadOrders = async (isRetry = false) => {
    try {
      setLoading(true);
      setFetchError(null);
      const [ordersData, verifData] = await Promise.allSettled([
        adminApi.getOrders(),
        adminApi.getPaymentVerifications(),
      ]);

      let fetchedOrders = [];
      if (ordersData.status === 'fulfilled' && ordersData.value) {
        if (Array.isArray(ordersData.value)) {
          fetchedOrders = ordersData.value;
        } else if (Array.isArray(ordersData.value.orders)) {
          fetchedOrders = ordersData.value.orders;
        } else if (Array.isArray(ordersData.value.results)) {
          fetchedOrders = ordersData.value.results;
        }
      }

      if (ordersData.status === 'rejected') {
        console.warn('Orders fetch initial error:', ordersData.reason);
        if (!isRetry) {
          // Auto retry once after 1.5s in case Render server is waking up
          setTimeout(() => loadOrders(true), 1500);
          return;
        } else {
          setFetchError(ordersData.reason?.message || 'Server did not respond in time.');
        }
      }

      setOrders(fetchedOrders);

      if (verifData.status === 'fulfilled' && Array.isArray(verifData.value)) {
        setVerifications(verifData.value);
      }
    } catch (err) {
      console.error('Failed to load orders/verifications:', err);
      setFetchError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const [modalVerifLoading, setModalVerifLoading] = useState(false);
  const hasFetchedVerifRef = useRef(new Set());

  const resolveProofUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('supabase://')) {
      const cleanPath = url.replace('supabase://', '');
      const sbUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hlxffdtkghzednkpwxlb.supabase.co';
      return `${sbUrl.replace(/\/$/, '')}/storage/v1/object/public/${cleanPath}`;
    }
    if (url.startsWith('local://')) {
      const clean = url.replace('local://', '').replace(/^\/+/, '');
      const base = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');
      return `${base.replace(/\/$/, '')}/media/${clean}`;
    }
    const base = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');
    return `${base.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }, []);

  // O(1) memoized lookup map for verifications
  const verificationsMap = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(verifications)) return map;
    verifications.forEach((v) => {
      if (v.order_number) map.set(String(v.order_number).trim().toLowerCase(), v);
      if (v.order_id) map.set(String(v.order_id), v);
      if (v.order) map.set(String(v.order), v);
    });
    return map;
  }, [verifications]);

  const getVerificationForOrder = useCallback((order) => {
    if (!order) return null;
    if (order.payment_verification && (order.payment_verification.transaction_id || order.payment_verification.payment_proof_url)) {
      return {
        ...order.payment_verification,
        payment_proof_url: resolveProofUrl(order.payment_verification.payment_proof_url),
      };
    }
    const orderNum = String(order.order_number || '').trim().toLowerCase();
    const orderId = String(order.id || '');
    const found = verificationsMap.get(orderNum) || verificationsMap.get(orderId);
    if (found) {
      return {
        ...found,
        payment_proof_url: resolveProofUrl(found.payment_proof_url),
      };
    }
    return null;
  }, [verificationsMap, resolveProofUrl]);

  const selectedOrderVerif = selectedOrder ? getVerificationForOrder(selectedOrder) : null;
  const isSelectedOrderManualUpi = Boolean(
    selectedOrder && (
      selectedOrder.payment_method === 'manual_upi' ||
      selectedOrder.payment_status === 'pending_verification' ||
      selectedOrder.status === 'awaiting_payment_verification' ||
      selectedOrderVerif
    )
  );

  // When opening an order that uses manual UPI, ensure verifications are fetched at most once per order
  useEffect(() => {
    if (!selectedOrder) return;
    const key = selectedOrder.order_number || String(selectedOrder.id);
    if (isSelectedOrderManualUpi && !selectedOrderVerif && !hasFetchedVerifRef.current.has(key)) {
      hasFetchedVerifRef.current.add(key);
      setModalVerifLoading(true);
      adminApi.getPaymentVerifications()
        .then((data) => {
          if (Array.isArray(data)) {
            setVerifications(data);
          }
        })
        .catch((err) => console.error('Error fetching verifications:', err))
        .finally(() => setModalVerifLoading(false));
    }
  }, [selectedOrder, isSelectedOrderManualUpi, selectedOrderVerif]);

  const handleApproveVerification = async (verificationId) => {
    if (actionLoadingId) return;
    try {
      setActionLoadingId(verificationId);
      const res = await adminApi.approvePaymentVerification(verificationId);
      showToast('Payment verified successfully! Order marked as confirmed & inventory updated.');

      setVerifications((prev) =>
        prev.map((v) => (v.id === verificationId ? { ...v, status: 'paid' } : v))
      );

      if (res.order) {
        setOrders((prev) =>
          prev.map((o) =>
            o.order_number === res.order.order_number
              ? { ...o, status: 'confirmed', payment_status: 'paid' }
              : o
          )
        );
        if (selectedOrder && selectedOrder.order_number === res.order.order_number) {
          setSelectedOrder((prev) => ({ ...prev, status: 'confirmed', payment_status: 'paid' }));
        }
      }
    } catch (err) {
      console.error('Failed to approve payment:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to approve payment.';
      alert(`Approval error: ${msg}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectVerification = async (verificationId) => {
    if (actionLoadingId) return;
    const reason = window.prompt('Enter reason for rejecting this payment proof (e.g. UTR not found in bank statement):');
    if (reason === null) return;

    try {
      setActionLoadingId(verificationId);
      const res = await adminApi.rejectPaymentVerification(verificationId, reason);
      showToast('Payment proof marked as rejected.');

      setVerifications((prev) =>
        prev.map((v) =>
          v.id === verificationId ? { ...v, status: 'rejected', rejection_reason: reason } : v
        )
      );

      if (res.order) {
        setOrders((prev) =>
          prev.map((o) =>
            o.order_number === res.order.order_number
              ? { ...o, payment_status: 'rejected' }
              : o
          )
        );
        if (selectedOrder && selectedOrder.order_number === res.order.order_number) {
          setSelectedOrder((prev) => ({ ...prev, payment_status: 'rejected' }));
        }
      }
    } catch (err) {
      console.error('Failed to reject payment:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to reject payment.';
      alert(`Rejection error: ${msg}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await adminApi.updateOrderStatus(orderId, newStatus);
      showToast(`Order status updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update status on server:', err);
      showToast(`Status updated locally.`);
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingVerificationCount = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'awaiting_payment_verification' || o.payment_status === 'pending_verification'
    ).length;
  }, [orders]);

  const STATUS_TABS = useMemo(() => [
    { id: 'All', label: 'All' },
    { id: 'awaiting_payment_verification', label: 'Awaiting Verification', count: pendingVerificationCount },
    { id: 'pending', label: 'Pending' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'processing', label: 'Processing' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
  ], [pendingVerificationCount]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const activeTabLower = activeTab.toLowerCase();
    return orders.filter((o) => {
      let statusMatch = false;
      if (activeTab === 'All') {
        statusMatch = true;
      } else if (activeTab === 'awaiting_payment_verification') {
        statusMatch =
          o.status === 'awaiting_payment_verification' ||
          o.payment_status === 'pending_verification';
      } else {
        statusMatch = o.status?.toLowerCase() === activeTabLower;
      }
      if (!statusMatch) return false;
      if (!q) return true;
      return (
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        (o.customer_email && o.customer_email.toLowerCase().includes(q))
      );
    });
  }, [orders, activeTab, searchQuery]);

  return (
    <div className="admin-orders-page">
      {toastMsg && (
        <div className="admin-feedback-toast">
          <Sparkles size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Tabs & Search Bar */}
      <div className="admin-orders-bar">
        <div className="admin-status-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`admin-tab-btn ${activeTab === tab.id ? 'admin-tab-btn--active' : ''}`}
            >
              {tab.label}
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className="admin-tab-count">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div className="admin-orders-search">
            <Search size={18} className="admin-orders-search__icon" />
            <input
              type="text"
              placeholder="Search order #, customer name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => loadOrders()}
            disabled={loading}
            title="Refresh order records"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.9rem', fontSize: '0.82rem' }}
          >
            <RotateCcw size={14} className={loading ? 'admin-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && orders.length === 0 ? (
        <div className="admin-loading-state" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.2rem', padding: '4rem 1rem' }}>
          <div className="admin-spinner" />
          <p style={{ color: '#c2a370', fontSize: '0.92rem', letterSpacing: '0.3px' }}>
            Loading customer orders &amp; payment records...
          </p>
        </div>
      ) : fetchError && orders.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <AlertTriangle size={42} color="#f87171" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#f87171', marginBottom: '0.5rem', fontFamily: 'Cinzel, serif', fontSize: '1.2rem' }}>
            Unable to Load Orders
          </h3>
          <p style={{ color: 'rgba(247, 239, 230, 0.7)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
            {fetchError}. The cloud backend server might have been asleep and is currently starting up.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => loadOrders()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto', padding: '0.65rem 1.4rem' }}
          >
            <RotateCcw size={16} /> Retry Fetching Orders
          </button>
        </div>
      ) : (
        /* Orders Table Card */
        <div className="admin-card admin-orders-card">
          <div className="admin-card__header">
            <div>
              <h2 className="admin-card__title">Customer Orders</h2>
              <p className="admin-card__subtitle">
                {filteredOrders.length} orders found • Click order to view full shipping &amp; verification details
              </p>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Date Placed</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Proof &amp; UTR</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'rgba(247, 239, 230, 0.5)', fontSize: '0.9rem' }}>
                      {orders.length === 0
                        ? 'No customer orders found in database.'
                        : `No orders match filter "${activeTab}"${searchQuery ? ` and search "${searchQuery}"` : ''}.`}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                const verification = getVerificationForOrder(order);
                const isAwaiting =
                  order.status === 'awaiting_payment_verification' ||
                  order.payment_status === 'pending_verification';

                return (
                  <tr key={order.id}>
                    <td>
                      <span
                        className="admin-order-link"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {order.order_number}
                      </span>
                      {isAwaiting && (
                        <div style={{ marginTop: '4px' }}>
                          <span
                            className="admin-verification-badge--pending"
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.7rem',
                              borderRadius: '4px',
                              display: 'inline-block',
                            }}
                          >
                            ⏳ Verify Proof
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="admin-table-customer">
                        <span className="admin-customer-name">{order.customer_name}</span>
                        <span className="admin-customer-email">{order.customer_email}</span>
                      </div>
                    </td>
                    <td className="admin-table-dim">{formatDate(order.created_at)}</td>
                    <td className="admin-table-bold">{formatCurrency(order.total_amount)}</td>
                    <td>
                      <span className="admin-payment-pill">
                        {order.payment_method === 'manual_upi' ? 'UPI (QR Code)' : (order.payment_method || 'Online')}
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        <span className={`admin-paystatus-pill admin-paystatus-pill--${order.payment_status}`}>
                          {order.payment_status === 'paid'
                            ? 'Paid'
                            : order.payment_status === 'pending_verification'
                            ? 'Pending Review'
                            : order.payment_status === 'rejected'
                            ? 'Rejected'
                            : (order.payment_status || 'Pending')}
                        </span>
                      </div>
                    </td>
                    <td>
                      {verification ? (
                        <div className="admin-proof-cell">
                          {verification.payment_proof_url ? (
                            <div
                              className="admin-proof-thumb-preview"
                              onClick={() =>
                                setLightboxData({
                                  url: verification.payment_proof_url,
                                  orderNumber: order.order_number,
                                  utr: verification.transaction_id,
                                  amount: verification.amount,
                                })
                              }
                              title="Click to zoom screenshot"
                            >
                              <img
                                src={verification.payment_proof_url}
                                alt="Payment Proof"
                                className="admin-proof-thumb-img"
                              />
                              <div className="admin-proof-thumb-hover">
                                <ZoomIn size={13} />
                              </div>
                            </div>
                          ) : (
                            <div className="admin-proof-no-thumb" title="No screenshot uploaded">
                              <ImageIcon size={16} />
                            </div>
                          )}

                          <div className="admin-proof-meta">
                            <div className="admin-proof-utr-row">
                              <span
                                className="admin-proof-utr-text"
                                title={`UTR: ${verification.transaction_id}`}
                              >
                                {verification.transaction_id}
                              </span>
                              <button
                                type="button"
                                className="admin-copy-utr-btn"
                                onClick={(e) => handleCopyUtr(verification.transaction_id, e)}
                                title="Copy UTR"
                              >
                                {copiedUtr === verification.transaction_id ? (
                                  <Check size={12} color="#4ade80" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            {verification.payment_proof_url && (
                              <button
                                type="button"
                                className="admin-proof-view-btn"
                                onClick={() =>
                                  setLightboxData({
                                    url: verification.payment_proof_url,
                                    orderNumber: order.order_number,
                                    utr: verification.transaction_id,
                                    amount: verification.amount,
                                  })
                                }
                              >
                                Inspect Proof <ZoomIn size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : order.payment_method === 'manual_upi' ? (
                        <span style={{ fontSize: '0.74rem', color: 'rgba(247, 239, 230, 0.4)', fontStyle: 'italic' }}>
                          Awaiting proof
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: 'rgba(247, 239, 230, 0.3)' }}>
                          -
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`admin-status-select admin-status-select--${order.status}`}
                      >
                        <option value="awaiting_payment_verification">Awaiting Verification</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Mobile Order Cards (Optimized, lightweight, 60fps mobile list) */}
        <div className="admin-mobile-orders">
          {filteredOrders.length === 0 ? (
            <div className="admin-mobile-empty">No orders found</div>
          ) : (
            filteredOrders.map((order) => {
              const verification = getVerificationForOrder(order);
              const isAwaiting =
                order.status === 'awaiting_payment_verification' ||
                order.payment_status === 'pending_verification';

              return (
                <div
                  key={order.id}
                  className={`admin-mobile-order-card ${isAwaiting ? 'admin-mobile-order-card--awaiting' : ''}`}
                >
                  <div className="admin-mobile-order-header">
                    <div className="admin-mobile-order-id-wrap">
                      <span
                        className="admin-order-link"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {order.order_number}
                      </span>
                      {isAwaiting && (
                        <span className="admin-verification-badge--pending admin-mobile-awaiting-badge">
                          Verify Proof
                        </span>
                      )}
                    </div>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`admin-status-select admin-status-select--${order.status}`}
                    >
                      <option value="awaiting_payment_verification">Awaiting</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="admin-mobile-order-customer">
                    <span className="admin-customer-name">{order.customer_name}</span>
                    <span className="admin-mobile-date">{formatDate(order.created_at)}</span>
                  </div>

                  <div className="admin-mobile-order-meta">
                    <span className="admin-mobile-total">{formatCurrency(order.total_amount)}</span>
                    <div className="admin-mobile-tags">
                      <span className="admin-payment-pill">
                        {order.payment_method === 'manual_upi' ? 'UPI (QR)' : (order.payment_method || 'Online')}
                      </span>
                      <span className={`admin-paystatus-pill admin-paystatus-pill--${order.payment_status}`}>
                        {order.payment_status === 'paid'
                          ? 'Paid'
                          : order.payment_status === 'pending_verification'
                          ? 'Reviewing'
                          : order.payment_status === 'rejected'
                          ? 'Rejected'
                          : (order.payment_status || 'Pending')}
                      </span>
                    </div>
                  </div>

                  {verification && (
                    <div className="admin-mobile-verif-box">
                      <div className="admin-mobile-verif-left">
                        {verification.payment_proof_url ? (
                          <div
                            className="admin-proof-thumb-preview"
                            onClick={() =>
                              setLightboxData({
                                url: resolveProofUrl(verification.payment_proof_url),
                                orderNumber: order.order_number,
                                utr: verification.transaction_id,
                                amount: verification.amount,
                              })
                            }
                            title="Click to zoom screenshot"
                          >
                            <img
                              src={resolveProofUrl(verification.payment_proof_url)}
                              alt="Proof"
                              className="admin-proof-thumb-img"
                              loading="lazy"
                            />
                            <div className="admin-proof-thumb-hover">
                              <ZoomIn size={12} />
                            </div>
                          </div>
                        ) : (
                          <div className="admin-proof-no-thumb" title="No screenshot">
                            <ImageIcon size={14} />
                          </div>
                        )}
                        <div className="admin-mobile-utr">
                          <span className="admin-mobile-utr-label">UTR:</span>
                          <span className="admin-mobile-utr-val" title={verification.transaction_id}>
                            {verification.transaction_id || 'Not Provided'}
                          </span>
                        </div>
                      </div>
                      {verification.transaction_id && (
                        <button
                          type="button"
                          className="admin-copy-utr-btn"
                          onClick={(e) => handleCopyUtr(verification.transaction_id, e)}
                          title="Copy UTR"
                        >
                          {copiedUtr === verification.transaction_id ? (
                            <Check size={12} color="#4ade80" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="admin-mobile-order-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--sm admin-mobile-details-btn"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View Details &amp; Packing Slip
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* Order Detail / Packing Slip Modal */}
      {selectedOrder && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-modal--order">
            <div className="admin-modal__header">
              <div>
                <h3 className="admin-modal__title">Order Details: {selectedOrder.order_number}</h3>
                <span className="admin-modal__subtitle">Placed on {formatDate(selectedOrder.created_at)}</span>
              </div>
              <button
                type="button"
                className="admin-modal__close"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-order-modal-body">
              {/* Manual UPI Verification Card */}
              {isSelectedOrderManualUpi && (
                <div className="admin-verification-card">
                  <div className="admin-verification-header">
                    <h4 className="admin-verification-title">
                      <Clock size={16} /> Customer Payment Proof &amp; Verification
                    </h4>
                    <span
                      className={`admin-verification-badge ${
                        selectedOrderVerif && (selectedOrderVerif.status === 'approved' || selectedOrderVerif.status === 'paid')
                          ? 'admin-verification-badge--approved'
                          : selectedOrderVerif?.status === 'rejected'
                          ? 'admin-verification-badge--rejected'
                          : 'admin-verification-badge--pending'
                      }`}
                    >
                      {selectedOrderVerif && (selectedOrderVerif.status === 'approved' || selectedOrderVerif.status === 'paid')
                        ? '✓ Verified & Approved'
                        : selectedOrderVerif?.status === 'rejected'
                        ? '✗ Rejected'
                        : '⏳ Pending Review'}
                    </span>
                  </div>

                  {modalVerifLoading ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(247, 239, 230, 0.6)', fontSize: '0.85rem' }}>
                      Checking payment proof records...
                    </div>
                  ) : selectedOrderVerif ? (
                    <>
                      <div className="admin-verification-body">
                        <div className="admin-verification-info">
                          <div className="admin-utr-highlight-box">
                            <span className="admin-utr-label">
                              Customer UPI Reference / UTR Number:
                            </span>
                            <div className="admin-utr-copy-group">
                              <span className="admin-verification-utr">
                                {selectedOrderVerif.transaction_id || 'Not Provided'}
                              </span>
                              {selectedOrderVerif.transaction_id && (
                                <button
                                  type="button"
                                  className="admin-btn-copy-lg"
                                  onClick={() => handleCopyUtr(selectedOrderVerif.transaction_id)}
                                  title="Copy UTR Number"
                                >
                                  {copiedUtr === selectedOrderVerif.transaction_id ? (
                                    <>
                                      <Check size={14} color="#4ade80" /> Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={14} /> Copy UTR
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            <span className="admin-utr-subtext">
                              Verify this reference against your bank statement / UPI app transaction alert.
                            </span>
                          </div>

                          <div className="admin-verif-stat-row">
                            <div>
                              <span className="admin-verif-stat-lbl">Submitted Amount:</span>
                              <strong className="admin-verif-stat-val">
                                {formatCurrency(selectedOrderVerif.amount || selectedOrder.total_amount)}
                              </strong>
                            </div>
                            <div>
                              <span className="admin-verif-stat-lbl">Submission Date:</span>
                              <span className="admin-verif-stat-sub">
                                {formatDate(selectedOrderVerif.submitted_at || selectedOrder.created_at)}
                              </span>
                            </div>
                          </div>

                          {selectedOrderVerif.rejection_reason && (
                            <div className="admin-rejection-note-box">
                              <strong>Rejection Reason:</strong> {selectedOrderVerif.rejection_reason}
                            </div>
                          )}
                        </div>

                        {selectedOrderVerif.payment_proof_url && (
                          <div className="admin-verification-thumb-wrap">
                            <div
                              className="admin-modal-screenshot-container"
                              onClick={() =>
                                setLightboxData({
                                  url: resolveProofUrl(selectedOrderVerif.payment_proof_url),
                                  orderNumber: selectedOrder.order_number,
                                  utr: selectedOrderVerif.transaction_id,
                                  amount: selectedOrderVerif.amount,
                                })
                              }
                              title="Click to zoom screenshot"
                            >
                              <img
                                src={resolveProofUrl(selectedOrderVerif.payment_proof_url)}
                                alt="Customer Payment Receipt"
                                className="admin-modal-screenshot-img"
                              />
                              <div className="admin-modal-screenshot-zoom-overlay">
                                <ZoomIn size={22} />
                                <span>Click to Inspect</span>
                              </div>
                            </div>
                            <a
                              href={resolveProofUrl(selectedOrderVerif.payment_proof_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-modal-open-tab-link"
                            >
                              Open original in new tab <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>

                      {(!selectedOrderVerif.status || selectedOrderVerif.status === 'pending' || selectedOrderVerif.status === 'pending_verification') && (
                        <div className="admin-verification-actions">
                          <button
                            type="button"
                            className="admin-btn--approve"
                            disabled={actionLoadingId === selectedOrderVerif.id}
                            onClick={() => handleApproveVerification(selectedOrderVerif.id)}
                          >
                            <Check size={16} />
                            {actionLoadingId === selectedOrderVerif.id ? 'Approving...' : 'Approve Payment & Confirm Order'}
                          </button>
                          <button
                            type="button"
                            className="admin-btn--reject"
                            disabled={actionLoadingId === selectedOrderVerif.id}
                            onClick={() => handleRejectVerification(selectedOrderVerif.id)}
                          >
                            <Ban size={15} />
                            Reject Payment
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', margin: '0.75rem 0' }}>
                      <p style={{ margin: '0 0 0.5rem', color: 'rgba(247, 239, 230, 0.7)', fontSize: '0.84rem' }}>
                        This order was placed with Manual UPI. If proof was recently submitted, click below to refresh.
                      </p>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={() => {
                          setModalVerifLoading(true);
                          adminApi.getPaymentVerifications()
                            .then((data) => {
                              if (Array.isArray(data)) setVerifications(data);
                            })
                            .finally(() => setModalVerifLoading(false));
                        }}
                      >
                        Check for Proof
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Customer & Shipping Details */}
              <div className="admin-order-details-grid">
                <div className="admin-detail-block">
                  <h4 className="admin-detail-title">
                    <MapPin size={15} /> Shipping Address
                  </h4>
                  <p className="admin-detail-text">
                    <strong>{selectedOrder.customer_name}</strong><br />
                    {selectedOrder.shipping_address}<br />
                    {selectedOrder.city}, {selectedOrder.postal_code}
                  </p>
                </div>

                <div className="admin-detail-block">
                  <h4 className="admin-detail-title">
                    <Mail size={15} /> Contact & Payment
                  </h4>
                  <p className="admin-detail-text">
                    Email: {selectedOrder.customer_email || 'N/A'}<br />
                    Phone: {selectedOrder.customer_phone || 'N/A'}<br />
                    Payment: {selectedOrder.payment_method} ({selectedOrder.payment_status || 'Paid'})
                  </p>
                </div>
              </div>

              {/* Delhivery Shipping & Logistics Management Card */}
              <div className="admin-verification-card" style={{ borderColor: 'rgba(194, 163, 112, 0.3)', marginBottom: '1.25rem' }}>
                <div className="admin-verification-header">
                  <h4 className="admin-verification-title">
                    <Truck size={16} /> Delhivery Logistics &amp; Shipping
                  </h4>
                  {selectedOrder.shipment?.awb_number ? (
                    <span className="admin-verification-badge admin-verification-badge--approved">
                      AWB: {selectedOrder.shipment.awb_number}
                    </span>
                  ) : (
                    <span className="admin-verification-badge admin-verification-badge--pending">
                      Not Dispatched
                    </span>
                  )}
                </div>

                {shippingFeedback.text && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    marginBottom: '0.75rem',
                    background: shippingFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    color: shippingFeedback.type === 'error' ? '#fca5a5' : '#86efac',
                    border: `1px solid ${shippingFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                  }}>
                    {shippingFeedback.text}
                  </div>
                )}

                {selectedOrder.shipment?.awb_number ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        <span style={{ color: 'rgba(247, 239, 230, 0.5)', display: 'block', fontSize: '0.72rem' }}>Waybill / AWB</span>
                        <strong style={{ color: '#c2a370', fontFamily: 'monospace', fontSize: '0.95rem' }}>{selectedOrder.shipment.awb_number}</strong>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        <span style={{ color: 'rgba(247, 239, 230, 0.5)', display: 'block', fontSize: '0.72rem' }}>Carrier Status</span>
                        <strong style={{ color: '#f7efe6', textTransform: 'capitalize' }}>
                          {selectedOrder.shipment.provider_status || selectedOrder.shipment.shipment_status?.replace(/_/g, ' ')}
                        </strong>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        <span style={{ color: 'rgba(247, 239, 230, 0.5)', display: 'block', fontSize: '0.72rem' }}>Payment Mode</span>
                        <strong style={{ color: '#f7efe6' }}>
                          {selectedOrder.shipment.payment_mode} {selectedOrder.shipment.payment_mode === 'COD' ? `(Collect ₹${Number(selectedOrder.shipment.cod_amount).toLocaleString('en-IN')})` : ''}
                        </strong>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        <span style={{ color: 'rgba(247, 239, 230, 0.5)', display: 'block', fontSize: '0.72rem' }}>Pickup Token</span>
                        <strong style={{ color: '#f7efe6' }}>{selectedOrder.shipment.pickup_token_number || 'Not Requested'}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        disabled={shippingActionLoading}
                        onClick={() => handleRefreshTracking(selectedOrder.id)}
                        title="Sync live status from Delhivery"
                      >
                        <RotateCcw size={13} className={shippingActionLoading ? 'animate-spin' : ''} />
                        {shippingActionLoading ? 'Syncing...' : 'Sync Tracking'}
                      </button>

                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={() => handlePrintLabel(selectedOrder.id)}
                        title="Open Delhivery Barcode Packing Slip"
                      >
                        <Printer size={13} />
                        Print Label
                      </button>

                      {!selectedOrder.shipment.pickup_token_number && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                          disabled={shippingActionLoading}
                          onClick={() => handleRequestPickup(selectedOrder.id)}
                          title="Schedule courier pickup"
                        >
                          <Truck size={13} />
                          Schedule Pickup
                        </button>
                      )}

                      {selectedOrder.shipment.tracking_url && (
                        <a
                          href={selectedOrder.shipment.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          Delhivery Portal <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 0.75rem', color: 'rgba(247, 239, 230, 0.7)', fontSize: '0.84rem' }}>
                      {selectedOrder.payment_method === 'manual_upi' && selectedOrder.payment_status !== 'paid'
                        ? '⚠️ This order was placed with Manual UPI. You must verify and approve the payment proof above before creating a Delhivery shipment.'
                        : 'Create a shipment manifest on Delhivery One and generate an Air Waybill (AWB) for this order.'}
                    </p>

                    <button
                      type="button"
                      className="admin-btn admin-btn--primary"
                      disabled={
                        shippingActionLoading ||
                        (selectedOrder.payment_method === 'manual_upi' && selectedOrder.payment_status !== 'paid')
                      }
                      onClick={() => handleCreateShipment(selectedOrder.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Truck size={15} />
                      {shippingActionLoading ? 'Manifesting with Delhivery...' : 'Create Delhivery Shipment'}
                    </button>
                  </div>
                )}
              </div>

              {/* Items Breakdown */}
              <div className="admin-order-items-wrap">
                <h4 className="admin-detail-title">Purchased Items</h4>
                <div className="admin-order-items-list">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="admin-order-item-row">
                      <img
                        src={item.image_url || '/products/1/1.jpeg'}
                        alt={item.product_name}
                        className="admin-order-item-img"
                        onError={(e) => { e.currentTarget.src = '/products/1/1.jpeg'; }}
                      />
                      <div className="admin-order-item-info">
                        <span className="admin-order-item-name">{item.product_name}</span>
                        <span className="admin-order-item-meta">Qty: {item.quantity} × {formatCurrency(item.price)}</span>
                      </div>
                      <span className="admin-order-item-subtotal">
                        {formatCurrency((item.price || 0) * (item.quantity || 1))}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="admin-order-summary-row">
                  <span>Grand Total:</span>
                  <span className="admin-order-total-val">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="admin-modal__footer">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => window.print()}
              >
                <Printer size={16} /> Print Packing Slip
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => setSelectedOrder(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / High-Resolution Screenshot Zoom Modal */}
      {lightboxData && (
        <div className="admin-lightbox-backdrop" onClick={() => setLightboxData(null)}>
          <div className="admin-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="admin-lightbox-header">
              <div>
                <h4 className="admin-lightbox-title">
                  Customer Payment Proof — Order #{lightboxData.orderNumber}
                </h4>
                <div className="admin-lightbox-sub">
                  <span>UTR: <strong style={{ color: '#c2a370', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{lightboxData.utr}</strong></span>
                  {lightboxData.amount && <span> • Amount: <strong style={{ color: '#c2a370' }}>{formatCurrency(lightboxData.amount)}</strong></span>}
                </div>
              </div>
              <div className="admin-lightbox-tools">
                <a
                  href={resolveProofUrl(lightboxData.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn admin-btn--secondary admin-btn--sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  Full Resolution <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  className="admin-modal__close"
                  onClick={() => setLightboxData(null)}
                  title="Close viewer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="admin-lightbox-body">
              <img
                src={resolveProofUrl(lightboxData.url)}
                alt="Payment Screenshot High Resolution"
                className="admin-lightbox-img"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
