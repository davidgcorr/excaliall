import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { sceneCoordsToViewportCoords } from "@excalidraw/common";

import { useApp, useExcalidrawAppState, useExcalidrawContainer } from "../App";
import { t } from "../../i18n";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./Table";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  TABLE_PADDING,
  MAX_COLUMNS,
  MAX_ROWS,
  getTableData,
  renderTableSvg,
  sampleTable,
  saveTable,
  tableSize,
  validateTable,
} from "./data";

import "./DataTableEditor.scss";

import type { ColumnDef } from "@tanstack/react-table";

export const DataTableEditor = ({ elementId }: { elementId: string }) => {
  const app = useApp();
  const state = useExcalidrawAppState();
  const { container } = useExcalidrawContainer();
  const candidate =
    elementId === "new" ? null : app.scene.getElement(elementId);
  const target = candidate?.type === "image" ? candidate : null;
  const initial = target ? getTableData(target) : sampleTable();
  const [data, setData] = useState(() => initial ?? sampleTable());
  const [active, setActive] = useState({ row: 0, column: 0 });
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => {
    const original = JSON.stringify(initial);
    return () => {
      const current = app.scene.getElement(elementId);
      if (
        !current ||
        current.isDeleted ||
        current.locked ||
        app.api.isDestroyed ||
        JSON.stringify(latest.current) === original
      ) {
        return;
      }
      // Deselecting or switching the properties panel commits without reselecting.
      void saveTable(app, latest.current, elementId, undefined, true).catch(
        (failure) => {
          if (!app.api.isDestroyed) {
            app.setAppState({ errorMessage: (failure as Error).message });
          }
        },
      );
    };
    // The session is keyed by element/file ID; keep its original data for comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, elementId]);
  const finish = () => {
    app.setAppState({ selectedElementIds: {}, selectedGroupIds: {} });
    app.focusContainer();
  };
  const changeCell = (row: number, column: number, value: string) => {
    setData((previous) =>
      row < 0
        ? {
            ...previous,
            columns: previous.columns.map((cell, index) =>
              index === column ? value : cell,
            ),
          }
        : {
            ...previous,
            rows: previous.rows.map((cells, index) =>
              index === row
                ? cells.map((cell, col) => (col === column ? value : cell))
                : cells,
            ),
          },
    );
  };
  const input = (row: number, column: number, value: string) => (
    <input
      aria-label={
        row < 0
          ? `${t("labels.tableColumn")} ${column + 1}`
          : `${data.columns[column]}, ${t("labels.tableRow")} ${row + 1}`
      }
      data-testid={`table-cell-${row}-${column}`}
      value={value}
      maxLength={500}
      onFocus={() => setActive({ row, column })}
      onChange={(event) => changeCell(row, column, event.currentTarget.value)}
      onPaste={(event) => {
        event.stopPropagation();
        const text = event.clipboardData.getData("text/plain");
        if (!/[\t\n]/.test(text) || row < 0) {
          return;
        }
        event.preventDefault();
        const values = text
          .replace(/\r/g, "")
          .replace(/\n$/, "")
          .split("\n")
          .map((line) => line.split("\t"));
        try {
          const width = Math.max(
            data.columns.length,
            column + Math.max(...values.map((cells) => cells.length)),
          );
          const height = Math.max(data.rows.length, row + values.length);
          if (width > MAX_COLUMNS || height > MAX_ROWS) {
            throw new Error("Paste supports up to 100 rows and 12 columns.");
          }
          const next = {
            ...data,
            columns: Array.from(
              { length: width },
              (_, index) => data.columns[index] ?? `Column ${index + 1}`,
            ),
            rows: Array.from({ length: height }, (_, index) =>
              Array.from(
                { length: width },
                (_, col) => data.rows[index]?.[col] ?? "",
              ),
            ),
          };
          values.forEach((cells, offset) =>
            cells.forEach((cell, col) => {
              next.rows[row + offset][column + col] = cell;
            }),
          );
          setData(validateTable(next));
          setError(null);
        } catch (failure) {
          setError((failure as Error).message);
        }
      }}
    />
  );
  // shadcn's headless DataTable pattern; source row indices remain stable while editing.
  const columns = useMemo<ColumnDef<string[]>[]>(
    () =>
      data.columns.map((name, index) => ({
        id: String(index),
        accessorFn: (row) => row[index],
        header: name,
      })),
    [data.columns],
  );
  const table = useReactTable({
    data: data.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const size = tableSize(data);
  const grid = useMemo(
    () =>
      new app.ownerWindow.XMLSerializer().serializeToString(
        renderTableSvg(data, app.ownerDocument, false),
      ),
    [app, data],
  );
  if (
    state.viewModeEnabled ||
    !target ||
    target.isDeleted ||
    target.locked ||
    !initial
  ) {
    return null;
  }
  const point = sceneCoordsToViewportCoords(
    { sceneX: target.x, sceneY: target.y },
    state,
  );
  const originalSize = initial ? tableSize(initial) : size;
  const scaleX =
    state.zoom.value * (target ? target.width / originalSize.width : 1);
  const scaleY =
    state.zoom.value * (target ? target.height / originalSize.height : 1);
  const sheet = (
    <div
      className="DataTableEditor"
      data-testid="data-table-editor"
      onWheel={(event) => {
        // Keep the camera and the on-canvas editor aligned, including large tables.
        event.stopPropagation();
        app.setAppState({
          scrollX: state.scrollX - event.deltaX / state.zoom.value,
          scrollY: state.scrollY - event.deltaY / state.zoom.value,
        });
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (
          event.key === "Escape" ||
          (event.key === "Enter" && (event.metaKey || event.ctrlKey))
        ) {
          event.preventDefault();
          finish();
        }
      }}
    >
      <div
        className="DataTableEditor__sheet"
        style={{
          left:
            point.x - state.offsetLeft + (size.width * scaleX - size.width) / 2,
          top:
            point.y -
            state.offsetTop +
            (size.height * scaleY - size.height) / 2,
          width: size.width,
          height: size.height,
          transformOrigin: "center",
          transform: `rotate(${
            target?.angle ?? 0
          }rad) scale(${scaleX}, ${scaleY})`,
          color: data.color,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            grid,
          )}")`,
        }}
      >
        <Table
          style={{
            margin: TABLE_PADDING,
            width: size.width - TABLE_PADDING * 2,
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
                  >
                    {input(
                      -1,
                      index,
                      String(
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        ),
                      ),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell, index) => (
                  <TableCell
                    key={cell.id}
                    style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
                  >
                    {input(row.index, index, String(cell.getValue() ?? ""))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
  return (
    <>
      <fieldset
        className="DataTableProperties"
        data-testid="data-table-properties"
      >
        <legend>{t("labels.editDataTable")}</legend>
        <button
          disabled={data.rows.length >= MAX_ROWS}
          onClick={() =>
            setData({
              ...data,
              rows: [...data.rows, data.columns.map(() => "")],
            })
          }
        >
          {t("labels.tableAddRow")}
        </button>
        <button
          disabled={data.columns.length >= MAX_COLUMNS}
          onClick={() =>
            setData({
              ...data,
              columns: [...data.columns, `Column ${data.columns.length + 1}`],
              rows: data.rows.map((row) => [...row, ""]),
            })
          }
        >
          {t("labels.tableAddColumn")}
        </button>
        <button
          disabled={active.row < 0 || !data.rows.length}
          onClick={() => {
            setData({
              ...data,
              rows: data.rows.filter((_, index) => index !== active.row),
            });
            setActive({ ...active, row: 0 });
          }}
        >
          {t("labels.tableDeleteRow")}
        </button>
        <button
          disabled={data.columns.length <= 1}
          onClick={() => {
            setData({
              ...data,
              columns: data.columns.filter(
                (_, index) => index !== active.column,
              ),
              rows: data.rows.map((row) =>
                row.filter((_, index) => index !== active.column),
              ),
            });
            setActive({ ...active, column: 0 });
          }}
        >
          {t("labels.tableDeleteColumn")}
        </button>
        <label>
          {t("labels.tableColor")}{" "}
          <input
            type="color"
            aria-label={t("labels.tableColor")}
            value={data.color}
            onChange={(event) =>
              setData({ ...data, color: event.currentTarget.value })
            }
          />
        </label>
        <label>
          {t("labels.tableRoughness")}{" "}
          <input
            type="range"
            aria-label={t("labels.tableRoughness")}
            min="0"
            max="3"
            step="0.25"
            value={data.roughness}
            onChange={(event) =>
              setData({ ...data, roughness: Number(event.currentTarget.value) })
            }
          />
        </label>
        <label>
          {t("labels.strokeWidth")}
          <input
            data-testid="table-stroke-width"
            type="range"
            min="0.5"
            max="6"
            step="0.1"
            value={data.strokeWidth ?? 1.3}
            onChange={(event) =>
              setData({
                ...data,
                strokeWidth: Number(event.currentTarget.value),
              })
            }
          />
          <output>{data.strokeWidth ?? 1.3}px</output>
        </label>
        <span>{t("labels.tableAutoSaveHint")}</span>
        {error && <span role="alert">{error}</span>}
      </fieldset>
      {container && createPortal(sheet, container)}
    </>
  );
};
