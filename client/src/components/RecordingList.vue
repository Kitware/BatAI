<script lang="ts">
import { defineComponent, ref, Ref, onMounted, computed } from 'vue';
import { getRecordings } from '../api/api';
import useState from '../use/useState';
import  { EditingRecording } from './UploadRecording.vue';

export default defineComponent({
    components: {
    },
  setup() {

    const { sharedList, recordingList } = useState();
    const editingRecording: Ref<EditingRecording | null> = ref(null);

    const fetchRecordings = async () => {
        const recordings = await getRecordings();
        recordingList.value = recordings.data;
        const shared = await getRecordings(true);
        sharedList.value = shared.data;

    };
    onMounted(() => fetchRecordings());

    const openPanel = ref(1);
    const filtered = ref(true);
    const modifiedList = computed(() => {
        if (filtered.value) {
            return sharedList.value.filter((item) => !item.userMadeAnnotations);
        }
        return sharedList.value;
    });

    return {
        recordingList,
        sharedList,
        modifiedList,
        filtered,
        editingRecording,
        openPanel,
     };
  },
});
</script>

<template>
  <v-expansion-panels v-model="openPanel">
    <v-expansion-panel>
      <v-expansion-panel-title>My Recordings</v-expansion-panel-title>
      <v-expansion-panel-text>
        <div
          v-for="item in recordingList"
          :key="`public_${item.id}`"
        >
          <v-card class="pa-2 my-2">
            <v-row dense>
              <v-col class="text-left">
                <b>Name:</b><router-link
                  :to="`/recording/${item.id.toString()}/spectrogram`"
                >
                  {{ item.name }}
                </router-link>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col>
                <b>Public:</b>
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
              </v-col>
              <v-col>
                <div>
                  <b class="pr-1">Annotations:</b>{{ item.userAnnotations }}
                </div>
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
    <v-expansion-panel>
      <v-expansion-panel-title>Public</v-expansion-panel-title>
      <v-expansion-panel-text class="ma-0 pa-0">
        <v-switch
          v-model="filtered"
          label="Filter Annotated"
          dense
        />
        <div
          v-for="item in modifiedList"
          :key="`public_${item.id}`"
        >
          <v-card class="pa-2 my-2">
            <v-row dense>
              <v-col class="text-left">
                <b class="pr-1">Name:</b>
                <router-link
                  :to="`/recording/${item.id.toString()}/spectrogram`"
                >
                  {{ item.name }}
                </router-link>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col>
                <div style="font-size:0.75em">
                  <b>Owner:</b> {{ item.owner_username }}
                </div>
              </v-col>
            </v-row>
            <v-row dense>
              <v-col>
                <div>
                  <b>Annotated:</b>
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
                </div>
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style scoped>
.v-expansion-panel-text>>> .v-expansion-panel-text__wrap {
  padding: 0 !important;
}

.v-expansion-panel-text__wrapper {
    padding: 0 !important;
}
</style>