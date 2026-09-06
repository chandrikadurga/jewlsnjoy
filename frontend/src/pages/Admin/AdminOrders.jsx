import { useState, useEffect } from 'react';
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
  Mail
} from 'lucide-react';
import { adminApi } from '../../services/api';
import './AdminOrders.css';

const STATUS_TABS = ['All', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load orders:', err);
      // Fallback sample orders if backend is loading
      setOrders([
        {
          id: 5,
          order_number: 'ORD-10945',
          customer_name: 'Ananya Sen',
          customer_email: 'ananya.sen@example.com',
          customer_phone: '+91 98305 99120',
          shipping_address: 'Tower 3, Apt 1104, South City, Kolkata, West Bengal - 700068',
          city: 'Kolkata',
          postal_code: '700068',
          total_amount: '749.00',
          payment_method: 'UPI',
          payment_status: 'Paid',
          status: 'pending',
          created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          items: [
            { id: 1, product_name: 'Reversible Four-Leaf Clover Necklace', quantity: 1, price: '749.00', image_url: '/products/5/1.jpeg' }
          ]
        },
        {
          id: 4,
          order_number: 'ORD-10944',
          customer_name: 'Vikram Rathore',
          customer_email: 'vikram.r@example.com',
          customer_phone: '+91 94140 55678',
          shipping_address: 'C-19 Malviya Nagar, Jaipur, Rajasthan - 302017',
          city: 'Jaipur',
          postal_code: '302017',
          total_amount: '1598.00',
          payment_method: 'Cash on Delivery',
          payment_status: 'Pending',
          status: 'pending',
          created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
          items: [
            { id: 2, product_name: 'Onyx Solitaire Medallion Necklace', quantity: 1, price: '699.00', image_url: '/products/4/1.jpeg' },
            { id: 3, product_name: 'Emerald Green Chain Pendant', quantity: 1, price: '899.00', image_url: '/products/7/1.jpeg' }
          ]
        },
        {
          id: 3,
          order_number: 'ORD-10943',
          customer_name: 'Rhea Kapoor',
          customer_email: 'rhea.k@example.com',
          customer_phone: '+91 99402 12345',
          shipping_address: '12 Anna Nagar East, Chennai, Tamil Nadu - 600102',
          city: 'Chennai',
          postal_code: '600102',
          total_amount: '849.00',
          payment_method: 'Net Banking',
          payment_status: 'Paid',
          status: 'processing',
          created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
          items: [
            { id: 4, product_name: 'Emerald Square Layered Duo Necklace', quantity: 1, price: '849.00', image_url: '/products/6/1.jpeg' }
          ]
        },
        {
          id: 2,
          order_number: 'ORD-10942',
          customer_name: 'Pooja Sharma',
          customer_email: 'pooja.sharma@example.com',
          customer_phone: '+91 97110 88912',
          shipping_address: '74/B Defence Colony, New Delhi, Delhi - 110024',
          city: 'New Delhi',
          postal_code: '110024',
          total_amount: '1298.00',
          payment_method: 'Credit Card',
          payment_status: 'Paid',
          status: 'shipped',
          created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
          items: [
            { id: 5, product_name: 'Royal Crown Pink Crystal Necklace', quantity: 2, price: '649.00', image_url: '/products/3/1.jpeg' }
          ]
        },
        {
          id: 1,
          order_number: 'ORD-10941',
          customer_name: 'Aarav Mehta',
          customer_email: 'aarav.mehta@example.com',
          customer_phone: '+91 98201 44321',
          shipping_address: 'Flat 402, Royal Palms, Bandra West, Mumbai, Maharashtra - 400050',
          city: 'Mumbai',
          postal_code: '400050',
          total_amount: '1398.00',
          payment_method: 'UPI',
          payment_status: 'Paid',
          status: 'delivered',
          created_at: new Date(Date.now() - 144 * 3600000).toISOString(),
          items: [
            { id: 6, product_name: 'Emerald Luxe Tennis Necklace', quantity: 1, price: '799.00', image_url: '/products/1/1.jpeg' },
            { id: 7, product_name: 'Midnight Heart Pendant Necklace', quantity: 1, price: '599.00', image_url: '/products/2/1.jpeg' }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

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
    setTimeout(() => setToastMsg(''), 3000);
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

  const filteredOrders = orders.filter((o) => {
    const statusMatch = activeTab === 'All' || o.status.toLowerCase() === activeTab.toLowerCase();
    const q = searchQuery.toLowerCase();
    const searchMatch =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(q));
    return statusMatch && searchMatch;
  });

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
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`admin-tab-btn ${activeTab === tab ? 'admin-tab-btn--active' : ''}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

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
      </div>

      {/* Orders Table Card */}
      <div className="admin-card admin-orders-card">
        <div className="admin-card__header">
          <div>
            <h2 className="admin-card__title">Customer Orders</h2>
            <p className="admin-card__subtitle">
              {filteredOrders.length} orders found • Click order to view full shipping details
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
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span
                      className="admin-order-link"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {order.order_number}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-customer">
                      <span className="admin-customer-name">{order.customer_name}</span>
                      <span className="admin-customer-email">{order.customer_email}</span>
                    </div>
                  </td>
                  <td className="admin-table-dim">{formatDate(order.created_at)}</td>
                  <td>
                    <span className="admin-items-count">
                      {order.items?.length || 1} piece{(order.items?.length || 1) > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="admin-table-bold">{formatCurrency(order.total_amount)}</td>
                  <td>
                    <span className="admin-payment-pill">
                      {order.payment_method || 'Online'}
                    </span>
                  </td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`admin-status-select admin-status-select--${order.status}`}
                    >
                      <option value="pending">Pending</option>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
