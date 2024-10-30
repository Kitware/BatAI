<script lang="ts">
import { defineComponent, PropType, ref, Ref } from 'vue';
import { RecordingMimeTypes } from '../constants';
import useRequest from '../use/useRequest';
import { UploadLocation, uploadRecordingFile, patchRecording, getCellLocation, getCellfromLocation, getGuanoMetadata, RecordingFileParameters } from '../api/api';
import MapLocation from './MapLocation.vue';
import { useDate } from 'vuetify/lib/framework.mjs';
import { getCurrentTime, extractDateTimeComponents } from '../use/useUtils';
export interface EditingRecording {
  id: number;
  name: string;
  date: string;
  time: string;
  equipment: string;
  comments: string;
  public: boolean;
  location?: { lat: number, lon: number };
  siteName?: string;
  software?: string;
  detector?: string;
  speciesList?: string;
  unusualOccurrences?: string;
}

export default defineComponent({
  components: {
    MapLocation,
  },
  props: {
    editing: {
      type: Object as PropType<EditingRecording | null>,
      default: () => null,
    }
  },
  emits: ['done', 'cancel'],
  setup(props, { emit }) {
    const dateAdapter = useDate();
    const fileInputEl: Ref<HTMLInputElement | null> = ref(null);
    const fileModel: Ref<File | undefined> = ref();
    const successfulUpload = ref(false);
    const errorText = ref('');
    const progressState = ref('');
    const recordedDate = ref(props.editing ? props.editing.date : new Date().toISOString().split('T')[0]); // YYYY-MM-DD Time
    const recordedTime = ref(props.editing && props.editing.time ? props.editing.time.replace(/:/g, "") : getCurrentTime()); // HHMMSS
    const uploadProgress = ref(0);
    const name = ref(props.editing ? props.editing.name : '');
    const equipment = ref(props.editing ? props.editing.equipment : '');
    const comments = ref(props.editing ? props.editing.comments : '');
    const validForm = ref(false);
    const latitude: Ref<number | undefined> = ref(props.editing?.location?.lat ? props.editing.location.lat : undefined);
    const longitude: Ref<number | undefined> = ref(props.editing?.location?.lon ? props.editing.location.lon : undefined);
    const gridCellId: Ref<number | undefined> = ref();
    const publicVal = ref(props.editing ? props.editing.public : false);
    // Guano Metadata
    const siteName = ref(props.editing?.siteName || '');
    const software = ref(props.editing?.software || '');
    const detector = ref(props.editing?.detector || '');
    const speciesList = ref(props.editing?.speciesList || '');
    const unusualOccurrences = ref(props.editing?.unusualOccurrences || '');
    const autoFill = async (filename: string) => {

      const regexPattern = /^(\d+)_(.+)_(\d{8})_(\d{6})(?:_(.*))?$/;

      // Match the file name against the regular expression
      const match = filename.match(regexPattern);

      // If there's no match, return null
      if (!match) {
          return null;
      }

      // Extract the matched groups
      const cellId = match[1];
      const labelName = match[2];
      const date = match[3];
      const timestamp = match[4];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const extraData = match[5] || null; // Additional data after the required parts

      // Extracting individual components
      if (cellId) {
        gridCellId.value = parseInt(cellId, 10);
        let updatedQuadrant;
        if (['SW', 'NE', 'NW', 'SE'].includes(labelName)) {
          updatedQuadrant = labelName as 'SW' | 'NE' | 'NW' | 'SE' | undefined;
        }
        const { latitude: lat , longitude: lon } = (await getCellLocation(gridCellId.value, updatedQuadrant)).data;
        if (lat && lon) {
          latitude.value = lat;
          longitude.value = lon;
        }
        // Next we get the latitude longitude for this sell Id and quadarnt
      }
      if (date && date.length === 8) {
        // We convert it to the YYYY-MM-DD time;
        recordedDate.value = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6,8)}`;
      }
      if (timestamp) {
        recordedTime.value = timestamp;
      }
    };
    const readFile = async (e: Event) => {
      const target = (e.target as HTMLInputElement);
      if (target?.files?.length) {
        const file = target.files.item(0);
        if (!file) {
          return;
        }
        name.value = file.name.replace(/\.[^/.]+$/, "");
        await autoFill(name.value);
        if (!RecordingMimeTypes.includes(file.type)) {
          errorText.value = `Selected file is not one of the following types: ${RecordingMimeTypes.join(' ')}`;
          return;
        }
        fileModel.value = file;
      }
    };
    function selectFile() {
      if (fileInputEl.value !== null) {
        fileInputEl.value.click();
      }
    }


    const { request: submit, loading: submitLoading } = useRequest(async () => {
      const file = fileModel.value;
      if (!file) {
        throw new Error('Unreachable');
      }
      let location: UploadLocation = null;
      if (latitude.value && longitude.value) {
        location = {
          latitude: latitude.value,
          longitude: longitude.value,
        };
      }
      if (gridCellId.value !== null) {
        if (location === null) {
          location  = {};
        }
        location['gridCellId'] = gridCellId.value;
      }
      const fileUploadParams: RecordingFileParameters = {
          name: name.value,
          recorded_date: recordedDate.value,
          recorded_time: recordedTime.value,
          equipment: equipment.value,
          comments: comments.value,
          publicVal: publicVal.value,
          location,
          site_name: siteName.value,
          software: software.value,
          detector: detector.value,
          species_list: speciesList.value,
          unusual_occurrences: unusualOccurrences.value,
        };

      await uploadRecordingFile(file, fileUploadParams);
      emit('done');
    });

    const getMetadata = async () => {
      if (fileModel.value) {
        const results = await getGuanoMetadata(fileModel.value);
        if (results.nabat_site_name) {
          siteName.value = results.nabat_site_name;
        }
        if (results.nabat_software_type) {
          software.value = results.nabat_software_type;
        }
        if (results.nabat_detector_type) {
          detector.value = results.nabat_detector_type;
        }
        if (results.nabat_species_list) {
          speciesList.value = results.nabat_species_list.join(',');
        }
        if (results.nabat_unusual_occurrences) {
          unusualOccurrences.value = results.nabat_unusual_occurrences;
        }
        // Finally we get the latitude/longitude or gridCell Id if it's available.
        const startTime = results.nabat_activation_start_time;
        const NaBatgridCellId = results.nabat_grid_cell_grts_id;
        const NABatlatitude = results.nabat_latitude;
        const NABatlongitude = results.nabat_longitude;
        if (startTime) {
          const {date, time} = extractDateTimeComponents(startTime);
          recordedDate.value = date;
          recordedTime.value = time;
        }
        if (NaBatgridCellId) {
          gridCellId.value = parseInt(NaBatgridCellId);
        }
        if (NABatlatitude && NABatlongitude) {
          latitude.value = NABatlatitude;
          longitude.value = NABatlongitude;
        }
      }
    };

    const handleSubmit = async () => {
      if (props.editing) {
        let location: UploadLocation = null;
        if (latitude.value && longitude.value) {
          location = {
            latitude: latitude.value,
            longitude: longitude.value,
          };
        }
        if (gridCellId.value !== null) {
          if (location === null) {
            location  = {};
          }
          location['gridCellId'] = gridCellId.value;
        }
        const fileUploadParams: RecordingFileParameters = {
          name: name.value,
          recorded_date: recordedDate.value,
          recorded_time: recordedTime.value,
          equipment: equipment.value,
          comments: comments.value,
          publicVal: publicVal.value,
          location,
          site_name: siteName.value,
          software: software.value,
          detector: detector.value,
          species_list: speciesList.value,
          unusual_occurrences: unusualOccurrences.value,
        };

        await patchRecording(props.editing.id, fileUploadParams);
        emit('done');
      } else {
        submit();
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateTime = (time: any)  => {
    recordedDate.value = new Date(time as string).toISOString().split('T')[0];
  };

  const setLocation = async ({lat, lon}: {lat: number, lon: number}) => {
    latitude.value = lat;
    longitude.value = lon;
    const result  = await getCellfromLocation(lat, lon);
    if (result.data.grid_cell_id) {
      gridCellId.value = result.data.grid_cell_id;
    } else if (result.data.error) {
      gridCellId.value = undefined;
    }
  };

  const gridCellChanged = async () => {
    if (gridCellId.value) {
      const result = await getCellLocation(gridCellId.value);
      if (result.data.latitude && result.data.longitude) {
        latitude.value = result.data.latitude;
        longitude.value = result.data.longitude;
        triggerUpdateMap();
        
      }
    }
  };

  const updateMap = ref(0); // updates the map when lat/lon change by editing directly;

  const triggerUpdateMap = () => updateMap.value += 1;

    return {
      errorText,
      fileModel,
      fileInputEl,
      submitLoading,
      successfulUpload,
      progressState,
      uploadProgress,
      name,
      equipment,
      comments,
      recordedDate,
      validForm,
      latitude,
      longitude,
      gridCellId,
      publicVal,
      updateMap,
      recordedTime,
      // Guano Metadata
      siteName,
      software,
      detector,
      speciesList,
      unusualOccurrences,
      selectFile,
      readFile,
      handleSubmit,
      updateTime,
      setLocation,
      triggerUpdateMap,
      gridCellChanged,
      getMetadata,
      dateAdapter,
    };
  },
});
</script>

<template>
  <div
    style="height: 100%"
    class="d-flex pa-1"
  >
    <v-alert
      v-if="successfulUpload"
      v-model="successfulUpload"
      type="success"
      dismissible
    >
      Data successfully uploaded
    </v-alert>
    <input
      ref="fileInputEl"
      class="d-none"
      type="file"
      accept="audio/*"
      @change="readFile"
    >
    <v-card
      width="100%"
      style="max-height:90vh; overflow-y: scroll;"
    >
      <v-container>
        <v-card-title>
          {{ editing ? 'Edit' : 'Upload' }} Recording
        </v-card-title>
        <v-card-text>
          <v-form v-model="validForm">
            <v-row
              v-if="errorText === '' && progressState === '' && fileModel !== undefined && !editing"
              class="mx-2"
            >
              Upload {{ fileModel.name }} ?
            </v-row>
            <v-row
              v-else-if="fileModel === undefined && !editing"
              class="mx-2 my-2"
            >
              <v-btn
                block
                color="primary"
                @click="selectFile"
              >
                <v-icon class="pr-2">
                  mdi-audio
                </v-icon>
                Choose Audio
              </v-btn>
            </v-row>
            <v-row
              v-else-if="progressState !== '' && !editing"
              class="mx-2"
            >
              <v-progress-linear
                v-model="uploadProgress"
                color="secondary"
                height="25"
                class="ma-auto text-xs-center"
              >
                <strong>{{ progressState }} : {{ Math.ceil(uploadProgress) }}%</strong>
              </v-progress-linear>
            </v-row>
            <v-row
              v-else-if="!editing"
              class="mx-2"
            >
              <v-alert type="error">
                {{ errorText }}
              </v-alert>
            </v-row>
            <v-row>
              <v-text-field
                v-model="name"
                label="name"
                :rules="[ v => !!v || 'Requires a name']"
              />
            </v-row>
            <v-row>
              <v-checkbox
                v-model="publicVal"
                label="Public"
                hint="Share Recording with other Users"
                persistent-hint
              />
            </v-row>
            <v-row class="pb-4">
              <v-menu
                open-delay="20"
                :close-on-content-click="false"
              >
                <template #activator="{ props:subProps }">
                  <v-btn
                    color="primary"
                    v-bind="subProps"
                    class="mr-2"
                  >
                    <b>Recorded:</b>
                    <span> {{ recordedDate }}</span>
                  </v-btn>
                </template>
                <v-date-picker
                  :model-value="dateAdapter.parseISO(recordedDate)"
                  hide-actions
                  @update:model-value="updateTime($event)"
                />
              </v-menu>
              <v-spacer />
              <v-text-field
                v-model="recordedTime"
                label="Time"
                hint="HHMMSS"
                persistent-hint
              />
            </v-row>
            <v-row>
              <v-expansion-panels>
                <v-expansion-panel>
                  <v-expansion-panel-title>Location</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-row class="mt-2">
                      <v-text-field
                        v-model="latitude"
                        type="number"
                        label="LAT:"
                        class="mx-4"
                        @change="triggerUpdateMap()"
                      />
                      <v-text-field
                        v-model="longitude"
                        type="number"
                        label="LON:"
                        class="mx-4"
                        @change="triggerUpdateMap()"
                      />
                    </v-row>
                    <v-row>
                      <v-text-field
                        v-model="gridCellId"
                        type="number"
                        label="NABat Grid Cell"
                        @change="gridCellChanged()"
                      />
                    </v-row>
                    <v-row>
                      <v-spacer />
                      <map-location
                        :size="{width: 600, height: 400}"
                        :location="{ x: longitude, y: latitude}"
                        :update-map="updateMap"
                        @location="setLocation($event)"
                      />
                      <v-spacer />
                    </v-row>
                  </v-expansion-panel-text>
                </v-expansion-panel>
                <v-expansion-panel>
                  <v-expansion-panel-title>Details</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-row>
                      <v-text-field
                        v-model="equipment"
                        label="equipment"
                      />
                    </v-row>
                    <v-row>
                      <v-text-field
                        v-model="comments"
                        label="comments"
                      />
                    </v-row>
                  </v-expansion-panel-text>
                </v-expansion-panel>
                <v-expansion-panel>
                  <v-expansion-panel-title>Guano Metadata</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-row v-if="fileModel">
                      <v-btn
                        color="secondary"
                        :disabled="!fileModel"
                        @click="getMetadata"
                      >
                        Get Guano Metadata
                      </v-btn>
                    </v-row>
                    <v-row>
                      <v-text-field
                        v-model="siteName"
                        label="Site Name"
                      />
                    </v-row>
                    <v-row>
                      <v-text-field
                        v-model="software"
                        label="Software"
                      />
                    </v-row>
                    <v-row>
                      <v-text-field
                        v-model="detector"
                        label="Detector"
                      />
                    </v-row>
                    <v-row>
                      <v-text-field
                        v-model="speciesList"
                        label="Species List"
                      />
                    </v-row>
                    <v-row>
                      <v-text-field
                        v-model="unusualOccurrences"
                        label="Unusual Occurences"
                      />
                    </v-row>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            @click="$emit('cancel', true)"
          >
            Cancel
          </v-btn>
          <v-btn
            :disabled=" (!fileModel && !editing) || errorText !== '' || submitLoading || !validForm"
            color="primary"
            @click="handleSubmit"
          >
            <span v-if="!submitLoading">
              Submit
            </span>
            <v-icon v-else>
              mdi-loading mdi-spin
            </v-icon>
          </v-btn>
        </v-card-actions>
      </v-container>
    </v-card>
  </div>
</template>
