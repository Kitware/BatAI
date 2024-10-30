<script lang="ts">
import { defineComponent, nextTick, onMounted, onUnmounted, PropType, Ref, ref, watch } from "vue";
import { SpectrogramAnnotation, SpectrogramTemporalAnnotation } from "../../api/api";
import { geojsonToSpectro, SpectroInfo } from "./geoJSUtils";
import EditAnnotationLayer from "./layers/editAnnotationLayer";
import RectangleLayer from "./layers/rectangleLayer";
import TemporalLayer from "./layers/temporalLayer";
import LegendLayer from "./layers/legendLayer";
import TimeLayer from "./layers/timeLayer";
import FreqLayer from "./layers/freqLayer";
import SpeciesLayer from "./layers/speciesLayer";
import SpeciesSequenceLayer from "./layers/speciesSequenceLayer";
import { cloneDeep } from "lodash";
import useState from "../../use/useState";
export default defineComponent({
  name: "LayerManager",
  props: {
    geoViewerRef: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: Object as PropType<any>,
      required: true,
    },
    spectroInfo: {
      type: Object as PropType<SpectroInfo | undefined>,
      default: () => undefined,
    },
    thumbnail: {
      type: Boolean,
      default: false,
    },
    yScale: {
      type: Number,
      default: 1,
    },
    scaledWidth: {
      type: Number,
      default: -1,
    },
    scaledHeight: {
      type: Number,
      default: -1,
    }
  },
  emits: ["selected", "update:annotation", "create:annotation", "set-cursor"],
  setup(props, { emit }) {
    const {
      creationType,
      annotationState,
      setAnnotationState,
      layerVisibility,
      selectedUsers,
      colorScale,
      currentUser,
      annotations,
      temporalAnnotations,
      otherUserAnnotations,
      selectedId,
      selectedType,
      setSelectedId,
    } = useState();
    const selectedAnnotationId: Ref<null | number> = ref(null);
    const hoveredAnnotationId: Ref<null | number> = ref(null);
    const localAnnotations: Ref<SpectrogramAnnotation[]> = ref(cloneDeep(annotations.value));
    const localTemporalAnnotations: Ref<SpectrogramTemporalAnnotation[]> = ref(cloneDeep(temporalAnnotations.value));
    const editing = ref(false);
    const editingAnnotation: Ref<null | SpectrogramAnnotation | SpectrogramTemporalAnnotation> = ref(null);
    let rectAnnotationLayer: RectangleLayer;
    let temporalAnnotationLayer: TemporalLayer;
    let editAnnotationLayer: EditAnnotationLayer;
    let legendLayer: LegendLayer;
    let timeLayer: TimeLayer;
    let freqLayer: FreqLayer;
    let speciesLayer: SpeciesLayer;
    let speciesSequenceLayer: SpeciesSequenceLayer;
    const displayError = ref(false);
    const errorMsg = ref("");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const temporalEvent = (type: string, data: any) => {
      if (type === "annotation-clicked") {
        // click temporal annotation
        if (selectedAnnotationId.value !== null) {
          const foundIndex = temporalAnnotations.value.findIndex(
            (item) => item.id === selectedAnnotationId.value
          );
          if (foundIndex !== -1) {
            editingAnnotation.value = temporalAnnotations.value[foundIndex];
            const copy: SpectrogramTemporalAnnotation[] = cloneDeep(localTemporalAnnotations.value);
            copy[foundIndex].editing = true;
            localTemporalAnnotations.value = copy;
          }
        }
        selectedAnnotationId.value = data.id;
        editing.value = data.edit;
        editingAnnotation.value = null;
        selectedId.value = selectedAnnotationId.value;
        //emit("selected", selectedAnnotationId.value);
        if (data.id !== null) {
          setSelectedId(selectedAnnotationId.value, 'sequence');
        }
        setSelectedId(selectedAnnotationId.value);
        triggerUpdate();
      }
      if (type === "annotation-right-clicked") {
        selectedAnnotationId.value = data.id;
        editing.value = data.edit;
        const foundIndex = localTemporalAnnotations.value.findIndex(
          (item) => item.id === selectedAnnotationId.value
        );
        if (editing.value && foundIndex !== -1) {
          editingAnnotation.value = localTemporalAnnotations.value[foundIndex];
          const copy: SpectrogramTemporalAnnotation[] = cloneDeep(localTemporalAnnotations.value);
          copy[foundIndex].editing = true;
          localTemporalAnnotations.value = copy;
        } else if (!editing.value && foundIndex !== -1) {
          editingAnnotation.value = null;
          localTemporalAnnotations.value[foundIndex].editing = undefined;
        }
        if (data.id !== null) {
          setSelectedId(selectedAnnotationId.value, 'sequence');
        }
        setSelectedId(selectedAnnotationId.value);
        //emit("selected", selectedAnnotationId.value);
        triggerUpdate();
      }

    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const event = (type: string, data: any) => {
      // Will handle clicking, selecting and editing here
      if (type === "update:mode") {
        setAnnotationState(data.mode);
      }
      if (type === "update:cursor") {
        emit("set-cursor", data.cursor);
      }
      if (type === "annotation-cleared") {
        editing.value = false;
        selectedAnnotationId.value = null;
        editingAnnotation.value = null;
        editAnnotationLayer.disable();
        triggerUpdate();
        const copy: SpectrogramAnnotation[] = cloneDeep(localAnnotations.value);
        copy.forEach((item) => (item.editing = undefined));
        localAnnotations.value = copy;
        if (data.id !== null) {
          setSelectedId(selectedAnnotationId.value, 'pulse');
        }
        setSelectedId(selectedAnnotationId.value);
        //emit("selected", selectedAnnotationId.value);
      }
      if (type === "annotation-clicked") {
        if (selectedAnnotationId.value !== null) {
          const foundIndex = localAnnotations.value.findIndex(
            (item) => item.id === selectedAnnotationId.value
          );
          if (foundIndex !== -1) {
            editingAnnotation.value = localAnnotations.value[foundIndex];
            const copy: SpectrogramAnnotation[] = cloneDeep(localAnnotations.value);
            copy[foundIndex].editing = true;
            localAnnotations.value = copy;
          }
        }
        selectedAnnotationId.value = data.id;
        editing.value = data.edit;
        editingAnnotation.value = null;
        selectedId.value = selectedAnnotationId.value;
        //emit("selected", selectedAnnotationId.value);
        if (data.id !== null) {
          setSelectedId(selectedAnnotationId.value, 'pulse');
        }
        setSelectedId(selectedAnnotationId.value);
        triggerUpdate();
      }
      if (type === "annotation-hover") {
        hoveredAnnotationId.value = data.id;
      }
      if (type === "annotation-right-clicked") {
        selectedAnnotationId.value = data.id;
        editing.value = data.edit;
        const foundIndex = localAnnotations.value.findIndex(
          (item) => item.id === selectedAnnotationId.value
        );
        if (editing.value && foundIndex !== -1) {
          editingAnnotation.value = localAnnotations.value[foundIndex];
          const copy: SpectrogramAnnotation[] = cloneDeep(localAnnotations.value);
          copy[foundIndex].editing = true;
          localAnnotations.value = copy;
        } else if (!editing.value && foundIndex !== -1) {
          editingAnnotation.value = null;
          localAnnotations.value[foundIndex].editing = undefined;
        }
        setSelectedId(selectedAnnotationId.value, 'pulse');
        //emit("selected", selectedAnnotationId.value);
        triggerUpdate();
      }
      if (type === "update:geojson") {
        const status = data["status"];
        const creating = data["creating"];
        const geoJSON = data["geoJSON"];
        if (geoJSON && selectedAnnotationId.value !== null && status === "editing" && !creating) {
          if (annotationState.value !== "creating") {
            const index = selectedType.value === 'pulse' ? localAnnotations.value.findIndex(
              (item) => item.id === selectedAnnotationId.value
            ) : localTemporalAnnotations.value.findIndex((item) => item.id === selectedAnnotationId.value);
            if (index !== -1 && props.spectroInfo && selectedType.value === 'pulse') {
              // update bounds for the localAnnotation
              const conversionResult = geojsonToSpectro(geoJSON, props.spectroInfo, props.scaledWidth, props.scaledHeight);
              if (conversionResult.error) {
                displayError.value = true;
                errorMsg.value = conversionResult.error;
                return;
              }
              const { low_freq, high_freq, start_time, end_time } = conversionResult;
              localAnnotations.value[index] = {
                ...localAnnotations.value[index],
                low_freq,
                high_freq,
                start_time,
                end_time,
              };
              editingAnnotation.value = localAnnotations.value[index];
            }
            if (index !== -1 && props.spectroInfo && selectedType.value === 'sequence') {
              // update bounds for the localAnnotation
              const conversionResult = geojsonToSpectro(geoJSON, props.spectroInfo, props.scaledWidth, props.scaledHeight);
              if (conversionResult.error) {
                displayError.value = true;
                errorMsg.value = conversionResult.error;
                return;
              }
              const { start_time, end_time } = conversionResult;
              localTemporalAnnotations.value[index] = {
                ...localTemporalAnnotations.value[index],
                start_time,
                end_time,
              };
              editingAnnotation.value = localTemporalAnnotations.value[index];
            }

            triggerUpdate();
            emit("update:annotation", editingAnnotation.value);
          }
        } else if (creating) {
          if (geoJSON && props.spectroInfo) {
            const conversionResult = geojsonToSpectro(geoJSON, props.spectroInfo, props.scaledWidth, props.scaledHeight);

            if (conversionResult.error) {
              displayError.value = true;
              errorMsg.value = conversionResult.error;
              return;
            }
            const { low_freq, high_freq, start_time, end_time } = conversionResult;
            if (creationType.value === 'pulse') {
              const newAnnotation: SpectrogramAnnotation = {
                low_freq,
                high_freq,
                start_time,
                end_time,
                comments: "",
                species: [],
                id: 0,
              };
              emit("create:annotation", newAnnotation);
            } else if (creationType.value === 'sequence') {
              const newAnnotation: SpectrogramTemporalAnnotation = {
                start_time,
                end_time,
                species: [],
                type: '',
                comments: '',
                id: 0,
              };
              emit("create:annotation", newAnnotation);

            }
            editAnnotationLayer.disable();
            annotationState.value = "";
            editing.value = false;
          }
        }
      }
    };

    const getDataForLayers = () => {
      if (selectedUsers.value.length) {
        // We add more annotations to the system
        let additionalAnnotations: SpectrogramAnnotation[] = [];
        let additionalTemporalAnnotations: SpectrogramTemporalAnnotation[] = [];
        for (let i = 0; i < selectedUsers.value.length; i += 1) {
          const newAnnotations = otherUserAnnotations.value[selectedUsers.value[i]]['annotations'];
          additionalAnnotations = additionalAnnotations.concat(newAnnotations);
          const newTemporalAnnotations = otherUserAnnotations.value[selectedUsers.value[i]]['temporal'];
          additionalTemporalAnnotations = additionalTemporalAnnotations.concat(newTemporalAnnotations);

        }
        additionalAnnotations = additionalAnnotations.concat(localAnnotations.value);
        additionalTemporalAnnotations = additionalTemporalAnnotations.concat(localTemporalAnnotations.value);
        return { annotations: additionalAnnotations, temporalAnnotations: additionalTemporalAnnotations, colorScale };
      } else {
        return { annotations: localAnnotations.value, temporalAnnotations: localTemporalAnnotations.value };
      }
    };
    const triggerUpdate = () => {
      // Check for selected and editing annotations;
      const { annotations, temporalAnnotations } = getDataForLayers();
      if (rectAnnotationLayer) {
        rectAnnotationLayer.formatData(
          annotations,
          selectedType.value === 'pulse' ? selectedAnnotationId.value : null,
          currentUser.value,
          colorScale.value,
          props.yScale,
        );
        rectAnnotationLayer.redraw();
      }
      if (temporalAnnotationLayer && layerVisibility.value.includes('temporal')) {
        temporalAnnotationLayer.formatData(
          temporalAnnotations,
          selectedType.value === 'sequence' ? selectedAnnotationId.value : null,
          currentUser.value,
          colorScale.value,
          props.yScale,
        );
        temporalAnnotationLayer.redraw();
      }
      if (!props.thumbnail) {
        if (layerVisibility.value.includes("grid")) {
          legendLayer.setGridEnabled(true);
        } else {
          legendLayer.setGridEnabled(false);
        }
        legendLayer.redraw();
        if (layerVisibility.value.includes("time") || layerVisibility.value.includes('duration')) {
          if (layerVisibility.value.includes("time")) {
            timeLayer.displayDuration = false;
          } else {
            timeLayer.displayDuration = true;
          }
          timeLayer.formatData(annotations, temporalAnnotations);
          timeLayer.redraw();
        } else {
          timeLayer.disable();
        }
        if (layerVisibility.value.includes("freq")) {
          freqLayer.formatData(annotations);
          freqLayer.redraw();
        } else {
          freqLayer.disable();
        }
        if (layerVisibility.value.includes("species")) {
          speciesLayer.formatData(annotations);
          speciesLayer.redraw();
          speciesSequenceLayer.formatData(temporalAnnotations);
          speciesSequenceLayer.redraw();
        } else {
          speciesLayer.disable();
          speciesSequenceLayer.disable();
        }
      }
      if (editing.value && editingAnnotation.value) {
        setTimeout(() => {
          editAnnotationLayer.changeData(editingAnnotation.value, selectedType.value);
        }, 0);
      }
    };
    watch(
      annotations,
      () => {
        localAnnotations.value = annotations.value;
        triggerUpdate();
      }
    );
    watch(temporalAnnotations, () => {
      localTemporalAnnotations.value = temporalAnnotations.value;
      triggerUpdate();
    });
    watch(selectedUsers, () => triggerUpdate());
    watch(
      selectedId,
      () => {
        selectedAnnotationId.value = selectedId.value;
        if (
          editAnnotationLayer &&
          editAnnotationLayer.getMode() === "editing" &&
          selectedId.value === null
        ) {
          nextTick(() => {
            if (
              editAnnotationLayer &&
              editAnnotationLayer.getMode() === "disabled" &&
              selectedId.value === null
            ) {
              annotationState.value === 'disabled';
              editAnnotationLayer.featureLayer.clear();
            }
          });
          editAnnotationLayer.disable();
          return;
        }
        triggerUpdate();
      }
    );
    onUnmounted(() => {
      if (editAnnotationLayer) {
        editAnnotationLayer.destroy();
      }
      if (rectAnnotationLayer) {
        rectAnnotationLayer.destroy();
      }
      if (temporalAnnotationLayer) {
        temporalAnnotationLayer.destroy();
      }
      if (timeLayer) {
        timeLayer.destroy();
      }
      if (freqLayer) {
        freqLayer.destroy();
      }
      if (speciesLayer) {
        speciesLayer.destroy();
      }
      if (speciesSequenceLayer) {
        speciesSequenceLayer.destroy();
      }
    });
    const initLayers = () => {
      if (props.spectroInfo) {
        if (!editAnnotationLayer) {
        editAnnotationLayer = new EditAnnotationLayer(props.geoViewerRef, event, props.spectroInfo);
        } else {
          editAnnotationLayer.spectroInfo = props.spectroInfo;
        }
        if (!rectAnnotationLayer) {
        rectAnnotationLayer = new RectangleLayer(props.geoViewerRef, event, props.spectroInfo);
        } else {
          rectAnnotationLayer.spectroInfo = props.spectroInfo;
        }
        if (!temporalAnnotationLayer) {
        temporalAnnotationLayer = new TemporalLayer(props.geoViewerRef, temporalEvent, props.spectroInfo);
        } {
          temporalAnnotationLayer.spectroInfo = props.spectroInfo;
        }
        rectAnnotationLayer.formatData(localAnnotations.value, selectedAnnotationId.value, currentUser.value, colorScale.value, props.yScale);
        rectAnnotationLayer.redraw();
        temporalAnnotationLayer.formatData(localTemporalAnnotations.value, selectedAnnotationId.value, currentUser.value, colorScale.value, props.yScale);
        temporalAnnotationLayer.redraw();
        if (!props.thumbnail) {
          if (!legendLayer) {
          legendLayer = new LegendLayer(props.geoViewerRef, event, props.spectroInfo);
          } else {
            legendLayer.spectroInfo = props.spectroInfo;
            legendLayer.createLabels();
            legendLayer.calcGridLines();
          }
          if (!timeLayer) {
          timeLayer = new TimeLayer(props.geoViewerRef, event, props.spectroInfo);
          } else {
            timeLayer.spectroInfo = props.spectroInfo;
          }
          if (!freqLayer) {
          freqLayer = new FreqLayer(props.geoViewerRef, event, props.spectroInfo);
          } else {
            freqLayer.spectroInfo = props.spectroInfo;
          }
          if (!speciesSequenceLayer) {
          speciesSequenceLayer = new SpeciesSequenceLayer(props.geoViewerRef, event, props.spectroInfo);
          } else {
            speciesSequenceLayer.spectroInfo = props.spectroInfo;
          }
          if (!speciesLayer) {
          speciesLayer = new SpeciesLayer(props.geoViewerRef, event, props.spectroInfo);
          } else {
            speciesLayer.spectroInfo = props.spectroInfo;
          }

          timeLayer.formatData(localAnnotations.value, temporalAnnotations.value);
          freqLayer.formatData(localAnnotations.value);
          speciesLayer.formatData(localAnnotations.value);
          speciesSequenceLayer.formatData(localTemporalAnnotations.value);

          legendLayer.redraw();
          if (layerVisibility.value.includes('species')) {
            speciesLayer.redraw();
            speciesSequenceLayer.redraw();
          } else {
            speciesLayer.disable();
            speciesSequenceLayer.disable();
          }
          timeLayer.disable();
          freqLayer.disable();
        }
      }
      triggerUpdate();
    };
    onMounted(() => initLayers());

    watch(() => props.spectroInfo, () => initLayers());
    watch(layerVisibility, () => {
      if (!props.thumbnail && legendLayer) {
        triggerUpdate();
      }
    });
    watch([() => props.scaledWidth, () => props.scaledHeight], () => {
      const { annotations, temporalAnnotations } = getDataForLayers();
      legendLayer.setScaledDimensions(props.scaledWidth, props.scaledHeight);
      rectAnnotationLayer.setScaledDimensions(props.scaledWidth, props.scaledHeight);
      rectAnnotationLayer.formatData(
        annotations,
        selectedType.value === 'pulse' ? selectedAnnotationId.value : null,
        currentUser.value,
        colorScale.value,
        props.yScale,
      );
      rectAnnotationLayer.redraw();
      editAnnotationLayer.setScaledDimensions(props.scaledWidth, props.scaledHeight);
      if (editing.value && editingAnnotation.value) {
        setTimeout(() => {
          editAnnotationLayer.changeData(editingAnnotation.value, selectedType.value);
        }, 0);
      }
      timeLayer.setScaledDimensions(props.scaledWidth, props.scaledHeight);
      freqLayer.setScaledDimensions(props.scaledWidth, props.scaledHeight);
      speciesLayer.setScaledDimensions(props.scaledWidth, props.scaledHeight);
      speciesSequenceLayer.setScaledDimensions(props.scaledWidth, props.scaledHeight);
      temporalAnnotationLayer.setScaledDimensions(props.scaledWidth, props.scaledHeight);
      if (layerVisibility.value.includes("time")) {
        timeLayer.formatData(annotations, temporalAnnotations);
        timeLayer.redraw();
      } else {
        timeLayer.disable();
      }
      if (layerVisibility.value.includes("freq")) {
        freqLayer.formatData(annotations);
        freqLayer.redraw();
      } else {
        freqLayer.disable();
      }
      if (layerVisibility.value.includes("species")) {
        speciesLayer.formatData(annotations);
        speciesLayer.redraw();
        speciesSequenceLayer.formatData(temporalAnnotations);
        speciesSequenceLayer.redraw();
      } else {
        speciesLayer.disable();
        speciesSequenceLayer.disable();
      }
      if (temporalAnnotationLayer && layerVisibility.value.includes('temporal')) {
        temporalAnnotationLayer.formatData(
          temporalAnnotations,
          selectedAnnotationId.value,
          currentUser.value,
          colorScale.value,
          props.yScale,
        );
        temporalAnnotationLayer.redraw();
      }


    });
    watch(
      () => annotationState.value,
      () => {
        if (annotationState.value === "creating") {
          editing.value = false;
          selectedAnnotationId.value = null;
          editingAnnotation.value = null;
          editAnnotationLayer.changeData(null, selectedType.value);
          triggerUpdate();
        }
      }
    );
    return {
      annotationState,
      localAnnotations,
      displayError,
      errorMsg,
      selectedUsers,
    };
  },
});
</script>

<template>
  <v-dialog
    v-model="displayError"
    width="500"
  >
    <v-card>
      <v-card-title>Error</v-card-title>
      <v-card-text>{{ errorMsg }}</v-card-text>
      <v-card-actions>
        <v-row>
          <v-spacer />
          <v-btn
            variant="outlined"
            @click="displayError = false"
          >
            Dismiss
          </v-btn>
          <v-spacer />
        </v-row>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
