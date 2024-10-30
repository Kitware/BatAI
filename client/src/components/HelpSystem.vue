<script lang="ts">
import { defineComponent, ref } from 'vue';
export default defineComponent({
  components: {
  },
  setup() {
    const helpDialog = ref(false);

    return { helpDialog };
  },
});
</script>

<template>
  <div>
    <v-tooltip
       
      bottom
    >
      <template #activator="{ props: subProps }">
        <v-btn
          v-bind="subProps"
          icon="mdi-help"          
          :color="helpDialog ? 'blue' : ''"
          @click="helpDialog = true;"
        />
      </template>
      <span>
        Help:Instructions and Videos
      </span>
    </v-tooltip>
    <v-dialog
      v-model="helpDialog"
      width="auto"
    >
      <v-card>
        <v-card-title>
          Help
        </v-card-title>
        <v-card-text>
          <v-expansion-panels>
            <v-expansion-panel>
              <v-expansion-panel-title>Controls/Shortcuts</v-expansion-panel-title>
              <v-expansion-panel-text>
                <h2> Controls </h2>
                <v-row>
                  <v-col>
                    <b>Shortcut:</b>
                  </v-col>
                  <v-col>
                    <b>Description:</b>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-icon class="mr-3">
                      mdi-mouse-left-click
                    </v-icon>left click
                  </v-col>
                  <v-col>Select an Annotation</v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-icon class="mr-3">
                      mdi-mouse-move-vertical
                    </v-icon>left click and move
                  </v-col>
                  <v-col>Pan spectrogram</v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-icon class="mr-3">
                      mdi-mouse-scroll-wheel
                    </v-icon>mousewheel
                  </v-col>
                  <v-col>Zoom In/Out on the spectrogram</v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-icon class="mr-3">
                      mdi-mouse-right-click
                    </v-icon>right click
                  </v-col>
                  <v-col>Set Annotation into Editing mode</v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-icon class="mr-3">
                      mdi-keyboard
                    </v-icon><b>+</b><v-icon class="mr-3">
                      mdi-mouse-scroll-wheel
                    </v-icon>ctrl+mousewheel
                  </v-col>
                  <v-col>Zoom In/Out on the time scale</v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-icon class="mr-3">
                      mdi-keyboard
                    </v-icon><b>+</b><v-icon class="mr-3">
                      mdi-mouse-scroll-wheel
                    </v-icon>shift+mousewheel
                  </v-col>
                  <v-col>Zoom In/Out on the frequency scale</v-col>
                </v-row>
                <h2 class="pt-5">
                  Icons
                </h2>
                <v-row>
                  <v-col>
                    <b>Icon:</b>
                  </v-col>
                  <v-col>
                    <b>Description:</b>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-icon size="35">
                      mdi-bat
                    </v-icon>
                  </v-col>
                  <v-col>Toggle Species Name Annotations on/off</v-col>
                </v-row>

                <v-row>
                  <v-col>
                    <v-btn
                      size="35"
                      color=""
                      variant="flat"
                    >
                      <v-icon>mdi-arrow-left-right</v-icon>
                      <h3>ms</h3>
                    </v-btn>
                  </v-col>
                  <v-col>Toggle millisecond/timing endpoint labels</v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-btn
                      size="35"
                      color=""
                      variant="flat"
                    >
                      <v-icon>mdi-arrow-expand-horizontal</v-icon>
                      <h3>ms</h3>
                    </v-btn>
                  </v-col>
                  <v-col>Toggle millisecond/timing duration labels</v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-btn
                      size="35"
                      color=""
                      variant="flat"
                    >
                      <h3>khz</h3>
                    </v-btn>
                  </v-col>
                  <v-col>Toggle frequency labels</v-col>
                </v-row>

                <v-row>
                  <v-col>
                    <v-icon size="35">
                      mdi-grid
                    </v-icon>
                  </v-col>
                  <v-col>Toggle grid on/off</v-col>
                </v-row>
                <v-row>
                  <v-col>
                    <v-icon size="35">
                      mdi-calendar-collapse-horizontal
                    </v-icon>
                  </v-col>
                  <v-col>Swap between norm and compressed view</v-col>
                </v-row>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel>
              <v-expansion-panel-title>Uploading Data</v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="video-container">
                  <video controls>
                    <source
                      src="/UploadingDataBatAIweb.mp4"
                      type="video/mp4"
                    >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel>
              <v-expansion-panel-title>Basic Interactions</v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="video-container">
                  <video controls>
                    <source
                      src="/BasicHelpBatAIweb.mp4"
                      type="video/mp4"
                    >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel>
              <v-expansion-panel-title>Annotation Creation</v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="video-container">
                  <video controls>
                    <source
                      src="/CreatingAnnotationsBatAIweb.mp4"
                      type="video/mp4"
                    >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
        <v-card-actions>
          <v-row>
            <v-spacer />
            <v-btn
              variant="outlined"
              @click="helpDialog = false"
            >
              Dismiss
            </v-btn>
            <v-spacer />
          </v-row>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.video-container {
  max-width: 100%; /* Set maximum width */
  overflow: hidden; /* Hide overflow */
}

video {
  width: 100%; /* Make the video width 100% of its container */
}

</style>