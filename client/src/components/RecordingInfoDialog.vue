<script lang="ts">
import { defineComponent, onMounted, ref, Ref, watch } from 'vue';
import { getRecording, Recording } from '../api/api';
import RecordingInfoDisplay from './RecordingInfoDisplay.vue';


export default defineComponent({
  components: {
    RecordingInfoDisplay
  },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  emits: ['close'],
  setup(props) {
    const recordingInfo: Ref<Recording | null> = ref(null);

    const loadData = async () => {
      const recording = getRecording(props.id);
      recordingInfo.value = (await recording).data;
    };
    watch(() => props.id, () => loadData());
    onMounted(() => loadData());
    return {
      recordingInfo,
    };
  },
});
</script>

<template>
  <recording-info-display
    v-if="recordingInfo"
    :recording-info="recordingInfo"
    @close="$emit('close')"
  />
</template>
