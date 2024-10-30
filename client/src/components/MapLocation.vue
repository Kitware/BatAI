<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script lang="ts">
import { defineComponent, PropType, Ref, ref, onMounted } from "vue";
import { watch } from "vue";
import geo, { GeoEvent } from "geojs";

export default defineComponent({
  name: "MapLocation",
  components: {},
  props: {
    editor: {
      type: Boolean,
      default: true,
    },
    size: {
      type: Object as PropType<{ width: number; height: number }>,
      default: () => ({ width: 300, height: 300 }),
    },
    location: {
      type: Object as PropType<{ x?: number; y?: number } | undefined>,
      default: () => undefined,
    },
    updateMap: {
      type: Number,
      default: 0,
    },
  },
  emits: ['location'],
  setup(props, { emit }) {
    const usCenter = { x: -90.5855, y: 39.8333 };
    const mapRef: Ref<HTMLDivElement | null> = ref(null);
    const map: Ref<any> = ref();
    const mapLayer: Ref<any> = ref();
    const markerLayer: Ref<any> = ref();
    const markerFeature: Ref<any> = ref();
    const markerLocation: Ref<{ x: number; y: number } | null> = ref(null);
    const uiLayer: Ref<any> = ref();
    const mounted = ref(false);
    onMounted((() => mounted.value = true));
    watch(mapRef, () => {
      if (mapRef.value) {
        const centerPoint = props.location && props.location.x && props.location.y ? props.location : usCenter;
        const zoomLevel = props.location && props.location.x && props.location.y ? 6 : 3;
        map.value = geo.map({ node: mapRef.value, center: centerPoint, zoom: zoomLevel });
        mapLayer.value = map.value.createLayer("osm");
        markerLayer.value = map.value.createLayer("feature", { features: ["marker"] });
        uiLayer.value = map.value.createLayer("ui");
        markerFeature.value = markerLayer.value.createFeature("marker");
        uiLayer.value.createWidget('slider');

        if (props.location?.x && props.location?.y) {
            markerLocation.value = { x: props.location?.x, y: props.location.y };
            markerFeature.value
              .data([markerLocation.value])
              .style({
                symbol: geo.markerFeature.symbols.drop,
                symbolValue: 1 / 3,
                rotation: -Math.PI / 2,
                radius: 30,
                strokeWidth: 5,
                strokeColor: "blue",
                fillColor: "yellow",
                rotateWithMap: false,
              })
              .draw();
        }
        if (props.editor) {
          mapLayer.value.geoOn(geo.event.mouseclick, (e: GeoEvent) => {
            // Place a marker at the point
            const { x, y } = e.geo;
            markerLocation.value = { x, y };
            markerFeature.value
              .data([markerLocation.value])
              .style({
                symbol: geo.markerFeature.symbols.drop,
                symbolValue: 1 / 3,
                rotation: -Math.PI / 2,
                radius: 30,
                strokeWidth: 5,
                strokeColor: "blue",
                fillColor: "yellow",
                rotateWithMap: false,
              })
              .draw();
              emit('location', { lon: x, lat:y });

          });
        }
      }
    });
    watch(() =>  props.updateMap, () => {
      if (props.location?.x && props.location?.y) {
            markerLocation.value = { x: props.location?.x, y: props.location.y };
            markerFeature.value
              .data([markerLocation.value])
              .style({
                symbol: geo.markerFeature.symbols.drop,
                symbolValue: 1 / 3,
                rotation: -Math.PI / 2,
                radius: 30,
                strokeWidth: 5,
                strokeColor: "blue",
                fillColor: "yellow",
                rotateWithMap: false,
              })
              .draw();
              const centerPoint = props.location && props.location.x && props.location.y ? props.location : usCenter;
              const zoomLevel = props.location && props.location.x && props.location.y ? 6 : 3;
              if (map.value) {
                map.value.zoom(zoomLevel);
                map.value.center(centerPoint);
              }

        }
    });
    return {
      mapRef,
    };
  },
});
</script>

<template>
  <v-card class="pa-0 ma-0">
    <div
      ref="mapRef"
      :style="`width:${size.width}px; height:${size.height}px`"
    />
  </v-card>
</template>

<style lang="scss" scoped></style>
