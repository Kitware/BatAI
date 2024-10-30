from datetime import datetime
import logging

from django.http import HttpRequest, JsonResponse
from guano import GuanoFile
from ninja import File, Schema
from ninja.files import UploadedFile
from ninja.pagination import RouterPaginated

router = RouterPaginated()
logger = logging.getLogger(__name__)


class GuanoMetadataSchema(Schema):
    nabat_grid_cell_grts_id: str | None = None
    nabat_latitude: float | None = None
    nabat_longitude: float | None = None
    nabat_site_name: str | None = None
    nabat_activation_start_time: datetime | None = None
    nabat_activation_end_time: datetime | None = None
    nabat_software_type: str | None = None
    nabat_species_list: list[str] | None = None
    nabat_comments: str | None = None
    nabat_detector_type: str | None = None
    nabat_unusual_occurrences: str | None = None


router = RouterPaginated()


@router.post('/')
def default_data(
    request: HttpRequest,
    audio_file: File[UploadedFile],
):
    try:
        # Read GUANO metadata from the file name provided
        gfile = GuanoFile(audio_file.file.name)

        # Extract required NABat fields
        nabat_fields = {
            'nabat_grid_cell_grts_id': gfile.get('NABat|Grid Cell GRTS ID', None),
            'nabat_latitude': (gfile.get('NABat|Latitude', None)),
            'nabat_longitude': (gfile.get('NABat|Longitude', None)),
            'nabat_site_name': gfile.get('NABat|Site Name', None),
        }
        if (
            nabat_fields['nabat_longitude'] and float(nabat_fields['nabat_longitude']) > 0
        ):  # individuals don't put the - in the longitude
            nabat_fields['nabat_longitude'] = str(float(nabat_fields['nabat_longitude']) * -1)
        # Extract additional fields with conditionals
        additional_fields = {
            'nabat_activation_start_time': parse_datetime(
                gfile.get('NABat|Activation start time', None)
            )
            if 'NABat|Activation start time' in gfile
            else None,
            'nabat_activation_end_time': parse_datetime(
                gfile.get('NABat|Activation end time', None)
            )
            if 'NABat|Activation end time' in gfile
            else None,
            'nabat_software_type': gfile.get('NABat|Software type', None),
            'nabat_species_list': gfile.get('NABat|Species List', '').split(','),
            'nabat_comments': gfile.get('NABat|Comments', None),
            'nabat_detector_type': gfile.get('NABat|Detector type', None),
            'nabat_unusual_occurrences': gfile.get('NABat|Unusual occurrences', ''),
        }

        # Combine all extracted fields
        metadata = {**nabat_fields, **additional_fields}

        return JsonResponse(metadata, safe=False)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def parse_datetime(datetime_str):
    if datetime_str:
        try:
            # Try parsing using the custom format
            return datetime.strptime(datetime_str, '%Y%m%dT%H%M%S')
        except ValueError:
            try:
                # Try parsing using ISO format
                return datetime.fromisoformat(datetime_str)
            except ValueError:
                # If both formats fail, return None or handle the error accordingly
                return None
    return None
