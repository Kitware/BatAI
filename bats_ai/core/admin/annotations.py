from django.contrib import admin

from bats_ai.core.models import Annotations


@admin.register(Annotations)
class AnnotationsAdmin(admin.ModelAdmin):
    list_display = [
        'pk',
        'recording',
        'owner',
        'start_time',
        'end_time',
        'low_freq',
        'high_freq',
        'type',
        'comments',
    ]
    list_select_related = True
    # list_select_related = ['owner']
    filter_horizontal = ('species',)  # or filter_vertical
    autocomplete_fields = ['owner']
