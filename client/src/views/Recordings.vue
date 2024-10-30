<script lang="ts">
import { defineComponent, ref, Ref, onMounted } from 'vue';
import { deleteRecording, getRecordings, Recording } from '../api/api';
import UploadRecording, { EditingRecording } from '../components/UploadRecording.vue';
import MapLocation from '../components/MapLocation.vue';
import useState from '../use/useState';
import BatchUploadRecording from '../components/BatchUploadRecording.vue';
import RecordingInfoDisplay from '../components/RecordingInfoDisplay.vue';
export default defineComponent({
    components: {
        UploadRecording,
        MapLocation,
        BatchUploadRecording,
        RecordingInfoDisplay
    },
  setup() {
    const itemsPerPage = ref(-1);
    const { sharedList, recordingList } = useState();
    const editingRecording: Ref<EditingRecording | null> = ref(null);
    let intervalRef: number | null = null;

    const uploadDialog = ref(false);
    const batchUploadDialog = ref(false);
    const headers = ref([
        {
            title:'Edit',
            key:'edit',
        },

        {
            title:'Name',
            key:'name',
        },
        {
            title:'Owner',
            key:'owner_username',
        },
        {
            title:'Recorded Date',
            key:'recorded_date',
        },
        {
            title:'Recorded Time',
            key:'recorded_time',
        },
        {
            title:'Public',
            key:'public',
        },
        {
            title:'GRTS CellId',
            key:'grts_cell_id',
        },

        {
          title: 'Location',
          key:'recording_location'
        },
        {
          title: 'Details',
          key:'comments'
        },
        {
            title:'Users Annotated',
            key:'userAnnotations',
        },
    ]);

    const sharedHeaders = ref([
        {
            title:'Name',
            key:'name',
        },
        {
            title:'Owner',
            key:'owner_username',
        },
        {
            title:'Recorded Date',
            key:'recorded_date',
        },
        {
            title:'Recorded Time',
            key:'recorded_time',
        },
        {
            title:'Public',
            key:'public',
        },
        {
            title:'GRTS CellId',
            key:'grts_cell_id',
        },
        {
          title: 'Location',
          key:'details'
        },
        {
          title: 'Details',
          key:'comments'
        },

        {
            title:'Annotated by Me',
            key:'userMadeAnnotations',
        },
    ]);
    const fetchRecordings = async () => {
        const recordings = await getRecordings();
        recordingList.value = recordings.data;
        // If we have a spectrogram being generated we need to refresh on an interval
        let missingSpectro = false;
        for (let i =0; i< recordingList.value.length; i+=1) {
          if (!recordingList.value[i].hasSpectrogram) {
            missingSpectro = true;
            break;
          }
        }
        if (missingSpectro) {
          if (intervalRef === null) {
            intervalRef = setInterval(() => fetchRecordings(), 5000);
          }
        } else  {
          if (intervalRef !== null) {
            clearInterval(intervalRef);
          }
        }
        const shared = await getRecordings(true);
        sharedList.value = shared.data;

    };
    onMounted(() => fetchRecordings());

    const uploadDone = () => {
        uploadDialog.value = false;
        batchUploadDialog.value = false;
        editingRecording.value = null;
        fetchRecordings();
    };

    const editRecording = (item: Recording) => {
      editingRecording.value = {
        name: item.name,
        equipment: item.equipment || '', 
        comments: item.comments || '',
        date: item.recorded_date,
        time: item.recorded_time,
        public: item.public,
        id: item.id,
        siteName: item.site_name,
        software: item.software,
        detector: item.detector,
        speciesList: item.species_list,
        unusualOccurrences: item.unusual_occurrences,
      };
      if (item.recording_location) {
        const [ lon, lat ] = item.recording_location.coordinates;
        editingRecording.value['location'] = {lat, lon};
      }
      uploadDialog.value = true;
    };
    const delRecording = async (id: number) => {
        await deleteRecording(id);
        fetchRecordings();
    };

    return {
        itemsPerPage,
        headers,
        sharedHeaders,
        recordingList,
        sharedList,
        uploadDialog,
        batchUploadDialog,
        uploadDone,
        editRecording,
        delRecording,
        editingRecording,
     };
  },
});
</script>

<template>
  <v-card>
    <v-card-title>
      <v-row class="py-2">
        <div>
          My Recordings
        </div>
        <v-spacer />
        <v-menu>
          <template #activator="{ props }">
            <v-btn
              color="primary"
              v-bind="props"
            >
              Upload <v-icon>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="uploadDialog=true">
              <v-list-item-title>Upload Recording</v-list-item-title>
            </v-list-item>
            <v-list-item @click="batchUploadDialog=true">
              <v-list-item-title>
                Batch Upload
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-row>
    </v-card-title>
    <v-card-text>
      <v-data-table
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="recordingList"
        density="compact"
        class="elevation-1 my-recordings"
      >
        <template #item.edit="{ item }">
          <v-icon @click="editRecording(item)">
            mdi-pencil
          </v-icon>
          <v-icon
            color="error"
            @click="delRecording(item.id)"
          >
            mdi-delete
          </v-icon>
        </template>

        <template #item.name="{ item }">
          <router-link
            v-if="item.hasSpectrogram"
            :to="`/recording/${item.id.toString()}/spectrogram`"
          >
            {{ item.name }}
          </router-link>
          <div v-else>
            {{ item.name }} 
            <v-tooltip bottom>
              <template #activator="{ props: subProps }">
                <span v-bind="subProps">
                  <v-icon color="warning">mdi-alert</v-icon>
                  <v-icon>mdi-sync mdi-spin</v-icon>
                </span>
              </template>
              <span>Waiting for spectrogram to be computed</span>
            </v-tooltip>
          </div>
        </template>
        <template #item.recording_location="{ item }">
          <v-menu
            v-if="item.recording_location"
            open-on-hover
            :close-on-content-click="false"
          >
            <template #activator="{ props }">
              <v-icon v-bind="props">
                mdi-map
              </v-icon>
            </template>
            <v-card>
              <map-location
                :editor="false"
                :size="{width: 400, height: 400}"
                :location="{ x: item.recording_location.coordinates[0], y: item.recording_location.coordinates[1]}"
              />
            </v-card>
          </v-menu>
          <v-icon
            v-else
            color="error"
          >
            mdi-close
          </v-icon>
        </template>

        <template #item.comments="{ item }">
          <v-menu
            v-if="item.comments !== undefined"
            open-on-click
            :close-on-content-click="false"
          >
            <template #activator="{ props }">
              <v-icon v-bind="props">
                mdi-information-outline
              </v-icon>
            </template>
            <recording-info-display
              :recording-info="item"
              disable-button
            />
          </v-menu>
        </template>

        <template #item.public="{ item }">
          <v-icon
            v-if="item.public"
            color="success"
          >
            mdi-check
          </v-icon>
          <v-icon
            v-else
            color="error"
          >
            mdi-close
          </v-icon>
        </template>
        <template #bottom />
      </v-data-table>
    </v-card-text>
    <v-dialog
      v-model="uploadDialog"
      width="700"
    >
      <upload-recording
        :editing="editingRecording"
        @done="uploadDone()"
        @cancel="uploadDialog = false; editingRecording = null"
      />
    </v-dialog>
    <v-dialog
      v-model="batchUploadDialog"
      width="700"
    >
      <batch-upload-recording
        @done="uploadDone()"
        @cancel="batchUploadDialog = false; editingRecording = null"
      />
    </v-dialog>
  </v-card>
  <v-card>
    <v-card-title>
      <v-row class="py-2">
        <div>
          Shared
        </div>
      </v-row>
    </v-card-title>
    <v-card-text>
      <v-data-table
        v-model:items-per-page="itemsPerPage"
        :headers="sharedHeaders"
        :items="sharedList"
        density="compact"
        class="elevation-1 shared-recordings"
      >
        <template #item.name="{ item }">
          <router-link
            :to="`/recording/${item.id.toString()}/spectrogram`"
          >
            {{ item.name }}
          </router-link>
        </template>
        <template #item.public="{ item }">
          <v-icon
            v-if="item.public"
            color="success"
          >
            mdi-check
          </v-icon>
          <v-icon
            v-else
            color="error"
          >
            mdi-close
          </v-icon>
        </template>
        <template #item.recording_location="{ item }">
          <v-menu
            v-if="item.recording_location"
            open-on-hover
            :close-on-content-click="false"
          >
            <template #activator="{ props }">
              <v-icon v-bind="props">
                mdi-map
              </v-icon>
            </template>
            <v-card>
              <map-location
                :editor="false"
                :size="{width: 400, height: 400}"
                :location="{ x: item.recording_location.coordinates[0], y: item.recording_location.coordinates[1]}"
              />
            </v-card>
          </v-menu>
          <v-icon
            v-else
            color="error"
          >
            mdi-close
          </v-icon>
        </template>

        <template #item.comments="{ item }">
          <v-menu
            v-if="item.comments !== undefined"
            open-on-click
            :close-on-content-click="false"
          >
            <template #activator="{ props }">
              <v-icon v-bind="props">
                mdi-information-outline
              </v-icon>
            </template>
            <recording-info-display
              :recording-info="item"
              disable-button
            />
          </v-menu>
        </template>

        <template #item.userMadeAnnotations="{ item }">
          <v-icon
            v-if="item.userMadeAnnotations"
            color="success"
          >
            mdi-check
          </v-icon>
          <v-icon
            v-else
            color="error"
          >
            mdi-close
          </v-icon>
        </template>
        <template #bottom />
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.my-recordings {
  height: 40vh;
  max-height: 40vh;
  overflow-y:scroll;
}
.shared-recordings {
  height: 40vh;
  max-height: 40vh;
  overflow-y:scroll;
}
</style>