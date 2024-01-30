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
}

export default class RectangleLayer {
  formattedData: RectGeoJSData[];

  drawingOther: boolean; //drawing another type of annotation at the same time?

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geoViewerRef: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: (name: string, data: any) => void,
    spectroInfo: SpectroInfo
  ) {
    this.geoViewerRef = geoViewerRef;
    this.drawingOther = false;
    this.spectroInfo = spectroInfo;
    this.formattedData = [];
    this.hoverOn = false;
    this.selectedIndex = [];
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
            this.event("annotation-clicked", { id: e.data.id, edit: false });
          }
        } else if (e.mouse.buttonsDown.right) {
          if (!e.data.editing || (e.data.editing && !e.data.selected)) {
            this.event("annotation-right-clicked", { id: e.data.id, edit: true });
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

  /**
   * Used to set the drawingOther parameter used to change styling if other types are drawn
   * and also handle selection clicking between different types
   * @param val - determines if we are drawing other types of annotations
   */
  setDrawingOther(val: boolean) {
    this.drawingOther = val;
  }

  formatData(annotationData: SpectrogramAnnotation[], selectedIndex: number | null) {
    const arr: RectGeoJSData[] = [];
    annotationData.forEach((annotation: SpectrogramAnnotation) => {
        const polygon = spectroToGeoJSon(annotation, this.spectroInfo);
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
        };
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
        return "red";
      },
    };
  }
}
