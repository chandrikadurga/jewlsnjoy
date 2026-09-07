"""
Abstract Base Class for Logistics / Shipping Providers.
Provides uniform interface for serviceability, rate calculations,
shipment creation, tracking, label generation, and pickup requests.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class ShippingProvider(ABC):
    """
    Abstract interface that all carrier implementations must satisfy.
    Allows easy future addition of providers (e.g. Shiprocket, Bluedart).
    """

    @abstractmethod
    def check_serviceability(self, pincode: str, payment_mode: str = 'Prepaid', weight_grams: int = 200) -> Dict[str, Any]:
        """
        Checks whether destination pincode is serviceable.
        Returns:
            {
                'serviceable': bool,
                'cod_available': bool,
                'prepaid_available': bool,
                'raw': dict
            }
        """
        pass

    @abstractmethod
    def create_shipment(self, order, weight_grams: int = 200, dimensions: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """
        Creates a manifest/shipment with the carrier.
        Returns normalized dictionary with:
            {
                'awb_number': str,
                'provider_order_id': str,
                'provider_status': str,
                'payment_mode': str,
                'cod_amount': Decimal,
                'raw_response': dict
            }
        """
        pass

    @abstractmethod
    def get_tracking(self, awb_or_order_num: str) -> Dict[str, Any]:
        """
        Fetches tracking updates for an AWB or Order Reference.
        Returns:
            {
                'awb': str,
                'provider_status': str,
                'normalized_status': str,
                'status_code': str,
                'last_updated': str,
                'events': list,
                'raw': dict
            }
        """
        pass

    @abstractmethod
    def generate_label(self, awb: str) -> Dict[str, Any]:
        """
        Generates or fetches printable packing slip / shipping label.
        Returns:
            {
                'label_url': str,
                'raw_response': dict
            }
        """
        pass

    @abstractmethod
    def request_pickup(self, pickup_location: str, package_count: int = 1, pickup_date: str = None, pickup_time: str = None) -> Dict[str, Any]:
        """
        Schedules a pickup with carrier for given pickup location.
        Returns:
            {
                'pickup_id': str,
                'token_number': str,
                'status': str,
                'raw': dict
            }
        """
        pass

    @abstractmethod
    def calculate_shipping_cost(self, origin_pin: str, dest_pin: str, weight_grams: int, payment_mode: str) -> Dict[str, Any]:
        """
        Fetches carrier cost quotation for shipping.
        """
        pass
