import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { orderApi } from '../../services/api';
import './Checkout.css';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli',
  'Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
];

export default function Checkout() {
  const { items, cartTotal, isEmpty, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState('');
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState({ type: '', text: '' });
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', postalCode: '',
  });

  const rawShipping = cartTotal >= 999 ? 0 : 80;
  const discountAmount = Math.round((cartTotal * appliedDiscount) / 100);
  const total = Math.max(0, cartTotal - discountAmount + rawShipping);
  const amountForFreeShipping = Math.max(0, 999 - cartTotal);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'WELCOME10' || code === 'JEWELS10') {
      setAppliedDiscount(10);
      setCouponMsg({ type: 'success', text: '10% luxury discount applied!' });
    } else if (code === 'GOLD5') {
      setAppliedDiscount(5);
      setCouponMsg({ type: 'success', text: '5% member discount applied!' });
    } else {
      setCouponMsg({ type: 'error', text: 'Invalid coupon code. Try WELCOME10' });
    }
  };

  const handleCopyOrder = () => {
    if (confirmedOrderNumber) {
      navigator.clipboard.writeText(confirmedOrderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const paymentLabel =
        paymentMethod === 'upi'
          ? 'UPI / QR Code'
          : paymentMethod === 'cod'
          ? 'Cash on Delivery (COD)'
          : 'Credit / Debit Card';

      const orderPayload = {
        customer_name: `${form.firstName} ${form.lastName}`.trim() || 'Valued Customer',
        customer_email: form.email,
        customer_phone: form.phone,
        shipping_address: form.address,
        city: form.city,
        state: form.state,
        postal_code: form.postalCode,
        payment_method: paymentLabel,
        items: items.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          image_url: item.product.primary_image_url || item.product.image || `/products/${item.product.id}/1.jpeg`,
        })),
      };

      const res = await orderApi.create(orderPayload);
      setConfirmedOrderNumber(res.order_number);
    } catch (err) {
      console.error('Order creation error:', err);
      // Fallback local order number
      setConfirmedOrderNumber(`ORD-${Math.floor(10000 + Math.random() * 90000)}`);
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
      clearCart();
    }
  };

  if (isEmpty && !submitted) {
    return (
      <div className="checkout-empty">
        <div className="container">
          <div className="checkout-empty__card">
            <div className="checkout-empty__badge">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            <h1 className="checkout-empty__title">Your Bag is Empty</h1>
            <p className="checkout-empty__desc">
              Explore our anti-tarnish, water-resistant luxury jewellery and discover pieces crafted to dazzle every moment.
            </p>
            <Link to="/shop" className="btn btn-primary btn-lg">
              Explore Collection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="checkout-success">
        <div className="container">
          <div className="checkout-success__card">
            <div className="checkout-success__icon-seal">
              <span className="checkout-success__sparkle">✦</span>
            </div>
            
            <span className="checkout-success__pill">Order Confirmed</span>
            <h1 className="checkout-success__title">Thank You, {form.firstName || 'Valued Client'}!</h1>
            
            <p className="checkout-success__sub">
              Your order has been placed with <strong>Jewels &apos;n&apos; Joys</strong>. We are hand-packing your jewellery with care.
            </p>

            <div className="checkout-success__reference-box">
              <div className="checkout-success__ref-info">
                <span className="checkout-success__ref-label">Order Reference</span>
                <span className="checkout-success__ref-value">{confirmedOrderNumber}</span>
              </div>
              <button 
                type="button" 
                className="checkout-success__copy-btn"
                onClick={handleCopyOrder}
                aria-label="Copy order reference"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {form.address && (
              <div className="checkout-success__delivery-preview">
                <div className="checkout-success__dp-item">
                  <strong>Delivering To:</strong>
                  <span>{form.address}, {form.city}, {form.state} - {form.postalCode}</span>
                </div>
                <div className="checkout-success__dp-item">
                  <strong>Updates sent to:</strong>
                  <span>{form.email || form.phone}</span>
                </div>
              </div>
            )}

            <div className="checkout-success__trust-bar">
              <span>✦ Anti-Tarnish Guarantee</span>
              <span>✦ Premium Velvet Gift Box</span>
              <span>✦ Express Dispatch</span>
            </div>

            <div className="checkout-success__actions">
              <a
                href={`https://wa.me/919457650897?text=${encodeURIComponent(
                  `Hello Jewels 'n' Joys! I just placed order ${confirmedOrderNumber}. Could you share delivery updates?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold btn-lg checkout-success__wa-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.311.045-.698.034-1.84-.44-1.458-.605-2.39-2.083-2.463-2.181-.072-.097-.591-.786-.591-1.498 0-.713.374-1.063.507-1.209.133-.146.29-.182.387-.182s.193.003.277.008c.088.005.207-.033.324.249.121.289.412 1.004.448 1.077.036.073.06.158.012.255-.049.097-.073.158-.145.242-.073.085-.153.19-.219.255-.073.072-.149.15-.064.296.085.145.378.623.811 1.009.558.497 1.028.651 1.174.723.145.073.23.06.315-.036.085-.097.364-.424.461-.57.097-.145.194-.121.327-.073.133.048.847.399.992.472.145.073.242.109.278.17.036.06.036.35-.108.755z"/>
                </svg>
                Track via WhatsApp
              </a>
              <Link to="/shop" className="btn btn-primary btn-lg">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* Mobile Top Order Summary Bar */}
      <div className="checkout-mobile-bar">
        <button
          type="button"
          className="checkout-mobile-bar__toggle"
          onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
          aria-expanded={isMobileSummaryOpen}
        >
          <div className="checkout-mobile-bar__left">
            <span className="checkout-mobile-bar__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </span>
            <span className="checkout-mobile-bar__label">
              {isMobileSummaryOpen ? 'Hide order summary' : 'Show order summary'}
            </span>
            <span className={`checkout-mobile-bar__chevron ${isMobileSummaryOpen ? 'open' : ''}`}>
              ▾
            </span>
          </div>
          <span className="checkout-mobile-bar__total">
            ₹{total.toLocaleString('en-IN')}
          </span>
        </button>

        {/* Mobile Accordion Content */}
        {isMobileSummaryOpen && (
          <div className="checkout-mobile-dropdown">
            <div className="checkout-mobile-dropdown__inner">
              <ul className="checkout-summary__items">
                {items.map((item) => (
                  <li key={item.key} className="checkout-summary__item">
                    <div className="checkout-summary__img-wrap">
                      <img src={item.product.image} alt={item.product.name} />
                      <span className="checkout-summary__qty">{item.quantity}</span>
                    </div>
                    <div className="checkout-summary__item-info">
                      <p className="checkout-summary__item-name">{item.product.name}</p>
                      {item.variant && (
                        <p className="checkout-summary__item-variant">{item.variant.label}</p>
                      )}
                    </div>
                    <p className="checkout-summary__item-price">
                      ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="checkout-summary__totals">
                <div className="checkout-summary__row">
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="checkout-summary__row checkout-summary__row--discount">
                    <span>Discount ({appliedDiscount}%)</span>
                    <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="checkout-summary__row">
                  <span>Standard Shipping</span>
                  <span>{rawShipping === 0 ? <strong className="free-shipping-tag">FREE</strong> : `₹${rawShipping}`}</span>
                </div>
                <div className="checkout-summary__row checkout-summary__row--total">
                  <span>Total Due</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="container">
        <div className="checkout-page__header">
          <div className="checkout-page__breadcrumbs">
            <Link to="/shop" className="checkout-page__back">
              ← Return to Jewellery
            </Link>
          </div>
          <div className="checkout-page__badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7z"/>
            </svg>
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>

        <div className="checkout-layout">
          {/* Main Form Column */}
          <div className="checkout-form-col">
            <form className="checkout-form" onSubmit={handleSubmit} noValidate>

              {/* Step 1: Customer Contact */}
              <section className="checkout-section">
                <div className="checkout-section__header">
                  <span className="checkout-section__step">1</span>
                  <div className="checkout-section__title-group">
                    <h2 className="checkout-section__title">Contact Information</h2>
                    <p className="checkout-section__subtitle">We will send your order confirmation and dispatch updates here</p>
                  </div>
                </div>

                <div className="checkout-form__row">
                  <div className="checkout-field">
                    <label htmlFor="firstName" className="checkout-field__label">
                      First Name <span className="req">*</span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      autoComplete="given-name"
                      className="checkout-field__input"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="e.g. Priya"
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="lastName" className="checkout-field__label">
                      Last Name <span className="req">*</span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      autoComplete="family-name"
                      className="checkout-field__input"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="e.g. Sharma"
                    />
                  </div>
                </div>

                <div className="checkout-form__row">
                  <div className="checkout-field">
                    <label htmlFor="email" className="checkout-field__label">
                      Email Address <span className="req">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="checkout-field__input"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="phone" className="checkout-field__label">
                      Mobile Number <span className="req">*</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      required
                      autoComplete="tel"
                      className="checkout-field__input"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </section>

              {/* Step 2: Shipping Address */}
              <section className="checkout-section">
                <div className="checkout-section__header">
                  <span className="checkout-section__step">2</span>
                  <div className="checkout-section__title-group">
                    <h2 className="checkout-section__title">Delivery Address</h2>
                    <p className="checkout-section__subtitle">Direct courier delivery to your doorstep</p>
                  </div>
                </div>

                <div className="checkout-field">
                  <label htmlFor="address" className="checkout-field__label">
                    Flat, House no., Street, Area <span className="req">*</span>
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    required
                    autoComplete="street-address"
                    className="checkout-field__input"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="House / Flat no., Landmark, Street"
                  />
                </div>

                <div className="checkout-form__row">
                  <div className="checkout-field">
                    <label htmlFor="city" className="checkout-field__label">
                      City / Town <span className="req">*</span>
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      required
                      autoComplete="address-level2"
                      className="checkout-field__input"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="e.g. Mumbai"
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="postalCode" className="checkout-field__label">
                      PIN Code <span className="req">*</span>
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoComplete="postal-code"
                      className="checkout-field__input"
                      value={form.postalCode}
                      onChange={handleChange}
                      placeholder="6-digit PIN"
                    />
                  </div>
                </div>

                <div className="checkout-field">
                  <label htmlFor="state" className="checkout-field__label">
                    State / Union Territory <span className="req">*</span>
                  </label>
                  <div className="checkout-select-wrapper">
                    <select
                      id="state"
                      name="state"
                      required
                      className="checkout-field__input checkout-field__select"
                      value={form.state}
                      onChange={handleChange}
                    >
                      <option value="">Select State / UT</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <span className="checkout-select-arrow">▾</span>
                  </div>
                </div>
              </section>

              {/* Step 3: Payment Method Selection */}
              <section className="checkout-section">
                <div className="checkout-section__header">
                  <span className="checkout-section__step">3</span>
                  <div className="checkout-section__title-group">
                    <h2 className="checkout-section__title">Payment Method</h2>
                    <p className="checkout-section__subtitle">Choose your preferred payment method</p>
                  </div>
                </div>

                <div className="checkout-payment-options">
                  <label className={`checkout-pay-option ${paymentMethod === 'upi' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={() => setPaymentMethod('upi')}
                    />
                    <div className="checkout-pay-option__content">
                      <div className="checkout-pay-option__top">
                        <span className="checkout-pay-option__name">UPI / QR Code (Instant)</span>
                        <span className="checkout-pay-option__tag">Popular</span>
                      </div>
                      <p className="checkout-pay-option__desc">
                        Google Pay, PhonePe, Paytm, BHIM or any banking app.
                      </p>
                    </div>
                  </label>

                  <label className={`checkout-pay-option ${paymentMethod === 'cod' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                    />
                    <div className="checkout-pay-option__content">
                      <div className="checkout-pay-option__top">
                        <span className="checkout-pay-option__name">Cash on Delivery (COD)</span>
                      </div>
                      <p className="checkout-pay-option__desc">
                        Pay cash or UPI directly to delivery agent at your door.
                      </p>
                    </div>
                  </label>

                  <label className={`checkout-pay-option ${paymentMethod === 'card' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                    />
                    <div className="checkout-pay-option__content">
                      <div className="checkout-pay-option__top">
                        <span className="checkout-pay-option__name">Debit / Credit Card / NetBanking</span>
                      </div>
                      <p className="checkout-pay-option__desc">
                        Visa, Mastercard, RuPay & All Major Indian Banks.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="checkout-payment-note">
                  <div className="checkout-payment-note__icon">✦</div>
                  <p>
                    <strong>Seamless Concierge Support:</strong> After placing your order, you will receive an instant verification message on WhatsApp & Email with live tracking and seamless payment confirmation.
                  </p>
                </div>
              </section>

              {/* Trust assurances strip */}
              <div className="checkout-trust-row">
                <div className="checkout-trust-pill">
                  <span className="checkout-trust-pill__icon">✦</span>
                  <span>100% Anti-Tarnish</span>
                </div>
                <div className="checkout-trust-pill">
                  <span className="checkout-trust-pill__icon">✦</span>
                  <span>Free Shipping over ₹999</span>
                </div>
                <div className="checkout-trust-pill">
                  <span className="checkout-trust-pill__icon">✦</span>
                  <span>Discreet Luxury Packaging</span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="checkout-cta-wrap">
                <button
                  type="submit"
                  className="btn btn-gold btn-lg btn-full checkout-submit-btn"
                  id="place-order-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="checkout-spinner-label">Securing your order...</span>
                  ) : (
                    <span>Confirm Order • ₹{total.toLocaleString('en-IN')}</span>
                  )}
                </button>
                <p className="checkout-guarantee-micro">
                  🔒 By completing your order, you agree to our Terms and Guarantee.
                </p>
              </div>
            </form>
          </div>

          {/* Desktop Order Summary Column */}
          <aside className="checkout-summary" aria-label="Order summary">
            <div className="checkout-summary__header">
              <h2 className="checkout-summary__title">Order Summary</h2>
              <span className="checkout-summary__count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
            </div>

            {/* Free shipping progress bar */}
            <div className="checkout-shipping-banner">
              {amountForFreeShipping > 0 ? (
                <>
                  <p className="checkout-shipping-text">
                    Add <strong>₹{amountForFreeShipping.toLocaleString('en-IN')}</strong> more for <strong>FREE Delivery</strong>
                  </p>
                  <div className="checkout-progress-track">
                    <div 
                      className="checkout-progress-bar"
                      style={{ width: `${Math.min(100, Math.round((cartTotal / 999) * 100))}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="checkout-shipping-unlocked">
                  <span>✦</span> You have unlocked <strong>FREE Express Shipping</strong>!
                </div>
              )}
            </div>

            <ul className="checkout-summary__items">
              {items.map((item) => (
                <li key={item.key} className="checkout-summary__item">
                  <div className="checkout-summary__img-wrap">
                    <img src={item.product.image} alt={item.product.name} />
                    <span className="checkout-summary__qty">{item.quantity}</span>
                  </div>
                  <div className="checkout-summary__item-info">
                    <p className="checkout-summary__item-name">{item.product.name}</p>
                    {item.variant && (
                      <p className="checkout-summary__item-variant">{item.variant.label}</p>
                    )}
                  </div>
                  <p className="checkout-summary__item-price">
                    ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                  </p>
                </li>
              ))}
            </ul>

            {/* Coupon field */}
            <form className="checkout-coupon-box" onSubmit={handleApplyCoupon}>
              <div className="checkout-coupon-row">
                <input
                  type="text"
                  className="checkout-coupon-input"
                  placeholder="Discount code (e.g. WELCOME10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <button type="submit" className="checkout-coupon-btn">
                  Apply
                </button>
              </div>
              {couponMsg.text && (
                <p className={`checkout-coupon-msg ${couponMsg.type}`}>
                  {couponMsg.text}
                </p>
              )}
            </form>

            <div className="checkout-summary__totals">
              <div className="checkout-summary__row">
                <span>Subtotal</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="checkout-summary__row checkout-summary__row--discount">
                  <span>Special Discount ({appliedDiscount}%)</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="checkout-summary__row">
                <span>Shipping</span>
                <span>{rawShipping === 0 ? <strong className="free-shipping-tag">FREE</strong> : `₹${rawShipping}`}</span>
              </div>
              <div className="checkout-summary__row checkout-summary__row--total">
                <div>
                  <span>Total</span>
                  <small className="checkout-vat-note">Inclusive of all taxes</small>
                </div>
                <span className="checkout-total-val">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Desktop Trust Card */}
            <div className="checkout-guarantee-card">
              <div className="checkout-guarantee-card__header">
                <span className="checkout-guarantee-card__star">✦</span>
                <span className="checkout-guarantee-card__title">The Jewels &apos;n&apos; Joys Promise</span>
              </div>
              <p className="checkout-guarantee-card__text">
                Every jewellery piece is forged in skin-friendly 18K gold-plated stainless steel, crafted to resist water, perfume, and daily wear without tarnishing.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
