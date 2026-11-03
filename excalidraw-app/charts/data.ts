import { csvParseRows } from "d3-dsv";
import { normalizeInputColor } from "@excalidraw/common";

import type { ExcalidrawElement } from "@excalidraw/element/types";

export const CHART_TYPES = [
  "Bar",
  "BarH",
  "Line",
  "Scatter",
  "Pie",
  "Donut",
  "StackedBar",
] as const;
export type ChartType = typeof CHART_TYPES[number];
export type ChartRow = Record<string, string | number>;
export type RoughVizChart = {
  version: 1;
  type: ChartType;
  title: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  rows: ChartRow[];
  labelColumn: string;
  valueColumns: string[];
  color: string;
  roughness: number;
  strokeWidth?: number;
  strokeColor?: string;
  fillStyle?: ExcalidrawElement["fillStyle"];
  strokeStyle?: ExcalidrawElement["strokeStyle"];
  sourceUrl: string;
};
export const SAMPLE_DATA =
  "Month,Revenue,Costs\nJan,40,22\nFeb,65,35\nMar,52,29\nApr,85,43";

export const parseChartData = (text: string): ChartRow[] => {
  if (text.length > 1_000_000) {
    throw new Error("Data must be smaller than 1 MB.");
  }
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  let rows: unknown;
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else if (parsed && typeof parsed === "object") {
      const entries = Object.entries(parsed);
      if (
        !entries.length ||
        !entries.every(([, values]) => Array.isArray(values))
      ) {
        throw new Error("JSON must be rows or an object of column arrays.");
      }
      const length = (entries[0][1] as unknown[]).length;
      if (
        !entries.every(([, values]) => (values as unknown[]).length === length)
      ) {
        throw new Error("All data columns must have equal lengths.");
      }
      rows = Array.from({ length }, (_, index) =>
        Object.fromEntries(
          entries.map(([key, values]) => [key, (values as unknown[])[index]]),
        ),
      );
    }
  } else {
    const csv = csvParseRows(trimmed);
    const headers = csv.shift()?.map((header) => header.trim()) ?? [];
    if (
      headers.some((header) => !header) ||
      new Set(headers).size !== headers.length
    ) {
      throw new Error("CSV headers must be unique and non-empty.");
    }
    rows = csv
      .filter((row) => row.some((cell) => cell.trim()))
      .map((row) => {
        if (row.length !== headers.length) {
          throw new Error("Each CSV row must match the header column count.");
        }
        return Object.fromEntries(
          headers.map((key, index) => [key, row[index]]),
        );
      });
  }
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) {
    throw new Error("Provide between 1 and 500 rows of CSV or JSON data.");
  }
  const columns = Object.keys(rows[0] ?? {});
  if (
    columns.some((key) =>
      ["__proto__", "constructor", "prototype"].includes(key),
    )
  ) {
    throw new Error(
      "Data column names cannot be __proto__, constructor, or prototype.",
    );
  }
  if (columns.length < 2 || columns.length > 20) {
    throw new Error("Provide between 2 and 20 columns.");
  }
  return rows.map((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      Array.isArray(row) ||
      Object.keys(row).length !== columns.length ||
      !columns.every((key) => Object.hasOwn(row, key))
    ) {
      throw new Error("All rows must have the same columns.");
    }
    return Object.fromEntries(
      columns.map((key) => {
        const value = row[key];
        if (
          (typeof value !== "string" && typeof value !== "number") ||
          String(value).length > 200 ||
          (typeof value === "number" && !Number.isFinite(value))
        ) {
          throw new Error(
            "Cells must be finite numbers or text up to 200 characters.",
          );
        }
        return [key, value];
      }),
    );
  });
};

export const validateChart = (chart: RoughVizChart) => {
  if (!CHART_TYPES.includes(chart.type) || chart.version !== 1) {
    throw new Error("Unsupported chart type.");
  }
  const rows = parseChartData(JSON.stringify(chart.rows));
  if (
    !Object.hasOwn(rows[0], chart.labelColumn) ||
    !chart.valueColumns.length ||
    chart.valueColumns.some((column) => !Object.hasOwn(rows[0], column))
  ) {
    throw new Error("Choose label/X and value/Y columns from the data.");
  }
  if (
    typeof chart.color !== "string" ||
    !normalizeInputColor(chart.color) ||
    (chart.strokeColor !== undefined &&
      (typeof chart.strokeColor !== "string" ||
        !normalizeInputColor(chart.strokeColor))) ||
    (chart.fillStyle !== undefined &&
      !["hachure", "cross-hatch", "solid", "zigzag"].includes(
        chart.fillStyle,
      )) ||
    (chart.strokeStyle !== undefined &&
      !["solid", "dashed", "dotted"].includes(chart.strokeStyle)) ||
    chart.title.length > 200 ||
    [chart.xAxisTitle, chart.yAxisTitle].some(
      (title) =>
        title !== undefined &&
        (typeof title !== "string" || title.length > 200),
    ) ||
    !Number.isFinite(chart.roughness) ||
    chart.roughness < 0 ||
    chart.roughness > 3 ||
    (chart.strokeWidth !== undefined &&
      (!Number.isFinite(chart.strokeWidth) ||
        chart.strokeWidth < 0.5 ||
        chart.strokeWidth > 6))
  ) {
    throw new Error("Invalid chart appearance settings.");
  }
  if (
    new Set(chart.valueColumns).size !== chart.valueColumns.length ||
    chart.valueColumns.includes(chart.labelColumn)
  ) {
    throw new Error("Choose distinct label/X and value/Y columns.");
  }
  if (
    ["Bar", "BarH", "StackedBar"].includes(chart.type) &&
    new Set(rows.map((row) => String(row[chart.labelColumn]))).size !==
      rows.length
  ) {
    throw new Error(
      "Bar chart labels must be unique. Aggregate repeated labels first.",
    );
  }
  if (
    chart.type === "StackedBar" &&
    (chart.labelColumn === "total" || chart.valueColumns.includes("total"))
  ) {
    throw new Error("Rename the reserved stacked-bar column 'total'.");
  }
  const numericColumns =
    chart.type === "Scatter"
      ? [chart.labelColumn, ...chart.valueColumns]
      : chart.valueColumns;
  for (const row of rows) {
    for (const column of numericColumns) {
      if (
        String(row[column]).trim() === "" ||
        !Number.isFinite(Number(row[column]))
      ) {
        throw new Error(
          `Column “${column}” must contain a number in every row.`,
        );
      }
      if (chart.type !== "Scatter" && Number(row[column]) < 0) {
        throw new Error("This chart type requires non-negative values.");
      }
    }
  }
  if (
    (chart.type === "Pie" || chart.type === "Donut") &&
    !rows.some((row) => Number(row[chart.valueColumns[0]]) > 0)
  ) {
    throw new Error("Pie and donut charts need at least one positive value.");
  }
  return chart;
};

export const getChartMetadata = (
  customData?: Record<string, unknown>,
): RoughVizChart | null => {
  try {
    const value = customData?.roughViz as RoughVizChart | undefined;
    return value ? validateChart(value) : null;
  } catch {
    return null;
  }
};
