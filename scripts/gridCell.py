import click
import fiona
import pyproj
from shapely.geometry import Point, shape

# Global variable for the shapefile location
SHAPEFILE_PATH = './combined_shapefile.shp'


target_crs = 'epsg:5070'
source_crs = 'epsg:4326'
# Load the shapefile using fiona
with fiona.open(SHAPEFILE_PATH, 'r') as shp:
    # Create a coordinate transformer
    transformer = pyproj.Transformer.from_crs(source_crs, target_crs, always_xy=True)
    data = []
    for feature in shp:
        data.append({'id': feature['id'], 'geometry': shape(feature['geometry'])})


def get_gridcell_id(latitude, longitude, data):
    x, y = transformer.transform(longitude, latitude)
    point = Point(x, y)
    for index, feature in enumerate(data):
        if point.within(feature['geometry']):
            print(f'Found index {index}, Feature ID: {feature["id"]}')
            return index, feature['id']  # Returning index and Feature ID
    return None, None


@click.command()
@click.argument('latitude', type=float)
@click.argument('longitude', type=float)
def main(latitude, longitude):
    gridcell_id, feature_id = get_gridcell_id(latitude, longitude, data)

    if gridcell_id is not None:
        click.echo(f'The gridcell ID is: {gridcell_id}, Feature ID: {feature_id}')
    else:
        click.echo('Point not found in any grid cell.')


if __name__ == '__main__':
    main()
