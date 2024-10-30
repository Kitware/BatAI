/*eslint class-methods-use-this: "off"*/
import geo, { GeoEvent } from "geojs";
import { SpectroInfo, spectroToGeoJSon, reOrdergeoJSON, spectroTemporalToGeoJSon } from "../geoJSUtils";
import { SpectrogramAnnotation, SpectrogramTemporalAnnotation } from "../../../api/api";
import { LayerStyle } from "./types";
import { GeoJSON } from "geojson";

export type EditAnnotationTypes = "rectangle";

interface RectGeoJSData {
  id: number;
  selected: boolean;
  editing: boolean | string;
  polygon: GeoJSON.Polygon;
}


const typeMapper = new Map([
  ["LineString", "line"],
  ["Polygon", "polygon"],
  ["Point", "point"],
  ["rectangle", "rectangle"],
]);

/**
 * correct matching of drag handle to cursor direction relies on strict ordering of
 * vertices within the GeoJSON coordinate list using utils.reOrdergeoJSON()
 * and utils.reOrderBounds()
 */
const rectVertex = ["sw-resize", "nw-resize", "ne-resize", "se-resize"];
const rectEdge = ["w-resize", "n-resize", "e-resize", "s-resize"];
/**
 * This class is used to edit annotations within the viewer
 * It will do and display different things based on it either being in
 * rectangle or edit modes
 * Basic operation is that changedData will start the edited annotation
 * emits 'update:geojson' when data is changed
 */
export default class EditAnnotationLayer {
  skipNextExternalUpdate: boolean;

  _mode: "editing" | "creation";

  type: EditAnnotationTypes;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  featureLayer: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geoViewerRef: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: (name: string, data: any) => void;

  spectroInfo: SpectroInfo;

  style: LayerStyle<RectGeoJSData>;

  formattedData: GeoJSON.Feature[];

  styleType?: string;

  selectedKey?: string;

  selectedHandleIndex: number;

  hoverHandleIndex: number;

  disableModeSync: boolean; //Disables fallthrough mouse clicks when ending an annotation

  leftButtonCheckTimeout: number; //Fallthough mouse down when ending lineStrings

  scaledWidth: number;
  scaledHeight: number;

  /* in-progress events only emitted for lines and polygons */
  shapeInProgress: GeoJSON.LineString | GeoJSON.Polygon | null;

  mode: 'pulse' | 'sequence';

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geoViewerRef: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: (name: string, data: any) => void,
    spectroInfo: SpectroInfo
  ) {
    (this.geoViewerRef = geoViewerRef), (this.event = event);
    this.type = "rectangle";
    this.style = {
      strokeColor: "black",
      strokeWidth: 1.0,
      antialiasing: 0,
    };
    this.mode = 'pulse';
    this.formattedData = [];
    this.spectroInfo = spectroInfo;
    this.skipNextExternalUpdate = false;
    this._mode = "editing";
    this.selectedKey = "";
    this.selectedHandleIndex = -1;
    this.hoverHandleIndex = -1;
    this.shapeInProgress = null;
    this.disableModeSync = false;
    this.leftButtonCheckTimeout = -1;
    this.scaledWidth = 0;
    this.scaledHeight = 0;

    //Only initialize once, prevents recreating Layer each edit
    this.initialize();
  }

  destroy() {
    if (this.featureLayer) {
      this.geoViewerRef.deleteLayer(this.featureLayer);
    }
  }

  /**
   * Initialization of the layer should only be done once for edit layers
   * Handlers for edit_action and state which will emit data when necessary
   */
  initialize() {
    if (!this.featureLayer) {
      this.featureLayer = this.geoViewerRef.createLayer("annotation", {
        clickToEdit: true,
        showLabels: false,
        continuousPointProximity: false,
        finalPointProximity: 1,
        adjacentPointProximity: 1,
      });
      // For these we need to use an anonymous function to prevent geoJS from erroring
      this.featureLayer.geoOn(geo.event.annotation.edit_action, (e: GeoEvent) =>
        this.handleEditAction(e)
      );
      this.featureLayer.geoOn(geo.event.annotation.state, (e: GeoEvent) =>
        this.handleEditStateChange(e)
      );
      //Event name is misleading, this means hovering over an edit handle
      this.featureLayer.geoOn(geo.event.annotation.select_edit_handle, (e: GeoEvent) =>
        this.hoverEditHandle(e)
      );
      this.featureLayer.geoOn(geo.event.mouseclick, (e: GeoEvent) => {
        //Used to sync clicks that kick out of editing mode with application
        //This prevents that pseudo Edit state when left clicking on a object in edit mode
        if (
          !this.disableModeSync &&
          e.buttonsDown.left &&
          this.getMode() === "disabled" &&
          this.featureLayer.annotations()[0]
        ) {
          this.event("editing-annotation-sync", { edit: FontFaceSetLoadEvent });
        } else if (e.buttonsDown.left) {
          const newIndex = this.hoverHandleIndex;
          // Click features like a toggle: unselect if it's clicked twice.
          if (newIndex === this.selectedHandleIndex) {
            this.selectedHandleIndex = -1;
          } else {
            this.selectedHandleIndex = newIndex;
          }
          window.setTimeout(() => this.redraw(), 0); //Redraw timeout to update the selected handle
        }
        this.disableModeSync = false;
      });
      this.featureLayer.geoOn(geo.event.actiondown, (e: GeoEvent) => this.setShapeInProgress(e));
    }
  }

  skipNextFunc() {
    return () => {
      this.skipNextExternalUpdate = true;
    };
  }

  setScaledDimensions(newWidth: number, newHeight: number) {
    this.scaledWidth = newWidth;
    this.scaledHeight = newHeight;
  }

  /**
   * Listen to mousedown events and build a replica of the in-progress annotation
   * shape that GeoJS is keeps internally.  Emit the shape as update:in-progress-geojson
   */
  setShapeInProgress(e: GeoEvent) {
    // Allow middle click movement when placing points
    if (e.mouse.buttons.middle && !e.propogated) {
      return;
    }
    if (this.getMode() === "creation" && ["LineString", "Polygon"].includes(this.type)) {
      if (this.shapeInProgress === null) {
        // Initialize a new in-progress shape
        this.shapeInProgress = {
          type: "Polygon",
          coordinates: [[]],
        };
      }
      // Update the coordinates of the existing shape
      const newPoint: GeoJSON.Position = [Math.round(e.mouse.geo.x), Math.round(e.mouse.geo.y)];
      const coords = this.shapeInProgress?.coordinates as GeoJSON.Position[][];
      // Magic 0: there can only be a single polygon in progress at a time
      coords[0].push(newPoint);
      this.event("update:geojson", {
        status: "in-progress",
        complete: false,
        selecktedKey: this.selectedKey,
        geoJSON: this.shapeInProgress,
      });
      // triggers a mouse up while editing to make it seem like a point was placed
      window.setTimeout(
        () =>
          this.geoViewerRef.interactor().simulateEvent("mouseup", {
            map: { x: e.mouse.geo.x, y: e.mouse.geo.y },
            button: "left",
          }),
        0
      );
    } else if (this.shapeInProgress) {
      this.shapeInProgress = null;
    }
  }

  hoverEditHandle(e: GeoEvent) {
    const divisor = 2; //For Polygons we skip over edge handles (midpoints)
    if (e.enable && e.handle.handle.type === "vertex") {
      if (e.handle.handle.selected && e.handle.handle.index * divisor !== this.hoverHandleIndex) {
        this.hoverHandleIndex = e.handle.handle.index * divisor;
      }
      if (!e.handle.handle.selected) {
        this.hoverHandleIndex = -1;
      }
    } else if (e.enable && e.handle.handle.type === "center") {
      this.hoverHandleIndex = -1;
    }
    if (e.enable) {
      if (e.handle.handle.type === "vertex") {
        this.event("update:cursor", { cursor: rectVertex[e.handle.handle.index] });
      } else if (e.handle.handle.type === "edge") {
        this.event("update:cursor", { cursor: rectEdge[e.handle.handle.index] });
      }
      if (e.handle.handle.type === "center") {
        this.event("update:cursor", { cursor: "move" });
      } else if (e.handle.handle.type === "resize") {
        this.event("update:cursor", { cursor: "nwse-resize" });
      }
    } else if (this.getMode() !== "creation") {
      this.event("update:cursor", { cursor: "default" });
    }
  }

  applyStylesToAnnotations() {
    const annotation = this.featureLayer.annotations()[0];
    //Setup styling for rectangle and point editing
    if (annotation) {
      annotation.style(this.createStyle());
      annotation.editHandleStyle(this.editHandleStyle());
      annotation.highlightStyle(this.highlightStyle());
    }
    return annotation;
  }

  setKey(key: string) {
    if (typeof key === "string") {
      this.selectedKey = key;
    } else {
      throw new Error(`${key} is invalid`);
    }
  }

  /**
   * Provides whether the user is creating a new annotation or editing one
   */
  getMode(): "creation" | "editing" | "disabled" {
    const layermode = this.featureLayer.mode();
    return layermode ? this._mode : "disabled";
  }

  /**
   * Change the layer mode
   */
  setMode(mode: EditAnnotationTypes | null, geom?: GeoJSON.Feature) {
    if (mode !== null) {
      let newLayerMode: string;
      if (geom) {
        this._mode = "editing";
        newLayerMode = "edit";
        this.event("update:cursor", { cursor: "default" });
        this.event("update:mode", { mode: "editing" });
      } else if (typeMapper.has(mode)) {
        this._mode = "creation";
        this.event("update:mode", { mode: "creation" });
        newLayerMode = typeMapper.get(mode) as string;
        this.event("update:cursor", { cursor: "crosshair" });
      } else {
        throw new Error(`No such mode ${mode}`);
      }
      this.featureLayer.mode(newLayerMode, geom);
    } else {
      this.event("update:mode", { mode: "disabled" });
      this.featureLayer.mode(null);
    }
  }

  calculateCursorImage() {
    if (this.getMode() === "creation") {
      // TODO:  we may want to make this more generic or utilize the icons from editMenu
      this.event("update:cursor", { cursor: "mdi-vector-rectangle" });
    }
  }

  /**
   * Removes the current annotation and resets the mode when completed editing
   */
  disable() {
    if (this.featureLayer) {
      this.skipNextExternalUpdate = false;
      this.featureLayer.removeAllAnnotations(false, true);
      this.setMode(null);
      this.shapeInProgress = null;
      if (this.selectedHandleIndex !== -1) {
        this.selectedHandleIndex = -1;
        this.hoverHandleIndex = -1;
        this.event("update:selectedIndex", {
          selectedIndex: this.selectedHandleIndex,
          selectedKey: this.selectedKey,
        });
      }
      this.event("update:cursor", { cursor: "default" });
      this.event("update:mode", { mode: "disabled" });
    }
  }

  /** overrides default function to disable and clear anotations before drawing again */
  async changeData(frameData: SpectrogramAnnotation | null | SpectrogramTemporalAnnotation, type: 'pulse' | 'sequence') {
    this.mode = type;
    if (this.skipNextExternalUpdate === false) {
      // disable resets things before we load a new/different shape or mode
      this.disable();
      //TODO: Find a better way to track mouse up after placing a point or completing geometry
      //For line drawings and the actions of any recipes we want
      if (this.geoViewerRef.interactor().mouse().buttons.left) {
        this.leftButtonCheckTimeout = window.setTimeout(() => this.changeData(frameData, type), 20);
      } else {
        clearTimeout(this.leftButtonCheckTimeout);
        this.formatData(frameData, type);
      }
    } else {
      // prevent was called and it has prevented this update.
      // disable the skip for next time.
      this.skipNextExternalUpdate = false;
    }
    this.calculateCursorImage();
    this.redraw();
  }

  /**
   *
   * @param frameData a single FrameDataTrack Array that is the editing item
   */
  formatData(annotationData: SpectrogramAnnotation | null | SpectrogramTemporalAnnotation, type: 'pulse' | 'sequence') {
    this.selectedHandleIndex = -1;
    this.hoverHandleIndex = -1;
    this.event("update:selectedIndex", {
      selectedIndex: this.selectedHandleIndex,
      selectedKey: this.selectedKey,
    });
    if (annotationData) {

      const compressedView =  !!(this.spectroInfo.start_times && this.spectroInfo.end_times && type ==='sequence');
      const offsetY = compressedView ? -20 : 0;  
      const geoJSONData = type === 'pulse' ? spectroToGeoJSon(annotationData as SpectrogramAnnotation, this.spectroInfo, 1, this.scaledWidth, this.scaledHeight): spectroTemporalToGeoJSon(annotationData as SpectrogramTemporalAnnotation, this.spectroInfo, -10, -50, 1, this.scaledWidth, this.scaledHeight, offsetY);
      const geojsonFeature: GeoJSON.Feature = {
        type: "Feature",
        geometry: geoJSONData,
        properties: {
          annotationType: typeMapper.get(this.type),
        },
      };
      this.featureLayer.geojson(geojsonFeature);
      const annotation = this.applyStylesToAnnotations();
      this.setMode("rectangle", annotation);
      this.formattedData = [geojsonFeature];
      return;
    } else {
      this.setMode(this.type);
    }
    if (typeof this.type !== "string") {
      throw new Error(
        `editing props needs to be a string of value 
        ${geo.listAnnotations().join(", ")}
          when geojson prop is not set`
      );
    } else {
      // point or rectangle mode for the editor
      this.setMode(this.type);
    }
  }

  /**
   *
   * @param e geo.event emitting by handlers
   */
  handleEditStateChange(e: GeoEvent) {
    if (this.featureLayer === e.annotation.layer()) {
      // Only calls this once on completion of an annotation
      if (e.annotation.state() === "done" && this.getMode() === "creation") {
        const geoJSONData = [e.annotation.geojson()];
        if (this.type === "rectangle") {
          geoJSONData[0].geometry.coordinates[0] = reOrdergeoJSON(
            geoJSONData[0].geometry.coordinates[0] as GeoJSON.Position[]
          );
        }
        this.formattedData = geoJSONData;
        // The new annotation is in a state without styling, so apply local stypes
        this.applyStylesToAnnotations();
        //This makes sure the click for the end point doesn't kick us out of the mode
        this.disableModeSync = true;

        this.event("update:geojson", {
          status: "editing",
          creating: this.getMode() === "creation",
          geoJSON: geoJSONData[0],
          type: this.type,
          selectedKey: this.selectedKey,
        });
      }
    }
  }

  /**
   * If we release the mouse after movement we want to signal for the annotation to update
   * @param e geo.event
   */
  handleEditAction(e: GeoEvent) {
    if (this.featureLayer === e.annotation.layer()) {
      if (e.action === geo.event.actionup) {
        // This will commit the change to the current annotation on mouse up while editing
        if (e.annotation.state() === "edit") {
          const newGeojson: GeoJSON.Feature<GeoJSON.Point | GeoJSON.Polygon | GeoJSON.LineString> =
            e.annotation.geojson();
          if (this.formattedData.length > 0) {
            if (this.type === "rectangle") {
              /* Updating the corners for the proper cursor icons
              Also allows for regrabbing of the handle */
              newGeojson.geometry.coordinates[0] = reOrdergeoJSON(
                newGeojson.geometry.coordinates[0] as GeoJSON.Position[]
              );
              // The corners need to update for the indexes to update
              // coordinates are in a different system than display
              const coords = (newGeojson.geometry.coordinates[0] as GeoJSON.Position[]).map(
                (coord) => ({
                  x: coord[0],
                  y: coord[1],
                })
              );
              // only use the 4 coords instead of 5
              const remapped = this.geoViewerRef.worldToGcs(coords.splice(0, 4));
              e.annotation.options("corners", remapped);
              //This will retrigger highlighting of the current handle after releasing the mouse
              setTimeout(() => this.geoViewerRef.interactor().retriggerMouseMove(), 0);
            }
            // update existing feature
            this.formattedData[0].geometry = newGeojson.geometry;
          } else {
            // create new feature
            this.formattedData = [
              {
                ...newGeojson,
                properties: {
                  annotationType: this.type,
                },
                type: "Feature",
              },
            ];
          }
          this.event("update:geojson", {
            status: "editing",
            creating: this.getMode() === "creation",
            geoJSON: this.formattedData[0],
            type: this.type,
            selectedKey: this.selectedKey,
          });
        }
      }
    }
  }

  /**
   * Drawing for annotations are handled during initialization they don't need the standard redraw
   * function from BaseLayer
   */
  redraw() {
    this.applyStylesToAnnotations();
    this.featureLayer.draw();

    return null;
  }

  /**
   * The base style used to represent the annotation
   */
  createStyle(): LayerStyle<GeoJSON.Feature> {

    return {
      ...{
        strokeColor: 'black',
        strokeWidth: 1.0,
        antialiasing: 0,
        stroke: true,
        uniformPolygon: true,
        fill: false,
      },
      fill: false,
      strokeColor: "cyan",
    };
  }

  /**
   * Styling for the handles used to drag the annotation for ediing
   */
  editHandleStyle() {
    if (this.type === "rectangle" && this.mode === 'pulse') {
      return {
        handles: {
          rotate: false,
          resize: false,
        },
      }; 
    } else if (this.type === 'rectangle' && this.mode === 'sequence') {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        strokeOpacity: (d: any) => {
          if (d.type === 'edge' && [1,3].includes(d.index)) {
            return 0.0;
          }
          return 1.0;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stroke: (d: any) => {
          if (d.type === 'edge' && [1,3].includes(d.index)) {
            return false;
          }
          return true;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        radius: function (d: any) {
          if (d.type === 'edge' && [1,3].includes(d.index)) {
            return 0;
          }
          return 8;
        },      
        handles: {
          rotate:false,
          vertex: false,
          edge: true,
          center:false,
          resize:false
        }
      };
    }
    return {
      handles: {
        rotate: false,
      },
    };
  }

  /**
   * Should never have highlighting enabled but this will remove any highlighting style
   * from the annotation.  NOTE: this will not remove styling from handles
   */
  highlightStyle() {
    if (this.type === "rectangle" || this.type === "Polygon") {
      return {
        handles: {
          rotate: false,
        },
      };
    }
    if (this.type === "Point") {
      return {
        stroke: false,
      };
    }
    return {
      handles: {
        rotate: false,
      },
    };
  }
}
