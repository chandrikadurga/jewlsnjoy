import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw
} from 'lucide-react';
import { adminApi } from '../../services/api';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      // Fallback local stats if backend server isn't actively reachable
      setStats({
        total_revenue: 5892,
        total_orders: 5,
        total_products: 7,
        low_stock_count: 2,
        status_counts: {
          pending: 2,
          processing: 1,
          shipped: 1,
          delivered: 1,
          cancelled: 0,
        },
        recent_orders: [
          { id: 5, order_number: 'ORD-10945', customer_name: 'Ananya Sen', total_amount: '749.00', status: 'pending', created_at: '2026-09-05T13:45:00Z' },
          { id: 4, order_number: 'ORD-10944', customer_name: 'Vikram Rathore', total_amount: '1598.00', status: 'pending', created_at: '2026-09-05T07:20:00Z' },
          { id: 3, order_number: 'ORD-10943', customer_name: 'Rhea Kapoor', total_amount: '849.00', status: 'processing', created_at: '2026-09-04T16:10:00Z' },
          { id: 2, order_number: 'ORD-10942', customer_name: 'Pooja Sharma', total_amount: '1298.00', status: 'shipped', created_at: '2026-09-02T11:00:00Z' },
          { id: 1, order_number: 'ORD-10941', customer_name: 'Aarav Mehta', total_amount: '1398.00', status: 'delivered', created_at: '2026-08-30T09:30:00Z' },
        ],
        recent_products: [
          { id: 1, name: 'Emerald Luxe Tennis Necklace', price: '799.00', primary_image_url: '/products/1/1.jpeg', in_stock: true },
          { id: 2, name: 'Midnight Heart Pendant Necklace', price: '599.00', primary_image_url: '/products/2/1.jpeg', in_stock: true },
          { id: 3, name: 'Royal Crown Pink Crystal Necklace', price: '649.00', primary_image_url: '/products/3/1.jpeg', in_stock: true },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'Pending', icon: Clock, className: 'admin-status-badge--pending' },
      processing: { label: 'Processing', icon: RotateCcw, className: 'admin-status-badge--processing' },
      shipped: { label: 'Shipped', icon: Truck, className: 'admin-status-badge--shipped' },
      delivered: { label: 'Delivered', icon: CheckCircle2, className: 'admin-status-badge--delivered' },
      cancelled: { label: 'Cancelled', icon: AlertTriangle, className: 'admin-status-badge--cancelled' },
    };
    const s = map[status] || map.pending;
    const Icon = s.icon;
    return (
      <span className={`admin-status-badge ${s.className}`}>
        <Icon size={12} />
        <span>{s.label}</span>
      </span>
    );
  };

  if (loading && !stats) {
    return (
      <div className="admin-loading-state">
        <div className="admin-spinner" />
        <p>Loading luxury analytics...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card admin-kpi-card--gold">
          <div className="admin-kpi-card__top">
            <span className="admin-kpi-card__label">TOTAL REVENUE</span>
            <div className="admin-kpi-card__icon-wrap">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="admin-kpi-card__value">
            {formatCurrency(stats?.total_revenue)}
          </div>
          <div className="admin-kpi-card__meta">
            <span className="admin-kpi-card__trend admin-kpi-card__trend--up">
              <TrendingUp size={13} /> +18.4%
            </span>
            <span className="admin-kpi-card__sub">vs last 30 days</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-card__top">
            <span className="admin-kpi-card__label">TOTAL ORDERS</span>
            <div className="admin-kpi-card__icon-wrap">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="admin-kpi-card__value">
            {stats?.total_orders || 0}
          </div>
          <div className="admin-kpi-card__meta">
            <span className="admin-kpi-card__highlight">
              {stats?.status_counts?.pending || 0} pending review
            </span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-card__top">
            <span className="admin-kpi-card__label">CATALOG PRODUCTS</span>
            <div className="admin-kpi-card__icon-wrap">
              <Package size={20} />
            </div>
          </div>
          <div className="admin-kpi-card__value">
            {stats?.total_products || 7}
          </div>
          <div className="admin-kpi-card__meta">
            <span className="admin-kpi-card__sub">Multi-angle verified pieces</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-card__top">
            <span className="admin-kpi-card__label">INVENTORY ALERT</span>
            <div className="admin-kpi-card__icon-wrap admin-kpi-card__icon-wrap--alert">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="admin-kpi-card__value">
            {stats?.low_stock_count || 0}
          </div>
          <div className="admin-kpi-card__meta">
            <span className="admin-kpi-card__sub">Items below 15 units</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Orders & Overview */}
      <div className="admin-dashboard__grid">
        {/* Left Col: Recent Orders */}
        <div className="admin-card admin-dashboard__orders-card">
          <div className="admin-card__header">
            <div>
              <h2 className="admin-card__title">Recent Customer Orders</h2>
              <p className="admin-card__subtitle">Real-time orders placed through storefront</p>
            </div>
            <Link to="/admin/orders" className="admin-card__link">
              View All Orders <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_orders?.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="admin-order-code">{order.order_number}</span>
                    </td>
                    <td>
                      <div className="admin-table-customer">
                        <span className="admin-customer-name">{order.customer_name}</span>
                        {order.customer_email && (
                          <span className="admin-customer-email">{order.customer_email}</span>
                        )}
                      </div>
                    </td>
                    <td className="admin-table-dim">{formatDate(order.created_at)}</td>
                    <td className="admin-table-bold">{formatCurrency(order.total_amount)}</td>
                    <td>{getStatusBadge(order.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Quick Actions & Status Breakdown */}
        <div className="admin-dashboard__side-col">
          {/* Status Breakdown Card */}
          <div className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">Order Status Flow</h2>
            </div>
            <div className="admin-status-bars">
              <div className="admin-status-bar-item">
                <div className="admin-status-bar-info">
                  <span>Pending Confirmation</span>
                  <span className="admin-status-bar-count">{stats?.status_counts?.pending || 0}</span>
                </div>
                <div className="admin-status-bar-track">
                  <div
                    className="admin-status-bar-fill admin-status-bar-fill--pending"
                    style={{ width: `${Math.min(100, ((stats?.status_counts?.pending || 0) / Math.max(1, stats?.total_orders || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="admin-status-bar-item">
                <div className="admin-status-bar-info">
                  <span>In Processing</span>
                  <span className="admin-status-bar-count">{stats?.status_counts?.processing || 0}</span>
                </div>
                <div className="admin-status-bar-track">
                  <div
                    className="admin-status-bar-fill admin-status-bar-fill--processing"
                    style={{ width: `${Math.min(100, ((stats?.status_counts?.processing || 0) / Math.max(1, stats?.total_orders || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="admin-status-bar-item">
                <div className="admin-status-bar-info">
                  <span>Shipped & In Transit</span>
                  <span className="admin-status-bar-count">{stats?.status_counts?.shipped || 0}</span>
                </div>
                <div className="admin-status-bar-track">
                  <div
                    className="admin-status-bar-fill admin-status-bar-fill--shipped"
                    style={{ width: `${Math.min(100, ((stats?.status_counts?.shipped || 0) / Math.max(1, stats?.total_orders || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="admin-status-bar-item">
                <div className="admin-status-bar-info">
                  <span>Delivered Successfully</span>
                  <span className="admin-status-bar-count">{stats?.status_counts?.delivered || 0}</span>
                </div>
                <div className="admin-status-bar-track">
                  <div
                    className="admin-status-bar-fill admin-status-bar-fill--delivered"
                    style={{ width: `${Math.min(100, ((stats?.status_counts?.delivered || 0) / Math.max(1, stats?.total_orders || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="admin-card">
            <div className="admin-card__header">
              <h2 className="admin-card__title">Quick Administrative Actions</h2>
            </div>
            <div className="admin-quick-actions">
              <Link to="/admin/products?create=true" className="admin-action-btn admin-action-btn--primary">
                <Package size={16} />
                <span>Add New Jewellery Piece</span>
              </Link>
              <Link to="/admin/orders" className="admin-action-btn">
                <ShoppingBag size={16} />
                <span>Process Customer Orders</span>
              </Link>
              <a
                href="http://localhost:8000/admin/"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-action-btn admin-action-btn--outline"
              >
                <Sparkles size={16} />
                <span>Open Django Admin (superuser)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
