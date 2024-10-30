<script lang="ts">
import { defineComponent, PropType, ref, Ref, watch } from "vue";
import { RecordingMimeTypes } from "../constants";
import { getCellLocation, getCellfromLocation, getGuanoMetadata } from "../api/api";
import MapLocation from "./MapLocation.vue";
import { useDate } from "vuetify/lib/framework.mjs";
import { getCurrentTime, extractDateTimeComponents } from '../use/useUtils';
export interface BatchRecording {
  name: string;
  file: File;
  date: string;
  time: string;
  equipment: string;
  comments: string;
  public: boolean;
  location?: { lat: number; lon: number };
  gridCellId?: number;
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
      type: Object as PropType<BatchRecording>,
      default: () => null,
    },
  },
  emits: ["done", "cancel", "update", "delete"],
  setup(props, { emit }) {
    const dateAdapter = useDate();
    const fileInputEl: Ref<HTMLInputElement | null> = ref(null);
    const fileModel: Ref<File | undefined> = ref(props.editing.file);
    const successfulUpload = ref(false);
    const errorText = ref("");
    const progressState = ref("");
    const recordedDate = ref(
      props.editing
        ? props.editing.date
        : new Date().toISOString().split("T")[0]
    ); // YYYY-MM-DD Time
    const recordedTime = ref(
      props.editing && props.editing.time ? props.editing.time.replace(/:/g, "") : getCurrentTime()
    ); // HHMMSS
    const uploadProgress = ref(0);
    const name = ref(props.editing ? props.editing.name : "");
    const equipment = ref(props.editing ? props.editing.equipment : "");
    const comments = ref(props.editing ? props.editing.comments : "");
    const validForm = ref(false);
    const latitude: Ref<number | undefined> = ref(
      props.editing?.location?.lat ? props.editing.location.lat : undefined
    );
    const longitude: Ref<number | undefined> = ref(
      props.editing?.location?.lon ? props.editing.location.lon : undefined
    );
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
        if (["SW", "NE", "NW", "SE"].includes(labelName)) {
          updatedQuadrant = labelName as "SW" | "NE" | "NW" | "SE" | undefined;
        }
        const { latitude: lat, longitude: lon } = (
          await getCellLocation(gridCellId.value, updatedQuadrant)
        ).data;
        if (lat && lon) {
          latitude.value = lat;
          longitude.value = lon;
        }
        // Next we get the latitude longitude for this sell Id and quadarnt
      }
      if (date && date.length === 8) {
        // We convert it to the YYYY-MM-DD time;
        recordedDate.value = `${date.slice(0, 4)}-${date.slice(
          4,
          6
        )}-${date.slice(6, 8)}`;
      }
      if (timestamp) {
        recordedTime.value = timestamp;
      }
    };
    const readFile = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target?.files?.length) {
        const file = target.files.item(0);
        if (!file) {
          return;
        }
        name.value = file.name.replace(/\.[^/.]+$/, "");
        await autoFill(name.value);
        if (!RecordingMimeTypes.includes(file.type)) {
          errorText.value = `Selected file is not one of the following types: ${RecordingMimeTypes.join(
            " "
          )}`;
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateTime = (time: any) => {
      recordedDate.value = new Date(time as string).toISOString().split("T")[0];
    };

    const setLocation = async ({ lat, lon }: { lat: number; lon: number }) => {
      latitude.value = lat;
      longitude.value = lon;
      const result = await getCellfromLocation(lat, lon);
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
    const updateMap = ref(0); // updates the map when lat/lon change by editing directly;

    const triggerUpdateMap = () => (updateMap.value += 1);

    watch(
      [
        name,
        gridCellId,
        latitude,
        longitude,
        equipment,
        comments,
        recordedDate,
        recordedTime,
        fileModel,
        publicVal,
      ],
      () => {
        //Data has been updated we emit the updated recording value
        if (fileModel.value) {
          const newRecording: BatchRecording = {
            name: name.value,
            date: recordedDate.value,
            time: recordedTime.value,
            equipment: equipment.value,
            comments: comments.value,
            gridCellId: gridCellId.value,
            file: fileModel.value,
            public: publicVal.value,
          };
          if (latitude.value && longitude.value) {
            newRecording.location = {
              lat: latitude.value,
              lon: longitude.value,
            };
          }
          emit('update', newRecording);
        }
      }
    );

    watch([() => props.editing.comments, () => props.editing.equipment, () => props.editing.public], () => {
        publicVal.value = props.editing.public;
        equipment.value = props.editing.equipment;
        comments.value = props.editing.comments;
    });

    return {
      errorText,
      fileModel,
      fileInputEl,
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

      getMetadata,
      selectFile,
      readFile,
      updateTime,
      setLocation,
      triggerUpdateMap,
      gridCellChanged,
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
    <input
      ref="fileInputEl"
      class="d-none"
      type="file"
      accept="audio/*"
      @change="readFile"
    >
    <v-container>
      <div>
        <v-form v-model="validForm">
          <v-row
            v-if="fileModel !== undefined"
            class="mx-2"
          >
            Upload {{ fileModel.name }} ?
          </v-row>
          <v-row
            v-else-if="fileModel === undefined"
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
            v-else
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
              :rules="[(v) => !!v || 'Requires a name']"
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
              <template #activator="{ props: subProps }">
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
                      :size="{ width: 600, height: 400 }"
                      :location="{ x: longitude, y: latitude }"
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

        <v-row class="mt-6">
          <v-btn
            color="error"
            @click="$emit('delete')"
          >
            Delete <v-icon>mdi-delete</v-icon>
          </v-btn>
        </v-row>
      </div>
    </v-container>
  </div>
</template>
