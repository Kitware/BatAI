# Generated by Django 4.1.13 on 2024-03-12 21:53

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0008_grtscells_recording_recorded_time'),
    ]

    operations = [
        migrations.AddField(
            model_name='spectrogram',
            name='colormap',
            field=models.CharField(max_length=20, null=True),
        ),
    ]
