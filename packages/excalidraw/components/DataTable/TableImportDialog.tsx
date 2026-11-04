import { useEffect, useMemo, useRef, useState } from "react";

import { useApp } from "../App";
import { Dialog } from "../Dialog";
import { FilledButton } from "../FilledButton";

import {
  parseTableText,
  readTableWorkbook,
  tableContentsFromMatrix,
} from "./import";
import { MAX_COLUMNS, MAX_ROWS } from "./data";

import type { TableContents } from "./import";

type Workbook = Awaited<ReturnType<typeof readTableWorkbook>>;

export const TableImportDialog = ({
  onImport,
  onClose,
}: {
  onImport: (contents: TableContents) => void;
  onClose: () => void;
}) => {
  const app = useApp();
  const [text, setText] = useState("");
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [sheet, setSheet] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const parsed = useMemo(() => {
    try {
      return {
        contents: workbook
          ? tableContentsFromMatrix(workbook[sheet]?.matrix ?? [])
          : parseTableText(text),
        error: null,
      };
    } catch (failure) {
      return { contents: null, error: (failure as Error).message };
    }
  }, [text, workbook, sheet]);
  const loadFile = async (file: File) => {
    const id = ++request.current;
    setBusy(true);
    setFileError(null);
    try {
      if (file.size > 5_000_000) {
        throw new Error("Choose a file smaller than 5 MB.");
      }
      if (/\.xlsx$/i.test(file.name)) {
        // Read through the mounted app's realm, including embedded desktop editors.
        const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new app.ownerWindow.FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () =>
            reject(new Error("Could not read the selected file."));
          reader.readAsArrayBuffer(file);
        });
        const sheets = await readTableWorkbook(buffer);
        if (!sheets.length) {
          throw new Error("The workbook has no worksheets.");
        }
        if (request.current === id) {
          setWorkbook(sheets);
          setSheet(0);
          setText("");
        }
      } else if (/\.(csv|json)$/i.test(file.name)) {
        const contents = await new Promise<string>((resolve, reject) => {
          const reader = new app.ownerWindow.FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error("Could not read the selected file."));
          reader.readAsText(file);
        });
        parseTableText(contents);
        if (request.current === id) {
          setText(contents);
          setWorkbook(null);
        }
      } else {
        throw new Error(
          "Choose CSV, JSON or Excel .xlsx. Save older .xls workbooks as .xlsx first.",
        );
      }
    } catch (failure) {
      if (request.current === id) {
        setFileError((failure as Error).message);
      }
    } finally {
      if (request.current === id) {
        setBusy(false);
      }
    }
  };
  return (
    <Dialog
      title="Import table data"
      onCloseRequest={onClose}
      closeOnClickOutside={!busy}
    >
      <div className="TableImportDialog">
        <p>
          Replace this table’s headers and rows with CSV, Excel (.xlsx), or
          JSON. Colors, borders and fill settings are preserved.
        </p>
        <input
          ref={fileInput}
          data-testid="table-import-file"
          type="file"
          hidden
          accept=".csv,.json,.xlsx,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) {
              void loadFile(file);
            }
          }}
        />
        <FilledButton
          variant="outlined"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          Choose CSV / Excel / JSON file
        </FilledButton>
        {workbook ? (
          <>
            <label>
              Worksheet
              <select
                aria-label="Worksheet"
                value={sheet}
                disabled={busy}
                onChange={(event) =>
                  setSheet(Number(event.currentTarget.value))
                }
              >
                {workbook.map((item, index) => (
                  <option key={index} value={index}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <FilledButton
              variant="outlined"
              disabled={busy}
              onClick={() => {
                setWorkbook(null);
                setText("");
                setFileError(null);
              }}
            >
              Paste CSV / JSON instead
            </FilledButton>
          </>
        ) : (
          <label>
            Or paste CSV / JSON
            <textarea
              data-testid="table-import-text"
              maxLength={1_000_000}
              value={text}
              disabled={busy}
              placeholder={"Name,Amount\nProject A,100\nProject B,200"}
              spellCheck={false}
              onChange={(event) => {
                setText(event.currentTarget.value);
                setFileError(null);
              }}
            />
          </label>
        )}
        <p className="TableImportDialog__hint">
          The first spreadsheet or CSV row supplies the column names. JSON
          accepts an array of objects, an array of rows, or{" "}
          {"{ columns, rows }"}. Up to {MAX_ROWS} rows, {MAX_COLUMNS} columns
          and 500 characters per cell.
        </p>
        {parsed.contents && !fileError && (
          <>
            <p>
              {parsed.contents.rows.length} rows ·{" "}
              {parsed.contents.columns.length} columns
            </p>
            <div className="TableImportDialog__preview">
              <table>
                <thead>
                  <tr>
                    {parsed.contents.columns.slice(0, 4).map((name, index) => (
                      <th key={index}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.contents.rows.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      {row.slice(0, 4).map((cell, column) => (
                        <td key={column}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="TableImportDialog__hint">
              Preview shows the first 5 rows and 4 columns.
            </p>
          </>
        )}
        {(fileError || ((text || workbook) && parsed.error)) && (
          <p role="alert">{fileError || parsed.error}</p>
        )}
        <div className="TableImportDialog__actions">
          <FilledButton variant="outlined" onClick={onClose}>
            Cancel
          </FilledButton>
          <FilledButton
            disabled={busy || !parsed.contents || !!fileError}
            onClick={() => {
              if (parsed.contents) {
                onImport(parsed.contents);
              }
            }}
          >
            Replace table data
          </FilledButton>
        </div>
      </div>
    </Dialog>
  );
};
