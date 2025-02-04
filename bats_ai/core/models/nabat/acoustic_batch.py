import logging

from django.contrib.gis.db import models
from django_extensions.db.models import TimeStampedModel

from bats_ai.core.models import Species

logger = logging.getLogger(__name__)

COLORMAP = None


class colormap:
    def __init__(self, colormap=None):
        self.colormap = colormap
        self.previous = None

    def __enter__(self):
        global COLORMAP

        self.previous = COLORMAP
        COLORMAP = self.colormap

    def __exit__(self, exc_type, exc_value, exc_tb):
        global COLORMAP

        COLORMAP = self.previous


# TimeStampedModel also provides "created" and "modified" fields
class AcousticBatch(TimeStampedModel, models.Model):
    name = models.CharField(max_length=255)
    batch_id = models.BigIntegerField(blank=False, null=False)
    equipment = models.TextField(blank=True, null=True)
    comments = models.TextField(blank=True, null=True)
    recording_location = models.GeometryField(srid=4326, blank=True, null=True)
    grts_cell_id = models.IntegerField(blank=True, null=True)
    grts_cell = models.IntegerField(blank=True, null=True)
    public = models.BooleanField(default=False)
    software_name = models.TextField(blank=True, null=True)
    software_developer = models.TextField(blank=True, null=True)
    software_version = models.TextField(blank=True, null=True)
    detector = models.TextField(blank=True, null=True)
    nabat_auto_species = models.ForeignKey(Species, null=True)
    nabat_manual_species = models.ForeignKey(Species, null=True)
    species_list = models.TextField(blank=True, null=True)
    computed_species = models.ManyToManyField(
        Species, related_name='recording_computed_species'
    )  # species from a computed sense
    official_species = models.ManyToManyField(
        Species, related_name='recording_official_species'
    )  # species that are detemrined by the owner or from annotations as official species list
    unusual_occurrences = models.TextField(blank=True, null=True)

    @property
    def has_spectrogram(self):
        return len(self.spectrograms) > 0

    @property
    def spectrograms(self):
        from bats_ai.core.models.nabat import NABatSpectrogram

        query = NABatSpectrogram.objects.filter(acoustic_batch=self, colormap=COLORMAP).order_by(
            '-created'
        )
        return query.all()

    @property
    def spectrogram(self):
        pass

        spectrograms = self.spectrograms

        assert len(spectrograms) >= 1
        spectrogram = spectrograms[0]  # most recently created

        return spectrogram

    @property
    def has_compressed_spectrogram(self):
        return len(self.compressed_spectrograms) > 0

    @property
    def compressed_spectrograms(self):
        from bats_ai.core.models import CompressedSpectrogram

        query = CompressedSpectrogram.objects.filter(acoustic_batch=self).order_by('-created')
        return query.all()

    @property
    def compressed_spectrogram(self):
        pass

        compressed_spectrograms = self.compressed_spectrograms

        assert len(compressed_spectrograms) >= 1
        spectrogram = compressed_spectrograms[0]  # most recently created

        return spectrogram
