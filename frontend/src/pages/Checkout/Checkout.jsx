import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
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
  const { items, cartTotal, isEmpty } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', postalCode: '',
  });

  const shipping = cartTotal >= 999 ? 0 : 80;
  const total = cartTotal + shipping;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (isEmpty) {
    return (
      <div className="checkout-empty">
        <div className="container">
          <h1 className="checkout-empty__title">Your bag is empty</h1>
          <p className="checkout-empty__desc">Add some pieces before checking out.</p>
          <Link to="/shop" className="btn btn-primary btn-lg">Shop Now</Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="checkout-success">
        <div className="container">
          <div className="checkout-success__card">
            <div className="checkout-success__icon">✦</div>
            <h1 className="checkout-success__title">Thank You!</h1>
            <p className="checkout-success__note">
              Checkout functionality will be connected to the payment and order system in the next phase.
            </p>
            <p className="checkout-success__subtext">
              Your order details have been received. Our team will reach out shortly once payment integration is complete.
            </p>
            <Link to="/shop" className="btn btn-primary btn-lg">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="checkout-page__header">
          <h1 className="checkout-page__title">Checkout</h1>
          <Link to="/shop" className="checkout-page__back">← Continue Shopping</Link>
        </div>

        <div className="checkout-layout">
          {/* Form */}
          <div className="checkout-form-col">
            <form className="checkout-form" onSubmit={handleSubmit} noValidate>

              <section className="checkout-section">
                <h2 className="checkout-section__title">Contact Information</h2>
                <div className="checkout-form__row">
                  <div className="checkout-field">
                    <label htmlFor="firstName" className="checkout-field__label">First Name</label>
                    <input
                      id="firstName" name="firstName" type="text" required
                      className="checkout-field__input"
                      value={form.firstName} onChange={handleChange}
                      placeholder="Priya"
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="lastName" className="checkout-field__label">Last Name</label>
                    <input
                      id="lastName" name="lastName" type="text" required
                      className="checkout-field__input"
                      value={form.lastName} onChange={handleChange}
                      placeholder="Sharma"
                    />
                  </div>
                </div>
                <div className="checkout-field">
                  <label htmlFor="email" className="checkout-field__label">Email Address</label>
                  <input
                    id="email" name="email" type="email" required
                    className="checkout-field__input"
                    value={form.email} onChange={handleChange}
                    placeholder="priya@example.com"
                  />
                </div>
                <div className="checkout-field">
                  <label htmlFor="phone" className="checkout-field__label">Phone Number</label>
                  <input
                    id="phone" name="phone" type="tel" required
                    className="checkout-field__input"
                    value={form.phone} onChange={handleChange}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </section>

              <section className="checkout-section">
                <h2 className="checkout-section__title">Delivery Address</h2>
                <div className="checkout-field">
                  <label htmlFor="address" className="checkout-field__label">Street Address</label>
                  <input
                    id="address" name="address" type="text" required
                    className="checkout-field__input"
                    value={form.address} onChange={handleChange}
                    placeholder="12 MG Road, Koramangala"
                  />
                </div>
                <div className="checkout-form__row">
                  <div className="checkout-field">
                    <label htmlFor="city" className="checkout-field__label">City</label>
                    <input
                      id="city" name="city" type="text" required
                      className="checkout-field__input"
                      value={form.city} onChange={handleChange}
                      placeholder="Bengaluru"
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="postalCode" className="checkout-field__label">Postal Code</label>
                    <input
                      id="postalCode" name="postalCode" type="text" required
                      className="checkout-field__input"
                      value={form.postalCode} onChange={handleChange}
                      placeholder="560034"
                    />
                  </div>
                </div>
                <div className="checkout-field">
                  <label htmlFor="state" className="checkout-field__label">State</label>
                  <select
                    id="state" name="state" required
                    className="checkout-field__input checkout-field__select"
                    value={form.state} onChange={handleChange}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </section>

              <div className="checkout-payment-note">
                <p>
                  <strong>Payment:</strong> Payment gateway integration (Razorpay) will be added in the next phase.
                  Place your order now and we will contact you to complete payment.
                </p>
              </div>

              <button type="submit" className="btn btn-primary btn-lg btn-full" id="place-order-btn">
                Place Order
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <aside className="checkout-summary" aria-label="Order summary">
            <h2 className="checkout-summary__title">Order Summary</h2>
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
              <div className="checkout-summary__row">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
              </div>
              {shipping > 0 && (
                <p className="checkout-summary__free-note">
                  Add ₹{(999 - cartTotal).toLocaleString('en-IN')} more for free shipping
                </p>
              )}
              <div className="checkout-summary__row checkout-summary__row--total">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
