import { useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Menu,
  X,
  Bell,
  ShieldCheck
} from 'lucide-react';
import logoImg from '../assets/logo.jpeg';
import './AdminLayout.css';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
    { to: '/admin/products', label: 'Product Catalog', icon: Package },
    { to: '/admin/orders', label: 'Orders & Sales', icon: ShoppingBag },
  ];

  return (
    <div className="admin-root">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="admin-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__brand">
          <img src={logoImg} alt="Jewels 'n' Joys" className="admin-sidebar__logo" />
          <div className="admin-sidebar__brand-text">
            <span className="admin-sidebar__brand-name">Jewels &apos;n&apos; Joys</span>
            <span className="admin-sidebar__brand-badge">ADMIN SUITE</span>
          </div>
          <button
            type="button"
            className="admin-sidebar__close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          <div className="admin-sidebar__nav-group">
            <span className="admin-sidebar__section-title">MANAGEMENT</span>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`
                }
              >
                <item.icon size={18} className="admin-nav-link__icon" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="admin-sidebar__nav-group admin-sidebar__nav-group--bottom">
            <span className="admin-sidebar__section-title">STOREFRONT</span>
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-nav-link admin-nav-link--external"
            >
              <ExternalLink size={18} className="admin-nav-link__icon" />
              <span>Live Website</span>
            </Link>
          </div>
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-status-pill">
            <span className="admin-status-dot" />
            <span>SQLite DB Connected</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Top Header */}
        <header className="admin-header">
          <div className="admin-header__left">
            <button
              type="button"
              className="admin-header__menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <Menu size={22} />
            </button>
            <div className="admin-header__title-wrap">
              <h1 className="admin-header__title">
                {location.pathname === '/admin' && 'Executive Overview'}
                {location.pathname === '/admin/products' && 'Product Catalog'}
                {location.pathname === '/admin/orders' && 'Customer Orders'}
              </h1>
              <span className="admin-header__subtitle">Jewels &apos;n&apos; Joys Administration</span>
            </div>
          </div>

          <div className="admin-header__actions">
            <div className="admin-badge admin-badge--gold">
              <Sparkles size={14} />
              <span>Jewels &apos;n&apos; Joys Luxury</span>
            </div>
            <div className="admin-user-pill">
              <div className="admin-user-avatar">AD</div>
              <div className="admin-user-info">
                <span className="admin-user-name">Store Admin</span>
                <span className="admin-user-role">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="admin-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
