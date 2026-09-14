import { Link } from 'react-router-dom';
import logoImg from '../../assets/footer-logo.png';
import PaymentStrip from '../PaymentStrip/PaymentStrip';
import './Footer.css';

export default function FooterGlow({
  brandName = "Jewels 'n' Joys",
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
                alt="Jewels 'n' Joys"
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
              href="https://www.instagram.com/jewelsnjoys?stkn=MXV0eXZlODBkd3p2eg=="
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
              href="https://www.snapchat.com/add/arohi0770?share_id=lBy9FtFmH1A&locale=en-US"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Snapchat"
              className="footer-glow__social-link"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.002 2c-3.792 0-6.22 2.825-6.22 6.012 0 .866.24 1.777.625 2.533-.178.077-.417.185-.694.316-.62.296-1.127.537-1.168.917-.034.315.176.621.57.834.615.333 1.472.484 1.96.53.076.425.26 1.157.659 1.748-.686.23-1.688.627-1.996 1.442-.142.378-.052.793.24 1.127.34.389.967.65 1.724.717.378.033.784-.007 1.189-.047.33-.033.666-.066 1.002-.023.468.06.944.408 1.482.802.73.535 1.58 1.159 2.628 1.159.006 0 .012 0 .018 0 1.047 0 1.897-.624 2.628-1.159.537-.394 1.014-.742 1.482-.802.336-.043.671-.01 1.002.023.405.04.811.08 1.189.047.757-.067 1.384-.328 1.724-.717.292-.334.382-.749.24-1.127-.308-.815-1.31-1.212-1.996-1.442.399-.591.583-1.323.659-1.748.488-.046 1.345-.197 1.96-.53.394-.213.604-.519.57-.834-.041-.38-.548-.621-1.168-.917-.277-.131-.516-.239-.694-.316.385-.756.625-1.667.625-2.533C18.222 4.825 15.794 2 12.002 2z" />
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
                <Link to="/contact" className="footer-glow__link">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="footer-glow__col-title mb-4 text-xs font-semibold tracking-widest uppercase">
              Customer Care &amp; Legal
            </div>
            <ul className="footer-glow__list space-y-2.5">
              <li>
                <Link to="/shipping-policy" className="footer-glow__link">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link to="/return-policy" className="footer-glow__link">
                  Return &amp; Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="footer-glow__link">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/orders" className="footer-glow__link">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/faq" className="footer-glow__link">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      {/* Secure Payment Methods Strip */}
      <PaymentStrip className="footer-payment-strip" showCod={true} showTitle={true} />

      {/* Copyright & Legal Links */}
      <div className="footer-glow__copyright relative z-10 mt-10 text-center text-xs flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
        <span>&copy; {currentYear} {brandName}. All rights reserved.</span>
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <Link to="/privacy-policy" className="hover:underline">Privacy</Link>
          <span>•</span>
          <Link to="/return-policy" className="hover:underline">Returns</Link>
          <span>•</span>
          <Link to="/shipping-policy" className="hover:underline">Shipping</Link>
        </div>
      </div>
    </footer>
  );
}

// Export as both default and named alias so any import style succeeds
export { FooterGlow as Footer };
