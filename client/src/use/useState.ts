import { ref, Ref, watch } from "vue";
import { cloneDeep } from "lodash";
import * as d3 from "d3";
import { OtherUserAnnotations, Recording, SpectrogramAnnotation, SpectrogramTemporalAnnotation } from "../api/api";

const annotationState: Ref<AnnotationState> = ref("");
const creationType: Ref<'pulse' | 'sequence'> = ref("pulse");
type LayersVis = "time" | "freq" | "species" | "grid" | 'temporal' | 'duration';
const layerVisibility: Ref<LayersVis[]> = ref(['temporal', 'species', 'duration', 'freq']);
const colorScale: Ref<d3.ScaleOrdinal<string, string, never> | undefined> = ref();
const selectedUsers: Ref<string[]> = ref([]);
const currentUser: Ref<string> = ref('');
const selectedId: Ref<number | null> = ref(null);
const selectedType: Ref<'pulse' | 'sequence'> = ref('pulse');
const annotations : Ref<SpectrogramAnnotation[]> = ref([]);
const temporalAnnotations: Ref<SpectrogramTemporalAnnotation[]> = ref([]);
const otherUserAnnotations: Ref<OtherUserAnnotations> = ref({});
const sharedList: Ref<Recording[]> = ref([]);
const recordingList: Ref<Recording[]> = ref([]);
const nextShared: Ref<Recording | false> = ref(false);
const blackBackground = ref(true);
const scaledVals: Ref<{x: number, y: number}> = ref({x: 0, y: 0});

type AnnotationState = "" | "editing" | "creating" | "disabled";
export default function useState() {
  const setAnnotationState = (state: AnnotationState) => {
    annotationState.value = state;
  };
  function toggleLayerVisibility(value: LayersVis) {
    const index = layerVisibility.value.indexOf(value);
    const clone = cloneDeep(layerVisibility.value);
    if (index === -1) {
      // If the value is not present, add it
      clone.push(value);
    } else {
      // If the value is present, remove it
      clone.splice(index, 1);
    }
    if (value === 'time' && clone.includes('duration')) {
      const durationInd = layerVisibility.value.indexOf('duration');
      clone.splice(durationInd, 1);
    }
    if (value === 'duration' && clone.includes('time')) {
      const timeInd = layerVisibility.value.indexOf('time');
      clone.splice(timeInd, 1);
    }
    layerVisibility.value = clone;
  }
  const setSelectedUsers = (newUsers: string[]) => {
    selectedUsers.value = newUsers;
  };

  function createColorScale(userEmails: string[]) {
    colorScale.value = d3.scaleOrdinal<string>()
    .domain(userEmails)
    .range(d3.schemeCategory10.filter(color => color !== 'red' && color !== 'cyan' && color !== 'yellow'));

  }

  function setSelectedId(id: number | null, annotationType?: 'pulse' | 'sequence' ) {
    selectedId.value = id;
    if (annotationType) {
      selectedType.value = annotationType;
    }
  }
  watch(sharedList, () => {
    const filtered = sharedList.value.filter((item) => !item.userMadeAnnotations);
    if (filtered.length > 0) {
     nextShared.value = filtered[0];
    } else {
      nextShared.value = false;
    }
  });
  
    return {
    annotationState,
    creationType,
    setAnnotationState,
    toggleLayerVisibility,
    layerVisibility,
    createColorScale,
    colorScale,
    setSelectedUsers,
    selectedUsers,
    currentUser,
    setSelectedId,
    // State Passing Elements
    annotations,
    temporalAnnotations,
    otherUserAnnotations,
    selectedId,
    selectedType,
    sharedList,
    recordingList,
    nextShared,
    blackBackground,
    scaledVals,
  };
}
