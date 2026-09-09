import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { orderApi, shippingApi } from '../../services/api';
import paymentService from '../../services/paymentService';
import { UpiCardIcon, VisaCardIcon, MastercardIcon, PlusMoreIcon } from '../../components/PaymentStrip/PaymentStrip';
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
  const { user, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState('');
  const [confirmedPaymentId, setConfirmedPaymentId] = useState('');
  const [confirmedPaymentMethod, setConfirmedPaymentMethod] = useState('');
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code: 'JOY30', type: 'flat', value: 30 }
  const [couponMsg, setCouponMsg] = useState({ type: '', text: '' });
  const [copied, setCopied] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({
    active_provider: 'razorpay',
    razorpay: { key_id: '', environment: 'test', is_configured: false }
  });
  const [razorpayConfig, setRazorpayConfig] = useState({ key_id: '', environment: 'test', is_configured: false });
  const [orderError, setOrderError] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', postalCode: '',
  });

  // Delhivery Pincode Serviceability State
  const [shippingServiceability, setShippingServiceability] = useState(null);
  const [checkingServiceability, setCheckingServiceability] = useState(false);

  // Check Delhivery serviceability when a valid 6-digit Indian PIN code is entered
  useEffect(() => {
    const pin = (form.postalCode || '').trim();
    if (/^[1-9][0-9]{5}$/.test(pin)) {
      setCheckingServiceability(true);
      const timer = setTimeout(() => {
        shippingApi.checkServiceability(pin, paymentMethod === 'cod' ? 'COD' : 'Prepaid')
          .then((res) => {
            setShippingServiceability(res);
          })
          .catch(() => {
            setShippingServiceability(null);
          })
          .finally(() => {
            setCheckingServiceability(false);
          });
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setShippingServiceability(null);
      setCheckingServiceability(false);
    }
  }, [form.postalCode, paymentMethod]);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      const fullName = (profile?.full_name || user.user_metadata?.full_name || '').trim();
      const parts = fullName.split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      const phone = profile?.phone || user.user_metadata?.phone || '';
      const email = user.email || '';

      setForm((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: prev.email || email,
        phone: prev.phone || phone,
      }));
    }
  }, [user, profile]);

  const codFee = paymentMethod === 'cod' ? 25 : 0;
  const rawShipping = cartTotal >= 999 ? 0 : 80;

  let discountAmount = 0;
  if (appliedCoupon?.type === 'flat') {
    discountAmount = Math.min(cartTotal, appliedCoupon.value);
  } else if (appliedCoupon?.type === 'percent') {
    discountAmount = Math.round((cartTotal * appliedCoupon.value) / 100);
  }

  const total = Math.max(0, cartTotal - discountAmount + rawShipping + codFee);
  const amountForFreeShipping = Math.max(0, 999 - cartTotal);

  // Pre-fetch payment gateway configuration from backend
  useEffect(() => {
    paymentService.getConfig()
      .then((cfg) => {
        setPaymentConfig(cfg);
        setRazorpayConfig(cfg.razorpay || cfg);
        setPaymentMethod('razorpay');
      })
      .catch((err) => {
        console.warn('Payment gateway config fetch error:', err);
        setPaymentMethod('razorpay');
      });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const applyCouponCode = (rawCode) => {
    const code = (rawCode || couponCode).trim().toUpperCase();
    if (!code) return;

    if (code === 'JOY30' || code === 'SAVE30' || code === 'FLAT30' || code === 'WELCOME30' || code === 'OFF30' || code === 'SPECIAL30') {
      setAppliedCoupon({ code, type: 'flat', value: 30 });
      setCouponCode(code);
      setCouponMsg({ type: 'success', text: '₹30 flat discount applied successfully!' });
    } else if (code === 'WELCOME10' || code === 'JEWELS10') {
      setAppliedCoupon({ code, type: 'percent', value: 10 });
      setCouponCode(code);
      setCouponMsg({ type: 'success', text: '10% luxury discount applied!' });
    } else if (code === 'GOLD5') {
      setAppliedCoupon({ code, type: 'percent', value: 5 });
      setCouponCode(code);
      setCouponMsg({ type: 'success', text: '5% member discount applied!' });
    } else {
      setCouponMsg({ type: 'error', text: 'Invalid coupon code. Try JOY30' });
    }
  };

  const handleApplyCoupon = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    applyCouponCode(couponCode);
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

    // Validate essential fields
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.postalCode.trim() ||
      !form.state
    ) {
      alert('Please fill out all required delivery and contact fields.');
      return;
    }

    setOrderError('');
    setIsSubmitting(true);

    // Auto-normalize email (e.g. if user types s@gmailcom without a dot)
    let cleanEmail = form.email.trim().toLowerCase();
    if (cleanEmail.includes('@')) {
      const parts = cleanEmail.split('@');
      if (parts.length === 2 && !parts[1].includes('.')) {
        cleanEmail = `${parts[0]}@${parts[1]}.com`;
      }
    }

    const baseOrderPayload = {
      customer_name: `${form.firstName} ${form.lastName}`.trim(),
      customer_email: cleanEmail,
      customer_phone: form.phone,
      shipping_address: form.address,
      city: form.city,
      state: form.state,
      postal_code: form.postalCode,
      total_amount: total,
      notes: appliedCoupon?.code ? `Coupon: ${appliedCoupon.code} (-₹${discountAmount})` : '',
      items: items.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image_url: item.product.primary_image_url || item.product.image || `/products/${item.product.id}/1.jpeg`,
      })),
    };

    const getErrorText = (err) => {
      if (err.response?.data) {
        const d = err.response.data;
        if (typeof d === 'string') return d;
        if (d.error) return typeof d.error === 'string' ? d.error : JSON.stringify(d.error);
        if (d.message) return typeof d.message === 'string' ? d.message : JSON.stringify(d.message);
        if (d.detail) return typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail);
        if (typeof d === 'object') {
          return Object.entries(d)
            .map(([k, v]) => {
              if (Array.isArray(v)) {
                return `${k}: ${v.map((x) => {
                  if (typeof x === 'object' && x !== null) {
                    return x.non_field_errors?.join(' ') || Object.values(x).flat().join(' ') || JSON.stringify(x);
                  }
                  return x;
                }).join(' ')}`;
              }
              return `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`;
            })
            .join(' | ');
        }
      }
      return err.message || 'Server connection issue. Please make sure the Django backend is running on port 8000.';
    };

    // ── Cash On Delivery Path ─────────────────────────────────────────
    if (paymentMethod === 'cod') {
      try {
        const res = await orderApi.create({
          ...baseOrderPayload,
          payment_method: 'Cash on Delivery (COD)',
          payment_status: 'Pending',
        });
        setConfirmedOrderNumber(res.order_number);
        setConfirmedPaymentMethod('Cash on Delivery (COD)');
        setConfirmedPaymentId('');
        setSubmitted(true);
        clearCart();
      } catch (err) {
        console.error('COD Order creation error:', err);
        const msg = getErrorText(err);
        setOrderError(`Could not save order to database: ${msg}`);
        alert(`Order could not be saved to server: ${msg}`);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // ── Razorpay Online Payment Path ──────────────────────────────────
    try {
      const checkoutPayload = {
        customer_name: `${form.firstName} ${form.lastName}`.trim(),
        customer_email: cleanEmail,
        customer_phone: form.phone,
        shipping_address: form.address,
        city: form.city,
        state: form.state,
        postal_code: form.postalCode,
        country: 'India',
        coupon_code: appliedCoupon?.code || couponCode.trim().toUpperCase(),
        notes: appliedCoupon?.code ? `Coupon: ${appliedCoupon.code} (-₹${discountAmount})` : (couponCode ? `Coupon applied: ${couponCode}` : ''),
        items: items.map((item) => ({
          id: Number(item.product?.id || item.id),
          product_id: Number(item.product?.id || item.id),
          quantity: Number(item.quantity || 1),
        })),
      };

      const rzpOrder = await paymentService.createPaymentOrder(checkoutPayload);

      const rzpOrderId = rzpOrder?.order_id || rzpOrder?.razorpay_order_id;
      if (!rzpOrder || !rzpOrderId) {
        throw new Error(rzpOrder?.error || 'Failed to initialize payment order with Razorpay.');
      }

      const effectiveKeyId = rzpOrder.key_id || razorpayConfig.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!effectiveKeyId) {
        throw new Error('Razorpay public key ID is not configured.');
      }

      let paymentResponse = null;

      // Open Razorpay Standard Checkout Modal
      const checkoutResult = await paymentService.openCheckout({
        keyId: effectiveKeyId,
        orderId: rzpOrderId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || 'INR',
        customerDetails: {
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: cleanEmail,
          phone: form.phone,
        },
        notes: {
          order_number: rzpOrder.order_number,
        },
        onSuccess: (res) => {
          paymentResponse = res;
        },
        onError: (err) => {
          console.warn('Razorpay checkout error callback:', err);
        },
        onDismiss: () => {
          console.info('Razorpay checkout modal closed by user.');
        },
      });

      if (checkoutResult && checkoutResult.error) {
        const errorMsg = checkoutResult.error.description || checkoutResult.error.message || 'Payment was cancelled or failed.';
        setOrderError(errorMsg);
        alert(errorMsg);
        return;
      }

      const payId = paymentResponse?.razorpay_payment_id || checkoutResult?.razorpay_payment_id;
      const ordId = paymentResponse?.razorpay_order_id || checkoutResult?.razorpay_order_id || rzpOrderId;
      const sig = paymentResponse?.razorpay_signature || checkoutResult?.razorpay_signature;

      if (!payId || !sig) {
        // Customer dismissed checkout modal or payment was not completed
        console.info('Razorpay checkout closed or payment incomplete.');
        return;
      }

      // Verify payment authoritatively on Django backend
      const verifyResult = await paymentService.verifyPayment(
        rzpOrder.order_number,
        ordId,
        payId,
        sig
      );

      if (verifyResult && verifyResult.verified && verifyResult.payment_status === 'paid') {
        const orderData = verifyResult.order || {};
        setConfirmedOrderNumber(orderData.order_number || rzpOrder.order_number);
        setConfirmedPaymentMethod('Razorpay');
        setConfirmedPaymentId(orderData.razorpay_payment_id || payId || '');
        setSubmitted(true);
        clearCart();
      } else if (verifyResult && verifyResult.payment_status === 'failed') {
        const failMsg = verifyResult.error || verifyResult.message || 'Payment verification failed. Please try again.';
        setOrderError(failMsg);
        alert(failMsg);
      } else {
        console.info('Payment verification response pending or modal closed.');
      }
    } catch (err) {
      console.error('Razorpay payment processing error:', err);
      const msg = getErrorText(err);
      setOrderError(`Payment processing error: ${msg}`);
      alert(`Payment processing error: ${msg}`);
    } finally {
      setIsSubmitting(false);
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
            
            <span className="checkout-success__pill">
              Order Confirmed
            </span>
            <h1 className="checkout-success__title">Thank You, {form.firstName || 'Valued Client'}!</h1>
            
            <p className="checkout-success__sub">
              Your order has been registered with <strong>Jewels &apos;n&apos; Joys</strong>. We are hand-packing your jewellery with care.
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

            {/* Payment & Delivery Summary Details */}
            <div className="checkout-success__delivery-preview">
              <div className="checkout-success__dp-item">
                <strong>Payment Mode:</strong>
                <span className="checkout-success__pm-badge">
                  {confirmedPaymentMethod || (paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay Secure')}
                  {confirmedPaymentId && <small> (ID: {confirmedPaymentId})</small>}
                </span>
              </div>
              <div className="checkout-success__dp-item">
                <strong>Payment Status:</strong>
                <span style={{ color: confirmedPaymentMethod === 'Cash on Delivery (COD)' ? '#b45309' : '#15803d', fontWeight: 600 }}>
                  {confirmedPaymentMethod === 'Cash on Delivery (COD)' ? 'Pending (Pay upon delivery)' : '✓ Paid & Confirmed'}
                </span>
              </div>
              {form.address && (
                <div className="checkout-success__dp-item">
                  <strong>Delivering To:</strong>
                  <span>{form.address}, {form.city}, {form.state} - {form.postalCode}</span>
                </div>
              )}
              <div className="checkout-success__dp-item">
                <strong>Status Updates:</strong>
                <span>Instant dispatch notification sent to {form.email || form.phone}</span>
              </div>
            </div>

            <div className="checkout-success__trust-bar">
              <span>✦ 100% Anti-Tarnish Guarantee</span>
              <span>✦ Premium Velvet Gift Box</span>
              <span>✦ Express Dispatch</span>
            </div>

            <div className="checkout-success__actions">
              <Link
                to={`/orders/${encodeURIComponent(confirmedOrderNumber)}`}
                className="btn btn-secondary btn-lg"
              >
                Track Order Status
              </Link>
              <a
                href={`https://wa.me/917251070150?text=${encodeURIComponent(
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

              {/* Coupon Offer Recommendation Card */}
              <div className="checkout-coupon-offer">
                <div className="checkout-coupon-offer__left">
                  <span className="checkout-coupon-offer__badge">JOY30</span>
                  <div className="checkout-coupon-offer__text">
                    <strong>Get Flat ₹30 OFF</strong>
                    <span>Use code JOY30 on your order</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`checkout-coupon-offer__btn ${appliedCoupon?.code === 'JOY30' ? 'applied' : ''}`}
                  onClick={() => applyCouponCode('JOY30')}
                >
                  {appliedCoupon?.code === 'JOY30' ? 'Applied ✓' : 'Apply'}
                </button>
              </div>

              {/* Mobile Coupon Form */}
              <form className="checkout-coupon-box" onSubmit={handleApplyCoupon} style={{ marginBottom: '1.25rem' }}>
                <div className="checkout-coupon-row">
                  <input
                    type="text"
                    className="checkout-coupon-input"
                    placeholder="Discount code (e.g. JOY30)"
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
                {discountAmount > 0 && (
                  <div className="checkout-summary__row checkout-summary__row--discount">
                    <span>Discount {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}</span>
                    <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="checkout-summary__row">
                  <span>Standard Shipping</span>
                  <span>{rawShipping === 0 ? <strong className="free-shipping-tag">FREE</strong> : `₹${rawShipping}`}</span>
                </div>
                {paymentMethod === 'cod' && (
                  <div className="checkout-summary__row">
                    <span>COD Charges</span>
                    <span>₹25</span>
                  </div>
                )}
                <div className="checkout-summary__row checkout-summary__row--total">
                  <span>Total Due</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Perks & Benefits Strip (Directly under order summary as circled in user screenshot) */}
      <aside className="checkout-perks-strip" role="region" aria-label="Customer Benefits">
        <div className="checkout-perks-strip__container">
          <div className="checkout-perks-item">
            <span className="checkout-perks-item__icon">🎁</span>
            <span className="checkout-perks-item__text">Free gifts on every order</span>
          </div>
          <span className="checkout-perks-divider">•</span>
          <div className="checkout-perks-item">
            <span className="checkout-perks-item__icon">🚚</span>
            <span className="checkout-perks-item__text">Free delivery on order above 999rs</span>
          </div>
          <span className="checkout-perks-divider">•</span>
          <div className="checkout-perks-item">
            <span className="checkout-perks-item__icon">💳</span>
            <span className="checkout-perks-item__text">COD and Prepaid all payment methods are available</span>
          </div>
        </div>
      </aside>

      <div className="container checkout-container">
        <div className="checkout-page__header">
          <div className="checkout-page__header-left">
            <h1 className="checkout-page__title">Checkout</h1>
            <div className="checkout-page__badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7z"/>
              </svg>
              <span>256-Bit SSL Encrypted & Razorpay Protected</span>
            </div>
          </div>
          <Link to="/shop" className="checkout-page__back">
            — Continue Shopping
          </Link>
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
                      inputMode="email"
                      required
                      autoComplete="email"
                      className="checkout-field__input"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="priya@example.com"
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
                    {checkingServiceability && (
                      <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--color-muted)', marginTop: '4px' }}>
                        Checking Delhivery serviceability...
                      </span>
                    )}
                    {!checkingServiceability && shippingServiceability && (
                      <div style={{ marginTop: '5px', fontSize: '0.76rem', lineHeight: '1.4' }}>
                        {shippingServiceability.serviceable ? (
                          <span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                            <span>✓</span> Delivery available{shippingServiceability.city ? ` to ${shippingServiceability.city}` : ''} via Delhivery
                            {!shippingServiceability.cod_available && (
                              <span style={{ color: '#b45309', marginLeft: '4px' }}>(Prepaid Only)</span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: '#b91c1c', fontWeight: '500' }}>
                            ✕ PIN {form.postalCode} is currently not serviceable.
                          </span>
                        )}
                      </div>
                    )}
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
                    <p className="checkout-section__subtitle">
                      Choose your preferred secure payment method
                    </p>
                  </div>
                </div>

                <div className="checkout-payment-options">
                  {/* Razorpay Online Payment Option */}
                  <label className={`checkout-pay-option ${paymentMethod === 'razorpay' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={() => setPaymentMethod('razorpay')}
                    />
                    <div className="checkout-pay-option__content">
                      <div className="checkout-pay-option__top">
                        <div className="checkout-pay-option__title-row">
                          <span className="checkout-pay-option__name">Pay Online</span>
                          <span className="checkout-pay-option__tag">Recommended</span>
                        </div>
                        <div className="checkout-pay-option__badges-row" style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                          <UpiCardIcon />
                          <VisaCardIcon />
                          <MastercardIcon />
                          <PlusMoreIcon count={8} />
                        </div>
                      </div>
                      <p className="checkout-pay-option__desc">
                        Instant, secure payment powered by Razorpay. Supports Google Pay, PhonePe, Paytm, BHIM, Credit/Debit Cards, and NetBanking.
                      </p>
                    </div>
                  </label>

                  {/* Cash on Delivery Option */}
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
                        <div className="checkout-pay-option__title-row">
                          <span className="checkout-pay-option__name">Cash on Delivery (COD)</span>
                          <span className="checkout-pay-option__tag checkout-pay-option__tag--fee">+ ₹25 Charges</span>
                        </div>
                      </div>
                      <p className="checkout-pay-option__desc">
                        Pay cash or UPI directly to courier upon arrival at your doorstep. (₹25 COD handling charge applies)
                      </p>
                    </div>
                  </label>
                </div>

                <div className="checkout-payment-note">
                  <div className="checkout-payment-note__icon">✦</div>
                  <p>
                    {paymentMethod === 'cod' ? (
                      <>
                        <strong>Cash on Delivery:</strong> Please keep exact cash or UPI app ready for the courier delivery associate.
                      </>
                    ) : (
                      <>
                        <strong>Razorpay 256-Bit Protection:</strong> Payments are processed through Razorpay’s banking-grade encrypted infrastructure. Your payment credentials are never stored on our servers.
                      </>
                    )}
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
                  <span>Verified Merchant</span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="checkout-cta-wrap">
                {orderError && (
                  <div style={{
                    padding: '12px 16px',
                    marginBottom: '16px',
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '13px',
                    lineHeight: '1.5',
                  }}>
                    <strong>Order Error:</strong> {orderError}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-gold btn-lg btn-full checkout-submit-btn"
                  id="place-order-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="checkout-spinner-label">Processing...</span>
                  ) : paymentMethod === 'razorpay' ? (
                    <span>Pay with Razorpay • ₹{total.toLocaleString('en-IN')}</span>
                  ) : (
                    <span>Confirm COD Order • ₹{total.toLocaleString('en-IN')}</span>
                  )}
                </button>
                <p className="checkout-guarantee-micro">
                  🔒 Encrypted with 256-bit SSL. Razorpay Protected.
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

            {/* Coupon Offer Recommendation Card */}
            <div className="checkout-coupon-offer">
              <div className="checkout-coupon-offer__left">
                <span className="checkout-coupon-offer__badge">JOY30</span>
                <div className="checkout-coupon-offer__text">
                  <strong>Get Flat ₹30 OFF</strong>
                  <span>Use code JOY30 on your order</span>
                </div>
              </div>
              <button
                type="button"
                className={`checkout-coupon-offer__btn ${appliedCoupon?.code === 'JOY30' ? 'applied' : ''}`}
                onClick={() => applyCouponCode('JOY30')}
              >
                {appliedCoupon?.code === 'JOY30' ? 'Applied ✓' : 'Apply'}
              </button>
            </div>

            {/* Coupon field */}
            <form className="checkout-coupon-box" onSubmit={handleApplyCoupon}>
              <div className="checkout-coupon-row">
                <input
                  type="text"
                  className="checkout-coupon-input"
                  placeholder="Discount code (e.g. JOY30)"
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
              {discountAmount > 0 && (
                <div className="checkout-summary__row checkout-summary__row--discount">
                  <span>Discount {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="checkout-summary__row">
                <span>Shipping</span>
                <span>{rawShipping === 0 ? <strong className="free-shipping-tag">FREE</strong> : `₹${rawShipping}`}</span>
              </div>
              {paymentMethod === 'cod' && (
                <div className="checkout-summary__row">
                  <span>COD Charges</span>
                  <span>₹25</span>
                </div>
              )}
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
