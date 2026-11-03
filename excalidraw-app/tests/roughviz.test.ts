import { restoreElements } from "@excalidraw/excalidraw/data/restore";
import { newImageElement } from "@excalidraw/element/newElement";

import {
  CHART_TYPES,
  SAMPLE_DATA,
  getChartMetadata,
  parseChartData,
  validateChart,
} from "../charts/data";

import type { RoughVizChart } from "../charts/data";

const chart = (): RoughVizChart => ({
  version: 1,
  type: "Bar",
  title: "Revenue",
  rows: parseChartData(SAMPLE_DATA),
  labelColumn: "Month",
  valueColumns: ["Revenue"],
  color: "#1971c2",
  roughness: 1,
  sourceUrl: "https://example.com/data.csv",
});

describe("roughViz data charts", () => {
  it("preserves legacy charts and validates editable stroke widths", () => {
    expect(validateChart(chart()).strokeWidth).toBeUndefined();
    expect(validateChart({ ...chart(), strokeWidth: 2.5 }).strokeWidth).toBe(
      2.5,
    );
    for (const strokeWidth of [0, -1, Infinity, 4]) {
      expect(() => validateChart({ ...chart(), strokeWidth })).toThrow(
        "appearance",
      );
    }
  });
  it("reads CSV with quoted labels, CRLF, embedded commas and a BOM", () => {
    expect(
      parseChartData('\uFEFFlabel,value\r\n"Sales, EMEA",42\r\n"R&D",12'),
    ).toEqual([
      { label: "Sales, EMEA", value: "42" },
      { label: "R&D", value: "12" },
    ]);
  });
  it("accepts row JSON and roughViz column-array JSON", () => {
    const rows = [
      { label: "A", value: 10 },
      { label: "B", value: 20 },
    ];
    expect(parseChartData(JSON.stringify(rows))).toEqual(rows);
    expect(parseChartData('{"label":["A","B"],"value":[10,20]}')).toEqual(rows);
  });
  it.each([
    "",
    "label,label\na,1",
    "label,value\na,1,2",
    '[{"a":"x","b":{"nested":1}}]',
    '{"a":[1],"b":[1,2]}',
    '[{"a":1,"b":2},{"a":1,"c":2}]',
    JSON.stringify(Array.from({ length: 501 }, () => ({ a: "A", b: 1 }))),
  ])("rejects invalid or oversized data: %s", (input) => {
    expect(() => parseChartData(input)).toThrow();
  });
  it("validates all chart types and requires numeric scatter coordinates", () => {
    for (const type of CHART_TYPES.filter((type) => type !== "Scatter")) {
      expect(validateChart({ ...chart(), type })).toHaveProperty("type", type);
    }
    expect(() => validateChart({ ...chart(), type: "Scatter" })).toThrow(
      "Month",
    );
    expect(
      validateChart({ ...chart(), type: "Scatter", labelColumn: "Costs" }),
    ).toHaveProperty("type", "Scatter");
    expect(() =>
      validateChart({ ...chart(), valueColumns: ["missing"] }),
    ).toThrow("columns");
    expect(() =>
      validateChart({ ...chart(), rows: [{ Month: "A", Revenue: "NaN" }] }),
    ).toThrow("number");
    expect(() =>
      validateChart({
        ...chart(),
        type: "Pie",
        rows: [{ Month: "A", Revenue: 0 }],
      }),
    ).toThrow("positive");
  });
  it("round-trips editable chart data through Excalidraw restore", () => {
    const data = chart();
    const image = newImageElement({
      type: "image",
      x: 0,
      y: 0,
      width: 640,
      height: 420,
      customData: { roughViz: data },
    });
    const [restored] = restoreElements(
      JSON.parse(JSON.stringify([image])),
      null,
    );
    expect(getChartMetadata(restored.customData)).toEqual(data);
    expect(getChartMetadata({ roughViz: { type: "not-a-chart" } })).toBeNull();
  });
});
