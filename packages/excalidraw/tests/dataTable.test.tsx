import React from "react";

import { Excalidraw } from "../index";
import { actionToggleCropEditor } from "../actions/actionCropEditor";
import { actionEditDataTable } from "../actions/actionDataTable";
import {
  getTableData,
  renderTableSvg,
  sampleTable,
  validateTable,
} from "../components/DataTable/data";

import { API } from "./helpers/api";
import { Pointer } from "./helpers/ui";
import {
  fireEvent,
  render,
  screen,
  GlobalTestState,
  waitFor,
} from "./test-utils";

const { h } = window;
const image = () => ({
  ...API.createElement({
    type: "image",
    x: 30,
    y: 30,
    width: 556,
    height: 192,
  }),
  customData: { dataTable: sampleTable() },
});

describe("sketch data tables", () => {
  it("keeps controls in the side panel and autosaves edits and stroke width when selecting another element", async () => {
    await render(<Excalidraw />);
    fireEvent.click(screen.getByTestId("toolbar-data-table"));
    expect(await screen.findByTestId("table-cell--1-0")).toHaveValue("Name");
    expect(
      screen
        .getByTestId("data-table-properties")
        .closest(".selected-shape-actions"),
    ).not.toBeNull();
    fireEvent.change(screen.getByTestId("table-cell-0-0"), {
      target: { value: "Updated" },
    });
    expect(screen.getByTestId("table-cell-0-0")).toHaveValue("Updated");
    fireEvent.paste(screen.getByTestId("table-cell-0-0"), {
      clipboardData: { getData: () => "A\tB\nC\tD" },
    });
    expect(screen.getByTestId("table-cell-0-1")).toHaveValue("B");
    expect(screen.getByTestId("table-cell-1-0")).toHaveValue("C");
    fireEvent.click(screen.getByTestId("strokeWidth-bold"));
    fireEvent.click(screen.getByTestId("roughness-0"));
    const table = h.elements[0];
    const rectangle = API.createElement({ type: "rectangle", x: 700, y: 30 });
    API.setElements([...h.elements, rectangle]);
    API.setSelectedElements([rectangle]);
    expect(
      screen.queryByTestId("data-table-properties"),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      const saved = h.elements.find((item) => item.id === table.id)!;
      expect(getTableData(saved)?.rows[0][1]).toBe("B");
      expect(getTableData(saved)?.strokeWidth).toBe(4);
      expect(getTableData(saved)?.roughness).toBe(0);
    });
    expect(h.state.selectedElementIds).toEqual({ [rectangle.id]: true });
  });
  it("adds and deletes rows and columns using the focused cell", async () => {
    await render(<Excalidraw />);
    const element = image();
    API.setElements([element]);
    API.setSelectedElements([element]);
    expect(
      screen
        .getByTestId("table-canvas-toolbar")
        .closest(".DataTableEditor__sheet"),
    ).not.toBeNull();
    expect(
      screen
        .getByTestId("data-table-properties")
        .querySelector("[data-testid=table-add-row]"),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add row" }));
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    expect(screen.getByTestId("table-cell-3-3")).toHaveValue("");
    fireEvent.focus(screen.getByTestId("table-cell-3-3"));
    fireEvent.click(screen.getByRole("button", { name: "Delete column" }));
    expect(screen.queryByTestId("table-cell-3-3")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete row" }));
    expect(screen.queryByTestId("table-cell-3-0")).not.toBeInTheDocument();
    expect(screen.getByTestId("table-cell-0-0")).toHaveValue("Project A");
  });
  it("edits the hit table on double-click and through its context menu", async () => {
    await render(<Excalidraw />);
    const element = image();
    API.setElements([element]);
    new Pointer("mouse").doubleClickOn(element);
    expect(screen.getByTestId("table-cell-0-0")).toHaveValue("Project A");
    expect(h.state.croppingElementId).toBeNull();
    API.executeAction(actionToggleCropEditor);
    expect(h.state.croppingElementId).toBeNull();
    fireEvent.keyDown(screen.getByTestId("table-cell-0-0"), { key: "Escape" });
    API.setSelectedElements([element]);
    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      clientX: 70,
      clientY: 70,
      button: 2,
    });
    fireEvent.click(screen.getByTestId("editDataTable"));
    expect(screen.getByTestId("data-table-editor")).toBeInTheDocument();
  });
  it("protects locked tables and read-only canvases", async () => {
    await render(<Excalidraw />);
    const element = { ...image(), locked: true };
    API.setElements([element]);
    const state = {
      ...h.state,
      selectedElementIds: { [element.id]: true as const },
    };
    expect(actionEditDataTable.predicate!([element], state)).toBe(false);
    expect(
      actionEditDataTable.predicate!([{ ...element, locked: false }], {
        ...state,
        viewModeEnabled: true,
      }),
    ).toBe(false);
  });
  it("renders rough strokes and inert text for saved/exported tables", () => {
    const data = sampleTable();
    data.rows[0][0] = '<script>alert("x")</script>';
    const svg = renderTableSvg(data, document);
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(5);
    data.strokeWidth = 4;
    expect(
      renderTableSvg(data, document)
        .querySelector('path[stroke-width="4"]')
        ?.getAttribute("stroke-width"),
    ).toBe("4");
    expect(svg.querySelector("script")).toBeNull();
    expect(svg.textContent).toContain(data.rows[0][0]);
    expect(
      renderTableSvg(data, document, false).querySelector("text"),
    ).toBeNull();
    expect(
      getTableData({
        ...image(),
        customData: { dataTable: { ...data, version: 999 } },
      }),
    ).toBeNull();
  });
  it("rounds and clips the actual table border, fill and grid instead of the parent image", () => {
    const data = {
      ...sampleTable(),
      rounded: true,
      fillStyle: "solid" as const,
      backgroundColor: "#ff0000",
      strokeStyle: "dashed" as const,
      strokeWidth: 4,
    };
    const svg = renderTableSvg(data, document);
    expect(svg.querySelector("clipPath rect")?.getAttribute("rx")).toBe("16");
    expect(
      svg
        .querySelector('[data-table-border="round"] path')
        ?.getAttribute("stroke-dasharray"),
    ).toBe("8 6");
    expect(svg.querySelector('path[fill="#ff0000"]')).not.toBeNull();
    expect(
      renderTableSvg({ ...data, rounded: false }, document)
        .querySelector("clipPath rect")
        ?.getAttribute("rx"),
    ).toBe("0");
    expect(() =>
      validateTable({
        ...data,
        backgroundColor: "transparent",
        color: "#1238",
      }),
    ).not.toThrow();
  });
  it.each([
    ["full", true, 2, 3, 0],
    ["outer", true, 0, 0, 0],
    ["inner", false, 2, 3, 0],
    ["rows", false, 0, 3, 2],
  ] as const)(
    "renders %s borders in saved/exported SVGs",
    (borderStyle, outline, columns, rows, edges) => {
      const data = { ...sampleTable(), borderStyle };
      const svg = renderTableSvg(data, document);
      expect(!!svg.querySelector("[data-table-border]")).toBe(outline);
      for (const [kind, count] of [
        ["column", columns],
        ["row", rows],
        ["row-edge", edges],
      ] as const) {
        const lines = svg.querySelectorAll(`[data-table-grid="${kind}"]`);
        expect(lines).toHaveLength(count);
        lines.forEach((line) =>
          expect(
            line.querySelector(`path[stroke="${data.color}"]`),
          ).not.toBeNull(),
        );
      }
      expect(svg.querySelectorAll("text")).toHaveLength(12);
    },
  );

  it("defaults older tables to full borders and rejects unknown border modes", () => {
    const legacy = sampleTable();
    delete legacy.borderStyle;
    const svg = renderTableSvg(legacy, document);
    expect(svg.querySelector("[data-table-border]")).not.toBeNull();
    expect(svg.querySelectorAll('[data-table-grid="column"]')).toHaveLength(2);
    expect(svg.querySelectorAll('[data-table-grid="row"]')).toHaveLength(3);
    expect(() =>
      validateTable({ ...legacy, borderStyle: "unknown" }),
    ).toThrow();
  });

  it("selects borders with icons and saves the choice on deselection", async () => {
    await render(<Excalidraw />);
    fireEvent.click(screen.getByTestId("toolbar-data-table"));
    await screen.findByTestId("table-cell--1-0");
    expect(screen.getByTestId("table-border-full")).toHaveClass("active");
    fireEvent.click(screen.getByTestId("table-border-inner"));
    expect(screen.getByTestId("table-border-inner")).toHaveClass("active");
    fireEvent.change(screen.getByTestId("table-cell-0-0"), {
      target: { value: "Keep this cell" },
    });
    API.setSelectedElements([]);
    await waitFor(() =>
      expect(getTableData(h.elements[0])?.borderStyle).toBe("inner"),
    );
    expect(getTableData(h.elements[0])?.rows[0][0]).toBe("Keep this cell");
    API.setSelectedElements([...h.app.scene.getNonDeletedElements()]);
    await screen.findByTestId("table-cell--1-0");
    expect(screen.getByTestId("table-border-inner")).toHaveClass("active");
    fireEvent.click(screen.getByTestId("table-border-rows"));
    API.setSelectedElements([]);
    await waitFor(() =>
      expect(getTableData(h.elements[0])?.borderStyle).toBe("rows"),
    );
  });

  it.each([
    ["header", ["header"], []],
    ["all", ["all"], []],
    ["header-alternating-columns", ["header", "column", "column"], ["0", "2"]],
    ["alternating-columns", ["column", "column"], ["0", "2"]],
  ] as const)(
    "fills the intended regions for %s",
    (fillScope, regions, columns) => {
      const data = {
        ...sampleTable(),
        fillScope,
        backgroundColor: "#ff0000",
        fillStyle: "solid" as const,
        rounded: true,
      };
      const svg = renderTableSvg(data, document);
      const fills = [...svg.querySelectorAll("[data-table-fill-region]")];
      expect(
        fills.map((fill) => fill.getAttribute("data-table-fill-region")),
      ).toEqual(regions);
      expect(
        [...svg.querySelectorAll("[data-table-fill-column]")].map((fill) =>
          fill.getAttribute("data-table-fill-column"),
        ),
      ).toEqual(columns);
      fills.forEach((fill) =>
        expect(fill.querySelector('path[fill="#ff0000"]')).not.toBeNull(),
      );
      expect(svg.querySelector('path[fill="#ffffff"]')).toBeNull();
      expect(svg.querySelectorAll("text")).toHaveLength(12);
      expect(svg.querySelector("clipPath rect")?.getAttribute("rx")).toBe("16");
      expect(svg.querySelector("[data-table-border]")).not.toBeNull();
    },
  );

  it("keeps legacy fills compatible and validates fill-area choices", () => {
    const legacy = sampleTable();
    delete legacy.fillScope;
    delete legacy.backgroundColor;
    const svg = renderTableSvg(legacy, document);
    expect(svg.querySelector('path[fill="#ffffff"]')).not.toBeNull();
    expect(() => validateTable({ ...legacy, fillScope: "unknown" })).toThrow();
    expect(sampleTable().fillScope).toBe("all");
  });

  it("places border icons below stroke width and persists the fill-area selection", async () => {
    await render(<Excalidraw />);
    fireEvent.click(screen.getByTestId("toolbar-data-table"));
    await screen.findByTestId("table-cell--1-0");
    const width = screen.getByTestId("strokeWidth-thin").closest("fieldset")!;
    const borders = screen.getByTestId("table-border-full").closest("fieldset");
    expect(width.nextElementSibling).toBe(borders);
    expect(screen.getByTestId("table-fill-all")).toHaveClass("active");
    fireEvent.click(screen.getByTestId("table-fill-header-columns"));
    expect(screen.getByTestId("table-fill-header-columns")).toHaveClass(
      "active",
    );
    API.setSelectedElements([]);
    await waitFor(() =>
      expect(getTableData(h.elements[0])?.fillScope).toBe(
        "header-alternating-columns",
      ),
    );
    API.setSelectedElements([...h.app.scene.getNonDeletedElements()]);
    await screen.findByTestId("table-cell--1-0");
    expect(screen.getByTestId("table-fill-header-columns")).toHaveClass(
      "active",
    );
  });

  it("rejects invalid row shapes and oversized cells before rendering or saving", () => {
    expect(() =>
      validateTable({ ...sampleTable(), rows: [["mismatched"]] }),
    ).toThrow();
    expect(() =>
      validateTable({ ...sampleTable(), columns: Array(13).fill("a") }),
    ).toThrow();
    expect(() =>
      validateTable({
        ...sampleTable(),
        rows: Array(101).fill(["a", "b", "c"]),
      }),
    ).toThrow();
    expect(() =>
      validateTable({ ...sampleTable(), rows: [["a".repeat(501), "b", "c"]] }),
    ).toThrow();
  });
});
