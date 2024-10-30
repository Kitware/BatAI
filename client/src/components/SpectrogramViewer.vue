<script lang="ts">
import { defineComponent, PropType, ref, Ref, watch } from "vue";
import { SpectroInfo, spectroToCenter, useGeoJS } from "./geoJS/geoJSUtils";
import {
  patchAnnotation,
  patchTemporalAnnotation,
  putAnnotation,
  putTemporalAnnotation,
  SpectrogramAnnotation,
  SpectrogramTemporalAnnotation,
} from "../api/api";
import LayerManager from "./geoJS/LayerManager.vue";
import { GeoEvent } from "geojs";
import geo from "geojs";
import useState from "../use/useState";

export default defineComponent({
  name: "SpectroViewer",
  components: {
    LayerManager,
  },
  props: {
    image: {
      type: Object as PropType<HTMLImageElement | undefined>,
      default: () => undefined,
    },
    spectroInfo: {
      type: Object as PropType<SpectroInfo>,
        required: true,
    },
    recordingId: {
      type: String as PropType<string | null>,
      required: true,
    },
  },
  emits: [
    "update:annotation",
    "create:annotation",
    "geoViewerRef",
    "hoverData",
  ],
  setup(props, { emit }) {
    const { annotations, temporalAnnotations, selectedId, selectedType, creationType, blackBackground, scaledVals } = useState();
    const containerRef: Ref<HTMLElement | undefined> = ref();
    const geoJS = useGeoJS();
    const initialized = ref(false);
    const cursor = ref("");
    const scaledWidth = ref(0);
    const scaledHeight = ref(0);
    const imageCursorRef: Ref<HTMLElement | undefined> = ref();
    const tileURL = props.spectroInfo.spectroId ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/v1/dynamic/spectrograms/${props.spectroInfo.spectroId}/tiles/{z}/{x}/{y}.png/` : "";
    const setCursor = (newCursor: string) => {
      cursor.value = newCursor;
    };

    const cursorHandler = {
      handleMouseLeave() {
        if (imageCursorRef.value) {
          imageCursorRef.value.style.display = "none";
        }
      },
      handleMouseEnter() {
        if (imageCursorRef.value) {
          imageCursorRef.value.style.display = "block";
        }
      },
      handleMouseMove(evt: MouseEvent) {
        const offsetX = evt.clientX + 10;
        const offsetY = evt.clientY - 25;
        window.requestAnimationFrame(() => {
          if (imageCursorRef.value) {
            imageCursorRef.value.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
          }
        });
      },
    };

    const mouseMoveEvent = (e: GeoEvent) => {
      const { x, y } = e.geo;
      if (!props.spectroInfo) {
        return;
      }
      const adjustedWidth = scaledWidth.value > props.spectroInfo.width ? scaledWidth.value : props.spectroInfo.width;
      const adjustedHeight = scaledHeight.value > props.spectroInfo.height ? scaledHeight.value : props.spectroInfo.height;

      const freq =
        adjustedHeight - y >= 0
          ? ((adjustedHeight - y) *
            (props.spectroInfo.high_freq - props.spectroInfo.low_freq)) /
          adjustedHeight /
          1000 +
          props.spectroInfo.low_freq / 1000
          : -1;

      if (!props.spectroInfo.end_times && !props.spectroInfo.start_times) {
        if (x >= 0 && adjustedHeight - y >= 0) {
          const time =
            x *
            ((props.spectroInfo.end_time - props.spectroInfo.start_time) / adjustedWidth);
          emit("hoverData", { time, freq });
        } else {
          emit("hoverData", { time: -1, freq: -1 });
        }
      } else if (
        props.spectroInfo &&
        props.spectroInfo.start_times &&
        props.spectroInfo.end_times
      ) {
        // compressed view
        if (x >= 0 && adjustedHeight - y >= 0) {
          const timeLength = props.spectroInfo.end_time - props.spectroInfo.start_time;
          const timeToPixels = adjustedWidth / timeLength;
          // find X in the range
          let offsetAdditive = 0;
          for (let i = 0; i < props.spectroInfo.start_times.length; i += 1) {
            const start_time = props.spectroInfo.start_times[i];
            const end_time = props.spectroInfo.end_times[i];
            const startX = offsetAdditive;
            const endX = offsetAdditive + (end_time - start_time) * timeToPixels;

            if (x > startX && x < endX) {
              const timeOffset = x - offsetAdditive;
              const time = start_time + timeOffset / timeToPixels;
              emit("hoverData", { time, freq });
              return;
            }
            offsetAdditive += (end_time - start_time) * timeToPixels;
          }
        } else {
          emit("hoverData", { time: -1, freq: -1 });
        }
      }
    };
    watch([containerRef], () => {
      scaledWidth.value = props.spectroInfo?.width;
      scaledHeight.value = props.spectroInfo?.height;
      if (props.image) {
        const { naturalWidth, naturalHeight } = props.image;
        scaledWidth.value = naturalWidth;
        scaledHeight.value = naturalHeight;

      }
      if (containerRef.value) {
      if (!geoJS.getGeoViewer().value) {
        geoJS.initializeViewer(containerRef.value, scaledWidth.value, scaledHeight.value, false, props.image ? 'quad' : 'tile', tileURL);
        geoJS.getGeoViewer().value.geoOn(geo.event.mousemove, mouseMoveEvent);
      }
    }
      if (props.image) {
        geoJS.drawImage(props.image, scaledWidth.value, scaledHeight.value);
      } else {
        const scaledTileWidth = (scaledWidth.value / props.spectroInfo?.width) * 256;
        const scaledTileHeight = (scaledHeight.value / props.spectroInfo?.height) * 256;
        geoJS.updateMapSize(tileURL, scaledWidth.value, scaledHeight.value, scaledTileWidth, scaledTileHeight);
      }
      initialized.value = true;
      emit("geoViewerRef", geoJS.getGeoViewer());
    });

    watch(() => props.spectroInfo, () => {

      scaledHeight.value = props.spectroInfo?.height;
      if (props.image) {
        const { naturalWidth, naturalHeight } = props.image;
        scaledWidth.value = naturalWidth;
        scaledHeight.value = naturalHeight;

      }
      geoJS.resetMapDimensions(scaledWidth.value, scaledHeight.value);
      geoJS.getGeoViewer().value.bounds({
      left: 0,
      top: 0,
      bottom: scaledHeight.value,
      right: scaledWidth.value,
      });
      if (props.image) {
        geoJS.drawImage(props.image, scaledWidth.value, scaledHeight.value);
      } 
    });

    const updateAnnotation = async (annotation: SpectrogramAnnotation | SpectrogramTemporalAnnotation) => {
      // We call the patch on the selected annotation
      if (props.recordingId !== null && selectedId.value !== null) {
        if (selectedType.value === 'pulse') {
          await patchAnnotation(props.recordingId, selectedId.value, annotation);
        } else if (selectedType.value === 'sequence') {
          await patchTemporalAnnotation(props.recordingId, selectedId.value, annotation);
        }
        emit("update:annotation", annotation);
      }
    };

    const createAnnotation = async (annotation: SpectrogramAnnotation | SpectrogramTemporalAnnotation) => {
      // We call the patch on the selected annotation
      if (props.recordingId !== null) {
        if (creationType.value === 'pulse') {
          const response = await putAnnotation(props.recordingId, annotation);
          emit("create:annotation", response.data.id);
        } else if (creationType.value === 'sequence') {
          const response = await putTemporalAnnotation(props.recordingId, annotation);
          emit("create:annotation", response.data.id);
        }
      }
    };
    let skipNextSelected = false;
    watch(
      selectedId,
      () => {
        if (skipNextSelected) {
          skipNextSelected = false;
          return;

        }
        const found = selectedType.value === 'pulse' ? annotations.value.find((item) => item.id === selectedId.value) : temporalAnnotations.value.find((item) => item.id === selectedId.value);
        if (found && props.spectroInfo) {

          const center = spectroToCenter(found, props.spectroInfo, selectedType.value);
          const x = center[0];
          const y = center[1];
          const bounds = geoJS.getGeoViewer().value.bounds();
          if (x < bounds.left || x > bounds.right) {
            geoJS.getGeoViewer().value.center({ x, y });
          }
        }
      }
    );

    const wheelEvent = (event: WheelEvent) => {
      let baseWidth = 0;
      let baseHeight = 0; 
      if (props.image) {
      const { naturalWidth, naturalHeight } = props.image;
      baseWidth = naturalWidth;
      baseHeight = naturalHeight;
      } else if (props.spectroInfo) {
        baseWidth = props.spectroInfo.width;
        baseHeight = props.spectroInfo.height;
      }

      if (event.ctrlKey) {
        scaledWidth.value = scaledWidth.value + event.deltaY * -4;
        if (scaledWidth.value < baseWidth) {
          scaledWidth.value = baseWidth;
        }
        if (props.image) {
        geoJS.drawImage(props.image, scaledWidth.value, scaledHeight.value, false);
      } else if (tileURL) {
        const scaledTileWidth = (scaledWidth.value / baseWidth) * 256;
        const scaledTileHeight = (scaledHeight.value / baseHeight) * 256;
        geoJS.updateMapSize(tileURL, scaledWidth.value, scaledHeight.value, scaledTileWidth, scaledTileHeight);
      }
      } else if (event.shiftKey) {
        scaledHeight.value = scaledHeight.value + event.deltaY * -0.25;
        if (scaledHeight.value < baseHeight) {
          scaledHeight.value = baseHeight;
        }
        if (props.image) {
        geoJS.drawImage(props.image, scaledWidth.value, scaledHeight.value, false);
      } else {
        const scaledTileWidth = (scaledWidth.value / baseWidth) * 256;
        const scaledTileHeight = (scaledHeight.value / baseHeight) * 256;
        geoJS.updateMapSize(tileURL, scaledWidth.value, scaledHeight.value, scaledTileWidth, scaledTileHeight);
      }
      }
      const xScale = props.spectroInfo?.compressedWidth ? scaledWidth.value / props.spectroInfo.compressedWidth: scaledWidth.value / (props.spectroInfo?.width || 1) ;
      const yScale = scaledHeight.value / (props.spectroInfo?.height || 1) ;
      scaledVals.value = {x: xScale, y: yScale};
    };



    return {
      containerRef,
      geoViewerRef: geoJS.getGeoViewer(),
      initialized,
      cursor,
      setCursor,
      updateAnnotation,
      createAnnotation,
      cursorHandler,
      imageCursorRef,
      blackBackground,
      wheelEvent,
      scaledWidth,
      scaledHeight,
    };
  },
});
</script>

<template>
  <div
    class="video-annotator"
    :class="{ 'black-background': blackBackground, 'white-background': !blackBackground }"
    @wheel="wheelEvent($event)"
  >
    <div
      id="spectro"
      ref="containerRef"
      class="playback-container"
      :style="{ cursor: cursor }"
      @mousemove="cursorHandler.handleMouseMove"
      @mouseleave="cursorHandler.handleMouseLeave"
      @mouseover="cursorHandler.handleMouseEnter"
    />
    <layer-manager
      v-if="initialized"
      :geo-viewer-ref="geoViewerRef"
      :spectro-info="spectroInfo"
      :scaled-width="scaledWidth"
      :scaled-height="scaledHeight"
      @update:annotation="updateAnnotation($event)"
      @create:annotation="createAnnotation($event)"
      @set-cursor="setCursor($event)"
    />
    <div
      ref="imageCursorRef"
      class="imageCursor"
    >
      <v-icon color="white">
        {{ cursor }}
      </v-icon>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.video-annotator {
  position: relative;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 0;

  display: flex;
  flex-direction: column;

  .geojs-map {
    margin: 2px;

    &.geojs-map:focus {
      outline: none;
    }
  }


  .playback-container {
    flex: 1;
  }

  .loadingSpinnerContainer {
    z-index: 20;
    margin: 0;
    position: absolute;
    top: 50%;
    left: 50%;
    -ms-transform: translate(-50%, -50%);
    transform: translate(-50%, -50%);
  }

  .geojs-map.annotation-input {
    cursor: inherit;
  }
}

.black-background {
  background-color: black;
}

.white-background {
  background-color: white;
}

.imageCursor {
  z-index: 9999; //So it will be above the annotator layers
  position: fixed;
  backface-visibility: hidden;
  top: 0;
  left: 0;
  pointer-events: none;
}
</style>
