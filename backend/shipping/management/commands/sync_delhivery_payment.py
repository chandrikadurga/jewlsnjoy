import json
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from shipping.services.delhivery import DelhiveryShippingProvider
from shipping.models import Shipment
from shipping.exceptions import DelhiveryError


class Command(BaseCommand):
    help = 'Executes Delhivery /api/p/edit payment update and captures complete HTTP status and response.'

    def add_arguments(self, parser):
        parser.add_argument('--waybill', type=str, default='41710610005176', help='Delhivery waybill / AWB')
        parser.add_argument('--pt', type=str, default='COD', help='Payment type: COD or Prepaid')
        parser.add_argument('--cod', type=float, default=324.0, help='Collectable COD amount')

    def handle(self, *args, **options):
        waybill = str(options['waybill']).strip()
        pt = str(options['pt']).strip().upper()
        cod = float(options['cod'])

        payload = {
            'waybill': waybill,
            'pt': pt,
            'cod': cod
        }

        self.stdout.write(self.style.NOTICE("=" * 60))
        self.stdout.write(self.style.NOTICE("DELHIVERY PAYMENT UPDATE OPERATION"))
        self.stdout.write(self.style.NOTICE("=" * 60))
        self.stdout.write(f"Endpoint: POST /api/p/edit")
        self.stdout.write("Payload sent:")
        self.stdout.write(json.dumps(payload, indent=2))
        self.stdout.write("-" * 60)

        provider = DelhiveryShippingProvider()

        try:
            result = provider.edit_shipment(
                waybill=waybill,
                payment_mode=pt,
                cod_amount=cod
            )

            http_status = result.get('http_status', 200)
            delhivery_resp = result.get('delhivery_response', {})

            self.stdout.write(self.style.SUCCESS(f"\nHTTP STATUS: {http_status}\n"))
            self.stdout.write("RESPONSE:")
            self.stdout.write(json.dumps(delhivery_resp, indent=2, default=str))

            if result.get('success'):
                self.stdout.write(self.style.SUCCESS("\nSTATUS: SUCCESS"))
                # Only update DB upon verified success
                shipment = Shipment.objects.filter(awb_number=waybill).first()
                if shipment:
                    shipment.payment_mode = pt
                    shipment.cod_amount = Decimal(str(cod))
                    shipment.last_synced_at = timezone.now()
                    shipment.save(update_fields=['payment_mode', 'cod_amount', 'last_synced_at', 'updated_at'])
                    self.stdout.write(self.style.SUCCESS(f"Local database updated for AWB {waybill}: payment_mode={pt}, cod_amount={cod}"))
                else:
                    self.stdout.write(self.style.WARNING(f"No local shipment found with AWB {waybill} to update."))
            else:
                self.stdout.write(self.style.ERROR("\nSTATUS: FAILURE"))
                self.stdout.write(self.style.ERROR("Zero-Trust Guard: Local DB NOT updated."))

        except DelhiveryError as e:
            http_status = getattr(e, 'code', 400) or 400
            raw_resp = getattr(e, 'raw_response', str(e))

            self.stdout.write(self.style.ERROR(f"\nHTTP STATUS: {http_status}\n"))
            self.stdout.write("RESPONSE:")
            if isinstance(raw_resp, (dict, list)):
                self.stdout.write(json.dumps(raw_resp, indent=2, default=str))
            else:
                self.stdout.write(str(raw_resp))

            self.stdout.write(self.style.ERROR(f"\nROOT CAUSE / ERROR: {str(e)}"))
            self.stdout.write(self.style.NOTICE("Zero-Trust Guard: Local DB NOT updated."))

        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"\nUNEXPECTED EXCEPTION: {str(exc)}"))
            self.stdout.write(self.style.NOTICE("Zero-Trust Guard: Local DB NOT updated."))

        self.stdout.write(self.style.NOTICE("\n" + "=" * 60))
