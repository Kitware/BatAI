/* eslint-disable class-methods-use-this */
import geo, { GeoEvent } from "geojs";
import { SpectroInfo, spectroToGeoJSon } from "../geoJSUtils";
import { SpectrogramAnnotation } from "../../../api/api";
import { LayerStyle } from "./types";

interface RectGeoJSData {
  id: number;
  selected: boolean;
  editing?: boolean;
  polygon: GeoJSON.Polygon;
  color?: string;
  owned: boolean; // if the annotation is user owned
}

export default class RectangleLayer {
  formattedData: RectGeoJSData[];


  hoverOn: boolean; //to turn over annnotations on
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  featureLayer: any;

  selectedIndex: number[]; // sparse array

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geoViewerRef: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: (name: string, data: any) => void;

  spectroInfo: SpectroInfo;

  style: LayerStyle<RectGeoJSData>;

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
    this.formattedData = [];
    this.hoverOn = false;
    this.selectedIndex = [];
    this.scaledWidth = 0;
    this.scaledHeight = 0;
    this.event = event;
    //Only initialize once, prevents recreating Layer each edit
    const layer = this.geoViewerRef.createLayer("feature", {
      features: ["polygon"],
    });
    this.featureLayer = layer
      .createFeature("polygon", { selectionAPI: true })
      .geoOn(geo.event.feature.mouseclick, (e: GeoEvent) => {
        /**
         * Handle clicking on individual annotations, if DrawingOther is true we use the
         * Rectangle type if only the polygon is visible we use the polygon bounds
         * */
        if (e.mouse.buttonsDown.left) {
          if (!e.data.editing || (e.data.editing && !e.data.selected)) {
            if (e.data.owned) {
              this.event("annotation-clicked", { id: e.data.id, edit: false });
            }
          }
        } else if (e.mouse.buttonsDown.right) {
          if (!e.data.editing || (e.data.editing && !e.data.selected)) {
            if (e.data.owned) {
              this.event("annotation-right-clicked", { id: e.data.id, edit: true });
            }
          }
        }
      });
    this.featureLayer.geoOn(
      geo.event.feature.mouseclick_order,
      this.featureLayer.mouseOverOrderClosestBorder
    );
    this.featureLayer.geoOn(geo.event.mouseclick, (e: GeoEvent) => {
      // If we aren't clicking on an annotation we can deselect the current track
      if (this.featureLayer.pointSearch(e.geo).found.length === 0) {
        this.event("annotation-cleared", { id: null, edit: false });
      }
    });
    this.style = this.createStyle();
  }

  hoverAnnotations(e: GeoEvent) {
    const { found } = this.featureLayer.pointSearch(e.mouse.geo);
    this.event("annotation-hover", { id: found, pos: e.mouse.geo });
  }

  setHoverAnnotations(val: boolean) {
    if (!this.hoverOn && val) {
      this.featureLayer.geoOn(geo.event.feature.mouseover, (e: GeoEvent) =>
        this.hoverAnnotations(e)
      );
      this.featureLayer.geoOn(geo.event.feature.mouseoff, (e: GeoEvent) =>
        this.hoverAnnotations(e)
      );
      this.hoverOn = true;
    } else if (this.hoverOn && !val) {
      this.featureLayer.geoOff(geo.event.feature.mouseover);
      this.featureLayer.geoOff(geo.event.feature.mouseoff);
      this.hoverOn = false;
    }
  }

  setScaledDimensions(newWidth: number, newHeight: number) {
    this.scaledWidth = newWidth;
    this.scaledHeight = newHeight;    
  }

  destroy() {
    if (this.featureLayer) {
      this.geoViewerRef.deleteLayer(this.featureLayer);
    }
  }

  formatData(
    annotationData: SpectrogramAnnotation[],
    selectedIndex: number | null,
    currentUser: string,
    colorScale?: d3.ScaleOrdinal<string, string, never>,
    yScale = 1,
  ) {
    const arr: RectGeoJSData[] = [];
    annotationData.forEach((annotation: SpectrogramAnnotation) => {
      const polygon = spectroToGeoJSon(annotation, this.spectroInfo, yScale, this.scaledWidth, this.scaledHeight);
      const [xmin, ymin] = polygon.coordinates[0][0];
      const [xmax, ymax] = polygon.coordinates[0][2];
      // For the compressed view we need to filter out default or NaN numbers
      if (Number.isNaN(xmax) || Number.isNaN(xmin) || Number.isNaN(ymax) || Number.isNaN(ymin)) {
        return;
      }
      if (xmax === -1 && ymin === -1 && ymax === -1 && xmin === -1) {
        return;
      }
      const newAnnotation: RectGeoJSData = {
        id: annotation.id,
        selected: annotation.id === selectedIndex,
        editing: annotation.editing,
        polygon,
        owned: annotation.owner_email === currentUser,
      };
      if (colorScale && annotation.owner_email !== currentUser && annotation.owner_email) {
        newAnnotation.color = colorScale(annotation.owner_email);
      }
      arr.push(newAnnotation);
    });
    this.formattedData = arr;
  }

  redraw() {
    // add some styles
    this.featureLayer
      .data(this.formattedData)
      .polygon((d: RectGeoJSData) => d.polygon.coordinates[0])
      .style(this.createStyle())
      .draw();
  }

  disable() {
    this.featureLayer.data([]).draw();
  }

  createStyle(): LayerStyle<RectGeoJSData> {
    return {
      ...{
        strokeColor: "black",
        strokeWidth: 2.0,
        antialiasing: 0,
        stroke: true,
        uniformPolygon: true,
        fill: false,
      },
      // Style conversion to get array objects to work in geoJS
      position: (point) => {
        return { x: point[0], y: point[1] };
      },
      strokeColor: (_point, _index, data) => {
        if (data.selected) {
          return "cyan";
        }
        if (data.color) {
          return data.color;
        }
        return "red";
      },
    };
  }
}
