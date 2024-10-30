<script lang="ts">
import { defineComponent, PropType } from "vue";
import { SpectroInfo } from './geoJS/geoJSUtils';
import useState from "../use/useState";
import { watch, ref } from "vue";
import RecordingList from "./RecordingList.vue";

export default defineComponent({
  name: "AnnotationList",
  components: {
    RecordingList,
  },
  props: {
    spectroInfo: {
      type: Object as PropType<SpectroInfo | undefined>,
      default: () => undefined,
    },
  },
  emits: ['select'],
  setup() {
    const { creationType, annotationState, setAnnotationState, annotations, temporalAnnotations, selectedId, selectedType, setSelectedId } = useState();
    const tab = ref('pulse');
    const scrollToId = (id: number) => {
    const el = document.getElementById(`annotation-${id}`);
    if (el) {
      el.scrollIntoView({block: 'end', behavior: 'smooth'});
    }
  };
  watch(selectedId, () => {
    tab.value = selectedType.value;
    if (selectedId.value !== null) {
      scrollToId(selectedId.value);
    }
  });
  watch(selectedType, () => {
    tab.value = selectedType.value;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tabSwitch = (event: any) => {
    // On tab switches we want to deselect the curret anntation
    if (['sequence', 'pulse'].includes(event)) {
      tab.value = event as 'sequence' | 'pulse';
      selectedType.value = event as 'sequence' | 'pulse';
      selectedId.value = null;
    } else {
      tab.value = 'recordings';
    }
  };

    return {
        annotationState,
        annotations,
        creationType,
        temporalAnnotations,
        selectedId,
        selectedType,
        setAnnotationState,
        setSelectedId,
        tabSwitch,
        tab,
    };
  },
});
</script>

<template>
  <v-card
    class="pa-0 ma-0"
    :class="{'annotation-list': ['pulse','sequence'].includes(tab),'recording-list': !['pulse','sequence'].includes(tab)}"
  >
    <v-card-title>
      <v-row dense>
        <v-tabs
          v-model="tab"
          class="ma-auto"
          @update:model-value="tabSwitch($event)"
        >
          <v-tab
            value="recordings"
            size="x-small"
          >
            Recordings
          </v-tab>
          <v-tab
            value="pulse"
            size="x-small"
          >
            Pulse
          </v-tab>
          <v-tab
            value="sequence"
            size="x-small"
          >
            Sequence
          </v-tab>
        </v-tabs>
      </v-row>
    </v-card-title>
    <v-card-text class="">
      <v-window v-model="tab">
        <v-window-item value="recordings">
          <recording-list />
        </v-window-item>
        <v-window-item value="pulse">
          <v-row class="pa-2">
            <v-col>
              Annotations
            </v-col>
            <v-spacer />
            <v-col>
              <v-btn
                :disabled="annotationState === 'creating'"
                @click="annotationState = 'creating'; creationType = 'pulse' "
              >
                Add<v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-col>
          </v-row>

          <v-list>
            <v-list-item
              v-for="annotation in annotations"
              :id="`annotation-${annotation.id}`"
              :key="annotation.id"
              :class="{selected: annotation.id===selectedId}"
              class="annotation-item"
              @click="setSelectedId(annotation.id, 'pulse')"
            >
              <v-row>
                <v-col class="annotation-time">
                  <span>{{ annotation.start_time }}-{{ annotation.end_time }}ms</span>
                  <span class="pl-2"><b>({{ annotation.end_time - annotation.start_time }}ms)</b></span>
                </v-col>
                <v-col class="annotation-freq">
                  <span>{{ (annotation.low_freq/1000).toFixed(1) }}-{{ (annotation.high_freq/1000).toFixed() }}Khz </span>
                </v-col>
              </v-row>
              <v-row
                v-for="item in annotation.species"
                :key="`${annotation.id}_${item.common_name}`"
                class="ma-0 pa-0"
              >
                <v-col class="ma-0 pa-0">
                  <div class="species-name">
                    {{ item.species_code || item.common_name }}
                  </div>
                  <div
                    v-if="item.family"
                    class="species-hierarchy"
                  >
                    <span> {{ item.family }}</span>
                    <span v-if="item.genus">-></span>
                    <span v-if="item.genus">{{ item.genus }}</span>
                  </div>
                </v-col>
              </v-row>
            </v-list-item>
          </v-list>
        </v-window-item>
        <v-window-item value="sequence">
          <v-row class="pa-2">
            <v-col>
              Annotations
            </v-col>
            <v-spacer />
            <v-col>
              <v-btn
                :disabled="annotationState === 'creating'"
                @click="annotationState = 'creating'; creationType = 'sequence' "
              >
                Add<v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-col>
          </v-row>

          <v-list>
            <v-list-item
              v-for="annotation in temporalAnnotations"
              :id="`annotation-${annotation.id}`"
              :key="annotation.id"
              :class="{selected: annotation.id===selectedId}"
              class="annotation-item"
              @click="setSelectedId(annotation.id, 'sequence')"
            >
              <v-row>
                <v-col class="annotation-time">
                  <span>{{ annotation.start_time }}-{{ annotation.end_time }}ms</span>
                  <span class="pl-2"><b>({{ annotation.end_time - annotation.start_time }}ms)</b></span>
                </v-col>
                <v-col class="annotation-time">
                  <b>Type:</b><span>{{ annotation.type }}</span>
                </v-col>
              </v-row>
              <v-row
                v-for="item in annotation.species"
                :key="`${annotation.id}_${item.common_name}`"
                class="ma-0 pa-0"
              >
                <v-col class="ma-0 pa-0">
                  <div class="species-name">
                    {{ item.species_code || item.common_name }}
                  </div>
                  <div
                    v-if="item.family"
                    class="species-hierarchy"
                  >
                    <span> {{ item.family }}</span>
                    <span v-if="item.genus">-></span>
                    <span v-if="item.genus">{{ item.genus }}</span>
                  </div>
                </v-col>
              </v-row>
            </v-list-item>
          </v-list>
        </v-window-item>
      </v-window>
    </v-card-text>
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
.annotation-freq {
    font-size: 1em;
}
.annotation-item {
  border: 1px solid gray;
}
.species-name {
    font-weight: bold;
    font-size: 1em;
}
.species-hierarchy {
    font-size: 0.75em;
}
.selected {
    background-color: cyan;
}
.annotation-list {
  max-height: 60vh;
  overflow-y: auto;
}
.recording-list {
  max-height: 85vh;
  overflow-y: auto;
}

</style>
