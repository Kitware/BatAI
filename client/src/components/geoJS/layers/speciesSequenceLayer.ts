/* eslint-disable class-methods-use-this */
import { SpectrogramTemporalAnnotation } from "../../../api/api";
import { SpectroInfo, spectroTemporalToGeoJSon } from "../geoJSUtils";
import { LayerStyle } from "./types";

interface TextData {
  text: string;
  x: number;
  y: number;
  offsetY?: number;
  offsetX?: number;
  textType: 'species' | 'type';
}

export default class SpeciesSequenceLayer {

  textData: TextData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textLayer: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geoViewerRef: any;


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: (name: string, data: any) => void;

  spectroInfo: SpectroInfo;

  textStyle: LayerStyle<TextData>;

  scaledWidth: number;
  scaledHeight: number;


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geoViewerRef: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: (name: string, data: any) => void,
    spectroInfo: SpectroInfo
  ) {
    this.geoViewerRef = geoViewerRef;
    this.spectroInfo = spectroInfo;
    this.textData = [];
    this.scaledWidth = 0;
    this.scaledHeight = 0;
    this.event = event;
    //Only initialize once, prevents recreating Layer each edit
    const layer = this.geoViewerRef.createLayer("feature", {
      features: ["text"],
    });
    this.textLayer = layer
      .createFeature("text")
      .text((data: TextData) => data.text)
      .position((data: TextData) => ({ x: data.x, y: data.y }));


    this.textStyle = this.createTextStyle();
  }

  setScaledDimensions(newWidth: number, newHeight: number) {
    this.scaledWidth = newWidth;
    this.scaledHeight = newHeight;
  }

  destroy() {
    if (this.textLayer) {
      this.geoViewerRef.deleteLayer(this.textLayer);
    }    
  }

  formatData(annotationData: SpectrogramTemporalAnnotation[]) {
    this.textData = [];
    const compressedView =  !!(this.spectroInfo.start_times && this.spectroInfo.end_times);
    const offsetY = compressedView ? -100 : 0;  
    annotationData.forEach((annotation: SpectrogramTemporalAnnotation) => {
      const polygon = spectroTemporalToGeoJSon(annotation, this.spectroInfo, -10, -50, 1, this.scaledWidth, this.scaledHeight);
      const [xmin, ymin] = polygon.coordinates[0][0];
      const [xmax, ymax] = polygon.coordinates[0][2];
      // For the compressed view we need to filter out default or NaN numbers
      if (Number.isNaN(xmax) || Number.isNaN(xmin) || Number.isNaN(ymax) || Number.isNaN(ymin)) {
        return;
      }
      if (xmax === -1 && ymin === -1 && ymax === -1 && xmin === -1) {
        return;
      }
      let textOffset = 0;
      const species = annotation.species;
      const type = annotation.type;
      if (species) {
        for (let i =0; i< species.length; i += 1) {
          const specie = species[i];
          this.textData.push({
            text: `${specie.species_code || specie.common_name}`,
            x: xmin + (xmax-xmin) /2.0,
            y: ymax,
            offsetX:0,
            offsetY: -30 + textOffset,
            textType: 'species',
          });
          textOffset -= 15;        
        }
      }
      if (type) {
        this.textData.push({
          text: `${type}`,
          x: xmin + (xmax-xmin) /2.0,
          y: ymin ,
          offsetX:0,
          offsetY: 10 + offsetY,
          textType: 'type'
        });
      }
    });
  }

  redraw() {
    // add some styles
    this.textLayer.data(this.textData).style(this.createTextStyle()).draw();
  }

  disable() {
    this.textLayer.data([]).draw();
  }


  createTextStyle(): LayerStyle<TextData> {
    return {
      ...{
        strokeColor: "yellow",
        strokeWidth: 2.0,
        antialiasing: 0,
        stroke: true,
        uniformPolygon: true,
        fill: false,
      },
      color: (d) => {
        if (d.textType === 'type') {
          return 'yellow';
        }
        return "white";
      },
      offset: (data) => ({
        x: data.offsetX || 0,
        y: data.offsetY || 0,
      }),
      textAlign: 'center',
    };
  }
}
