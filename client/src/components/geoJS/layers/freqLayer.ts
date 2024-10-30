/* eslint-disable class-methods-use-this */
import { SpectrogramAnnotation } from "../../../api/api";
import { SpectroInfo, spectroToGeoJSon } from "../geoJSUtils";
import { LayerStyle } from "./types";

interface LineData {
  line: GeoJSON.LineString;
  thicker?: boolean;
  grid?: boolean;
}

interface TextData {
  text: string;
  x: number;
  y: number;
  offsetY?: number;
  offsetX?: number;
}

export default class FreqLayer {
  lineData: LineData[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineLayer: any;

  textData: TextData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textLayer: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geoViewerRef: any;


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: (name: string, data: any) => void;

  spectroInfo: SpectroInfo;

  textStyle: LayerStyle<TextData>;
  lineStyle: LayerStyle<LineData>;

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
    this.lineData = [];
    this.spectroInfo = spectroInfo;
    this.textData = [];
    this.scaledWidth = 0;
    this.scaledHeight = 0;
    this.event = event;
    //Only initialize once, prevents recreating Layer each edit
    const layer = this.geoViewerRef.createLayer("feature", {
      features: ["text", "line"],
    });
    this.textLayer = layer
      .createFeature("text")
      .text((data: TextData) => data.text)
      .position((data: TextData) => ({ x: data.x, y: data.y }));

    this.lineLayer = layer.createFeature("line");

    this.textStyle = this.createTextStyle();
    this.lineStyle = this.createLineStyle();
  }

  setScaledDimensions(newWidth: number, newHeight: number) {
    this.scaledWidth = newWidth;
    this.scaledHeight = newHeight;
  }

  destroy() {
    if (this.textLayer) {
      this.geoViewerRef.deleteLayer(this.textLayer);
    }
    if (this.lineLayer) {
      this.geoViewerRef.deleteLayer(this.lineLayer);
    }
  }

  formatData(annotationData: SpectrogramAnnotation[]) {
    this.textData = [];
    this.lineData = [];
    const lineDist = 16;
    annotationData.forEach((annotation: SpectrogramAnnotation) => {
      const polygon = spectroToGeoJSon(annotation, this.spectroInfo, 1, this.scaledWidth, this.scaledHeight);
      const {low_freq, high_freq } = annotation;
      const [xmin, ymin] = polygon.coordinates[0][0];
      const [xmax, ymax] = polygon.coordinates[0][2];
      // For the compressed view we need to filter out default or NaN numbers
      if (Number.isNaN(xmax) || Number.isNaN(xmin) || Number.isNaN(ymax) || Number.isNaN(ymin)) {
        return;
      }
      if (xmax === -1 && ymin === -1 && ymax === -1 && xmin === -1) {
        return;
      }
      // We create two small lines for the beginning/end of annotation
      this.lineData.push({
        line: {
          type: "LineString",
          coordinates: [
            [xmax, ymin],
            [xmax + lineDist, ymin],
          ],
        },
        thicker: true,
      });
      this.lineData.push({
        line: {
          type: "LineString",
          coordinates: [
            [xmax, ymax],
            [xmax + lineDist, ymax],
          ],
        },
        thicker: true,
      });
      // Now we need to create the text Labels
      this.textData.push({
        text: `${(low_freq/1000).toFixed(1)}KHz`,
        x: xmax + lineDist,
        y: ymin ,
        offsetX: 0,
        offsetY: 0,
      });
      this.textData.push({
        text: `${(high_freq/1000).toFixed(1)}KHz`,
        x: xmax + lineDist,
        y: ymax,
        offsetX: 0,
        offsetY: 0,
      });
    });
  }

  redraw() {
    // add some styles
    this.lineLayer
      .data(this.lineData)
      .line((d: LineData) => d.line.coordinates)
      .style(this.createLineStyle())
      .draw();
    this.textLayer.data(this.textData).style(this.createTextStyle()).draw();
  }

  disable() {
    this.lineLayer.data([]).draw();
    this.textLayer.data([]).draw();
  }


  createLineStyle(): LayerStyle<LineData> {
    return {
      ...{
        strokeColor: "#00FFFF",
        strokeWidth: 2.0,
        antialiasing: 0,
        stroke: true,
        uniformPolygon: true,
        fill: false,
      },
      strokeOpacity: (_point, _index, data) => {
        // Reduce the rectangle opacity if a polygon is also drawn
        if (data.grid) {
          return 0.5;
        }
        return 1.0;
      },

      strokeWidth: (_point, _index, data) => {
        if (data.thicker) {
          return 4.0;
        }
        if (data.grid) {
          return 1.0;
        }
        return 2.0;
      },
    };
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
      color: () => {
        return "white";
      },
      offset: (data) => ({
        x: data.offsetX || 0,
        y: data.offsetY || 0,
      }),
      textAlign: 'starts',
    };
  }
}
