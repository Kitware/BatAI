import base64
import io
import logging
import math

from PIL import Image
import cv2
from django.core.files import File
from django.core.files.storage import default_storage
from django.db import models
from django.db.models.fields.files import FieldFile
from django.dispatch import receiver
from django_extensions.db.models import TimeStampedModel
import librosa
import matplotlib.pyplot as plt
import numpy as np
import tqdm

from .acoustic_batch import AcousticBatch

logger = logging.getLogger(__name__)

FREQ_MIN = 5e3
FREQ_MAX = 120e3
FREQ_PAD = 2e3

COLORMAP_ALLOWED = [None, 'gist_yarg', 'turbo']


# TimeStampedModel also provides "created" and "modified" fields
class NABatSpectrogram(TimeStampedModel, models.Model):
    acoustic_batch = models.ForeignKey(AcousticBatch, on_delete=models.CASCADE)
    image_file = models.FileField()
    width = models.IntegerField()  # pixels
    height = models.IntegerField()  # pixels
    duration = models.IntegerField()  # milliseconds
    frequency_min = models.IntegerField()  # hz
    frequency_max = models.IntegerField()  # hz
    colormap = models.CharField(max_length=20, blank=False, null=True)

    @classmethod
    def generate(cls, recording, colormap=None, dpi=520):
        """
        Ref: https://matplotlib.org/stable/users/explain/colors/colormaps.html
        """
        wav_file = recording.audio_file
        try:
            if isinstance(wav_file, FieldFile):
                sig, sr = librosa.load(io.BytesIO(wav_file.read()), sr=None)
                wav_file.name
            else:
                sig, sr = librosa.load(wav_file, sr=None)

            duration = len(sig) / sr
        except Exception as e:
            print(e)
            return None

        # Helpful aliases
        size_mod = 1
        high_res = False
        inference = False

        if colormap in ['inference']:
            colormap = None
            dpi = 300
            size_mod = 0
            inference = True
        if colormap in ['none', 'default', 'dark']:
            colormap = None
        if colormap in ['light']:
            colormap = 'gist_yarg'
        if colormap in ['heatmap']:
            colormap = 'turbo'
            high_res = True

        # Supported colormaps
        if colormap not in COLORMAP_ALLOWED:
            logger.warning(f'Substituted requested {colormap} colormap to default')
            logger.warning('See COLORMAP_ALLOWED')
            colormap = None

        # Function to take a signal and return a spectrogram.
        size = int(0.001 * sr)  # 1.0ms resolution
        size = 2 ** (math.ceil(math.log(size, 2)) + size_mod)
        hop_length = int(size / 4)

        # Short-time Fourier Transform
        window = librosa.stft(sig, n_fft=size, hop_length=hop_length, window='hamming')

        # Calculating and processing data for the spectrogram.
        window = np.abs(window) ** 2
        window = librosa.power_to_db(window)

        # Denoise spectrogram
        # Subtract median frequency
        window -= np.median(window, axis=1, keepdims=True)

        # Subtract mean amplitude
        window_ = window[window > 0]
        thresh = np.median(window_)
        window[window <= thresh] = 0

        bands = librosa.fft_frequencies(sr=sr, n_fft=size)
        for index in range(len(bands)):
            band_min = bands[index]
            band_max = bands[index + 1] if index < len(bands) - 1 else np.inf
            if band_max <= FREQ_MIN or FREQ_MAX <= band_min:
                window[index, :] = -1

        window = np.clip(window, 0, None)

        freq_low = int(FREQ_MIN - FREQ_PAD)
        freq_high = int(FREQ_MAX + FREQ_PAD)
        vmin = window.min()
        vmax = window.max()

        chunksize = int(2e3)
        arange = np.arange(chunksize, window.shape[1], chunksize)
        chunks = np.array_split(window, arange, axis=1)

        imgs = []
        for chunk in tqdm.tqdm(chunks):
            h, w = chunk.shape
            alpha = 3
            figsize = (int(math.ceil(w / h)) * alpha + 1, alpha)
            fig = plt.figure(figsize=figsize, facecolor='black', dpi=dpi)
            ax = plt.axes()
            plt.margins(0)

            kwargs = {
                'sr': sr,
                'n_fft': size,
                'hop_length': hop_length,
                'x_axis': 's',
                'y_axis': 'fft',
                'ax': ax,
                'vmin': vmin,
                'vmax': vmax,
            }

            # Plot
            if colormap is None:
                librosa.display.specshow(chunk, **kwargs)
            else:
                librosa.display.specshow(chunk, cmap=colormap, **kwargs)

            ax.set_ylim(freq_low, freq_high)
            ax.axis('off')

            buf = io.BytesIO()
            fig.savefig(buf, bbox_inches='tight', pad_inches=0)

            fig.clf()
            plt.close()

            buf.seek(0)
            img = Image.open(buf)

            img = np.array(img)
            mask = img[:, :, -1]
            flags = np.where(np.sum(mask != 0, axis=0) == 0)[0]
            index = flags.min() if len(flags) > 0 else img.shape[1]
            img = img[:, :index, :3]

            imgs.append(img)

        if inference:
            w_ = int(4.0 * duration * 1e3)
            h_ = int(dpi)
        else:
            w_ = int(8.0 * duration * 1e3)
            h_ = 1200

        img = np.hstack(imgs)
        img = cv2.resize(img, (w_, h_), interpolation=cv2.INTER_LANCZOS4)

        if high_res:
            img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

            noise = 0.1
            img = img.astype(np.float32)
            img -= img.min()
            img /= img.max()
            img *= 255.0
            img /= 1.0 - noise
            img[img < 0] = 0
            img[img > 255] = 255
            img = 255.0 - img  # invert

            img = cv2.blur(img, (9, 9))
            img = cv2.resize(img, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_LANCZOS4)
            img = cv2.blur(img, (9, 9))

            img -= img.min()
            img /= img.max()
            img *= 255.0

            mask = (img > 255 * noise).astype(np.float32)
            mask = cv2.blur(mask, (5, 5))

            img[img < 0] = 0
            img[img > 255] = 255
            img = np.around(img).astype(np.uint8)
            img = cv2.applyColorMap(img, cv2.COLORMAP_TURBO)

            img = img.astype(np.float32)
            img *= mask.reshape(*mask.shape, 1)
            img[img < 0] = 0
            img[img > 255] = 255
            img = np.around(img).astype(np.uint8)

        # cv2.imwrite('temp.png', img)

        img = Image.fromarray(img, 'RGB')
        w, h = img.size

        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=80)
        buf.seek(0)

        name = f'{recording.pk}_{colormap}_spectrogram.jpg'
        image_file = File(buf, name=name)

        spectrogram = cls(
            recording_id=recording.pk,
            image_file=image_file,
            width=w,
            height=h,
            duration=math.ceil(duration * 1e3),
            frequency_min=freq_low,
            frequency_max=freq_high,
            colormap=colormap,
        )
        spectrogram.save()
        return spectrogram.pk

    @property
    def image_np(self):
        return np.array(self.image)

    @property
    def image_pil(self):
        return self.image

    @property
    def image(self):
        img = Image.open(self.image_file)
        return img

    @property
    def base64(self):
        img = self.image_file.read()
        img_base64 = base64.b64encode(img).decode('utf-8')

        return img_base64

    @property
    def image_url(self):
        return default_storage.url(self.image_file.name)


@receiver(models.signals.pre_delete, sender=NABatSpectrogram)
def delete_content(sender, instance, **kwargs):
    if instance.image_file:
        instance.image_file.delete(save=False)
