from django_large_image.rest import LargeImageFileDetailMixin
from rest_framework import mixins, serializers, viewsets

from bats_ai.core.models import CompressedSpectrogram


class CompressedSpectrogramSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompressedSpectrogram
        fields = '__all__'


class CompressedSpectrogramViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
    LargeImageFileDetailMixin,
):
    queryset = CompressedSpectrogram.objects.all()
    serializer_class = CompressedSpectrogramSerializer

    FILE_FIELD_NAME = 'image_file'
