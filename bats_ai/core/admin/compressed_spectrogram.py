from django.contrib import admin

from bats_ai.core.models import CompressedSpectrogram


@admin.register(CompressedSpectrogram)
class CompressedSpectrogramAdmin(admin.ModelAdmin):
    list_display = [
        'pk',
        'recording',
        'spectrogram',
        'image_file',
        'length',
        'widths',
        'starts',
        'stops',
    ]
    list_display_links = ['pk', 'recording', 'spectrogram']
    list_select_related = True
    autocomplete_fields = ['recording']
    readonly_fields = [
        'recording',
        'spectrogram',
        'image_file',
        'created',
        'modified',
        'widths',
        'starts',
        'stops',
    ]
