from .annotations import AnnotationsAdmin
from .compressed_spectrogram import CompressedSpectrogramAdmin
from .grts_cells import GRTSCellsAdmin
from .image import ImageAdmin
from .recording import RecordingAdmin
from .species import SpeciesAdmin
from .spectrogram import SpectrogramAdmin
from .temporal_annotations import TemporalAnnotationsAdmin

__all__ = [
    'AnnotationsAdmin',
    'ImageAdmin',
    'RecordingAdmin',
    'SpectrogramAdmin',
    'TemporalAnnotationsAdmin',
    'SpeciesAdmin',
    'GRTSCellsAdmin',
    'CompressedSpectrogramAdmin',
]
