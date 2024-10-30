import logging

from django.http import HttpRequest
from ninja import Schema
from ninja.pagination import RouterPaginated

from bats_ai.core.models import Annotations, Recording

logger = logging.getLogger(__name__)


router = RouterPaginated()


class AnnotationSchema(Schema):
    recording: int  # Foreign Key to index
    owner_username: str
    start_time: int
    end_time: int
    low_freq: int
    high_freq: int
    species: list[int]
    comments: str


@router.get('/{id}')
def get_annotation(request: HttpRequest, id: int):
    try:
        annotation = Annotations.objects.get(pk=id)
        recording = annotation.recording

        # Check if the user owns the recording or if the recording is public
        if recording.owner == request.user or recording.public:
            # Query annotations associated with the recording that are owned by the current user
            annotations_qs = Annotations.objects.filter(recording=recording, owner=request.user)

            # Serialize the annotations using AnnotationSchema
            annotations_data = [
                AnnotationSchema.from_orm(annotation, owner_email=request.user.email).dict()
                for annotation in annotations_qs
            ]

            return annotations_data
        else:
            return {
                'error': 'Permission denied. You do not own this annotation, or the associated recording is not public.'
            }

    except Recording.DoesNotExist:
        return {'error': 'Recording not found'}
