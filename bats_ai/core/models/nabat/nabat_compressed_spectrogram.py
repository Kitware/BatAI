from PIL import Image
import cv2
from django.contrib.postgres.fields import ArrayField
from django.core.files.storage import default_storage
from django.db import models
from django.dispatch import receiver
from django_extensions.db.models import TimeStampedModel
import numpy as np

from .acoustic_batch import AcousticBatch
from .nabat_spectrogram import NABatSpectrogram

FREQ_MIN = 5e3
FREQ_MAX = 120e3
FREQ_PAD = 2e3


# TimeStampedModel also provides "created" and "modified" fields
class NABatCompressedSpectrogram(TimeStampedModel, models.Model):
    acoustic_batch = models.ForeignKey(AcousticBatch, on_delete=models.CASCADE)
    spectrogram = models.ForeignKey(NABatSpectrogram, on_delete=models.CASCADE)
    image_file = models.FileField()
    length = models.IntegerField()
    starts = ArrayField(ArrayField(models.IntegerField()))
    stops = ArrayField(ArrayField(models.IntegerField()))
    widths = ArrayField(ArrayField(models.IntegerField()))
    cache_invalidated = models.BooleanField(default=True)

    @property
    def image_url(self):
        return default_storage.url(self.image_file.name)

    def predict(self):
        import json
        import os

        import onnx
        import onnxruntime as ort
        import tqdm

        img = Image.open(self.image_file)

        relative = ('..',) * 4
        asset_path = os.path.abspath(os.path.join(__file__, *relative, 'assets'))

        onnx_filename = os.path.join(asset_path, 'model.mobilenet.onnx')
        assert os.path.exists(onnx_filename)

        session = ort.InferenceSession(
            onnx_filename,
            providers=[
                (
                    'CUDAExecutionProvider',
                    {
                        'cudnn_conv_use_max_workspace': '1',
                        'device_id': 0,
                        'cudnn_conv_algo_search': 'HEURISTIC',
                    },
                ),
                'CPUExecutionProvider',
            ],
        )

        img = np.array(img)

        h, w, c = img.shape
        ratio_y = 224 / h
        ratio_x = ratio_y * 0.5
        raw = cv2.resize(img, None, fx=ratio_x, fy=ratio_y, interpolation=cv2.INTER_LANCZOS4)

        h, w, c = raw.shape
        if w <= h:
            canvas = np.zeros((h, h + 1, 3), dtype=raw.dtype)
            canvas[:, :w, :] = raw
            raw = canvas
            h, w, c = raw.shape

        inputs_ = []
        for index in range(0, w - h, 100):
            inputs_.append(raw[:, index : index + h, :])
        inputs_.append(raw[:, -h:, :])
        inputs_ = np.array(inputs_)

        chunksize = 1
        chunks = np.array_split(inputs_, np.arange(chunksize, len(inputs_), chunksize))
        outputs = []
        for chunk in tqdm.tqdm(chunks, desc='Inference'):
            outputs_ = session.run(
                None,
                {'input': chunk},
            )
            outputs.append(outputs_[0])
        outputs = np.vstack(outputs)
        outputs = outputs.mean(axis=0)

        model = onnx.load(onnx_filename)
        mapping = json.loads(model.metadata_props[0].value)
        labels = [mapping['forward'][str(index)] for index in range(len(mapping['forward']))]

        prediction = np.argmax(outputs)
        label = labels[prediction]
        score = outputs[prediction]

        confs = dict(zip(labels, outputs))

        return label, score, confs


@receiver(models.signals.pre_delete, sender=NABatSpectrogram)
def delete_content(sender, instance, **kwargs):
    if instance.image_file:
        instance.image_file.delete(save=False)
