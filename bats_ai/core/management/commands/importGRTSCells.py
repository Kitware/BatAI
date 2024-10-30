import csv

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand

from bats_ai.core.models import GRTSCells


class Command(BaseCommand):
    help = 'Import data from CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')

    def handle(self, *args, **options):
        csv_file = options['csv_file']

        # Get all field names of the GRTSCells model
        model_fields = [field.name for field in GRTSCells._meta.get_fields()]

        with open(csv_file) as file:
            reader = csv.DictReader(file)
            total_rows = sum(1 for _ in reader)  # Get total number of rows in the CSV
            file.seek(0)  # Reset file pointer to start
            next(reader)  # Skip header row
            counter = 0  # Initialize progress counter

            for row in reader:
                # Filter row dictionary to include only keys that exist in the model fields
                filtered_row = {key: row[key] for key in row if key in model_fields}

                for key, value in filtered_row.items():
                    if value == '':
                        filtered_row[key] = None

                # Convert boolean fields from string to boolean values
                for boolean_field in ['priority_frame', 'priority_state', 'clipped']:
                    if filtered_row.get(boolean_field):
                        if filtered_row[boolean_field].lower() == 'true':
                            filtered_row[boolean_field] = True
                        elif filtered_row[boolean_field].lower() == 'false':
                            filtered_row[boolean_field] = False
                        else:
                            raise ValidationError(
                                f'Invalid boolean value for field {boolean_field}: {filtered_row[boolean_field]}'
                            )

                # Check if a record with all the data already exists
                if GRTSCells.objects.filter(**filtered_row).exists():
                    # self.stdout.write(f'Skipping row because it already exists: {filtered_row}')
                    counter += 1
                    self.stdout.write(f'Processed {counter} of {total_rows} rows')
                    continue

                try:
                    GRTSCells.objects.create(**filtered_row)
                    counter += 1
                    self.stdout.write(f'Processed {counter} of {total_rows} rows')
                except ValidationError as e:
                    self.stderr.write(str(e))
                    continue
