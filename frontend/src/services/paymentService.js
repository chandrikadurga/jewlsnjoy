import api from './api';
import { supabase } from './supabase';

let cashfreeSdkPromise = null;
let cashfreeInstance = null;

/**
 * Dynamically loads the official Cashfree JS SDK v3.
 * https://sdk.cashfree.com/js/v3/cashfree.js
 */
export const loadCashfreeSDK = () => {
  if (typeof window === 'undefined') return Promise.resolve(false);

  if (window.Cashfree) {
    return Promise.resolve(true);
  }

  if (cashfreeSdkPromise) {
    return cashfreeSdkPromise;
  }

  cashfreeSdkPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = (err) => {
      console.error('Failed to load Cashfree SDK script:', err);
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return cashfreeSdkPromise;
};

/**
 * Initializes and caches Cashfree SDK instance with designated mode ('sandbox' or 'production').
 */
export const getCashfreeInstance = async (mode) => {
  const loaded = await loadCashfreeSDK();
  if (!loaded || !window.Cashfree) {
    throw new Error('Cashfree Web SDK could not be loaded. Please check your internet connection.');
  }

  const selectedMode = mode || import.meta.env.VITE_CASHFREE_MODE || 'sandbox';
  if (!cashfreeInstance) {
    cashfreeInstance = window.Cashfree({ mode: selectedMode });
  }
  return cashfreeInstance;
};

/**
 * Helper to get active Supabase Bearer token if user is signed in.
 */
const getAuthHeaders = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
  } catch (err) {
    console.warn('Could not retrieve Supabase session for payment request:', err);
  }
  return {};
};

export const paymentService = {
  /**
   * Fetch backend public payment configuration (sandbox vs production)
   */
  getConfig: async () => {
    try {
      const res = await api.get('/api/payments/config/');
      return res.data;
    } catch (err) {
      return { environment: 'sandbox', is_configured: false };
    }
  },

  /**
   * Zero-trust payment order creation.
   * Sends cart items (IDs & quantities) and customer details.
   * Backend computes authentic total from DB and initiates Cashfree order.
   */
  createPaymentOrder: async (checkoutPayload) => {
    const headers = await getAuthHeaders();
    const res = await api.post('/api/payments/create/', checkoutPayload, { headers });
    return res.data;
  },

  /**
   * Opens Cashfree modal checkout using payment_session_id.
   */
  openCheckout: async ({ paymentSessionId, mode = 'sandbox' }) => {
    if (!paymentSessionId) {
      throw new Error('Missing payment session ID for Cashfree checkout.');
    }

    const cashfree = await getCashfreeInstance(mode);

    return new Promise((resolve) => {
      cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal',
      }).then((result) => {
        resolve(result || {});
      }).catch((err) => {
        console.error('Cashfree modal checkout error:', err);
        resolve({ error: err });
      });
    });
  },

  /**
   * Authoritatively verifies payment against Django backend.
   * Django queries Cashfree PG server directly before returning verified status.
   */
  verifyPayment: async (orderNumber, cashfreeOrderId = '') => {
    const headers = await getAuthHeaders();
    const res = await api.post('/api/payments/verify/', {
      order_number: orderNumber,
      cashfree_order_id: cashfreeOrderId,
    }, { headers });
    return res.data;
  },
};

export default paymentService;
