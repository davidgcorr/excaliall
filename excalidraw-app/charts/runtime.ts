import * as roughViz from "rough-viz/src/index.js";

import type { RoughVizChart } from "./data";

// Bootstrap lookup; all further browser access belongs to the mounted chart.
const mount = document.getElementById("roughviz-mount")!;
const ownerDocument = mount.ownerDocument;
const ownerWindow = ownerDocument.defaultView!;
const token = mount.dataset.token!;
ownerWindow.addEventListener("message", (event) => {
  if (
    event.source !== ownerWindow.parent ||
    event.data?.token !== token ||
    event.data?.type !== "render-chart"
  ) {
    return;
  }
  try {
    const chart: RoughVizChart = event.data.chart;
    const values = (column: string) =>
      chart.rows.map((row) => Number(row[column]));
    const options: Record<string, unknown> = {
      element: "#roughviz-mount",
      title: chart.title,
      font: "Arial",
      interactive: false,
      roughness: chart.roughness,
      fillStyle: "hachure",
      color: chart.color,
      colors: [chart.color, "#f59f00", "#2f9e44", "#e64980", "#7950f2"],
      margin: { top: 65, right: 35, bottom: 70, left: 80 },
      axisFontSize: "13px",
      labelFontSize: "14px",
      titleFontSize: "21px",
      xLabel: chart.labelColumn,
      yLabel: chart.valueColumns.join(", "),
    };
    if (chart.type === "Line") {
      options.data = Object.fromEntries(
        chart.valueColumns.map((key) => [key, values(key)]),
      );
      options.x = chart.rows.map((row) => String(row[chart.labelColumn]));
      options.circleRadius = 5;
    } else if (chart.type === "Scatter") {
      options.data = {
        x: values(chart.labelColumn),
        y: values(chart.valueColumns[0]),
      };
      options.radius = 8;
    } else if (chart.type === "StackedBar") {
      options.labels = chart.labelColumn;
      options.data = chart.rows.map((row) =>
        Object.fromEntries([
          [chart.labelColumn, String(row[chart.labelColumn])],
          ...chart.valueColumns.map((key) => [key, Number(row[key])]),
        ]),
      );
    } else {
      options.data = {
        labels: chart.rows.map((row) => String(row[chart.labelColumn])),
        values: values(chart.valueColumns[0]),
      };
    }
    const instance = new roughViz[chart.type](options);
    instance.responsive = false;
    const svg = mount.querySelector("svg");
    if (!svg || !svg.querySelector("path")) {
      throw new Error("roughViz did not produce a chart.");
    }
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "640");
    svg.setAttribute("height", "420");
    const background = ownerDocument.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    background.setAttribute("width", "640");
    background.setAttribute("height", "420");
    background.setAttribute("fill", "white");
    svg.prepend(background);
    // Only drawing primitives and local references leave the isolated renderer.
    svg
      .querySelectorAll("script,foreignObject,iframe,a")
      .forEach((node) => node.remove());
    for (const node of [svg, ...svg.querySelectorAll("*")]) {
      for (const attribute of [...node.attributes]) {
        if (
          /^on/i.test(attribute.name) ||
          (/href$/i.test(attribute.name) && !attribute.value.startsWith("#"))
        ) {
          node.removeAttribute(attribute.name);
        }
      }
    }
    ownerWindow.parent.postMessage(
      {
        type: "chart-rendered",
        token,
        svg: new ownerWindow.XMLSerializer().serializeToString(svg),
      },
      "*",
    );
  } catch (error) {
    ownerWindow.parent.postMessage(
      {
        type: "chart-error",
        token,
        error:
          error instanceof Error ? error.message : "Chart rendering failed.",
      },
      "*",
    );
  }
});
ownerWindow.parent.postMessage({ type: "chart-ready", token }, "*");
