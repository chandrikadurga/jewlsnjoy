import { Link } from 'react-router-dom';
import logoImg from '../../assets/logo.jpeg';
import './Footer.css';

export default function FooterGlow({
  brandName = "Jewels N' Joys",
  tagline = "Thoughtfully designed jewellery that adds a touch of elegance to every moment.",
}) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-glow-root relative z-10 w-full overflow-hidden" role="contentinfo">
      {/* Ambient warm gold / champagne glow orbs */}
      <div className="glow-orbs-container pointer-events-none absolute top-0 left-1/2 z-0 h-full w-full -translate-x-1/2 select-none" aria-hidden="true">
        <div className="glow-orb-top absolute -top-24 left-1/4 h-72 w-72 rounded-full"></div>
        <div className="glow-orb-bottom absolute right-1/4 -bottom-20 h-80 w-80 rounded-full"></div>
      </div>

      {/* Glassmorphic luxury card */}
      <div className="glass relative mx-auto flex max-w-6xl flex-col items-center gap-8 rounded-2xl px-6 py-10 md:flex-row md:items-start md:justify-between md:gap-12">
        {/* Brand column */}
        <div className="footer-glow__brand flex flex-col items-center md:items-start">
          <Link to="/" className="footer-glow__logo mb-4 flex items-center gap-3">
            <div className="footer-glow__logo-wrap">
              <img
                src={logoImg}
                alt="Jewels N' Joys"
                className="footer-glow__logo-img"
              />
            </div>
            <span className="footer-glow__logo-text text-2xl font-serif font-medium tracking-tight">
              {brandName}
            </span>
          </Link>

          <p className="footer-glow__tagline mb-6 max-w-xs text-center text-sm md:text-left">
            {tagline}
          </p>

          <div className="footer-glow__socials mt-2 flex gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="footer-glow__social-link"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="footer-glow__social-link"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              className="footer-glow__social-link"
            >
              <span className="font-bold text-xs">𝕏</span>
            </a>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="footer-glow__nav flex w-full flex-col gap-8 text-center md:w-auto md:flex-row md:justify-end md:text-left" aria-label="Footer navigation">
          <div>
            <div className="footer-glow__col-title mb-4 text-xs font-semibold tracking-widest uppercase">
              Shop
            </div>
            <ul className="footer-glow__list space-y-2.5">
              <li>
                <Link to="/shop" className="footer-glow__link">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Necklaces" className="footer-glow__link">
                  Necklaces
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Earrings" className="footer-glow__link">
                  Earrings
                </Link>
              </li>
              <li>
                <Link to="/shop?featured=true" className="footer-glow__link">
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="footer-glow__col-title mb-4 text-xs font-semibold tracking-widest uppercase">
              Company
            </div>
            <ul className="footer-glow__list space-y-2.5">
              <li>
                <Link to="/about" className="footer-glow__link">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/about" className="footer-glow__link">
                  Sustainability
                </Link>
              </li>
              <li>
                <Link to="/about" className="footer-glow__link">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/contact" className="footer-glow__link">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/admin" className="footer-glow__link">
                  Admin Suite
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="footer-glow__col-title mb-4 text-xs font-semibold tracking-widest uppercase">
              Customer Care
            </div>
            <ul className="footer-glow__list space-y-2.5">
              <li>
                <Link to="/contact" className="footer-glow__link">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link to="/contact" className="footer-glow__link">
                  Easy Returns
                </Link>
              </li>
              <li>
                <Link to="/contact" className="footer-glow__link">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/contact" className="footer-glow__link">
                  Care Guide
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      {/* Copyright */}
      <div className="footer-glow__copyright relative z-10 mt-10 text-center text-xs">
        <span>&copy; {currentYear} {brandName}. All rights reserved.</span>
      </div>
    </footer>
  );
}

// Export as both default and named alias so any import style succeeds
export { FooterGlow as Footer };
