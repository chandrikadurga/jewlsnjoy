# Delhivery One Logistics Integration Guide for Jewels 'n' Joys

This document explains how the Delhivery One shipping and logistics integration works, how to configure environment variables in Render, how to test in sandbox, how to activate production, and how to safely disable or troubleshoot the system.

---

## 1. Where to Obtain the Delhivery API Token
1. Log into your account on **[Delhivery One](https://one.delhivery.com/)**.
2. Navigate to **Settings** → **API Setup**.
3. Locate or generate your **API Token**.
4. Keep this token strictly confidential. **Never put it in frontend source code, Vite environment variables, or GitHub repositories.**

---

## 2. Render Environment Variables
Add the following environment variables to your Render Django web service settings (**Dashboard** → **jewlsnjoy** → **Environment**):

| Variable | Recommended Default | Description |
|---|---|---|
| `DELHIVERY_ENABLED` | `True` | Master feature flag (`True` to enable, `False` to fallback to manual logistics) |
| `DELHIVERY_ENV` | `sandbox` (or `production`) | Environment toggle (`sandbox` routes to `https://staging-express.delhivery.com`, `production` routes to `https://track.delhivery.com`) |
| `DELHIVERY_API_TOKEN` | *(Secret Token)* | API token obtained from Delhivery One API Setup |
| `DELHIVERY_PICKUP_LOCATION` | `JewelsNJoysWarehouse` | Exact name of your registered warehouse in Delhivery One |
| `DELHIVERY_API_BASE_URL` | *(Optional)* | Custom base URL override (leave empty to use default sandbox/production endpoints) |
| `DELHIVERY_DEFAULT_WEIGHT_G` | `200` | Fallback parcel weight in grams for jewellery boxes |
| `DELHIVERY_DEFAULT_LENGTH_CM` | `10.0` | Default package length in cm |
| `DELHIVERY_DEFAULT_BREADTH_CM` | `10.0` | Default package breadth in cm |
| `DELHIVERY_DEFAULT_HEIGHT_CM` | `5.0` | Default package height in cm |

---

## 3. Pickup Location Configuration
Delhivery requires every shipment manifest to have a registered pickup location.
1. In Delhivery One, navigate to **Settings** → **Facilities / Warehouses**.
2. Note the registered warehouse name (e.g., `JewelsNJoysWarehouse`).
3. Set `DELHIVERY_PICKUP_LOCATION` to this exact case-sensitive name in your environment.

---

## 4. Sandbox vs. Production Activation

### Testing in Sandbox / Staging
1. Set `DELHIVERY_ENV=sandbox` in Render or `.env`.
2. The system automatically connects to `https://staging-express.delhivery.com`.
3. Use test orders to verify serviceability, shipment creation, AWB generation, tracking, and label URLs.

### Activating in Production
1. Set `DELHIVERY_ENV=production`.
2. Ensure `DELHIVERY_API_TOKEN` is your live production token from Delhivery One.
3. Ensure `DELHIVERY_PICKUP_LOCATION` matches your live facility name.
4. Redeploy Render service.

---

## 5. How the Shipping Workflows Operate

### A. Pincode Serviceability (Checkout)
1. Customer enters their 6-digit Indian PIN code on the checkout page.
2. Storefront calls backend `/api/shipping/serviceability/`.
3. Backend contacts Delhivery API (`GET /c/api/pin-codes/json/?filter_codes=...`).
4. A subtle indicator confirms delivery availability. If COD is not serviceable for that PIN, the customer is prompted to pay via UPI QR code.
5. If the Delhivery API is temporarily unreachable, checkout **gracefully degrades** and does not block the customer from placing the order.

### B. Shipment Creation & Dispatch (Prepaid vs. COD)
- **Prepaid Orders (Manual UPI)**:
  1. Order placed → status `awaiting_payment_verification`, payment `pending_verification`.
  2. Delhivery shipment creation is **blocked** until the admin reviews and approves the payment proof.
  3. Once approved → payment `paid`, order `confirmed`.
  4. Admin clicks **"Create Delhivery Shipment"** in the order modal.
  5. Backend generates manifest with `payment_mode="Prepaid"` and `cod_amount=0.00`.
- **Cash on Delivery (COD) Orders**:
  1. Order placed → payment `pending`.
  2. Admin reviews and clicks **"Create Delhivery Shipment"**.
  3. Backend generates manifest with `payment_mode="COD"` and `cod_amount=order.total_amount` (calculated server-side).

### C. Idempotency & Concurrency Safety
- Row-locking (`select_for_update`) and database constraints prevent accidental double-dispatching from rapid double-clicks or multiple admins clicking simultaneously.
- If a shipment already has an active AWB, subsequent creation attempts return the existing shipment with a clear notice.

### D. Tracking Synchronization & Status Progression
- Storefront Order Detail page and Admin modal display the carrier, AWB, and direct tracking link.
- Clicking **"Sync Tracking"** polls the latest checkpoint scans from Delhivery and updates the order status (`manifested` → `shipped` → `out_for_delivery` → `delivered`).
- **Protection Rule**: An older or out-of-order tracking scan cannot move an order backward (e.g. `delivered` can never regress to `in_transit`).

### E. Printing Labels & Scheduling Pickups
- In the Admin Order modal:
  - **Print Label**: Opens the official Delhivery barcode packing slip in a new tab.
  - **Schedule Pickup**: Raises a pickup request with Delhivery for the warehouse, saving the carrier's pickup token.

---

## 6. How to Safely Disable Delhivery (Fallback)
If Delhivery experiences downtime or if you wish to temporarily revert to manual shipping via Delhivery One portal:
1. In Render environment variables, set:
   ```env
   DELHIVERY_ENABLED=False
   ```
2. Redeploy or restart the backend.
3. **Effect**:
   - Checkout continues working normally without calling Delhivery.
   - Pincode checks return permissive status.
   - All customer order history and order tracking remain accessible.
   - Admin can copy addresses and manually create shipments in the Delhivery One dashboard as before.

---

## 7. Troubleshooting & Common API Errors

| Error Message | Cause | Resolution |
|---|---|---|
| `Authentication with Delhivery API failed (401/403)` | Invalid or missing token | Check `DELHIVERY_API_TOKEN` in Render environment variables |
| `DELHIVERY_PICKUP_LOCATION is not configured` | Pickup facility name missing | Set `DELHIVERY_PICKUP_LOCATION` to your registered warehouse name |
| `Payment is not verified yet` | Admin tried to dispatch unpaid UPI order | Verify & approve customer payment proof first |
| `Postal code is not a valid 6-digit Indian PIN code` | Customer entered invalid postal code | Verify destination address in order details |
| `Shipment already exists for this order` | Shipment was already manifested | Order is already dispatched; check the AWB number displayed |
