from django.http import HttpRequest
from ninja import Schema
from ninja.pagination import RouterPaginated

from bats_ai.core.models import Annotations, Recording, TemporalAnnotations

router = RouterPaginated()


class TemporalAnnotationSchema(Schema):
    recording: int  # Foreign Key to index
    owner_username: str
    start_time: int
    end_time: int
    type: str
    comments: str


@router.get('/{id}')
def get_temporal_annotation(request: HttpRequest, id: int):
    try:
        annotation = Annotations.objects.get(pk=id)
        recording = annotation.recording

        # Check if the user owns the recording or if the recording is public
        if recording.owner == request.user or recording.public:
            # Query annotations associated with the recording that are owned by the current user
            annotations_qs = TemporalAnnotations.objects.filter(
                recording=recording, owner=request.user
            )

            # Serialize the annotations using AnnotationSchema
            annotations_data = [
                TemporalAnnotationSchema.from_orm(annotation, owner_email=request.user.email).dict()
                for annotation in annotations_qs
            ]

            return annotations_data
        else:
            return {
                'error': 'Permission denied. You do not own this annotation, or the associated recording is not public.'
            }

    except Recording.DoesNotExist:
        return {'error': 'Recording not found'}
