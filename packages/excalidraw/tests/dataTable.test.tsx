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
import { fireEvent, render, screen, GlobalTestState } from "./test-utils";

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
  it("opens a new editable table from the toolbar, supports spreadsheet paste and cancels without changing the scene", async () => {
    await render(<Excalidraw />);
    fireEvent.click(screen.getByTestId("toolbar-data-table"));
    expect(screen.getByTestId("table-cell--1-0")).toHaveValue("Name");
    fireEvent.change(screen.getByTestId("table-cell-0-0"), {
      target: { value: "Updated" },
    });
    expect(screen.getByTestId("table-cell-0-0")).toHaveValue("Updated");
    fireEvent.paste(screen.getByTestId("table-cell-0-0"), {
      clipboardData: { getData: () => "A\tB\nC\tD" },
    });
    expect(screen.getByTestId("table-cell-0-1")).toHaveValue("B");
    expect(screen.getByTestId("table-cell-1-0")).toHaveValue("C");
    fireEvent.keyDown(screen.getByTestId("table-cell-0-0"), { key: "Escape" });
    expect(screen.queryByTestId("data-table-editor")).not.toBeInTheDocument();
    expect(h.elements).toHaveLength(0);
  });
  it("adds and deletes rows and columns using the focused cell", async () => {
    await render(<Excalidraw />);
    fireEvent.click(screen.getByTestId("toolbar-data-table"));
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
