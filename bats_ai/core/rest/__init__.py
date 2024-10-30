from rest_framework import routers

from .compressed_spectrogram import CompressedSpectrogramViewSet
from .spectrogram import SpectrogramViewSet

__all__ = [
    'SpectrogramViewSet',
    'CompressedSpectrogramViewSet',
]

rest = routers.SimpleRouter()
rest.register(r'spectrograms', SpectrogramViewSet)
rest.register(r'compressed_spectrograms', CompressedSpectrogramViewSet)
