import { useEffect, useRef, useState } from "react";
import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";
import { newImageElement } from "@excalidraw/element/newElement";
import { viewportCoordsToSceneCoords } from "@excalidraw/common";
import { useApp } from "@excalidraw/excalidraw/components/App";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import {
  generateIdFromFile,
  getDataURL,
} from "@excalidraw/excalidraw/data/blob";

import type { ExcalidrawImageElement } from "@excalidraw/element/types";

import {
  CHART_TYPES,
  SAMPLE_DATA,
  getChartMetadata,
  parseChartData,
  validateChart,
} from "./data";
import { renderChart } from "./render";

import "./RoughVizDialog.scss";

import type { RoughVizChart, ChartType } from "./data";

const NAMES: Record<ChartType, string> = {
  Bar: "Bar",
  BarH: "Horizontal bar",
  Line: "Line",
  Scatter: "Scatter",
  Pie: "Pie",
  Donut: "Donut",
  StackedBar: "Stacked bar",
};

export const RoughVizDialog = ({
  onClose,
  elementId,
}: {
  onClose: () => void;
  elementId?: string | null;
}) => {
  const app = useApp();
  const [target] = useState(() => {
    const selected =
      elementId === null
        ? []
        : typeof elementId === "string"
        ? [app.scene.getElement(elementId)].filter(
            (element): element is NonNullable<typeof element> =>
              !!element && !element.isDeleted,
          )
        : app.scene.getSelectedElements(app.state);
    return selected.length === 1 &&
      selected[0].type === "image" &&
      !selected[0].locked &&
      getChartMetadata(selected[0].customData)
      ? (selected[0] as ExcalidrawImageElement)
      : null;
  });
  const [initial] = useState(() => getChartMetadata(target?.customData));
  const [text, setText] = useState(
    initial ? JSON.stringify(initial.rows, null, 2) : SAMPLE_DATA,
  );
  const [type, setType] = useState<ChartType>(initial?.type ?? "Bar");
  const [title, setTitle] = useState(initial?.title ?? "Revenue by month");
  const [labelColumn, setLabelColumn] = useState(
    initial?.labelColumn ?? "Month",
  );
  const [valueColumns, setValueColumns] = useState(
    initial?.valueColumns ?? ["Revenue"],
  );
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [color, setColor] = useState(initial?.color ?? "#1971c2");
  const [strokeWidth, setStrokeWidth] = useState(
    initial?.strokeWidth ??
      (initial?.type === "Pie" || initial?.type === "Donut" ? 0.75 : 1),
  );
  const [roughness, setRoughness] = useState(initial?.roughness ?? 1);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    [],
  );
  let columns: string[] = [];
  let rowCount = 0;
  try {
    const rows = parseChartData(text);
    columns = Object.keys(rows[0]);
    rowCount = rows.length;
  } catch {
    /* Validation is reported on Preview/Insert. */
  }
  const multiple = type === "Line" || type === "StackedBar";

  const loadText = (value: string) => {
    const rows = parseChartData(value);
    const keys = Object.keys(rows[0]);
    setText(value);
    const nextLabel = keys.includes(labelColumn) ? labelColumn : keys[0];
    setLabelColumn(nextLabel);
    const retained = valueColumns.filter(
      (key) => keys.includes(key) && key !== nextLabel,
    );
    setValueColumns(
      retained.length
        ? retained
        : [
            keys.find(
              (key) =>
                key !== nextLabel &&
                rows.every(
                  (row) =>
                    String(row[key]).trim() !== "" &&
                    Number.isFinite(Number(row[key])),
                ),
            ) ?? keys.find((key) => key !== nextLabel)!,
          ],
    );
    setError(null);
    setPreview(null);
  };
  const config = (): RoughVizChart =>
    validateChart({
      version: 1,
      type,
      title,
      rows: parseChartData(text),
      labelColumn,
      valueColumns: multiple ? valueColumns : valueColumns.slice(0, 1),
      sourceUrl,
      color,
      roughness,
      strokeWidth,
    });
  const run = async (insert: boolean) => {
    if (busy) {
      return;
    }
    const request = new app.ownerWindow.AbortController();
    controller.current = request;
    setBusy(true);
    setError(null);
    try {
      const chart = config();
      const svg = await renderChart(
        chart,
        app.ownerDocument,
        app.ownerWindow,
        request.signal,
      );
      const file = new app.ownerWindow.File([svg], "roughviz-chart.svg", {
        type: "image/svg+xml",
      });
      const dataURL = await getDataURL(file);
      if (request.signal.aborted) {
        return;
      }
      setPreview(dataURL);
      if (!insert) {
        return;
      }
      const fileId = await generateIdFromFile(file);
      if (request.signal.aborted || app.api.isDestroyed) {
        return;
      }
      const currentTarget = target ? app.scene.getElement(target.id) : null;
      if (
        target &&
        (!currentTarget ||
          currentTarget.isDeleted ||
          currentTarget.locked ||
          currentTarget.type !== "image")
      ) {
        throw new Error("The selected chart is no longer editable.");
      }
      const state = app.api.getAppState();
      const center = viewportCoordsToSceneCoords(
        {
          clientX: state.offsetLeft + state.width / 2,
          clientY: state.offsetTop + state.height / 2,
        },
        state,
      );
      const element =
        currentTarget?.type === "image"
          ? newElementWith(currentTarget, {
              fileId,
              status: "saved",
              crop: null,
              customData: { ...currentTarget.customData, roughViz: chart },
            })
          : newImageElement({
              type: "image",
              x: center.x - 320,
              y: center.y - 210,
              width: 640,
              height: 420,
              fileId,
              status: "saved",
              customData: { roughViz: chart },
            });
      const existing = app.api.getSceneElementsIncludingDeleted();
      app.api.updateScene({
        elements: currentTarget
          ? existing.map((item) => (item.id === element.id ? element : item))
          : [...existing, element],
        appState: currentTarget
          ? undefined
          : {
              selectedElementIds: { [element.id]: true },
              selectedGroupIds: {},
              editingGroupId: null,
            },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      // Load the image after its fileId is referenced by the scene.
      app.api.addFiles([
        {
          id: fileId,
          dataURL,
          mimeType: "image/svg+xml",
          created: Date.now(),
          lastRetrieved: Date.now(),
        },
      ]);
      onClose();
    } catch (failure) {
      if (!request.signal.aborted) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not render chart.",
        );
      }
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setBusy(false);
      }
    }
  };
  const loadUrl = async () => {
    if (busy) {
      return;
    }
    const request = new app.ownerWindow.AbortController();
    controller.current = request;
    setBusy(true);
    setError(null);
    try {
      const url = new URL(sourceUrl);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      ) {
        throw new Error(
          "Enter an HTTP(S) CSV or JSON URL without credentials.",
        );
      }
      const response = await app.ownerWindow.fetch(url, {
        signal: request.signal,
        credentials: "omit",
      });
      if (!response.ok) {
        throw new Error(`Data request failed (${response.status}).`);
      }
      if (Number(response.headers.get("content-length")) > 1_000_000) {
        throw new Error("Data must be smaller than 1 MB.");
      }
      let dataText = "";
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new app.ownerWindow.TextDecoder();
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            size += value.byteLength;
            if (size > 1_000_000) {
              await reader.cancel();
              throw new Error("Data must be smaller than 1 MB.");
            }
            dataText += decoder.decode(value, { stream: true });
          }
          dataText += decoder.decode();
        } finally {
          reader.releaseLock();
        }
      } else {
        dataText = await response.text();
      }
      if (!request.signal.aborted) {
        loadText(dataText);
      }
    } catch (failure) {
      if (!request.signal.aborted) {
        setError(
          failure instanceof Error
            ? `${failure.message} The server must allow cross-origin requests.`
            : "Could not load data.",
        );
      }
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setBusy(false);
      }
    }
  };

  if (elementId && !target) {
    return (
      <Dialog title="Edit roughViz chart" onCloseRequest={onClose}>
        <p>This chart is unavailable or locked.</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={target ? "Edit roughViz chart" : "Insert roughViz chart"}
      size="wide"
      onCloseRequest={onClose}
      closeOnClickOutside={!busy}
    >
      <div className="RoughVizDialog">
        <div className="RoughVizDialog__data">
          <p>
            Paste CSV or JSON, import a file, or load a data URL. The data is
            saved with the chart.
          </p>
          <label>
            CSV / JSON data
            <textarea
              data-testid="roughviz-data"
              value={text}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value;
                setText(value);
                setPreview(null);
                try {
                  loadText(value);
                } catch {
                  setError(null);
                }
              }}
              spellCheck={false}
            />
          </label>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            hidden
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) {
                return;
              }
              try {
                if (file.size > 1_000_000) {
                  throw new Error("Data must be smaller than 1 MB.");
                }
                loadText(await file.text());
                setSourceUrl("");
              } catch (failure) {
                setError((failure as Error).message);
              }
            }}
          />
          <div className="RoughVizDialog__actions">
            <FilledButton
              variant="outlined"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              Import CSV / JSON
            </FilledButton>
            <span>
              {rowCount} rows · {columns.length} columns
            </span>
          </div>
          <label>
            Data URL
            <input
              type="url"
              placeholder="https://example.com/data.csv"
              value={sourceUrl}
              disabled={busy}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
          </label>
          <FilledButton
            variant="outlined"
            disabled={busy || !sourceUrl}
            onClick={loadUrl}
          >
            Load / refresh data URL
          </FilledButton>
          <p className="RoughVizDialog__hint">
            URLs are loaded only when you click. Reopen this dialog with one
            chart selected to edit or refresh it. Supports up to 500 rows.
          </p>
        </div>
        <div className="RoughVizDialog__options">
          <label>
            Chart type
            <select
              data-testid="roughviz-type"
              value={type}
              disabled={busy}
              onChange={(event) => setType(event.target.value as ChartType)}
            >
              {CHART_TYPES.map((kind) => (
                <option key={kind} value={kind}>
                  {NAMES[kind]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              data-testid="roughviz-title"
              value={title}
              maxLength={200}
              disabled={busy}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <div className="RoughVizDialog__fields">
            <label>
              {type === "Scatter" ? "X column (numeric)" : "Labels / X column"}
              <select
                data-testid="roughviz-label"
                disabled={busy}
                value={labelColumn}
                onChange={(event) => setLabelColumn(event.target.value)}
              >
                {columns.map((key) => (
                  <option key={key}>{key}</option>
                ))}
              </select>
            </label>
            <label>
              {multiple
                ? "Value series (select one or more)"
                : "Values / Y column"}
              <select
                data-testid="roughviz-values"
                disabled={busy}
                multiple={multiple}
                value={multiple ? valueColumns : valueColumns[0] ?? ""}
                onChange={(event) =>
                  setValueColumns(
                    [...event.target.selectedOptions].map(
                      (option) => option.value,
                    ),
                  )
                }
              >
                {columns.map((key) => (
                  <option key={key}>{key}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="RoughVizDialog__fields">
            <label>
              Color
              <input
                type="color"
                value={color}
                disabled={busy}
                onChange={(event) => setColor(event.target.value)}
              />
            </label>
            <label>
              Roughness
              <input
                type="range"
                min="0.25"
                max="3"
                step="0.25"
                value={roughness}
                disabled={busy}
                onChange={(event) => setRoughness(Number(event.target.value))}
              />
            </label>
          </div>
          <label>
            Stroke width
            <input
              data-testid="roughviz-stroke-width"
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={strokeWidth}
              disabled={busy}
              onChange={(event) => {
                setStrokeWidth(Number(event.currentTarget.value));
                setPreview(null);
              }}
            />
            <output>{strokeWidth}px</output>
          </label>
          <div className="RoughVizDialog__preview">
            {preview ? (
              <img src={preview} alt={title || "Chart preview"} />
            ) : (
              <span>Choose Preview to render your data</span>
            )}
          </div>
          {error && (
            <p role="alert" className="RoughVizDialog__error">
              {error}
            </p>
          )}
          <div className="RoughVizDialog__actions">
            <FilledButton
              variant="outlined"
              disabled={busy}
              onClick={() => run(false)}
            >
              Preview
            </FilledButton>
            <FilledButton
              data-testid="roughviz-insert"
              disabled={busy}
              onClick={() => run(true)}
            >
              {target ? "Update chart" : "Insert chart"}
            </FilledButton>
            {busy && (
              <FilledButton
                variant="outlined"
                onClick={() => {
                  controller.current?.abort();
                  controller.current = null;
                  setBusy(false);
                }}
              >
                Cancel
              </FilledButton>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};
