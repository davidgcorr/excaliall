import { isRoughVizChartElement } from "@excalidraw/element";

import { IconButton } from "../components/IconButton";
import { dataChartIcon } from "../components/icons";
import { t } from "../i18n";
import { getSelectedElements } from "../scene";

import { register } from "./register";

export const actionInsertDataChart = register({
  name: "insertDataChart",
  label: "labels.insertDataChart",
  icon: dataChartIcon,
  keywords: [
    "roughviz",
    "chart",
    "graph",
    "csv",
    "json",
    "data",
    "bar",
    "pie",
    "scatter",
  ],
  trackEvent: { category: "element" },
  predicate: (_elements, state, props) =>
    !!props.onOpenDataChart && !state.viewModeEnabled,
  perform: (_elements, state, _value, app) => {
    if (!app.props.onOpenDataChart || state.viewModeEnabled) {
      return false;
    }
    app.setActiveTool({ type: state.preferredSelectionTool.type });
    app.props.onOpenDataChart();
    return false;
  },
  PanelComponent: ({ updateData }) => (
    <IconButton
      type="button"
      icon={dataChartIcon}
      aria-label={t("labels.insertDataChart")}
      title={t("labels.insertDataChart")}
      data-testid="toolbar-data-chart"
      onClick={() => updateData(null)}
    />
  ),
});

export const actionEditDataChart = register({
  name: "editDataChart",
  label: "labels.editDataChart",
  icon: dataChartIcon,
  keywords: ["roughviz", "chart", "graph", "data", "parameters", "settings"],
  trackEvent: { category: "element" },
  predicate: (elements, state, props) => {
    const selected = getSelectedElements(elements, state).filter(
      isRoughVizChartElement,
    );
    return (
      !!props.onOpenDataChart &&
      !state.viewModeEnabled &&
      selected.length === 1 &&
      !selected[0].locked &&
      isRoughVizChartElement(selected[0])
    );
  },
  perform: (elements, state, _value, app) => {
    const selected = getSelectedElements(elements, state).filter(
      isRoughVizChartElement,
    );
    if (
      app.props.onOpenDataChart &&
      !state.viewModeEnabled &&
      selected.length === 1 &&
      !selected[0].locked &&
      isRoughVizChartElement(selected[0])
    ) {
      app.props.onOpenDataChart(selected[0].id);
    }
    return false;
  },
});
