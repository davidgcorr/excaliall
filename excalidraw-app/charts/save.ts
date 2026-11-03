import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";
import { newImageElement } from "@excalidraw/element/newElement";
import { viewportCoordsToSceneCoords } from "@excalidraw/common";
import {
  generateIdFromFile,
  getDataURL,
} from "@excalidraw/excalidraw/data/blob";

import type { FileId } from "@excalidraw/element/types";
import type { AppClassProperties } from "@excalidraw/excalidraw/types";

import { getChartMetadata, validateChart } from "./data";

import type { RoughVizChart } from "./data";

export const saveChartSvg = async (
  app: AppClassProperties,
  chart: RoughVizChart,
  svg: string,
  options: {
    elementId?: string;
    signal?: AbortSignal;
    expectedFileId?: FileId | null;
    beforeApply?: () => void;
  } = {},
) => {
  validateChart(chart);
  const file = new app.ownerWindow.File([svg], "roughviz-chart.svg", {
    type: "image/svg+xml",
  });
  const [fileId, dataURL] = await Promise.all([
    generateIdFromFile(file),
    getDataURL(file),
  ]);
  if (options.signal?.aborted || app.api.isDestroyed) {
    return;
  }
  const target = options.elementId
    ? app.scene.getElement(options.elementId)
    : null;
  if (
    options.elementId &&
    (!target ||
      target.type !== "image" ||
      target.isDeleted ||
      target.locked ||
      !getChartMetadata(target.customData))
  ) {
    throw new Error("The selected chart is no longer editable.");
  }
  if (app.state.viewModeEnabled) {
    throw new Error("This canvas is read-only.");
  }
  if (
    target?.type === "image" &&
    options.expectedFileId !== undefined &&
    target.fileId !== options.expectedFileId
  ) {
    throw new app.ownerWindow.DOMException(
      "The chart changed while rendering.",
      "AbortError",
    );
  }
  const state = app.api.getAppState();
  const center = viewportCoordsToSceneCoords(
    {
      clientX: state.offsetLeft + state.width / 2,
      clientY: state.offsetTop + state.height / 2,
    },
    state,
  );
  const element =
    target?.type === "image"
      ? newElementWith(target, {
          fileId,
          status: "saved",
          crop: null,
          customData: { ...target.customData, roughViz: chart },
        })
      : newImageElement({
          type: "image",
          x: center.x - 320,
          y: center.y - 210,
          width: 640,
          height: 420,
          fileId,
          status: "saved",
          customData: { roughViz: chart },
        });
  const existing = app.api.getSceneElementsIncludingDeleted();
  options.beforeApply?.();
  app.api.updateScene({
    elements: target
      ? existing.map((item) => (item.id === element.id ? element : item))
      : [...existing, element],
    appState: target
      ? undefined
      : {
          selectedElementIds: { [element.id]: true },
          selectedGroupIds: {},
          editingGroupId: null,
        },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  app.api.addFiles([
    {
      id: fileId,
      dataURL,
      mimeType: "image/svg+xml",
      created: Date.now(),
      lastRetrieved: Date.now(),
    },
  ]);
  return element;
};
