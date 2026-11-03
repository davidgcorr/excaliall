import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@excalidraw/excalidraw/components/App";
import { t } from "@excalidraw/excalidraw/i18n";
import { DataElementStyleControls } from "@excalidraw/excalidraw/components/DataElementStyleControls";

import { getChartMetadata, validateChart } from "./data";
import { renderChart } from "./render";
import { saveChartSvg } from "./save";

import "./ChartProperties.scss";

import type { RoughVizChart } from "./data";

export const ChartProperties = ({ elementId }: { elementId: string }) => {
  const app = useApp();
  const initial = getChartMetadata(app.scene.getElement(elementId)?.customData);
  return initial ? (
    <ChartPropertiesEditor elementId={elementId} initial={initial} />
  ) : null;
};

const ChartPropertiesEditor = ({
  elementId,
  initial,
}: {
  elementId: string;
  initial: RoughVizChart;
}) => {
  const app = useApp();
  const [chart, setChart] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(chart);
  latest.current = chart;
  const saved = useRef(JSON.stringify(initial));
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const persist = useCallback(
    async (snapshot: RoughVizChart) => {
      try {
        validateChart(snapshot);
      } catch (failure) {
        if (mounted.current) {
          setError((failure as Error).message);
        }
        return;
      }
      if (JSON.stringify(snapshot) === saved.current || app.api.isDestroyed) {
        return;
      }
      const target = app.scene.getElement(elementId);
      if (
        target?.type !== "image" ||
        target.isDeleted ||
        target.locked ||
        app.state.viewModeEnabled
      ) {
        return;
      }
      controller.current?.abort();
      const request = new app.ownerWindow.AbortController();
      controller.current = request;
      if (mounted.current) {
        setBusy(true);
        setError(null);
      }
      try {
        const svg = await renderChart(
          snapshot,
          app.ownerDocument,
          app.ownerWindow,
          request.signal,
        );
        await saveChartSvg(app, snapshot, svg, {
          elementId,
          signal: request.signal,
          expectedFileId: target.fileId,
          beforeApply: () => {
            saved.current = JSON.stringify(snapshot);
          },
        });
      } catch (failure) {
        if (
          !request.signal.aborted &&
          (failure as Error).name !== "AbortError"
        ) {
          if (mounted.current) {
            setError((failure as Error).message);
          } else if (!app.api.isDestroyed) {
            app.setAppState({ errorMessage: (failure as Error).message });
          }
        }
      } finally {
        if (controller.current === request) {
          controller.current = null;
          if (mounted.current) {
            setBusy(false);
          }
        }
      }
    },
    [app, elementId],
  );
  // External changes, including undo/redo and imported data, refresh the controls.
  useEffect(() => {
    if (JSON.stringify(initial) !== saved.current) {
      controller.current?.abort();
      saved.current = JSON.stringify(initial);
      setChart(initial);
      setError(null);
    }
  }, [initial]);
  useEffect(() => {
    const timer = app.ownerWindow.setTimeout(() => {
      void persist(chart);
    }, 200);
    return () => {
      app.ownerWindow.clearTimeout(timer);
      controller.current?.abort();
    };
  }, [app, chart, persist]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      // Commit the final valid draft even if selection changes before the debounce.
      void persist(latest.current);
    };
  }, [persist]);
  const columns = Object.keys(chart.rows[0]);
  const multiple = chart.type === "Line" || chart.type === "StackedBar";
  const axes = chart.type !== "Pie" && chart.type !== "Donut";
  return (
    <fieldset className="ChartProperties" data-testid="chart-properties">
      <legend>{t("labels.chartProperties")}</legend>
      <DataElementStyleControls
        style={{
          strokeColor: chart.strokeColor ?? "#1e1e1e",
          roughness: chart.roughness,
          backgroundColor: chart.color,
          fillStyle: chart.fillStyle ?? "hachure",
          strokeWidth:
            chart.strokeWidth ??
            (chart.type === "Pie" || chart.type === "Donut" ? 0.75 : 1),
          strokeStyle: chart.strokeStyle ?? "solid",
        }}
        onChange={(patch) => {
          const { backgroundColor, ...rest } = patch;
          setChart((previous) => ({
            ...previous,
            ...rest,
            ...(backgroundColor !== undefined
              ? { color: backgroundColor }
              : {}),
          }));
        }}
      />
      <label>
        {t("labels.chartLabelColumn")}
        <select
          data-testid="chart-label-column"
          value={chart.labelColumn}
          onChange={(event) =>
            setChart({ ...chart, labelColumn: event.currentTarget.value })
          }
        >
          {columns.map((column) => (
            <option key={column}>{column}</option>
          ))}
        </select>
      </label>
      <label>
        {t("labels.chartValueColumns")}
        <select
          data-testid="chart-value-columns"
          multiple={multiple}
          value={multiple ? chart.valueColumns : chart.valueColumns[0]}
          onChange={(event) =>
            setChart({
              ...chart,
              valueColumns: [...event.currentTarget.selectedOptions].map(
                (option) => option.value,
              ),
            })
          }
        >
          {columns.map((column) => (
            <option key={column}>{column}</option>
          ))}
        </select>
      </label>
      <label>
        {t("labels.chartTitle")}
        <input
          data-testid="chart-title"
          value={chart.title}
          maxLength={200}
          onChange={(event) =>
            setChart({ ...chart, title: event.currentTarget.value })
          }
        />
      </label>
      <label>
        {t("labels.chartXAxisTitle")}
        <input
          data-testid="chart-x-axis-title"
          value={chart.xAxisTitle ?? chart.labelColumn}
          maxLength={200}
          disabled={!axes}
          onChange={(event) =>
            setChart({ ...chart, xAxisTitle: event.currentTarget.value })
          }
        />
      </label>
      <label>
        {t("labels.chartYAxisTitle")}
        <input
          data-testid="chart-y-axis-title"
          value={chart.yAxisTitle ?? chart.valueColumns.join(", ")}
          maxLength={200}
          disabled={!axes}
          onChange={(event) =>
            setChart({ ...chart, yAxisTitle: event.currentTarget.value })
          }
        />
      </label>

      <small role="status">
        {busy ? t("labels.chartUpdating") : t("labels.chartDataHint")}
      </small>
      {error && <span role="alert">{error}</span>}
    </fieldset>
  );
};
