<script lang="ts">
import { computed, defineComponent, PropType, ref } from "vue";
import { Species } from "../api/api";
import { cloneDeep } from "lodash";

export default defineComponent({
  name: "SpeciesInfo",
  components: {},
  props: {
    speciesList: {
      type: Array as PropType<Species[]>,
      required: true,
    },
    selectedSpecies: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
  },
  emits: ['dismiss'],
  setup(props) {
    const itemsPerPage = ref(-1);
    const displayDialog = ref(false);
    const headers = ref([
      {
        title: "Species Code",
        key: "species_code",
      },
      {
        title: "Family",
        key: "family,",
      },
      {
        title: "Genus",
        key: "genus,",
      },
      {
        title: "Common Name",
        key: "common_name",
      },
    ]);

    const orderedSpecies = computed(() => {
      const copiedSpecies = cloneDeep(props.speciesList);
      copiedSpecies.sort((a, b) => {
        const aSelected = props.selectedSpecies.includes(a.species_code);
        const bSelected = props.selectedSpecies.includes(b.species_code);

        if (aSelected && !bSelected) {
          return -1;
        } else if (!aSelected && bSelected) {
          return 1;
        } else {
          // Compare species_code strings
          return a.species_code.localeCompare(b.species_code);
        }
      });
      return copiedSpecies;
    });

    return {
      headers,
      orderedSpecies,
      itemsPerPage,
      displayDialog,
    };
  },
});
</script>

<template>
  <span>
    <v-btn
      size="x-small"
      color="primary"
      class="ml-3"
      @click="displayDialog = true"
    > Species Info </v-btn>
    <v-dialog
      v-model="displayDialog"
      width="600"
    >
      <v-card>
        <v-card-title>
          <v-row class="my-2">
            <h2>Species Info</h2>
            <v-spacer />
            <v-icon
              size="large"
              @click="displayDialog = false"
            >mdi-close</v-icon>
          </v-row>
        </v-card-title>
        <v-card-text>
          <v-data-table
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="orderedSpecies"
            density="compact"
            class="elevation-1 my-recordings"
          />
        </v-card-text>
        <v-card-actions>
          <v-row>
            <v-spacer />
            <v-btn @click="displayDialog = false">
              Ok
            </v-btn>
            <v-spacer />
          </v-row>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </span>
</template>
