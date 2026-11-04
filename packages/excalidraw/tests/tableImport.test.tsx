import { readFileSync } from "node:fs";

import React from "react";

import { Excalidraw } from "../index";
import {
  parseTableText,
  readTableWorkbook,
  tableContentsFromMatrix,
} from "../components/DataTable/import";
import {
  getTableData,
  getTablePage,
  renderTableSvg,
  sampleTable,
  tableSize,
  validateTable,
} from "../components/DataTable/data";

import { API } from "./helpers/api";
import { fireEvent, render, screen, waitFor } from "./test-utils";

const { h } = window;
const workbook = () =>
  Uint8Array.from(readFileSync(`${__dirname}/fixtures/table-import.xlsx`));
const setup = async () => {
  await render(<Excalidraw />);
  fireEvent.click(screen.getByTestId("toolbar-data-table"));
  await screen.findByTestId("table-cell--1-0");
};

describe("table data import", () => {
  it("reads quoted CSV, multiline cells, BOMs, blank cells and duplicate headers", () => {
    expect(
      parseTableText('\uFEFFName,Name,Note\n"A,B",,"first\nsecond"'),
    ).toEqual({
      columns: ["Name", "Name", "Note"],
      rows: [["A,B", "", "first\nsecond"]],
    });
    expect(parseTableText("A,B\nx").rows).toEqual([["x", ""]]);
  });
  it("accepts JSON records, row arrays, and explicit columns/rows without losing values", () => {
    expect(
      parseTableText('[{"Name":"A","Amount":0},{"Name":"B","Active":false}]'),
    ).toEqual({
      columns: ["Name", "Amount", "Active"],
      rows: [
        ["A", "0", ""],
        ["B", "", "false"],
      ],
    });
    expect(parseTableText('[["Name","Value"],["A",null]]')).toEqual({
      columns: ["Name", "Value"],
      rows: [["A", ""]],
    });
    expect(parseTableText('{"columns":["Key"],"rows":[["v"]]}').rows).toEqual([
      ["v"],
    ]);
    expect(() => parseTableText('[{"nested":{"x":1}}]')).toThrow(/Cells/);
    expect(() => tableContentsFromMatrix([Array(13).fill("A")])).toThrow(
      /columns/,
    );
    expect(() =>
      tableContentsFromMatrix([
        ["A"],
        ...Array.from({ length: 101 }, () => ["x"]),
      ]),
    ).toThrow(/rows/);
  });
  it("reads real Excel worksheets with numeric and boolean cells", async () => {
    const sheets = await readTableWorkbook(workbook().buffer);
    expect(sheets.map((sheet) => sheet.name)).toEqual(["Budget", "Status"]);
    expect(tableContentsFromMatrix(sheets[0].matrix).rows).toEqual([
      ["One", "100"],
      ["Two", "200"],
    ]);
    expect(tableContentsFromMatrix(sheets[1].matrix)).toEqual({
      columns: ["Code", "Active"],
      rows: [["B", "true"]],
    });
  });
  it("previews replacement data, replaces the canvas contents, and preserves table styling", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("table-border-inner"));
    fireEvent.click(screen.getByTestId("table-import"));
    await screen.findByRole("heading", { name: "Import table data" });
    fireEvent.change(screen.getByTestId("table-import-text"), {
      target: { value: "Item,Cost\nReplacement,42" },
    });
    expect(screen.getByText("1 rows · 2 columns")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Replace table data" }));
    await waitFor(() =>
      expect(screen.getByTestId("table-cell-0-0")).toHaveValue("Replacement"),
    );
    expect(screen.getByTestId("table-cell--1-0")).toHaveValue("Item");
    API.setSelectedElements([]);
    await waitFor(() =>
      expect(getTableData(h.elements[0])?.rows).toEqual([
        ["Replacement", "42"],
      ]),
    );
    expect(getTableData(h.elements[0])?.borderStyle).toBe("inner");
  });
  it("keeps the table unchanged when importing invalid data or canceling", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("table-import"));
    await screen.findByTestId("table-import-text");
    fireEvent.change(screen.getByTestId("table-import-text"), {
      target: { value: "[invalid" },
    });
    expect(
      screen.getByRole("button", { name: "Replace table data" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("table-cell-0-0")).toHaveValue("Project A");
  });
  it.each([
    ["csv", "Name,Value\nCSV file,9", "CSV file"],
    ["json", '[{"Name":"JSON file","Value":8}]', "JSON file"],
  ])(
    "imports a %s file through the selected table's import icon",
    async (extension, text, expected) => {
      await setup();
      fireEvent.click(screen.getByTestId("table-import"));
      await screen.findByTestId("table-import-file");
      fireEvent.change(screen.getByTestId("table-import-file"), {
        target: { files: [new File([text], `table.${extension}`)] },
      });
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Replace table data" }),
        ).not.toBeDisabled(),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Replace table data" }),
      );
      await waitFor(() =>
        expect(screen.getByTestId("table-cell-0-0")).toHaveValue(expected),
      );
    },
  );

  it("lets the user choose a worksheet when importing an Excel file", async () => {
    await setup();
    fireEvent.click(screen.getByTestId("table-import"));
    await screen.findByTestId("table-import-file");
    fireEvent.change(screen.getByTestId("table-import-file"), {
      target: { files: [new File([workbook()], "data.xlsx")] },
    });
    const worksheet = await screen.findByLabelText("Worksheet");
    fireEvent.change(worksheet, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Replace table data" }));
    await waitFor(() =>
      expect(screen.getByTestId("table-cell--1-0")).toHaveValue("Code"),
    );
    expect(screen.getByTestId("table-cell-0-1")).toHaveValue("true");
  });
});

describe("table pagination", () => {
  it("limits SVG dimensions to the selected page without truncating stored data", () => {
    const data = {
      ...sampleTable(),
      rowsPerPage: 2,
      columnsPerPage: 2,
      rowPage: 1,
      columnPage: 1,
    };
    expect(getTablePage(data).columns).toEqual(["Amount"]);
    expect(getTablePage(data).rows).toEqual([["600"]]);
    expect(tableSize(data)).toEqual({ width: 196, height: 104 });
    const svg = renderTableSvg(data, document);
    expect(svg.textContent).toBe("Amount600");
    expect(data.rows).toHaveLength(3);
    expect(data.columns).toHaveLength(3);
    expect(
      getTablePage({ ...data, rowPage: 999, columnPage: 999 }).rows,
    ).toEqual([["600"]]);
    expect(() => validateTable({ ...data, rowsPerPage: 0 })).toThrow();
    expect(() => validateTable({ ...data, columnPage: -1 })).toThrow();
  });
  it("edits the correct source cells across both page axes and saves all data", async () => {
    await setup();
    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Columns per page"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next row page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next column page" }));
    expect(screen.getByTestId("table-cell-1-2")).toHaveValue("850");
    fireEvent.change(screen.getByTestId("table-cell-1-2"), {
      target: { value: "Edited second page" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Previous row page" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Previous column page" }),
    );
    expect(screen.getByTestId("table-cell-0-0")).toHaveValue("Project A");
    API.setSelectedElements([]);
    await waitFor(() =>
      expect(getTableData(h.elements[0])?.rows[1][2]).toBe(
        "Edited second page",
      ),
    );
    expect(getTableData(h.elements[0])?.rows).toHaveLength(3);
    expect(getTableData(h.elements[0])?.columnsPerPage).toBe(2);
    expect(getTableData(h.elements[0])?.rowsPerPage).toBe(1);
  });
});
