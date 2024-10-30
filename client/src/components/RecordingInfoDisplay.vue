<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Recording } from '../api/api';
import MapLocation from './MapLocation.vue';


export default defineComponent({
  components: {
    MapLocation
  },
  props: {
    recordingInfo: {
      type: Object as PropType<Recording>,
      required: true,
    },
    disableButton: {
      type: Boolean,
      default: false,
    }
  },
  emits: ['close'],
  setup() {
    return {

    };
  },
});
</script>

<template>
  <v-card v-if="recordingInfo">
    <v-card-title>
      {{ recordingInfo.name }}
    </v-card-title>
    <v-card-text>
      <v-row>
        <div><b>Filename:</b><span>{{ recordingInfo.audio_file }}</span></div>
      </v-row>
      <v-row>
        <div><b>Owner:</b><span>{{ recordingInfo.owner_username }}</span></div>
      </v-row>
      <v-row>
        <div><b>Time:</b><span>{{ recordingInfo.recorded_date }}</span> <span> {{ recordingInfo.recorded_time }}</span></div>
      </v-row>
      <v-row>
        <div><b>Equipment:</b><span>{{ recordingInfo.equipment || 'None' }}</span></div>
      </v-row>
      <v-row>
        <div><b>Comments:</b><span>{{ recordingInfo.comments || 'None' }}</span></div>
      </v-row>
      <v-row>
        <div><b>GRTS CellId:</b><span>{{ recordingInfo.grts_cell_id }}</span></div>
      </v-row>
      <v-row v-if="recordingInfo.recording_location">
        <v-spacer />
        <map-location
          :editor="false"
          :size="{width: 400, height: 400}"
          :location="{ x: recordingInfo.recording_location.coordinates[0], y:recordingInfo.recording_location.coordinates[1]}"
        />
        <v-spacer />
      </v-row>
      
      <div
        v-if="recordingInfo.site_name"
        class="mt-5"
      >
        <v-row><h3>Guano Metadata</h3></v-row>
        <v-row v-if="recordingInfo.site_name">
          <div><b>Site Name:</b><span>{{ recordingInfo.site_name }}</span></div>
        </v-row>
        <v-row v-if="recordingInfo.software">
          <div><b>Software:</b><span>{{ recordingInfo.software }}</span></div>
        </v-row>
        <v-row v-if="recordingInfo.detector">
          <div><b>Detector:</b><span>{{ recordingInfo.detector }}</span></div>
        </v-row>
        <v-row v-if="recordingInfo.species_list">
          <div><b>Species List:</b><span>{{ recordingInfo.species_list }}</span></div>
        </v-row>
        <v-row v-if="recordingInfo.unusual_occurrences">
          <div><b>Unusual Occurrences:</b><span>{{ recordingInfo.unusual_occurrences }}</span></div>
        </v-row>
      </div>
    </v-card-text>
    <v-card-actions v-if="!disableButton">
      <v-row>
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="$emit('close')"
        >
          OK
        </v-btn>
        <v-spacer />
      </v-row>
    </v-card-actions>
  </v-card>
</template>
