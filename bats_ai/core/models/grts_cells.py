from django.contrib.gis.db import models

sample_frame_map = {
    12: 'Mexico',
    14: 'Contintental US',
    19: 'Canada',
    20: 'Alaska',
    21: 'Puerto Rico',
    15: 'Hawaii',
    22: 'Offshore Caribbean',
    23: 'Offshore AKCAN',
    24: 'Offshore CONUS',
    25: 'Offshore Hawaii',
    26: 'Offshore Mexico',
}


class GRTSCells(models.Model):
    id = models.IntegerField(primary_key=True)
    grts_cell_id = models.IntegerField()
    sample_frame_id = models.IntegerField(blank=True, null=True)
    grts_geom = models.GeometryField(blank=True, null=True)
    water_p = models.FloatField(blank=True, null=True)
    outside_p = models.FloatField(blank=True, null=True)
    location_1_type = models.CharField(max_length=255, blank=True, null=True)
    location_1_name = models.CharField(max_length=255, blank=True, null=True)
    location_1_p = models.FloatField(blank=True, null=True)
    location_2_type = models.CharField(max_length=255, blank=True, null=True)
    location_2_name = models.CharField(max_length=255, blank=True, null=True)
    location_2_p = models.FloatField(blank=True, null=True)
    sub_location_1_type = models.CharField(max_length=255, blank=True, null=True)
    sub_location_1_name = models.CharField(max_length=255, blank=True, null=True)
    sub_location_1_p = models.FloatField(blank=True, null=True)
    sub_location_2_type = models.CharField(max_length=255, blank=True, null=True)
    sub_location_2_name = models.CharField(max_length=255, blank=True, null=True)
    sub_location_2_p = models.FloatField(blank=True, null=True)
    own_1_name = models.CharField(max_length=255, blank=True, null=True)
    own_1_p = models.FloatField(blank=True, null=True)
    # continue defining all fields similarly
    priority_frame = models.BooleanField(blank=True, null=True)
    priority_state = models.BooleanField(blank=True, null=True)
    geom_4326 = models.GeometryField()
    clipped = models.BooleanField(blank=True, null=True)

    @property
    def sampleFrameMapping(self):
        return sample_frame_map[self.sample_frame_id]

    @staticmethod
    def sort_order():
        return [14, 20, 15, 24, 21, 19, 12, 22, 23, 25, 26]
