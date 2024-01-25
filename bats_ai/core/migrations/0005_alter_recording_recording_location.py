# Generated by Django 4.1.13 on 2024-01-25 13:09

import django.contrib.gis.db.models.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_spectrogram'),
    ]

    operations = [
        migrations.AlterField(
            model_name='recording',
            name='recording_location',
            field=django.contrib.gis.db.models.fields.GeometryField(blank=True, null=True, srid=4326),
        ),
    ]
