"""
Delhivery One Shipping Provider Implementation.
Follows official Delhivery One REST API contracts strictly.
All credentials remain server-side.
"""

import json
import logging
import urllib.parse
import urllib.request
from decimal import Decimal
from typing import Dict, Any, Optional
from django.conf import settings
from django.utils import timezone

from .base import ShippingProvider
from ..exceptions import (
    DelhiveryError,
    DelhiveryAuthenticationError,
    DelhiveryValidationError,
    DelhiveryServiceabilityError,
    DelhiveryShipmentCreationError,
    DelhiveryTrackingError,
    DelhiveryLabelError,
    DelhiveryPickupError,
    DelhiveryNetworkError,
)
from ..utils import (
    normalize_delhivery_status,
    validate_indian_pincode,
    sanitize_phone_number,
)

logger = logging.getLogger('shipping.delhivery')


class DelhiveryShippingProvider(ShippingProvider):
    """
    Client for Delhivery One logistics services.
    Handles communication with Delhivery's production or staging servers.
    """

    DEFAULT_PROD_URL = 'https://track.delhivery.com'
    DEFAULT_SANDBOX_URL = 'https://staging-express.delhivery.com'

    def __init__(self):
        self.api_token = getattr(settings, 'DELHIVERY_API_TOKEN', '').strip()
        self.env = getattr(settings, 'DELHIVERY_ENV', 'sandbox').strip().lower()
        self.enabled = getattr(settings, 'DELHIVERY_ENABLED', True)

        custom_base_url = getattr(settings, 'DELHIVERY_API_BASE_URL', '').strip().rstrip('/')
        if custom_base_url:
            self.base_url = custom_base_url
        elif self.env == 'production' or self.env == 'live':
            self.base_url = self.DEFAULT_PROD_URL
        else:
            self.base_url = self.DEFAULT_SANDBOX_URL

        self.pickup_location = getattr(settings, 'DELHIVERY_PICKUP_LOCATION', '').strip()
        self.default_weight_g = getattr(settings, 'DELHIVERY_DEFAULT_WEIGHT_G', 200)
        self.default_length_cm = getattr(settings, 'DELHIVERY_DEFAULT_LENGTH_CM', 10.0)
        self.default_breadth_cm = getattr(settings, 'DELHIVERY_DEFAULT_BREADTH_CM', 10.0)
        self.default_height_cm = getattr(settings, 'DELHIVERY_DEFAULT_HEIGHT_CM', 5.0)

    def _get_headers(self, content_type: str = 'application/json') -> Dict[str, str]:
        """Builds standard headers with token authorization."""
        if not self.api_token:
            raise DelhiveryAuthenticationError("DELHIVERY_API_TOKEN is not configured on this server.")

        headers = {
            'Authorization': f'Token {self.api_token}',
            'Accept': 'application/json',
        }
        if content_type:
            headers['Content-Type'] = content_type
        return headers

    def _make_request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Any] = None,
        content_type: str = 'application/json',
        timeout: int = 15,
    ) -> Any:
        """
        Executes HTTP request to Delhivery API with standard error translation.
        Never logs API tokens or sensitive customer address data in full.
        """
        url = f"{self.base_url}/{path.lstrip('/')}"
        if params:
            query_str = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
            url = f"{url}?{query_str}" if query_str else url

        encoded_body = None
        if data is not None:
            if content_type == 'application/x-www-form-urlencoded':
                if isinstance(data, dict):
                    encoded_body = urllib.parse.urlencode(data).encode('utf-8')
                elif isinstance(data, str):
                    encoded_body = data.encode('utf-8')
            elif content_type == 'application/json':
                encoded_body = json.dumps(data).encode('utf-8')
            else:
                encoded_body = data if isinstance(data, bytes) else str(data).encode('utf-8')

        headers = self._get_headers(content_type=content_type)
        req = urllib.request.Request(url, data=encoded_body, headers=headers, method=method.upper())

        logger.info("Delhivery API Request: %s %s", method.upper(), path)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                status_code = response.status
                raw_content = response.read().decode('utf-8')
                try:
                    return json.loads(raw_content)
                except json.JSONDecodeError:
                    return raw_content
        except urllib.error.HTTPError as e:
            err_body = ''
            try:
                err_body = e.read().decode('utf-8')
                parsed_err = json.loads(err_body)
            except Exception:
                parsed_err = err_body

            logger.error("Delhivery HTTP %s error on %s: %s", e.code, path, str(parsed_err)[:200])
            if e.code in (401, 403):
                raise DelhiveryAuthenticationError("Authentication with Delhivery API failed. Verify API token.", code=e.code, raw_response=parsed_err)
            elif e.code == 400:
                raise DelhiveryValidationError(f"Invalid request sent to Delhivery: {parsed_err}", code=e.code, raw_response=parsed_err)
            elif e.code == 404:
                raise DelhiveryTrackingError("Resource not found at Delhivery.", code=e.code, raw_response=parsed_err)
            else:
                raise DelhiveryError(f"Delhivery API responded with error status {e.code}", code=e.code, raw_response=parsed_err)
        except urllib.error.URLError as e:
            logger.error("Delhivery network connection failure: %s", str(e.reason))
            raise DelhiveryNetworkError(f"Unable to connect to Delhivery servers: {str(e.reason)}")
        except Exception as e:
            logger.error("Unexpected Delhivery request exception: %s", str(e))
            raise DelhiveryError(f"Unexpected logistics failure: {str(e)}")

    def check_serviceability(self, pincode: str, payment_mode: str = 'Prepaid', weight_grams: int = 200) -> Dict[str, Any]:
        """
        Checks if a destination pincode is serviceable via Delhivery.
        Official Endpoint: GET /c/api/pin-codes/json/?filter_codes={pincode}
        """
        if not validate_indian_pincode(pincode):
            return {
                'serviceable': False,
                'cod_available': False,
                'prepaid_available': False,
                'message': 'Invalid 6-digit Indian PIN code format.',
                'raw': {}
            }

        # If Delhivery integration is disabled via feature flag, return permissive status for fallback
        if not self.enabled:
            return {
                'serviceable': True,
                'cod_available': True,
                'prepaid_available': True,
                'message': 'Delhivery integration disabled; manual shipping active.',
                'raw': {'delhivery_disabled': True}
            }

        data = self._make_request('GET', '/c/api/pin-codes/json/', params={'filter_codes': str(pincode).strip()})
        delivery_codes = data.get('delivery_codes', []) if isinstance(data, dict) else []

        if not delivery_codes:
            return {
                'serviceable': False,
                'cod_available': False,
                'prepaid_available': False,
                'message': f"PIN code {pincode} is not currently serviceable by Delhivery.",
                'raw': data if isinstance(data, dict) else {}
            }

        code_info = delivery_codes[0].get('postal_code', {})
        prepaid_flag = str(code_info.get('pre_paid', '')).upper() == 'Y'
        cod_flag = str(code_info.get('cod', '')).upper() == 'Y' or str(code_info.get('cash', '')).upper() == 'Y'
        pickup_flag = str(code_info.get('pickup', '')).upper() == 'Y'

        is_serviceable = prepaid_flag or cod_flag

        return {
            'serviceable': is_serviceable,
            'cod_available': cod_flag,
            'prepaid_available': prepaid_flag,
            'pickup_available': pickup_flag,
            'city': code_info.get('district', '') or code_info.get('city', ''),
            'state': code_info.get('state_code', ''),
            'message': 'Serviceable' if is_serviceable else 'Unserviceable',
            'raw': code_info
        }

    def create_shipment(self, order, weight_grams: int = 200, dimensions: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """
        Creates a package shipment manifest in Delhivery Express system.
        Official Endpoint: POST /api/cmu/create.json (format=json&data=...)
        """
        if not self.enabled:
            raise DelhiveryError("Delhivery shipping integration is currently disabled (DELHIVERY_ENABLED=False).")

        pickup_loc = self.pickup_location
        if not pickup_loc:
            raise DelhiveryValidationError("DELHIVERY_PICKUP_LOCATION is not configured. A valid registered Delhivery warehouse is required.")

        # Payment mode and COD amount resolution
        is_cod = (order.payment_method or '').lower() == 'cod'
        payment_mode = 'COD' if is_cod else 'Prepaid'
        cod_amount = Decimal(str(order.total_amount)) if is_cod else Decimal('0.00')

        # Package dimensions
        dims = dimensions or {}
        length = dims.get('length', self.default_length_cm)
        breadth = dims.get('breadth', self.default_breadth_cm)
        height = dims.get('height', self.default_height_cm)
        weight = weight_grams or self.default_weight_g

        # Build items description
        items = list(order.items.all())
        products_desc = ', '.join([item.product_name for item in items])[:200] if items else 'Jewellery Items'
        total_qty = sum([item.quantity for item in items]) if items else 1

        phone = sanitize_phone_number(order.customer_phone)

        # Build Delhivery shipment dictionary
        shipment_data = {
            'name': order.customer_name or 'Valued Customer',
            'add': order.shipping_address or 'Customer Address',
            'pin': str(order.postal_code).strip(),
            'city': order.city or '',
            'state': order.state or '',
            'country': order.country or 'India',
            'phone': phone,
            'order': str(order.order_number),
            'payment_mode': payment_mode,
            'cod_amount': str(cod_amount),
            'total_amount': str(order.total_amount),
            'products_desc': products_desc,
            'hsn_code': '7117',
            'quantity': str(total_qty),
            'seller_name': "Jewels 'n' Joys",
            'order_date': order.created_at.strftime('%Y-%m-%d %H:%M:%S') if order.created_at else timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            'shipping_mode': 'Surface',
            'address_type': 'home',
            'shipment_width': float(breadth),
            'shipment_height': float(height),
            'weight': int(weight),
        }

        request_payload = {
            'shipments': [shipment_data],
            'pickup_location': {
                'name': pickup_loc
            }
        }

        form_data = {
            'format': 'json',
            'data': json.dumps(request_payload)
        }

        logger.info("Creating Delhivery shipment for Order #%s (Mode: %s, Total: %s)", order.order_number, payment_mode, order.total_amount)
        response = self._make_request(
            'POST',
            '/api/cmu/create.json',
            data=form_data,
            content_type='application/x-www-form-urlencoded',
            timeout=25
        )

        # Parse response
        if not isinstance(response, dict):
            raise DelhiveryShipmentCreationError(f"Unexpected response format from Delhivery: {response}")

        packages = response.get('packages', [])
        if not packages and not response.get('success'):
            rmk = response.get('rmk', 'No package created by Delhivery.')
            raise DelhiveryShipmentCreationError(f"Delhivery rejected shipment creation: {rmk}", raw_response=response)

        pkg = packages[0] if packages else {}
        status_text = pkg.get('status', '')
        waybill = pkg.get('waybill', '')

        if not waybill:
            remarks = pkg.get('remarks', [])
            error_detail = ', '.join(remarks) if remarks else status_text or 'No AWB assigned.'
            raise DelhiveryShipmentCreationError(f"Delhivery did not generate an AWB: {error_detail}", raw_response=response)

        return {
            'awb_number': str(waybill).strip(),
            'provider_order_id': str(response.get('upload_wbn', '')),
            'provider_shipment_id': str(pkg.get('refnum', '')),
            'provider_status': status_text or 'Manifested',
            'payment_mode': payment_mode,
            'cod_amount': cod_amount,
            'weight_grams': weight,
            'length_cm': length,
            'breadth_cm': breadth,
            'height_cm': height,
            'pickup_location': pickup_loc,
            'raw_response': response
        }

    def get_tracking(self, awb_or_order_num: str) -> Dict[str, Any]:
        """
        Fetches tracking information from Delhivery.
        Official Endpoint: GET /api/v1/packages/json/?waybill={awb}
        """
        if not self.enabled:
            return {
                'awb': awb_or_order_num,
                'provider_status': 'Manual Tracking',
                'normalized_status': 'in_transit',
                'status_code': '',
                'last_updated': timezone.now().isoformat(),
                'events': [],
                'tracking_url': '',
                'raw': {}
            }

        clean_id = str(awb_or_order_num).strip()
        params = {'waybill': clean_id} if clean_id.isdigit() else {'ref_ids': clean_id}

        data = self._make_request('GET', '/api/v1/packages/json/', params=params)

        shipment_data = data.get('ShipmentData', []) if isinstance(data, dict) else []
        if not shipment_data:
            return {
                'awb': clean_id,
                'provider_status': 'No tracking scans available yet',
                'normalized_status': 'manifested',
                'status_code': '',
                'last_updated': timezone.now().isoformat(),
                'events': [],
                'tracking_url': f"https://www.delhivery.com/track/package/{clean_id}",
                'raw': data if isinstance(data, dict) else {}
            }

        shipment_item = shipment_data[0].get('Shipment', {})
        status_obj = shipment_item.get('Status', {})
        raw_status = status_obj.get('Status', '') or status_obj.get('Instructions', '') or 'In Transit'
        status_code = status_obj.get('StatusType', '')
        last_updated = status_obj.get('StatusDateTime', '') or timezone.now().isoformat()
        awb = shipment_item.get('AWB', clean_id)

        # Parse scan timeline
        raw_scans = shipment_item.get('Scans', [])
        normalized_events = []
        for scan_entry in raw_scans:
            detail = scan_entry.get('ScanDetail', {})
            if detail:
                normalized_events.append({
                    'timestamp': detail.get('ScanDateTime', ''),
                    'status': detail.get('Scan', ''),
                    'location': detail.get('ScannedLocation', ''),
                    'instructions': detail.get('Instructions', ''),
                    'type': detail.get('ScanType', ''),
                })

        normalized_status = normalize_delhivery_status(raw_status)

        return {
            'awb': str(awb),
            'provider_status': raw_status,
            'normalized_status': normalized_status,
            'status_code': status_code,
            'last_updated': last_updated,
            'events': normalized_events,
            'tracking_url': f"https://www.delhivery.com/track/package/{awb}",
            'raw': shipment_item
        }

    def generate_label(self, awb: str) -> Dict[str, Any]:
        """
        Retrieves packing slip / shipping label from Delhivery.
        Official Endpoint: GET /api/p/packing_slip?wbns={awb}
        """
        if not self.enabled:
            raise DelhiveryError("Delhivery integration disabled.")

        clean_awb = str(awb).strip()
        data = self._make_request('GET', '/api/p/packing_slip', params={'wbns': clean_awb, 'pdf': 'true'})

        # Response may contain packages array with pdf_url or base64
        label_url = ''
        if isinstance(data, dict):
            packages = data.get('packages_found', []) or data.get('packages', [])
            if packages and isinstance(packages[0], dict):
                label_url = packages[0].get('pdf_url', '') or packages[0].get('url', '')

        # Standard Delhivery print URL fallback if reliable API endpoint configured
        if not label_url:
            label_url = f"{self.base_url}/api/p/packing_slip?wbns={clean_awb}"

        return {
            'label_url': label_url,
            'raw_response': data if isinstance(data, dict) else {}
        }

    def request_pickup(
        self,
        pickup_location: str,
        package_count: int = 1,
        pickup_date: str = None,
        pickup_time: str = None
    ) -> Dict[str, Any]:
        """
        Raises a pickup request with Delhivery.
        Official Endpoint: POST /fm/request/new/
        """
        if not self.enabled:
            raise DelhiveryError("Delhivery integration disabled.")

        loc = (pickup_location or self.pickup_location).strip()
        if not loc:
            raise DelhiveryValidationError("Pickup location name is required for pickup requests.")

        now = timezone.now()
        date_str = pickup_date or now.strftime('%Y-%m-%d')
        time_str = pickup_time or (now + timezone.timedelta(hours=2)).strftime('%H:%M:%S')

        payload = {
            'pickup_location': loc,
            'expected_package_count': int(package_count) or 1,
            'pickup_date': date_str,
            'pickup_time': time_str,
        }

        logger.info("Requesting Delhivery pickup at %s for %s packages on %s %s", loc, package_count, date_str, time_str)
        data = self._make_request('POST', '/fm/request/new/', data=payload, content_type='application/json')

        if not isinstance(data, dict):
            raise DelhiveryPickupError(f"Unexpected response from Delhivery pickup API: {data}")

        pickup_id = str(data.get('pr_id', '') or data.get('pickup_id', '') or data.get('token_number', ''))

        return {
            'pickup_id': pickup_id,
            'token_number': pickup_id,
            'status': data.get('status', 'scheduled'),
            'raw': data
        }

    def calculate_shipping_cost(self, origin_pin: str, dest_pin: str, weight_grams: int, payment_mode: str) -> Dict[str, Any]:
        """
        Fetches carrier cost quotation.
        Official Endpoint: GET /api/kinko/v1/invoice/charges/.json?...
        """
        if not self.enabled:
            return {'cost': Decimal('80.00'), 'currency': 'INR', 'note': 'Static rate fallback'}

        params = {
            'md': 'S',
            'ss': 'Delivered',
            'd_pin': str(dest_pin).strip(),
            'o_pin': str(origin_pin).strip() if origin_pin else '500081',
            'cgm': int(weight_grams) if weight_grams else 200,
            'pt': 'COD' if payment_mode.upper() == 'COD' else 'Prepaid',
        }

        try:
            data = self._make_request('GET', '/api/kinko/v1/invoice/charges/.json', params=params)
            # Parse charges array
            if isinstance(data, list) and data:
                total_charge = data[0].get('total_amount', 0)
                return {'cost': Decimal(str(total_charge)), 'currency': 'INR', 'raw': data}
            return {'cost': Decimal('80.00'), 'currency': 'INR', 'raw': data}
        except Exception as e:
            logger.warning("Delhivery shipping cost calculation not available for this account: %s", str(e))
            return {'cost': Decimal('80.00'), 'currency': 'INR', 'fallback': True}
