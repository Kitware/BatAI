# Generated by Django 4.1.13 on 2024-01-30 17:43

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0004_spectrogram'),
    ]

    operations = [
        migrations.AddField(
            model_name='recording',
            name='public',
            field=models.BooleanField(default=False),
        ),
    ]
