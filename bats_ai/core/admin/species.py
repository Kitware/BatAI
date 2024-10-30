from django.contrib import admin

from bats_ai.core.models import Species


@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = [
        'pk',
        'species_code',
        'family',
        'genus',
        'species',
        'common_name',
        'species_code_6',
    ]
    list_select_related = True
