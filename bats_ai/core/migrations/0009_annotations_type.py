# Generated by Django 4.1.13 on 2024-03-22 17:23

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0008_grtscells_recording_recorded_time'),
    ]

    operations = [
        migrations.AddField(
            model_name='annotations',
            name='type',
            field=models.TextField(blank=True, null=True),
        ),
    ]
