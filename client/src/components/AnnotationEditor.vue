<script lang="ts">
import { computed, defineComponent, PropType, ref, Ref, watch } from "vue";
import { SpectroInfo } from './geoJS/geoJSUtils';
import { deleteAnnotation, deleteTemporalAnnotation, patchAnnotation, patchTemporalAnnotation, Species, SpectrogramAnnotation, SpectrogramTemporalAnnotation } from "../api/api";
import useState from "../use/useState";
import SpeciesInfo from "./SpeciesInfo.vue";
export default defineComponent({
  name: "AnnotationEditor",
  components: {
    SpeciesInfo,
  },
  props: {
    spectroInfo: {
      type: Object as PropType<SpectroInfo | undefined>,
      default: () => undefined,
    },
    annotation: {
      type: Object as PropType<SpectrogramAnnotation | SpectrogramTemporalAnnotation | null>,
      default: () => null,
    },
    species: {
        type: Array as PropType<Species[]>,
        required: true,
    },
    recordingId: {
        type: String,
        required: true,
    }
  },
  emits: ['update:annotation', 'delete:annotation'],
  setup(props, { emit }) {
    const { selectedType } = useState();
    const speciesList = computed(() => {
        return props.species.map((item) => (item.species_code || item.common_name)).sort();
    });

    const speciesEdit: Ref<string[]> = ref( props.annotation?.species?.map((item) => item.species_code || item.common_name) || []);
    const comments: Ref<string> = ref(props.annotation?.comments || '');
    const type: Ref<string[]> = ref([]);
    const callTypes = ref(['Search', 'Approach', 'Terminal', 'Social']);

      type.value = (props.annotation as SpectrogramTemporalAnnotation).type?.split('+') || [];

    watch(() => props.annotation, () => {
        if (props.annotation?.species) {
            speciesEdit.value = props.annotation.species.map((item) => item.species_code || item.common_name);
        }
        if (selectedType.value === 'pulse' && props.annotation?.comments) {
            comments.value = props.annotation.comments;
        }
        if (selectedType.value === 'pulse' && (props.annotation as SpectrogramTemporalAnnotation).type) {
            type.value = (props.annotation as SpectrogramTemporalAnnotation).type?.split('+') || [];
        }
    });
    const updateAnnotation = async () => {
        if (props.annotation) {
            // convert species names to Ids;
            const speciesIds: number[] = [];
            speciesEdit.value.forEach((item) => {
                const found = props.species.find((specie) => specie.species_code === item);
                if (found) {
                    speciesIds.push(found.id);
                }
            });
            const updateType = type.value.join('+');
            if (selectedType.value === 'pulse') {
              await patchAnnotation(props.recordingId, props.annotation?.id, { ...props.annotation, comments: comments.value, type: updateType }, speciesIds );
            } else if (selectedType.value === 'sequence') {
              await patchTemporalAnnotation(props.recordingId, props.annotation.id, {...props.annotation, comments: comments.value, type: updateType }, speciesIds);
            }
            // Signal to redownload the updated annotation values if possible
            emit('update:annotation');
        }

    };

    const deleteAnno = async () => {
      if (props.annotation && props.recordingId && selectedType.value === 'pulse') {
            await deleteAnnotation(props.recordingId, props.annotation.id);
            emit('delete:annotation');
        }
        if (props.annotation && props.recordingId && selectedType.value === 'sequence') {
            await deleteTemporalAnnotation(props.recordingId, props.annotation.id);
            emit('delete:annotation');
        }
        
    };
    return {
        callTypes,
        speciesList,
        speciesEdit,
        comments,
        type,
        selectedType,
        updateAnnotation,
        deleteAnno
    };
  },
});
</script>

<template>
  <v-card>
    <v-card-title>
      <v-row class="pa-2">
        Edit Annotations
        <v-spacer />
        <v-btn
          size="x-small"
          color="error"
          class="mt-1"
          @click="deleteAnno()"
        >
          Delete<v-icon>mdi-delete</v-icon>
        </v-btn>
      </v-row>
    </v-card-title>
    <v-row>
      <SpeciesInfo
        :species-list="species"
        :selected-species="speciesEdit"
        class="my-2"
      />
    </v-row>
    <v-row>
      <v-autocomplete
        v-model="speciesEdit"
        multiple
        closable-chips
        chips
        :items="speciesList"
        label="Species"
        @update:model-value="updateAnnotation()"
      />
    </v-row>
    <v-row>
      <v-autocomplete
        v-model="type"
        multiple
        closable-chips
        chips
        :items="callTypes"
        label="Type"
        @update:model-value="updateAnnotation()"
      />
    </v-row>

    <v-row>
      <v-textarea
        v-model="comments"
        label="Comments"
        @change="updateAnnotation()"
      />
    </v-row>
  </v-card>
</template>

<style lang="scss" scoped>

</style>
