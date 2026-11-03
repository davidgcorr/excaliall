import rough from "roughjs/bin/rough";

import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";
import { newImageElement } from "@excalidraw/element/newElement";
import { viewportCoordsToSceneCoords } from "@excalidraw/common";

import type {
  ExcalidrawElement,
  ExcalidrawImageElement,
} from "@excalidraw/element/types";

import { generateIdFromFile, getDataURL } from "../../data/blob";

import type { AppClassProperties } from "../../types";

export type TableData = {
  version: 1;
  columns: string[];
  rows: string[][];
  color: string;
  roughness: number;
  strokeWidth?: number;
};
export const CELL_WIDTH = 180;
export const CELL_HEIGHT = 44;
export const TABLE_PADDING = 8;
export const MAX_ROWS = 100;
export const MAX_COLUMNS = 12;
export const sampleTable = (): TableData => ({
  version: 1,
  columns: ["Name", "Status", "Amount"],
  rows: [
    ["Project A", "In progress", "1200"],
    ["Project B", "Done", "850"],
    ["Project C", "Planned", "600"],
  ],
  color: "#1e1e1e",
  roughness: 1.2,
  strokeWidth: 1.3,
});

export const validateTable = (value: unknown): TableData => {
  const data = value as TableData | undefined;
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.columns) ||
    !data.columns.length ||
    data.columns.length > MAX_COLUMNS ||
    !data.columns.every(
      (cell) => typeof cell === "string" && cell.length <= 500,
    ) ||
    !Array.isArray(data.rows) ||
    data.rows.length > MAX_ROWS ||
    !data.rows.every(
      (row) =>
        Array.isArray(row) &&
        row.length === data.columns.length &&
        row.every((cell) => typeof cell === "string" && cell.length <= 500),
    ) ||
    !/^#[\da-f]{6}$/i.test(data.color) ||
    !Number.isFinite(data.roughness) ||
    data.roughness < 0 ||
    data.roughness > 3 ||
    (data.strokeWidth !== undefined &&
      (!Number.isFinite(data.strokeWidth) ||
        data.strokeWidth < 0.5 ||
        data.strokeWidth > 6))
  ) {
    throw new Error(
      "Invalid table. Use up to 100 rows, 12 columns, and 500 characters per cell.",
    );
  }
  return data;
};
export const getTableData = (
  element: ExcalidrawElement | null | undefined,
): TableData | null => {
  if (element?.type !== "image") {
    return null;
  }
  try {
    return validateTable(element.customData?.dataTable);
  } catch {
    return null;
  }
};
export const tableSize = (data: TableData) => ({
  width: data.columns.length * CELL_WIDTH + TABLE_PADDING * 2,
  height: (data.rows.length + 1) * CELL_HEIGHT + TABLE_PADDING * 2,
});

// Draw all grid strokes with rough.js. Text nodes keep untrusted cell contents inert.
export const renderTableSvg = (
  data: TableData,
  ownerDocument: Document,
  includeText = true,
): SVGSVGElement => {
  validateTable(data);
  const ns = "http://www.w3.org/2000/svg";
  const svg = ownerDocument.createElementNS(ns, "svg");
  const { width, height } = tableSize(data);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const rc = rough.svg(svg);
  const x = TABLE_PADDING;
  const y = TABLE_PADDING;
  const w = width - x * 2;
  const h = height - y * 2;
  const options = {
    stroke: data.color,
    roughness: data.roughness,
    seed: 42,
    strokeWidth: data.strokeWidth ?? 1.3,
  };
  svg.append(
    rc.rectangle(x, y, w, h, {
      ...options,
      fill: "#ffffff",
      fillStyle: "solid",
    }),
  );
  svg.append(
    rc.rectangle(x, y, w, CELL_HEIGHT, {
      ...options,
      fill: "#e8edff",
      fillStyle: "hachure",
      fillWeight: 0.4,
    }),
  );
  for (let col = 1; col < data.columns.length; col++) {
    svg.append(
      rc.line(x + col * CELL_WIDTH, y, x + col * CELL_WIDTH, y + h, options),
    );
  }
  for (let row = 1; row <= data.rows.length; row++) {
    svg.append(
      rc.line(x, y + row * CELL_HEIGHT, x + w, y + row * CELL_HEIGHT, options),
    );
  }
  if (includeText) {
    [data.columns, ...data.rows].forEach((row, rowIndex) =>
      row.forEach((cell, colIndex) => {
        const clip = ownerDocument.createElementNS(ns, "svg");
        clip.setAttribute("x", String(x + colIndex * CELL_WIDTH + 10));
        clip.setAttribute("y", String(y + rowIndex * CELL_HEIGHT));
        clip.setAttribute("width", String(CELL_WIDTH - 20));
        clip.setAttribute("height", String(CELL_HEIGHT));
        const text = ownerDocument.createElementNS(ns, "text");
        text.setAttribute("x", "0");
        text.setAttribute("y", "28");
        text.setAttribute("font-family", "Verdana, sans-serif");
        text.setAttribute("font-size", "15");
        text.setAttribute("fill", data.color);
        if (!rowIndex) {
          text.setAttribute("font-weight", "600");
        }
        text.textContent = cell;
        clip.append(text);
        svg.append(clip);
      }),
    );
  }
  return svg;
};

export const saveTable = async (
  app: AppClassProperties,
  draft: TableData,
  elementId?: string,
  position?: { x: number; y: number },
  preserveSelection = false,
) => {
  const data = validateTable(draft);
  const svg = renderTableSvg(data, app.ownerDocument);
  const file = new app.ownerWindow.File(
    [new app.ownerWindow.XMLSerializer().serializeToString(svg)],
    "data-table.svg",
    { type: "image/svg+xml" },
  );
  const [fileId, dataURL] = await Promise.all([
    generateIdFromFile(file),
    getDataURL(file),
  ]);
  if (app.api.isDestroyed) {
    return;
  }
  const target = elementId ? app.scene.getElement(elementId) : null;
  if (
    elementId &&
    (!target ||
      target.type !== "image" ||
      target.isDeleted ||
      target.locked ||
      !getTableData(target))
  ) {
    throw new Error("This table is no longer editable.");
  }
  if (app.state.viewModeEnabled) {
    throw new Error("This canvas is read-only.");
  }
  const size = tableSize(data);
  const previous = target && getTableData(target);
  const oldSize = previous ? tableSize(previous) : size;
  const state = app.api.getAppState();
  const center = viewportCoordsToSceneCoords(
    {
      clientX: state.offsetLeft + state.width / 2,
      clientY: state.offsetTop + state.height / 2,
    },
    state,
  );
  const element: ExcalidrawImageElement =
    target?.type === "image"
      ? newElementWith(target, {
          fileId,
          status: "saved",
          crop: null,
          width: (target.width * size.width) / oldSize.width,
          height: (target.height * size.height) / oldSize.height,
          customData: { ...target.customData, dataTable: data },
        })
      : newImageElement({
          type: "image",
          x: position?.x ?? center.x - size.width / 2,
          y: position?.y ?? center.y - size.height / 2,
          ...size,
          fileId,
          status: "saved",
          customData: { dataTable: data },
        });
  const existing = app.api.getSceneElementsIncludingDeleted();
  app.api.updateScene({
    elements: target
      ? existing.map((item) => (item.id === element.id ? element : item))
      : [...existing, element],
    appState: preserveSelection
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
