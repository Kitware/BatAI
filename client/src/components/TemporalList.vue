<script lang="ts">
import { defineComponent, PropType } from "vue";
import { SpectroInfo } from './geoJS/geoJSUtils';
import { SpectrogramTemporalAnnotation } from "../api/api";
import useState from "../use/useState";
import { watch } from "vue";

export default defineComponent({
  name: "TemporalList",
  components: {
  },
  props: {
    spectroInfo: {
      type: Object as PropType<SpectroInfo | undefined>,
      default: () => undefined,
    },
    annotations: {
      type: Array as PropType<SpectrogramTemporalAnnotation[]>,
      default: () => [],
    },
    selectedId: {
        type: Number as PropType<number | null>,
        default: null,
    },
  },
  emits: ['select'],
  setup(props) {
    const { annotationState, setAnnotationState } = useState();
    const scrollToId = (id: number) => {
    const el = document.getElementById(`annotation-${id}`);
    if (el) {
      el.scrollIntoView({block: 'end', behavior: 'smooth'});
    }
  };
  watch(() => props.selectedId, () => {
    if (props.selectedId !== null) {
      scrollToId(props.selectedId);
    }
  });
  

    return {
        annotationState,
        setAnnotationState,
    };
  },
});
</script>

<template>
  <v-card class="pa-0 ma-0">
    <v-card-title>
      <v-row class="pa-2">
        Temporal Annotations
        <v-spacer />
        <v-btn
          :disabled="annotationState === 'creating'"
          @click="annotationState = 'creating'"
        >
          Add<v-icon>mdi-plus</v-icon>
        </v-btn>
      </v-row>
    </v-card-title>
    <v-list>
      <v-list-item>
        <v-row dense>
          <v-col><b>Time</b></v-col>
        </v-row>
      </v-list-item>
      <v-list-item
        v-for="annotation in annotations"
        :id="`annotation-${annotation.id}`"
        :key="annotation.id"
        :class="{selected: annotation.id===selectedId}"
        class="annotation-item"
        @click="$emit('select', annotation.id)"
      >
        <v-row>
          <v-col class="annotation-time">
            <span>{{ annotation.start_time }}-{{ annotation.end_time }}ms</span>
            <span class="pl-2"><b>({{ annotation.end_time - annotation.start_time }}ms)</b></span>
          </v-col>
        </v-row>
        <v-row
          class="ma-0 pa-0"
        >
          <v-col class="ma-0 pa-0">
            <div class="type-name">
              {{ annotation.type }}
            </div>
          </v-col>
        </v-row>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<style lang="scss" scoped>
.annotation-id {
    cursor:pointer;
    text-decoration: underline;
}
.annotation-time {
    font-size: 1em;
}
.annotation-item {
  border: 1px solid gray;
}
.type-name {
    font-weight: bold;
    font-size: 1em;
}.selected {
    background-color: cyan;
}
</style>
