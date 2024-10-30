import io
import tempfile

from PIL import Image
from celery import shared_task
import cv2
from django.core.files import File
import numpy as np
import scipy

from bats_ai.core.models import Annotations, CompressedSpectrogram, Recording, Spectrogram, colormap


def generate_compressed(recording: Recording, spectrogram: Spectrogram):
    img = spectrogram.image_np
    annotations = Annotations.objects.filter(recording=recording)

    threshold = 0.5
    while True:
        canvas = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        canvas = canvas.astype(np.float32)

        is_light = np.median(canvas) > 128.0
        if is_light:
            canvas = 255.0 - canvas

        amplitude = canvas.max(axis=0)
        amplitude -= amplitude.min()
        amplitude /= amplitude.max()
        amplitude[amplitude < threshold] = 0.0
        amplitude[amplitude > 0] = 1.0
        amplitude = amplitude.reshape(1, -1)

        canvas -= canvas.min()
        canvas /= canvas.max()
        canvas *= 255.0
        canvas *= amplitude
        canvas = np.around(canvas).astype(np.uint8)

        width = canvas.shape[1]
        for annotation in annotations:
            start = annotation.start_time / spectrogram.duration
            stop = annotation.end_time / spectrogram.duration

            start = int(np.around(start * width))
            stop = int(np.around(stop * width))
            canvas[:, start : stop + 1] = 255.0

        mask = canvas.max(axis=0)
        mask = scipy.signal.medfilt(mask, 3)
        mask[0] = 0
        mask[-1] = 0

        starts = []
        stops = []
        for index in range(1, len(mask) - 1):
            value_pre = mask[index - 1]
            value = mask[index]
            value_post = mask[index + 1]
            if value != 0:
                if value_pre == 0:
                    starts.append(index)
                if value_post == 0:
                    stops.append(index)
        assert len(starts) == len(stops)

        starts = [val - 40 for val in starts]  # 10 ms buffer
        stops = [val + 40 for val in stops]  # 10 ms buffer
        ranges = list(zip(starts, stops))

        while True:
            found = False
            merged = []
            index = 0
            while index < len(ranges) - 1:
                start1, stop1 = ranges[index]
                start2, stop2 = ranges[index + 1]

                start1 = min(max(start1, 0), len(mask))
                start2 = min(max(start2, 0), len(mask))
                stop1 = min(max(stop1, 0), len(mask))
                stop2 = min(max(stop2, 0), len(mask))

                if stop1 >= start2:
                    found = True
                    merged.append((start1, stop2))
                    index += 2
                else:
                    merged.append((start1, stop1))
                    index += 1
                if index == len(ranges) - 1:
                    merged.append((start2, stop2))
            ranges = merged
            if not found:
                for index in range(1, len(ranges)):
                    start1, stop1 = ranges[index - 1]
                    start2, stop2 = ranges[index]
                    assert start1 < stop1
                    assert start2 < stop2
                    assert start1 < start2
                    assert stop1 < stop2
                    assert stop1 < start2
                break

        segments = []
        starts_ = []
        stops_ = []
        domain = img.shape[1]
        widths = []
        total_width = 0
        for start, stop in ranges:
            segment = img[:, start:stop]
            segments.append(segment)

            starts_.append(int(round(spectrogram.duration * (start / domain))))
            stops_.append(int(round(spectrogram.duration * (stop / domain))))
            widths.append(stop - start)
            total_width += stop - start

            # buffer = np.zeros((len(img), 20, 3), dtype=img.dtype)
            # segments.append(buffer)
        # segments = segments[:-1]

        if len(segments) > 0:
            break

        threshold -= 0.05
        if threshold < 0:
            segments = None
            break

    if segments is None:
        canvas = img.copy()
    else:
        canvas = np.hstack(segments)

    canvas = Image.fromarray(canvas, 'RGB')
    buf = io.BytesIO()
    canvas.save(buf, format='JPEG', quality=80)
    buf.seek(0)

    # Use temporary files
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
        temp_file_name = temp_file.name
        canvas.save(temp_file_name)

        # Read the temporary file
        with open(temp_file_name, 'rb') as f:
            temp_file_content = f.read()

    # Wrap the content in BytesIO
    buf = io.BytesIO(temp_file_content)
    name = f'{spectrogram.pk}_spectrogram_compressed.jpg'
    image_file = File(buf, name=name)

    return total_width, image_file, widths, starts_, stops_


@shared_task
def image_compute_checksum(image_id: int):
    image = Image.objects.get(pk=image_id)
    image.compute_checksum()
    image.save()


@shared_task
def recording_compute_spectrogram(recording_id: int):
    recording = Recording.objects.get(pk=recording_id)

    cmaps = [
        None,  # Default (dark) spectrogram
        'light',  # Light spectrogram
    ]
    spectrogram_id = None
    for cmap in cmaps:
        with colormap(cmap):
            spectrogram_id_temp = Spectrogram.generate(recording, cmap)
            if cmap is None:
                spectrogram_id = spectrogram_id_temp
    if spectrogram_id is not None:
        generate_compress_spectrogram.delay(recording_id, spectrogram_id)


@shared_task
def generate_compress_spectrogram(recording_id: int, spectrogram_id: int):
    recording = Recording.objects.get(pk=recording_id)
    spectrogram = Spectrogram.objects.get(pk=spectrogram_id)
    length, image_file, widths, starts, stops = generate_compressed(recording, spectrogram)
    found = CompressedSpectrogram.objects.filter(recording=recording, spectrogram=spectrogram)
    if found.exists():
        existing = found.first()
        existing.length = length
        existing.image_file = image_file
        existing.widths = widths
        existing.starts = starts
        existing.stops = stops
        existing.cache_invalidated = False
        existing.save()
    else:
        CompressedSpectrogram.objects.create(
            recording=recording,
            spectrogram=spectrogram,
            image_file=image_file,
            length=length,
            widths=widths,
            starts=starts,
            stops=stops,
            cache_invalidated=False,
        )


@shared_task
def predict(compressed_spectrogram_id: int):
    compressed_spectrogram = CompressedSpectrogram.objects.get(pk=compressed_spectrogram_id)
    label, score, confs = compressed_spectrogram.predict()
    return label, score, confs
