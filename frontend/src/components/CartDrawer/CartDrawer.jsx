import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './CartDrawer.css';

function CartItem({ item }) {
  const { removeFromCart, updateQuantity } = useCart();

  return (
    <div className="cart-item">
      <div className="cart-item__image-wrap">
        <img
          src={item.product.image}
          alt={item.product.name}
          className="cart-item__image"
        />
      </div>
      <div className="cart-item__info">
        <p className="cart-item__category">{item.product.category}</p>
        <h4 className="cart-item__name">{item.product.name}</h4>
        {item.variant && (
          <p className="cart-item__variant">{item.variant.label}</p>
        )}
        <p className="cart-item__price">
          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
        </p>
        <div className="cart-item__controls">
          <div className="cart-item__qty" role="group" aria-label="Quantity">
            <button
              className="cart-item__qty-btn"
              onClick={() => updateQuantity(item.key, item.quantity - 1)}
              aria-label="Decrease quantity"
            >
              <Minus size={12} strokeWidth={2.5} />
            </button>
            <span className="cart-item__qty-value">{item.quantity}</span>
            <button
              className="cart-item__qty-btn"
              onClick={() => updateQuantity(item.key, item.quantity + 1)}
              aria-label="Increase quantity"
            >
              <Plus size={12} strokeWidth={2.5} />
            </button>
          </div>
          <button
            className="cart-item__remove"
            onClick={() => removeFromCart(item.key)}
            aria-label={`Remove ${item.product.name}`}
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, cartTotal, isEmpty } = useCart();

  return (
    <>
      {/* Backdrop */}
      {isDrawerOpen && (
        <div
          className="overlay cart-drawer__backdrop"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`cart-drawer${isDrawerOpen ? ' cart-drawer--open' : ''}`}
        aria-label="Shopping bag"
        aria-hidden={!isDrawerOpen}
      >
        {/* Header */}
        <div className="cart-drawer__header">
          <div className="cart-drawer__title-group">
            <ShoppingBag size={20} strokeWidth={1.5} />
            <h2 className="cart-drawer__title">Your Bag</h2>
          </div>
          <button
            className="cart-drawer__close"
            onClick={closeDrawer}
            aria-label="Close shopping bag"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="cart-drawer__body">
          {isEmpty ? (
            <div className="cart-drawer__empty">
              <ShoppingBag size={48} strokeWidth={1} className="cart-drawer__empty-icon" />
              <p className="cart-drawer__empty-title">Your bag is empty</p>
              <p className="cart-drawer__empty-text">
                Your bag is waiting for something beautiful.
              </p>
              <button
                className="btn btn-primary"
                onClick={closeDrawer}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="cart-drawer__items">
              {items.map((item) => (
                <li key={item.key}>
                  <CartItem item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — only when cart has items */}
        {!isEmpty && (
          <div className="cart-drawer__footer">
            <div className="cart-drawer__subtotal">
              <span>Subtotal</span>
              <span className="cart-drawer__total-price">
                ₹{cartTotal.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="cart-drawer__shipping-note">
              Shipping calculated at checkout.
            </p>
            <Link
              to="/checkout"
              className="btn btn-primary btn-full"
              onClick={closeDrawer}
            >
              Proceed to Checkout
            </Link>
            <button
              className="btn btn-ghost btn-full"
              onClick={closeDrawer}
            >
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
