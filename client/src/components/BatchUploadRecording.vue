<script lang="ts">
import { defineComponent, ref, Ref, watch } from 'vue';
import { RecordingMimeTypes } from '../constants';
import useRequest from '../use/useRequest';
import { UploadLocation, uploadRecordingFile, getCellLocation, RecordingFileParameters, getGuanoMetadata } from '../api/api';
import BatchRecordingElement, { BatchRecording } from './BatchRecordingElement.vue';
import { cloneDeep } from 'lodash';
import { extractDateTimeComponents, getCurrentTime } from '../use/useUtils';


interface AutoFillResult {
  name?: string;
  date?: string;
  time?: string;
  location?: {lat: number, lon: number};
  gridCellId?: number;
}

export default defineComponent({
  components: {
    BatchRecordingElement,
  },
  emits: ['done', 'cancel'],
  setup(props, { emit }) {
    const fileInputEl: Ref<HTMLInputElement | null> = ref(null);
    const fileModel: Ref<File | undefined> = ref();
    const recordings: Ref<BatchRecording[]> = ref([]);
    const successfulUpload = ref(false);
    const uploadProgress = ref(0);
    const errorText = ref('');
    const progressState = ref('');

    const globalPublic = ref(false);
    const globalEquipment = ref('');
    const globalComments = ref('');

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
      const baseDate = match[3];
      const timestamp = match[4];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const extraData = match[5] || null; // Additional data after the required parts
      // Extracting individual components
      const results: AutoFillResult = {
        name: filename.replace(/\.[^/.]+$/, ""),
      };
      if (cellId) {
        results.gridCellId = parseInt(cellId, 10);
        let updatedQuadrant;
        if (['SW', 'NE', 'NW', 'SE'].includes(labelName)) {
          updatedQuadrant = labelName as 'SW' | 'NE' | 'NW' | 'SE' | undefined;
        }
        const { latitude: lat , longitude: lon } = (await getCellLocation(results.gridCellId, updatedQuadrant)).data;
        if (lat && lon) {
          results.location = { lat, lon };
        }
        // Next we get the latitude longitude for this sell Id and quadarnt
      }
      if (baseDate && baseDate.length === 8) {
        // We convert it to the YYYY-MM-DD time;
        results.date = `${baseDate.slice(0, 4)}-${baseDate.slice(4, 6)}-${baseDate.slice(6,8)}`;
      }
      if (timestamp) {
        results.time = timestamp;
      }
      return results;
    };
    const readFile = async (e: Event) => {
      const target = (e.target as HTMLInputElement);
      if (target?.files?.length) {
        const files = target.files;
        if (!files) {
          return;
        }
        for (let i = 0; i< files.length; i+=1) {
          const file = files.item(i);
          if (file) {
            if (!RecordingMimeTypes.includes(file.type)) {
              errorText.value = `Selected file is not one of the following types: ${RecordingMimeTypes.join(' ')}`;
              return;
            }
            const name = file.name.replace(/\.[^/.]+$/, "");
            const data = await autoFill(name);
            if (data && data.name && data.time && data.date) {
              const newRecording: BatchRecording = {
                file,
                name: data.name,
                time: data.time,
                date: data.date,
                location: data.location,
                gridCellId: data.gridCellId,
                equipment: '',
                comments: '',
                public: false,

              };
              recordings.value.push(newRecording);
            } else {
              recordings.value.push({
                file,
                name: file.name,
                date: new Date().toISOString().split('T')[0],
                time: getCurrentTime(),
                equipment: '',
                comments: '',
                public: false,
              });

            }
          }
        }
      }
    };
    function selectFile() {
      if (fileInputEl.value !== null) {
        fileInputEl.value.click();
      }
    }


    const { request: submit, loading: submitLoading } = useRequest(async () => {
      const recordingCopies = cloneDeep(recordings.value);
      for (let i = 0; i < recordingCopies.length; i += 1) {
        const fileElement = recordingCopies[i];
        const file = fileElement.file;
        if (!file) {
          throw new Error('Unreachable');
        }
        let location: UploadLocation = null;
        if (fileElement.location) {
          location = { latitude: fileElement.location.lat, longitude: fileElement.location.lon };
        }
        if (fileElement.gridCellId !== null) {
          if (location === null) {
            location  = {};
          }
          location['gridCellId'] = fileElement.gridCellId;
        }
        const fileUploadParams: RecordingFileParameters = {
          name: fileElement.name,
          recorded_date: fileElement.date,
          recorded_time: fileElement.time,
          equipment: fileElement.equipment,
          comments: fileElement.comments,
          publicVal: fileElement.public,
          location,
          site_name: fileElement.siteName,
          software: fileElement.software,
          detector: fileElement.detector,
          species_list: fileElement.speciesList,
          unusual_occurrences: fileElement.unusualOccurrences,

        };
        await uploadRecordingFile(file, fileUploadParams);
        recordings.value.splice(0, 1);
      }
      emit('done');
    });

    const updateRecording = (index: number, data: BatchRecording) => {
      if (index < recordings.value.length) {
        recordings.value.splice(index, 1, data);
      }
    };
    const removeRecording = (index: number) => {
      if (index < recordings.value.length) {
        recordings.value.splice(index, 1);
      }
    };

    const getBatchMetadata = async () => {
      const updatedRecordings: BatchRecording[] = [];
      for (let i = 0; i < recordings.value.length; i += 1) {
        const recording  = recordings.value[i];
        const results = await getGuanoMetadata(recording.file);
        if (results.nabat_site_name) {
          recording.siteName = results.nabat_site_name;
        }
        if (results.nabat_software_type) {
          recording.software = results.nabat_software_type;
        }
        if (results.nabat_detector_type) {
          recording.detector = results.nabat_detector_type;
        }
        if (results.nabat_species_list) {
          recording.speciesList = results.nabat_species_list.join(',');
        }
        if (results.nabat_unusual_occurrences) {
          recording.unusualOccurrences = results.nabat_unusual_occurrences;
        }
        // Finally we get the latitude/longitude or gridCell Id if it's available.
        const startTime = results.nabat_activation_start_time;
        const NaBatgridCellId = results.nabat_grid_cell_grts_id;
        const NABatlatitude = results.nabat_latitude;
        const NABatlongitude = results.nabat_longitude;
        if (startTime) {
          const {date, time} = extractDateTimeComponents(startTime);
          recording.date = date;
          recording.time = time;
        }
        if (NaBatgridCellId) {
          recording.gridCellId= parseInt(NaBatgridCellId);
        }
        if (NABatlatitude && NABatlongitude) {
          recording.location = {
            lat: NABatlatitude,
            lon: NABatlongitude
          };
        }
        updatedRecordings.push(recording);
      }
      recordings.value = updatedRecordings;
    };

    watch([globalPublic, globalComments, globalEquipment], () => {
      const newResults: BatchRecording[] = [];
        recordings.value.forEach((item) => {
          item.public = globalPublic.value;
          if (globalComments.value) {
            item.comments = globalComments.value;
          }
          if (globalEquipment.value) {
            item.equipment = globalEquipment.value;
          }
          newResults.push(item);
        });
      recordings.value = newResults;
    });

    return {
      errorText,
      fileModel,
      fileInputEl,
      submitLoading,
      successfulUpload,
      progressState,
      uploadProgress,
      selectFile,
      readFile,
      recordings,
      submit,
      updateRecording,
      removeRecording,
      getBatchMetadata,
      globalPublic,
      globalEquipment,
      globalComments,
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
      multiple
      @change="readFile"
    >
    <v-card
      width="100%"
      style="max-height:90vh; overflow-y: scroll;"
    >
      <v-container>
        <v-card-title>
          Upload Multiple Recordings
        </v-card-title>
        <v-card-text>
          <v-row v-if="recordings.length === 0">
            <v-btn
              block
              color="primary"
              @click="selectFile"
            >
              <v-icon class="pr-2">
                mdi-audio
              </v-icon>
              Choose Audio Files
            </v-btn>
          </v-row>
          <v-expansion-panels v-else>
            <v-expansion-panel>
              <v-expansion-panel-title key="global_settings">
                Global Settings
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-row>
                  <v-btn
                    color="secondary"
                    @click="getBatchMetadata()"
                  >
                    Get Guano Metadata
                  </v-btn>
                </v-row>

                <v-row>
                  <v-checkbox
                    v-model="globalPublic"
                    label="Public"
                    hint="Share Recording with other Users"
                    persistent-hint
                  />
                </v-row>
                <v-row>
                  <v-text-field
                    v-model="globalEquipment"
                    label="equipment"
                  />
                </v-row>
                <v-row>
                  <v-text-field
                    v-model="globalComments"
                    label="comments"
                  />
                </v-row>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel
              v-for="(recording, index) in recordings"
              :key="`batch_${recording.name}`"
            >
              <v-expansion-panel-title>{{ recording.name }}</v-expansion-panel-title>
              <v-expansion-panel-text>
                <batch-recording-element
                  :editing="recording"
                  @update="updateRecording(index, $event)"
                  @delete="removeRecording(index)"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            @click="$emit('cancel')"
          >
            Cancel
          </v-btn>
          <v-btn
            :disabled=" (!recordings.length) || errorText !== '' || submitLoading"
            color="primary"
            @click="submit()"
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
