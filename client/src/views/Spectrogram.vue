<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  onUnmounted,
  Ref,
  ref,
  watch,
} from "vue";
import {
  getSpecies,
  getAnnotations,
  getSpectrogram,
  Species,
  getSpectrogramCompressed,
  getOtherUserAnnotations,
  getTemporalAnnotations,
} from "../api/api";
import SpectrogramViewer from "../components/SpectrogramViewer.vue";
import { SpectroInfo } from "../components/geoJS/geoJSUtils";
import AnnotationList from "../components/AnnotationList.vue";
import AnnotationEditor from "../components/AnnotationEditor.vue";
import ThumbnailViewer from "../components/ThumbnailViewer.vue";
import useState from "../use/useState";
import RecordingInfoDialog from "../components/RecordingInfoDialog.vue";
export default defineComponent({
  name: "Spectrogram",
  components: {
    SpectrogramViewer,
    AnnotationList,
    AnnotationEditor,
    ThumbnailViewer,
    RecordingInfoDialog,
  },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const {
      toggleLayerVisibility,
      layerVisibility,
      colorScale,
      setSelectedUsers,
      createColorScale,
      currentUser,
      annotationState,
      annotations,
      temporalAnnotations,
      otherUserAnnotations,
      selectedId,
      selectedType,
      scaledVals,
    } = useState();
    const image: Ref<HTMLImageElement> = ref(new Image());
    const spectroInfo: Ref<SpectroInfo | undefined> = ref();
    const selectedUsers: Ref<string[]> = ref([]);
    const speciesList: Ref<Species[]> = ref([]);
    const loadedImage = ref(false);
    const compressed = ref(false);
    const gridEnabled = ref(false);
    const recordingInfo = ref(false);
    const getAnnotationsList = async (annotationId?: number) => {
      const response = await getAnnotations(props.id);
      annotations.value = response.data.sort(
        (a, b) => a.start_time - b.start_time
      );
      const tempResp = await getTemporalAnnotations(props.id);
      temporalAnnotations.value = tempResp.data.sort(
        (a, b) => a.start_time - b.start_time
      );
      if (annotationId !== undefined) {
        selectedId.value = annotationId;
      }
    };
    const selectedIndex = computed(() => {
      if (annotations.value && selectedId.value !== null) {
        return annotations.value.findIndex(
          (item) => item.id === selectedId.value
        );
      }
      return -1;
    });
    const selectNextIndex = (dir: -1 | 1) => {
      if (annotations.value && annotations.value.length) {
        const newIndex = selectedIndex.value + dir;
        if (newIndex < 0) {
          selectedId.value = annotations.value[annotations.value.length - 1].id;
        } else if (newIndex > annotations.value.length - 1) {
          selectedId.value = annotations.value[0].id;
        } else {
          selectedId.value = annotations.value[newIndex].id;
        }
      }
    };

    const loadData = async () => {
      loadedImage.value = false;
      const response = compressed.value
        ? await getSpectrogramCompressed(props.id)
        : await getSpectrogram(props.id);
      if (response.data["url"]) {
        if (import.meta.env.PROD) {
        const updateHost = `${window.location.protocol}//${window.location.hostname}/`;
        const updatedURL = response.data["url"].replace(
          "http://127.0.0.1:9000/",
          updateHost
        );
        image.value.src = updatedURL.split("?")[0];
        } else {
          image.value.src = response.data['url'];
        }
      } else {
        // TODO Error Out if there is no URL
        console.error("No URL found for the spectrogram");
      }
      image.value.onload = () => {
        loadedImage.value = true;
      };
      spectroInfo.value = response.data["spectroInfo"];
      annotations.value =
        response.data["annotations"]?.sort(
          (a, b) => a.start_time - b.start_time
        ) || [];
      temporalAnnotations.value =
        response.data["temporal"]?.sort(
          (a, b) => a.start_time - b.start_time
        ) || [];
      if (response.data.currentUser) {
        currentUser.value = response.data.currentUser;
      }
      const speciesResponse = await getSpecies();
      speciesList.value = speciesResponse.data;
      if (response.data.otherUsers && spectroInfo.value) {
        // We have other users so we should grab the other user annotations
        const otherResponse = await getOtherUserAnnotations(props.id);
        otherUserAnnotations.value = otherResponse.data;
        createColorScale(Object.keys(otherUserAnnotations.value));
      }
    };
    const setSelection = (annotationId: number) => {
      selectedId.value = annotationId;
    };
    const selectedAnnotation = computed(() => {
      if (
        selectedId.value !== null &&
        selectedType.value === "pulse" &&
        annotations.value
      ) {
        const found = annotations.value.findIndex(
          (item) => item.id === selectedId.value
        );
        if (found !== -1) {
          return annotations.value[found];
        }
      }
      if (
        selectedId.value !== null &&
        selectedType.value === "sequence" &&
        temporalAnnotations.value
      ) {
        const found = temporalAnnotations.value.findIndex(
          (item) => item.id === selectedId.value
        );
        if (found !== -1) {
          return temporalAnnotations.value[found];
        }
      }
      return null;
    });
    watch(gridEnabled, () => {
      toggleLayerVisibility("grid");
    });
    watch(
      () => props.id,
      () => {
        loadData();
      }
    );
    onMounted(() => loadData());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentGeoViewerRef: Ref<any> = ref(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setParentGeoViewer = (data: any) => {
      parentGeoViewerRef.value = data;
    };

    const timeRef = ref(0);
    const freqRef = ref(0);
    const setHoverData = ({ time, freq }: { time: number; freq: number }) => {
      timeRef.value = time;
      freqRef.value = freq;
    };
    watch(compressed, () => loadData());

    const keyboardEvent = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        selectNextIndex(1);
      } else if (e.key === "ArrowUp") {
        selectNextIndex(-1);
      }
    };
    onMounted(() => {
      window.addEventListener("keydown", keyboardEvent);
    });
    onUnmounted(() => {
      window.removeEventListener("keydown", keyboardEvent);
    });

    const otherUsers = computed(() => Object.keys(otherUserAnnotations.value));

    const deleteChip = (item: string) => {
      selectedUsers.value.splice(
        selectedUsers.value.findIndex((data) => data === item)
      );
      setSelectedUsers(selectedUsers.value);
    };

    watch(selectedUsers, () => {
      setSelectedUsers(selectedUsers.value);
    });

    const processSelection = ({
      id,
      annotationType,
    }: {
      id: number;
      annotationType: "pulse" | "sequence";
    }) => {
      selectedId.value = id;
      selectedType.value = annotationType;
    };

    return {
      annotationState,
      compressed,
      loadedImage,
      image,
      spectroInfo,
      annotations,
      selectedId,
      selectedType,
      setSelection,
      getAnnotationsList,
      setParentGeoViewer,
      setHoverData,
      toggleLayerVisibility,
      processSelection,
      speciesList,
      selectedAnnotation,
      parentGeoViewerRef,
      gridEnabled,
      layerVisibility,
      timeRef,
      freqRef,
      // Other user selection
      otherUserAnnotations,
      temporalAnnotations,
      otherUsers,
      selectedUsers,
      deleteChip,
      colorScale,
      scaledVals,
      recordingInfo,
    };
  },
});
</script>

<template>
  <v-row>
    <v-dialog
      v-model="recordingInfo"
      width="600"
    >
      <recording-info-dialog
        :id="id"
        @close="recordingInfo = false"
      />
    </v-dialog>
    <v-col>
      <v-toolbar>
        <v-container>
          <v-row align="center">
            <v-tooltip bottom>
              <template #activator="{ props: subProps }">
                <v-icon
                  v-bind="subProps"
                  size="40"
                  @click="recordingInfo = true"
                >
                  mdi-information-outline
                </v-icon>
              </template>
              <span> Recording Information </span>
            </v-tooltip>

            <v-col cols="2">
              <div>
                <b>Time:</b>
                <span v-if="timeRef >= 0">{{ timeRef.toFixed(0) }}ms</span>
              </div>
              <div>
                <b>Frequency:</b>
                <span v-if="freqRef >= 0">{{ freqRef.toFixed(2) }}KHz</span>
              </div>
            </v-col>
            <v-col
              v-if="scaledVals.x > 1 || scaledVals.y > 1"
              cols="2"
            >
              <div>
                <b>xScale:</b>
                <span v-if="timeRef >= 0">{{ scaledVals.x.toFixed(2) }}x</span>
              </div>
              <div>
                <b>ySAcale:</b>
                <span v-if="freqRef >= 0">{{ scaledVals.y.toFixed(2) }}x</span>
              </div>
            </v-col>

            <v-col
              cols="1"
              class="px-0"
              style="font-size: 20px"
            >
              <div
                v-if="annotationState !== '' && annotationState !== 'disabled'"
              >
                <b>Mode:</b>
                <span> {{ annotationState }}</span>
              </div>
            </v-col>
            <v-col
              v-if="otherUsers.length && colorScale"
              cols="3"
              class="ma-0 pa-0 pt-5"
            >
              <v-select
                v-model="selectedUsers"
                :items="otherUsers"
                density="compact"
                label="Other Users"
                multiple
                single-line
                clearable
                variant="outlined"
                closable-chips
              >
                <template #selection="{ item }">
                  <v-chip
                    closable
                    size="x-small"
                    :color="colorScale(item.value)"
                    text-color="gray"
                    @click:close="deleteChip(item.value)"
                  >
                    {{ item.value.replace(/@.*/, "") }}
                  </v-chip>
                </template>
              </v-select>
            </v-col>
            <v-spacer />
            <v-tooltip bottom>
              <template #activator="{ props: subProps }">
                <v-icon
                  v-bind="subProps"
                  size="35"
                  class="mr-5 mt-5"
                  :color="layerVisibility.includes('species') ? 'blue' : ''"
                  @click="toggleLayerVisibility('species')"
                >
                  mdi-bat
                </v-icon>
              </template>
              <span> Turn Species Label On/Off</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props: subProps }">
                <v-btn
                  v-bind="subProps"
                  size="35"
                  class="mr-5 mt-5"
                  :color="layerVisibility.includes('time') ? 'blue' : ''"
                  @click="toggleLayerVisibility('time')"
                >
                  <v-icon>mdi-arrow-left-right</v-icon>
                  <h4>ms</h4>
                </v-btn>
              </template>
              <span> Turn Time Endpoint Labels On/Off</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props: subProps }">
                <v-btn
                  v-bind="subProps"
                  size="35"
                  class="mr-5 mt-5"
                  :color="layerVisibility.includes('duration') ? 'blue' : ''"
                  @click="toggleLayerVisibility('duration')"
                >
                  <v-icon>mdi-arrow-expand-horizontal</v-icon>
                  <h4>ms</h4>
                </v-btn>
              </template>
              <span> Turn Time Duration Labels On/Off</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props: subProps }">
                <v-btn
                  v-bind="subProps"
                  size="35"
                  class="mr-5 mt-5"
                  :color="layerVisibility.includes('freq') ? 'blue' : ''"
                  @click="toggleLayerVisibility('freq')"
                >
                  <h3>KHz</h3>
                </v-btn>
              </template>
              <span> Turn Time Label On/Off</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props: subProps }">
                <v-icon
                  v-bind="subProps"
                  size="35"
                  class="mr-5 mt-5"
                  :color="gridEnabled ? 'blue' : ''"
                  @click="gridEnabled = !gridEnabled"
                >
                  mdi-grid
                </v-icon>
              </template>
              <span> Turn Legend Grid On/Off</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template #activator="{ props: subProps }">
                <v-icon
                  v-bind="subProps"
                  size="35"
                  class="mr-5 mt-5"
                  :color="compressed ? 'blue' : ''"
                  @click="compressed = !compressed"
                >
                  mdi-calendar-collapse-horizontal
                </v-icon>
              </template>
              <span> Toggle Compressed View</span>
            </v-tooltip>
          </v-row>
        </v-container>
      </v-toolbar>
      <spectrogram-viewer
        v-if="loadedImage && spectroInfo"
        :image="image"
        :spectro-info="spectroInfo"
        :recording-id="id"
        :other-user-annotations="otherUserAnnotations"
        :grid="gridEnabled"
        class="spectro-main"
        @selected="setSelection($event)"
        @create:annotation="getAnnotationsList($event)"
        @update:annotation="getAnnotationsList()"
        @geo-viewer-ref="setParentGeoViewer($event)"
        @hover-data="setHoverData($event)"
      />
      <thumbnail-viewer
        v-if="loadedImage && parentGeoViewerRef"
        :image="image"
        :spectro-info="spectroInfo"
        :recording-id="id"
        :parent-geo-viewer-ref="parentGeoViewerRef"
        @selected="setSelection($event)"
      />
    </v-col>
    <v-col style="max-width: 400px">
      <annotation-list
        :annotations="annotations"
        :temporal-annotations="temporalAnnotations"
        @select="processSelection($event)"
      />
      <annotation-editor
        v-if="selectedAnnotation"
        :species="speciesList"
        :recording-id="id"
        :annotation="selectedAnnotation"
        class="mt-4"
        @update:annotation="getAnnotationsList()"
        @delete:annotation="
          getAnnotationsList();
          selectedId = null;
        "
      />
    </v-col>
  </v-row>
</template>

<style scoped>
.spectro-main {
  height: calc(100vh - 21vh - 64px - 72px);
}
</style>
