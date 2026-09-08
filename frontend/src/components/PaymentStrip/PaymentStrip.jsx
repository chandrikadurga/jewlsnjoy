import React from 'react';
import './PaymentStrip.css';

export const UpiCardIcon = () => (
  <span className="pay-card pay-card--upi" title="UPI (Google Pay, PhonePe, Paytm, BHIM)">
    <svg width="46" height="28" viewBox="0 0 46 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="UPI">
      <rect width="46" height="28" rx="5" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
      <g transform="translate(5.5, 6.5)">
        <text x="0" y="11.5" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="12" fontWeight="900" fontStyle="italic" fill="#4B5563" letterSpacing="0.4">UPI</text>
        <path d="M24 2.5L21.5 13H24L26.5 2.5H24Z" fill="#F47920" />
        <path d="M27.5 2.5L25 13H27.5L30 2.5H27.5Z" fill="#0F8B44" />
      </g>
    </svg>
  </span>
);

export const VisaCardIcon = () => (
  <span className="pay-card pay-card--visa" title="Visa Credit & Debit Cards">
    <svg width="46" height="28" viewBox="0 0 46 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
      <rect width="46" height="28" rx="5" fill="#0A50A1" />
      <g transform="translate(6.5, 7.5)">
        <text x="0" y="11.5" fontFamily="'Arial Black', -apple-system, sans-serif" fontSize="11.5" fontWeight="900" fontStyle="italic" fill="#FFFFFF" letterSpacing="1.2">VISA</text>
      </g>
    </svg>
  </span>
);

export const MastercardIcon = () => (
  <span className="pay-card pay-card--mastercard" title="Mastercard Credit & Debit Cards">
    <svg width="46" height="28" viewBox="0 0 46 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
      <rect width="46" height="28" rx="5" fill="#18181B" />
      <circle cx="18" cy="14" r="6.8" fill="#EB001B" />
      <circle cx="28" cy="14" r="6.8" fill="#F79E1B" />
      <path d="M23 8.9A6.78 6.78 0 0 0 20.5 14c0 1.9 0.8 3.6 2.5 4.8 1.7-1.2 2.5-2.9 2.5-4.8 0-1.9-0.8-3.6-2.5-4.8Z" fill="#FF5F00" />
    </svg>
  </span>
);

export const PlusMoreIcon = ({ count = 8 }) => (
  <span className="pay-card pay-card--more" title="RuPay, American Express, NetBanking, Wallets, and more">
    +{count}
  </span>
);

export default function PaymentStrip({ showCod = true, showTitle = true, className = '' }) {
  return (
    <div className={`payment-assurance-strip ${className}`} aria-label="Accepted payment methods">
      {showTitle && (
        <div className="payment-assurance-strip__header">
          <svg className="payment-assurance-strip__lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="payment-assurance-strip__title">Secure Payments</span>
        </div>
      )}
      <div className="payment-assurance-strip__cards">
        <UpiCardIcon />
        <VisaCardIcon />
        <MastercardIcon />
        <PlusMoreIcon count={8} />
        {showCod && (
          <>
            <span className="payment-assurance-strip__sep" aria-hidden="true">•</span>
            <span className="payment-assurance-strip__cod-badge" title="Cash on Delivery available on eligible orders">
              <span className="cod-badge__icon">📦</span>
              <span className="cod-badge__text">Cash on Delivery</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
