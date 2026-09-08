import api from './api';
import { supabase } from './supabase';

let razorpaySdkPromise = null;

/**
 * Dynamically loads the official Razorpay Checkout SDK.
 * https://checkout.razorpay.com/v1/checkout.js
 */
export const loadRazorpaySDK = () => {
  if (typeof window === 'undefined') return Promise.resolve(false);

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpaySdkPromise) {
    return razorpaySdkPromise;
  }

  razorpaySdkPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = (err) => {
      console.error('Failed to load Razorpay SDK script:', err);
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpaySdkPromise;
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
   * Fetch backend public payment configuration (Razorpay key_id, environment)
   */
  getConfig: async () => {
    try {
      const res = await api.get('/api/payments/config/');
      const data = res.data || {};
      return {
        active_provider: data.active_provider || 'razorpay',
        razorpay: data.razorpay || data || { key_id: '', environment: 'test', is_configured: false },
      };
    } catch (err) {
      return {
        active_provider: 'razorpay',
        razorpay: { key_id: '', environment: 'test', is_configured: false },
      };
    }
  },



  /**
   * Zero-trust payment order creation.
   * Sends cart items (IDs & quantities) and customer details.
   * Backend computes authentic total from DB and initiates Razorpay order.
   */
  createPaymentOrder: async (checkoutPayload) => {
    const headers = await getAuthHeaders();
    const res = await api.post('/api/payments/create/', checkoutPayload, { headers });
    return res.data;
  },

  /**
   * Opens Razorpay Standard Web Checkout Modal.
   */
  openCheckout: async ({
    keyId,
    orderId,
    amount,
    currency = 'INR',
    customerDetails = {},
    notes = {},
    themeColor = '#c6a15b',
    onSuccess,
    onError,
    onDismiss,
  }) => {
    const loaded = await loadRazorpaySDK();
    if (!loaded || !window.Razorpay) {
      throw new Error('Online payment is temporarily unavailable. Please try again or choose Cash on Delivery.');
    }

    const effectiveKey = keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!effectiveKey) {
      throw new Error('Razorpay Key ID is not configured.');
    }

    return new Promise((resolve) => {
      const options = {
        key: effectiveKey,
        amount: amount, // in paise
        currency: currency || 'INR',
        name: "Jewels 'n' Joys",
        description: 'Luxury Demi-Fine Jewellery',
        order_id: orderId,
        prefill: {
          name: customerDetails.name || '',
          email: customerDetails.email || '',
          contact: customerDetails.phone || '',
        },
        notes: notes || {},
        theme: {
          color: themeColor || '#c6a15b',
        },
        modal: {
          ondismiss: () => {
            if (onDismiss) onDismiss();
            resolve({ dismissed: true });
          },
        },
        handler: (response) => {
          if (onSuccess) onSuccess(response);
          resolve({ success: true, ...response });
        },
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          console.error('Razorpay payment failed:', response.error);
          if (onError) onError(response.error);
          resolve({ error: response.error });
        });
        rzp.open();
      } catch (err) {
        console.error('Razorpay initialization exception:', err);
        if (onError) onError(err);
        resolve({ error: err });
      }
    });
  },

  /**
   * Authoritatively verifies payment against Django backend.
   * Django verifies HMAC-SHA256 signature and checks Razorpay API before updating order.
   */
  verifyPayment: async (orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    const headers = await getAuthHeaders();
    const res = await api.post('/api/payments/verify/', {
      order_number: orderNumber,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    }, { headers });
    return res.data;
  },
};

export default paymentService;

