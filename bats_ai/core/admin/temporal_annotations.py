from django.contrib import admin

from bats_ai.core.models import TemporalAnnotations


@admin.register(TemporalAnnotations)
class TemporalAnnotationsAdmin(admin.ModelAdmin):
    list_display = [
        'pk',
        'recording',
        'owner',
        'start_time',
        'end_time',
        'type',
        'comments',
    ]
    list_select_related = True
    autocomplete_fields = ['owner']
