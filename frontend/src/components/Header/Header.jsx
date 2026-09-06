import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, Menu, X, Heart, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import SearchOverlay from '../SearchOverlay/SearchOverlay';
import './Header.css';

const NAV_LINKS = [
  { to: '/',            label: 'Home'        },
  { to: '/shop',        label: 'Shop'        },
  { to: '/collections', label: 'Collections' },
  { to: '/about',       label: 'About Us'    },
  { to: '/contact',     label: 'Contact Us'  },
];

export default function Header() {
  const { cartItemCount, openDrawer } = useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { wishlistCount } = useWishlist();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const mobileNavRef = useRef(null);
  const navigate = useNavigate();

  // Detect scroll for shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [navigate]);

  // Lock body scroll when mobile nav open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className={`header${scrolled ? ' header--scrolled' : ''}`} role="banner">
        <div className="container header__inner">

          {/* Logo */}
          <Link to="/" className="header__logo" aria-label="Jewels 'n' Joys — Home">
            <span className="header__logo-text">Jewels &apos;n&apos; Joys</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="header__nav hide-mobile" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `header__nav-link${isActive ? ' header__nav-link--active' : ''}`
                }
                end={link.to === '/'}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="header__actions">
            {/* Search */}
            <button
              className="header__icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
              id="header-search-btn"
            >
              <Search size={20} strokeWidth={1.5} />
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="header__icon-btn"
              aria-label={`Wishlist, ${wishlistCount} item${wishlistCount !== 1 ? 's' : ''}`}
              id="header-wishlist-btn"
              title="My Wishlist"
            >
              <Heart size={20} strokeWidth={1.5} />
              {wishlistCount > 0 && (
                <span className="header__cart-badge" aria-hidden="true">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Customer Account */}
            {isAuthenticated ? (
              <Link
                to="/account"
                className="header__icon-btn"
                aria-label="My Account"
                id="header-account-btn"
                title={`Account: ${user?.email}`}
              >
                <User size={20} strokeWidth={1.5} />
              </Link>
            ) : (
              <button
                type="button"
                className="header__icon-btn"
                onClick={() => openAuthModal('login')}
                aria-label="Sign In"
                id="header-account-btn"
                title="Sign In / Register"
              >
                <User size={20} strokeWidth={1.5} />
              </button>
            )}

            {/* Cart */}
            <button
              className="header__icon-btn header__cart-btn"
              onClick={openDrawer}
              aria-label={`Shopping bag, ${cartItemCount} item${cartItemCount !== 1 ? 's' : ''}`}
              id="header-cart-btn"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartItemCount > 0 && (
                <span className="header__cart-badge" aria-hidden="true">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </button>

            {/* Hamburger — mobile only */}
            <button
              className="header__icon-btn hide-desktop header__hamburger"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              id="header-menu-btn"
            >
              {mobileOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <>
          <div
            className="overlay header__overlay"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <nav
            ref={mobileNavRef}
            className="header__mobile-nav"
            aria-label="Mobile navigation"
          >
            <div className="header__mobile-header">
              <Link to="/" className="header__logo" onClick={closeMobile}>
                <span className="header__logo-text">Jewels &apos;n&apos; Joys</span>
              </Link>
              <button
                className="header__icon-btn"
                onClick={closeMobile}
                aria-label="Close menu"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <ul className="header__mobile-links">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      `header__mobile-link${isActive ? ' header__mobile-link--active' : ''}`
                    }
                    onClick={closeMobile}
                    end={link.to === '/'}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
              <li style={{ borderTop: '1px solid var(--color-border)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
                <NavLink
                  to="/wishlist"
                  className={({ isActive }) =>
                    `header__mobile-link${isActive ? ' header__mobile-link--active' : ''}`
                  }
                  onClick={closeMobile}
                >
                  My Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}
                </NavLink>
              </li>
              {isAuthenticated ? (
                <>
                  <li>
                    <NavLink
                      to="/account"
                      className={({ isActive }) =>
                        `header__mobile-link${isActive ? ' header__mobile-link--active' : ''}`
                      }
                      onClick={closeMobile}
                    >
                      My Account
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/orders"
                      className={({ isActive }) =>
                        `header__mobile-link${isActive ? ' header__mobile-link--active' : ''}`
                      }
                      onClick={closeMobile}
                    >
                      My Orders
                    </NavLink>
                  </li>
                </>
              ) : (
                <li>
                  <button
                    type="button"
                    className="header__mobile-link"
                    style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '0.75rem 0' }}
                    onClick={() => {
                      closeMobile();
                      openAuthModal('login');
                    }}
                  >
                    Sign In / Register
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </>
      )}

      {/* Search Overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
