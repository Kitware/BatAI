from django.contrib.gis.geos import Point, Polygon
from django.http import HttpRequest, JsonResponse
from ninja import Query
from ninja.pagination import RouterPaginated

from bats_ai.core.models import GRTSCells

router = RouterPaginated()


@router.get('/grid_cell_id')
def get_grid_cell_id(
    request: HttpRequest, latitude: float = Query(...), longitude: float = Query(...)  # noqa: B008
):
    try:
        # Create a point object from the provided latitude and longitude
        point = Point(longitude, latitude, srid=4326)

        # Query the grid cell that contains the provided point
        cell = GRTSCells.objects.filter(geom_4326__contains=point).first()

        if cell:
            # Return the grid cell ID
            return JsonResponse({'grid_cell_id': cell.grts_cell_id})
        else:
            return JsonResponse(
                {'error': 'No grid cell found for the provided latitude and longitude'}, status=200
            )
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=200)


@router.get('/{id}')
def get_cell_center(request: HttpRequest, id: int, quadrant: str = None):
    try:
        cells = GRTSCells.objects.filter(grts_cell_id=id)

        # Define a custom order for sample_frame_id
        custom_order = GRTSCells.sort_order()  # Define your custom order here

        # Define a custom key function to sort cells based on the custom order
        def custom_sort_key(cell):
            return custom_order.index(cell.sample_frame_id)

        # Sort the cells queryset based on the custom order
        sorted_cells = sorted(cells, key=custom_sort_key)
        cell = sorted_cells[0]
        geom_4326 = cell.geom_4326

        # Get the centroid of the entire cell polygon
        center = geom_4326.centroid

        if quadrant:
            # If quadrant is specified, divide the cell polygon into quadrants
            min_x, min_y, max_x, max_y = geom_4326.extent
            mid_x = (min_x + max_x) / 2
            mid_y = (min_y + max_y) / 2

            # Determine the bounding box coordinates of the specified quadrant
            if quadrant.upper() == 'NW':
                bbox = (min_x, mid_y, mid_x, max_y)
            elif quadrant.upper() == 'SE':
                bbox = (mid_x, min_y, max_x, mid_y)
            elif quadrant.upper() == 'SW':
                bbox = (min_x, min_y, mid_x, mid_y)
            elif quadrant.upper() == 'NE':
                bbox = (mid_x, mid_y, max_x, max_y)

            quadrant_polygon = Polygon.from_bbox(bbox)

            # Intersect the cell polygon with the specified quadrant's polygon
            quadrant_polygon = geom_4326.intersection(quadrant_polygon)

            # Get the centroid of the intersected polygon
            center = quadrant_polygon.centroid

        # Get the latitude and longitude of the centroid
        center_latitude = center.y
        center_longitude = center.x

        return JsonResponse({'latitude': center_latitude, 'longitude': center_longitude})
    except GRTSCells.DoesNotExist:
        return JsonResponse({'error': f'Cell with cellId={id} does not exist'}, status=200)
