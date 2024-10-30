import click
import guano


@click.command()
@click.argument('input_file', type=click.Path(exists=True))
@click.option('--output', '-o', default='output.json', help='Output JSON file path')
def extract_guano_metadata(input_file, output):
    try:
        # Load a .WAV file with (or without) GUANO metadata
        g = guano.GuanoFile(input_file)
        # Get and set metadata values like a Python dict
        print(f"GUANO Version: {g['GUANO|Version']}")
        # Print all the metadata values
        print('All Metadata:')
        for key, value in g.items():
            print(f'{key}: {value}')

        # Write the updated .WAV file back to disk

        click.echo(f'GUANO metadata extracted from {input_file} and saved to {output}')

    except Exception as e:
        click.echo(f'Error: {e}')


if __name__ == '__main__':
    extract_guano_metadata()
