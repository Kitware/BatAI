import { ref, Ref } from "vue";
import geo from "geojs";

const useGeoJS = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoViewer: Ref<any> = ref();
  const container: Ref<HTMLElement | undefined> = ref();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let quadFeature: any;

  const thumbnail = ref(false);

  let originalBounds = {
    left: 0,
    top: 0,
    bottom: 1,
    right: 1,
  };

  const getGeoViewer = () => {
    return geoViewer;
  };

  const initializeViewer = (
    sourceContainer: HTMLElement,
    width: number,
    height: number,
    thumbanilVal = false
  ) => {
    thumbnail.value = thumbanilVal;
    container.value = sourceContainer;
    const params = geo.util.pixelCoordinateParams(container.value, width, height);
    if (!container.value) {
      return;
    }
    geoViewer.value = geo.map(params.map);
    resetMapDimensions(width, height);
    const interactorOpts = geoViewer.value.interactor().options();
    interactorOpts.keyboard.focusHighlight = false;
    interactorOpts.keyboard.actions = {};
    interactorOpts.click.cancelOnMove = 5;
    interactorOpts.actions = [
      interactorOpts.actions[0],
      // The action below is needed to have GeoJS use the proper handler
      // with cancelOnMove for right clicks
      {
        action: geo.geo_action.select,
        input: { right: true },
        name: "button edit",
        owner: "geo.MapInteractor",
      },
      // The action below adds middle mouse button click to panning
      // It allows for panning while in the process of polygon editing or creation
      {
        action: geo.geo_action.pan,
        input: "middle",
        modifiers: { shift: false, ctrl: false },
        owner: "geo.mapInteractor",
        name: "button pan",
      },
      interactorOpts.actions[2],
      interactorOpts.actions[6],
      interactorOpts.actions[7],
      interactorOpts.actions[8],
      interactorOpts.actions[9],
    ];
    // Set > 2pi to disable rotation
    interactorOpts.zoomrotateMinimumRotation = 7;
    interactorOpts.zoomAnimation = {
      enabled: false,
    };
    interactorOpts.momentum = {
      enabled: false,
    };
    interactorOpts.wheelScaleY = 0.2;
    if (thumbnail.value) {
      interactorOpts.actions = [
        {
          action: "overview_pan",
          input: "left",
          modifiers: { shift: false, ctrl: false },
          name: "button pan",
        },
      ];
    }
    geoViewer.value.interactor().options(interactorOpts);
    geoViewer.value.bounds({
      left: 0,
      top: 0,
      bottom: height,
      right: width,
    });

    const quadFeatureLayer = geoViewer.value.createLayer("feature", {
      features: ["quad"],
      autoshareRenderer: false,
      renderer: "canvas",
    });
    quadFeature = quadFeatureLayer.createFeature("quad");
  };

  const drawImage = (image: HTMLImageElement, width = image.width, height = image.height, resetCam=true) => {
    if (quadFeature) {
      quadFeature
        .data([
          {
            ul: { x: 0, y: 0 },
            lr: { x: width, y: height },
            image: image,
          },
        ])
        .draw();
    }
    if (resetCam) {
    resetMapDimensions(width, height, 0.3,resetCam);
    } else {
      const params = geo.util.pixelCoordinateParams(container.value, width, height, width, height);
      const margin  = 0.3;
      const { right, bottom } = params.map.maxBounds;
      originalBounds = params.map.maxBounds;
      geoViewer.value.maxBounds({
        left: 0 - right * margin,
        top: 0 - bottom * margin,
        right: right * (1 + margin),
        bottom: bottom * (1 + margin),
      });
  
    }
    
  };
  const resetZoom = () => {
    const { width: mapWidth } = geoViewer.value.camera().viewport;

    const bounds = !thumbnail.value
      ? {
          left: -125, // Making sure the legend is on the screen
          top: 0,
          right: mapWidth,
          bottom: originalBounds.bottom,
        }
      : originalBounds;
    const zoomAndCenter = geoViewer.value.zoomAndCenterFromBounds(bounds, 0);
    geoViewer.value.zoom(zoomAndCenter.zoom);
    geoViewer.value.center(zoomAndCenter.center);
  };

  const resetMapDimensions = (width: number, height: number, margin = 0.3, resetCam = false) => {
    // Want the height to be the main view and whe width to be  relative to the width of the geo.amp
    geoViewer.value.bounds({
      left: 0,
      top: 0,
      bottom: height,
      right: width,
    });
    const params = geo.util.pixelCoordinateParams(container.value, width, height, width, height);
    const { right, bottom } = params.map.maxBounds;
    originalBounds = params.map.maxBounds;
    geoViewer.value.maxBounds({
      left: 0 - right * margin,
      top: 0 - bottom * margin,
      right: right * (1 + margin),
      bottom: bottom * (1 + margin),
    });
    geoViewer.value.zoomRange({
      // do not set a min limit so that bounds clamping determines min
      min: -Infinity,
      // 4x zoom max
      max: 4,
    });
    geoViewer.value.clampBoundsX(true);
    geoViewer.value.clampBoundsY(true);
    geoViewer.value.clampZoom(true);
    if (resetCam) {
      resetZoom();
    }
  };

  return {
    getGeoViewer,
    initializeViewer,
    drawImage,
    resetMapDimensions,
    resetZoom,
  };
};

import { SpectrogramAnnotation, SpectrogramTemporalAnnotation } from "../../api/api";

export interface SpectroInfo {
  width: number;
  height: number;
  start_time: number;
  end_time: number;
  start_times?: number[];
  end_times?: number[];
  widths?: number[], //widths of segements
  low_freq: number;
  high_freq: number;
}

function spectroTemporalToGeoJSon(
  annotation: SpectrogramTemporalAnnotation,
  spectroInfo: SpectroInfo,
  ymin = 0,
  ymax = 10,
  yScale = 1,
  scaledWidth = 0,
  scaledHeight = 0,
): GeoJSON.Polygon {
  const adjustedWidth = scaledWidth > spectroInfo.width ? scaledWidth : spectroInfo.width;
  const adjustedHeight = scaledHeight > spectroInfo.height ? scaledHeight : spectroInfo.height;
  //scale pixels to time and frequency ranges
  if (spectroInfo.start_times === undefined || spectroInfo.end_times === undefined) {
    const widthScale = adjustedWidth / (spectroInfo.end_time - spectroInfo.start_time);
    // Now we remap our annotation to pixel coordinates
    const start_time = annotation.start_time * widthScale;
    const end_time = annotation.end_time * widthScale;
    return {
      type: "Polygon",
      coordinates: [
        [
          [start_time, ymin * yScale],
          [start_time, ymax * yScale],
          [end_time, ymax * yScale],
          [end_time, ymin * yScale],
          [start_time, ymin * yScale],
        ],
      ],
    };
  } else if (spectroInfo.start_times && spectroInfo.end_times) {
    // Compressed Spectro has different conversion
    // Find what section the annotation is in
    const start = annotation.start_time;
    const end = annotation.end_time;
    const { start_times, end_times } = spectroInfo;
    const lengths = start_times.length === end_times.length ? start_times.length : 0;
    let foundIndex = -1;
    for (let i = 0; i < lengths; i += 1) {
      if (
        start_times[i] < start &&
        start < end_times[i] &&
        end < end_times[i] &&
        end > start_times[i]
      ) {
        foundIndex = i;
        break;
      }
    }
    // We need to build the length of times to pixel size for the time spaces before the annotation
    const widthScale = adjustedWidth / (spectroInfo.end_time - spectroInfo.start_time);
    let pixelAdd = 0;
    for (let i = 0; i < foundIndex; i += 1) {
      pixelAdd += (end_times[i] - start_times[i]) * widthScale;
    }
    // Now we remap our annotation to pixel coordinates
    const start_time = pixelAdd + (annotation.start_time - start_times[foundIndex]) * widthScale;
    const end_time = pixelAdd + (annotation.end_time - start_times[foundIndex]) * widthScale;

    return {
      type: "Polygon",
      coordinates: [
        [
          [start_time, ymin * yScale],
          [start_time, ymax * yScale],
          [end_time, ymax * yScale],
          [end_time, ymin * yScale],
          [start_time, ymin * yScale],
        ],
      ],
    };
  }
  return {
    type: "Polygon",
    coordinates: [
      [
        [-1, -1],
        [-1, -1],
        [-1, -1],
        [-1, -1],
        [-1, -1],
      ],
    ],
  };
}

function spectroToGeoJSon(
  annotation: SpectrogramAnnotation,
  spectroInfo: SpectroInfo,
  yScale = 1,
  scaledWidth = 0,
  scaledHeight = 0
): GeoJSON.Polygon {
  //scale pixels to time and frequency ranges
  const adjustedWidth = scaledWidth > spectroInfo.width ? scaledWidth : spectroInfo.width;
  const adjustedHeight = scaledHeight > spectroInfo.height ? scaledHeight : spectroInfo.height;

  if (spectroInfo.start_times === undefined || spectroInfo.end_times === undefined) {
    const widthScale = adjustedWidth / (spectroInfo.end_time - spectroInfo.start_time);
    const heightScale = adjustedHeight / (spectroInfo.high_freq - spectroInfo.low_freq);
    // Now we remap our annotation to pixel coordinates
    const low_freq =
      adjustedHeight - (annotation.low_freq - spectroInfo.low_freq) * heightScale;
    const high_freq =
      adjustedHeight - (annotation.high_freq - spectroInfo.low_freq) * heightScale;
    const start_time = annotation.start_time * widthScale;
    const end_time = annotation.end_time * widthScale;
    return {
      type: "Polygon",
      coordinates: [
        [
          [start_time, low_freq * yScale],
          [start_time, high_freq * yScale],
          [end_time, high_freq * yScale],
          [end_time, low_freq * yScale],
          [start_time, low_freq * yScale],
        ],
      ],
    };
  } else if (spectroInfo.start_times && spectroInfo.end_times) {
    // Compressed Spectro has different conversion
    // Find what section the annotation is in
    const start = annotation.start_time;
    const end = annotation.end_time;
    const { start_times, end_times } = spectroInfo;
    const lengths = start_times.length === end_times.length ? start_times.length : 0;
    let foundIndex = -1;
    for (let i = 0; i < lengths; i += 1) {
      if (
        start_times[i] < start &&
        start < end_times[i] &&
        end < end_times[i] &&
        end > start_times[i]
      ) {
        foundIndex = i;
        break;
      }
    }
    // We need to build the length of times to pixel size for the time spaces before the annotation
    const widthScale = adjustedWidth / (spectroInfo.end_time - spectroInfo.start_time);
    let pixelAdd = 0;
    for (let i = 0; i < foundIndex; i += 1) {
      pixelAdd += (end_times[i] - start_times[i]) * widthScale;
    }
    const heightScale = adjustedHeight / (spectroInfo.high_freq - spectroInfo.low_freq);
    // Now we remap our annotation to pixel coordinates
    const low_freq =
      adjustedHeight - (annotation.low_freq - spectroInfo.low_freq) * heightScale;
    const high_freq =
      adjustedHeight - (annotation.high_freq - spectroInfo.low_freq) * heightScale;
    const start_time = pixelAdd + (annotation.start_time - start_times[foundIndex]) * widthScale;
    const end_time = pixelAdd + (annotation.end_time - start_times[foundIndex]) * widthScale;

    return {
      type: "Polygon",
      coordinates: [
        [
          [start_time, low_freq * yScale],
          [start_time, high_freq * yScale],
          [end_time, high_freq * yScale],
          [end_time, low_freq * yScale],
          [start_time, low_freq * yScale],
        ],
      ],
    };
  }
  return {
    type: "Polygon",
    coordinates: [
      [
        [-1, -1],
        [-1, -1],
        [-1, -1],
        [-1, -1],
        [-1, -1],
      ],
    ],
  };
}

function findPolygonCenter(polygon: GeoJSON.Polygon): number[] {
  const coordinates = polygon.coordinates[0]; // Extract the exterior ring coordinates

  // Calculate the average of longitude and latitude separately
  const avgLng = coordinates.reduce((sum, point) => sum + point[0], 0) / coordinates.length;
  const avgLat = coordinates.reduce((sum, point) => sum + point[1], 0) / coordinates.length;

  return [avgLng, avgLat];
}

function spectroToCenter(annotation: SpectrogramAnnotation | SpectrogramTemporalAnnotation, spectroInfo: SpectroInfo, type: 'sequence' | 'pulse') {
  if (type === 'pulse') {
    const geoJSON = spectroToGeoJSon(annotation as SpectrogramAnnotation, spectroInfo);
    return findPolygonCenter(geoJSON);
  }
  if (type === 'sequence') {
    const geoJSON = spectroTemporalToGeoJSon(annotation as SpectrogramTemporalAnnotation, spectroInfo);
    return findPolygonCenter(geoJSON);
  }
  return [0,0];
}

/* beginning at bottom left, rectangle is defined clockwise */
function geojsonToSpectro(
  geojson: GeoJSON.Feature<GeoJSON.Polygon>,
  spectroInfo: SpectroInfo,
  scaledWidth = 0,
  scaledHeight = 0,
): { error?: string; start_time: number; end_time: number; low_freq: number; high_freq: number } {
  const adjustedWidth = scaledWidth > spectroInfo.width ? scaledWidth : spectroInfo.width;
  const adjustedHeight = scaledHeight > spectroInfo.height ? scaledHeight : spectroInfo.height;

  const coords = geojson.geometry.coordinates[0];
  if (spectroInfo.start_times === undefined && spectroInfo.end_times === undefined) {
    const widthScale = adjustedWidth / (spectroInfo.end_time - spectroInfo.start_time);
    const heightScale = adjustedHeight / (spectroInfo.high_freq - spectroInfo.low_freq);
    const start_time = Math.round(coords[1][0] / widthScale);
    const end_time = Math.round(coords[3][0] / widthScale);
    const high_freq = Math.round(spectroInfo.high_freq - coords[1][1] / heightScale);
    const low_freq = Math.round(spectroInfo.high_freq - coords[3][1] / heightScale);
    return {
      start_time,
      end_time,
      low_freq,
      high_freq,
    };
  } else if (spectroInfo.start_times && spectroInfo.end_times) {
    // first need to map the X positions to times based on the start/endtimes
    const start = coords[1][0];
    const end = coords[3][0];
    const { start_times, end_times } = spectroInfo;
    const timeToPixels = spectroInfo.width / (spectroInfo.end_time - spectroInfo.start_time);
    let additivePixels = 0;
    let start_time = -1;
    let end_time = -1;
    for (let i = 0; i < start_times.length; i += 1) {
      // convert the start/end time to a pixel
      const nextPixels = (end_times[i] - start_times[i]) * timeToPixels;
      if (start > additivePixels && end < additivePixels + nextPixels) {
        // Found the location for time markers
        // We need to remap pixels back to milliseconds
        const lowPixels = start - additivePixels;
        const highPixels = end - additivePixels;
        const lowTime = start_times[i] + lowPixels / timeToPixels;
        const highTime = start_times[i] + highPixels / timeToPixels;
        start_time = Math.round(lowTime);
        end_time = Math.round(highTime);
        break;
      }
      additivePixels += nextPixels;
    }
    const heightScale = spectroInfo.height / (spectroInfo.high_freq - spectroInfo.low_freq);
    const high_freq = Math.round(spectroInfo.high_freq - coords[1][1] / heightScale);
    const low_freq = Math.round(spectroInfo.high_freq - coords[3][1] / heightScale);
    if (start_time === -1 || end_time === -1) {
      // the time spreads across multiple pulses and isn't allowed;
      return {
        error:
          "Start or End Time spread across pusles.  This is not allowed in compressed annotations",
        start_time,
        end_time,
        low_freq,
        high_freq,
      };
    }
    return {
      start_time,
      end_time,
      low_freq,
      high_freq,
    };
  }
  return {
    error: "Spectrogram Info didn't match a regular or compressed view",
    start_time: 0,
    end_time: 0,
    low_freq: 0,
    high_freq: 0,
  };
}

/**
 * This will take the current geoJSON Coordinates for a rectangle and reorder it
 * to keep the vertices index the same with respect to how geoJS uses it
 * Example: UL, LL, LR, UR, UL
 */
function reOrdergeoJSON(coords: GeoJSON.Position[]) {
  let x1 = Infinity;
  let x2 = -Infinity;
  let y1 = Infinity;
  let y2 = -Infinity;
  coords.forEach((coord) => {
    x1 = Math.min(x1, coord[0]);
    x2 = Math.max(x2, coord[0]);
    y1 = Math.min(y1, coord[1]);
    y2 = Math.max(y2, coord[1]);
  });
  return [
    [x1, y2],
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ];
}

export {
  spectroToGeoJSon,
  geojsonToSpectro,
  reOrdergeoJSON,
  useGeoJS,
  spectroToCenter,
  spectroTemporalToGeoJSon,
};
