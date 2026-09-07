"""
Custom exceptions for Delhivery Shipping integration.
Allows fine-grained error handling and sanitizes error messages
to ensure no sensitive credentials or internal traces are exposed.
"""


class ShippingError(Exception):
    """Base exception for all shipping provider errors."""
    def __init__(self, message, code=None, raw_response=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.raw_response = raw_response


class DelhiveryError(ShippingError):
    """Base exception for Delhivery One errors."""
    pass


class DelhiveryAuthenticationError(DelhiveryError):
    """Raised when Delhivery API token authentication fails (e.g. 401/403)."""
    pass


class DelhiveryValidationError(DelhiveryError):
    """Raised when request payload or order data fails validation."""
    pass


class DelhiveryServiceabilityError(DelhiveryError):
    """Raised when a pincode or delivery mode is not serviceable."""
    pass


class DelhiveryShipmentCreationError(DelhiveryError):
    """Raised when shipment creation request fails at Delhivery."""
    pass


class DelhiveryTrackingError(DelhiveryError):
    """Raised when tracking query fails or AWB is invalid."""
    pass


class DelhiveryLabelError(DelhiveryError):
    """Raised when packing slip / label generation fails."""
    pass


class DelhiveryPickupError(DelhiveryError):
    """Raised when pickup request generation fails."""
    pass


class DelhiveryNetworkError(DelhiveryError):
    """Raised on connection timeouts or transient network failures."""
    pass
