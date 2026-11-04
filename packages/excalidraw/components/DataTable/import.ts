import { csvParseRows } from "d3-dsv";

import { MAX_COLUMNS, MAX_ROWS } from "./data";

export type TableContents = { columns: string[]; rows: string[][] };

const cellText = (value: unknown): string => {
  if (value == null) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (!["string", "number", "boolean"].includes(typeof value)) {
    throw new Error(
      "Cells must contain text, numbers, booleans or empty values.",
    );
  }
  const text = String(value);
  if (text.length > 500) {
    throw new Error("Cells must contain at most 500 characters.");
  }
  return text;
};

export const tableContentsFromMatrix = (matrix: unknown[][]): TableContents => {
  if (!matrix.length || !matrix.every(Array.isArray)) {
    throw new Error("Include a header row followed by data rows.");
  }
  if (matrix.length - 1 > MAX_ROWS) {
    throw new Error(
      `Tables support up to ${MAX_ROWS} rows and ${MAX_COLUMNS} columns.`,
    );
  }
  const width = Math.max(...matrix.map((row) => row.length));
  if (!width || width > MAX_COLUMNS || matrix.length - 1 > MAX_ROWS) {
    throw new Error(
      `Tables support up to ${MAX_ROWS} rows and ${MAX_COLUMNS} columns.`,
    );
  }
  const [header, ...rows] = matrix;
  return {
    columns: Array.from(
      { length: width },
      (_, index) => cellText(header[index]) || `Column ${index + 1}`,
    ),
    rows: rows.map((row) =>
      Array.from({ length: width }, (_, index) => cellText(row[index])),
    ),
  };
};

export const parseTableText = (text: string): TableContents => {
  const source = text.replace(/^\uFEFF/, "").trim();
  if (!source) {
    throw new Error("Choose a file or paste CSV / JSON data.");
  }
  if (source.startsWith("[") || source.startsWith("{")) {
    const value = JSON.parse(source);
    if (
      value &&
      !Array.isArray(value) &&
      Array.isArray(value.columns) &&
      Array.isArray(value.rows)
    ) {
      return tableContentsFromMatrix([value.columns, ...value.rows]);
    }
    if (!Array.isArray(value) || !value.length) {
      throw new Error(
        "JSON must be an array of objects, an array of rows, or an object with columns and rows.",
      );
    }
    if (value.every(Array.isArray)) {
      return tableContentsFromMatrix(value);
    }
    if (
      !value.every(
        (row) => row && typeof row === "object" && !Array.isArray(row),
      )
    ) {
      throw new Error("Use the same row format throughout the JSON data.");
    }
    const columns = [
      ...new Set<string>(value.flatMap((row) => Object.keys(row))),
    ];
    return tableContentsFromMatrix([
      columns,
      ...value.map((row) =>
        columns.map((key) =>
          Object.prototype.hasOwnProperty.call(row, key) ? row[key] : null,
        ),
      ),
    ]);
  }
  const matrix = csvParseRows(source);
  while (
    matrix.length > 1 &&
    matrix[matrix.length - 1].every((value) => !value.trim())
  ) {
    matrix.pop();
  }
  return tableContentsFromMatrix(matrix);
};

export const readTableWorkbook = async (input: ArrayBuffer) => {
  const { default: readExcel } = await import("read-excel-file/universal");
  const sheets = await readExcel(input);
  return sheets.map((sheet) => ({ name: sheet.sheet, matrix: sheet.data }));
};
