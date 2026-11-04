import rough from "roughjs/bin/rough";

import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";
import { newImageElement } from "@excalidraw/element/newElement";
import {
  normalizeInputColor,
  viewportCoordsToSceneCoords,
} from "@excalidraw/common";

import type {
  ExcalidrawElement,
  ExcalidrawImageElement,
} from "@excalidraw/element/types";

import { generateIdFromFile, getDataURL } from "../../data/blob";

import type { AppClassProperties } from "../../types";

export type TableBorderStyle = "inner" | "outer" | "rows" | "full";

export type TableFillScope =
  | "header"
  | "all"
  | "header-alternating-columns"
  | "alternating-columns";

export type TableData = {
  version: 1;
  columns: string[];
  rows: string[][];
  color: string;
  roughness: number;
  strokeWidth?: number;
  backgroundColor?: string;
  fillStyle?: ExcalidrawElement["fillStyle"];
  strokeStyle?: ExcalidrawElement["strokeStyle"];
  rounded?: boolean;
  borderStyle?: TableBorderStyle;
  fillScope?: TableFillScope;
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
  roughness: 1,
  strokeWidth: 1.3,
  backgroundColor: "#e8edff",
  fillStyle: "hachure",
  strokeStyle: "solid",
  rounded: false,
  borderStyle: "full",
  fillScope: "all",
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
    typeof data.color !== "string" ||
    !normalizeInputColor(data.color) ||
    (data.backgroundColor !== undefined &&
      (typeof data.backgroundColor !== "string" ||
        !normalizeInputColor(data.backgroundColor))) ||
    (data.fillStyle !== undefined &&
      !["hachure", "cross-hatch", "solid", "zigzag"].includes(
        data.fillStyle,
      )) ||
    (data.strokeStyle !== undefined &&
      !["solid", "dashed", "dotted"].includes(data.strokeStyle)) ||
    (data.rounded !== undefined && typeof data.rounded !== "boolean") ||
    (data.borderStyle !== undefined &&
      !["inner", "outer", "rows", "full"].includes(data.borderStyle)) ||
    (data.fillScope !== undefined &&
      ![
        "header",
        "all",
        "header-alternating-columns",
        "alternating-columns",
      ].includes(data.fillScope)) ||
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
  const radius = data.rounded ? 16 : 0;
  const outline = `M ${x + radius} ${y} H ${x + w - radius} Q ${x + w} ${y} ${
    x + w
  } ${y + radius} V ${y + h - radius} Q ${x + w} ${y + h} ${x + w - radius} ${
    y + h
  } H ${x + radius} Q ${x} ${y + h} ${x} ${y + h - radius} V ${
    y + radius
  } Q ${x} ${y} ${x + radius} ${y} Z`;
  const defs = ownerDocument.createElementNS(ns, "defs");
  const clipPath = ownerDocument.createElementNS(ns, "clipPath");
  clipPath.id = "table-corners";
  const clipRect = ownerDocument.createElementNS(ns, "rect");
  for (const [key, value] of Object.entries({
    x,
    y,
    width: w,
    height: h,
    rx: radius,
  })) {
    clipRect.setAttribute(key, String(value));
  }
  clipPath.append(clipRect);
  defs.append(clipPath);
  svg.append(defs);
  const content = ownerDocument.createElementNS(ns, "g");
  content.setAttribute("clip-path", "url(#table-corners)");
  svg.append(content);
  const options = {
    stroke: data.color,
    roughness: data.roughness,
    seed: 42,
    strokeWidth: data.strokeWidth ?? 1.3,
    strokeLineDash:
      data.strokeStyle === "dashed"
        ? [8, 6]
        : data.strokeStyle === "dotted"
        ? [1, 5]
        : undefined,
  };
  const fillScope = data.fillScope ?? "all";
  const fillOptions = {
    ...options,
    stroke: "none",
    fill: data.backgroundColor ?? "#e8edff",
    fillStyle: data.fillStyle ?? "hachure",
  };
  const fillRegion = (
    left: number,
    top: number,
    regionWidth: number,
    regionHeight: number,
    region: string,
    column?: number,
  ) => {
    if (regionHeight <= 0) {
      return;
    }
    const fill = rc.rectangle(
      left,
      top,
      regionWidth,
      regionHeight,
      fillOptions,
    );
    fill.setAttribute("data-table-fill-region", region);
    if (column !== undefined) {
      fill.setAttribute("data-table-fill-column", String(column));
    }
    content.append(fill);
  };
  // Older tables without a chosen background retain their original two-tone fill.
  if (data.fillScope === undefined && data.backgroundColor === undefined) {
    content.append(
      rc.path(outline, { ...fillOptions, fill: "#ffffff", fillStyle: "solid" }),
    );
    content.append(
      rc.rectangle(x, y, w, CELL_HEIGHT, {
        ...fillOptions,
        fill: "#e8edff",
        fillStyle: "hachure",
        fillWeight: 0.4,
      }),
    );
  } else if (fillScope === "all") {
    const fill = rc.path(outline, fillOptions);
    fill.setAttribute("data-table-fill-region", "all");
    content.append(fill);
  } else {
    if (fillScope === "header" || fillScope === "header-alternating-columns") {
      fillRegion(x, y, w, CELL_HEIGHT, "header");
    }
    if (
      fillScope === "header-alternating-columns" ||
      fillScope === "alternating-columns"
    ) {
      const skipHeader = fillScope === "header-alternating-columns";
      for (let column = 0; column < data.columns.length; column += 2) {
        fillRegion(
          x + column * CELL_WIDTH,
          y + (skipHeader ? CELL_HEIGHT : 0),
          CELL_WIDTH,
          h - (skipHeader ? CELL_HEIGHT : 0),
          "column",
          column,
        );
      }
    }
  }
  const borderStyle = data.borderStyle ?? "full";
  const addGridLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    kind: string,
  ) => {
    const line = rc.line(x1, y1, x2, y2, options);
    line.setAttribute("data-table-grid", kind);
    content.append(line);
  };
  if (borderStyle === "full" || borderStyle === "inner") {
    for (let col = 1; col < data.columns.length; col++) {
      addGridLine(
        x + col * CELL_WIDTH,
        y,
        x + col * CELL_WIDTH,
        y + h,
        "column",
      );
    }
  }
  if (borderStyle !== "outer") {
    for (let row = 1; row <= data.rows.length; row++) {
      addGridLine(
        x,
        y + row * CELL_HEIGHT,
        x + w,
        y + row * CELL_HEIGHT,
        "row",
      );
    }
  }
  if (borderStyle === "rows") {
    addGridLine(x, y, x + w, y, "row-edge");
    addGridLine(x, y + h, x + w, y + h, "row-edge");
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
        content.append(clip);
      }),
    );
  }
  if (borderStyle === "full" || borderStyle === "outer") {
    const border = rc.path(outline, options);
    border.setAttribute("data-table-border", data.rounded ? "round" : "sharp");
    svg.append(border);
  }
  if (data.strokeStyle === "dotted") {
    svg
      .querySelectorAll("path")
      .forEach((path) => path.setAttribute("stroke-linecap", "round"));
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
          roundness: null,
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
