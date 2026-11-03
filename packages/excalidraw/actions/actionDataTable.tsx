import { IconButton } from "../components/IconButton";
import { dataTableIcon } from "../components/icons";
import { getTableData } from "../components/DataTable/data";
import { t } from "../i18n";
import { getSelectedElements } from "../scene";

import { register } from "./register";

export const actionInsertDataTable = register({
  name: "insertDataTable",
  label: "labels.insertDataTable",
  icon: dataTableIcon,
  keywords: ["table", "data", "shadcn", "spreadsheet", "rows", "columns"],
  trackEvent: { category: "element" },
  predicate: (_elements, state) => !state.viewModeEnabled,
  perform: (_elements, state, _value, app) => {
    if (state.viewModeEnabled) {
      return false;
    }
    app.setActiveTool({ type: state.preferredSelectionTool.type });
    app.setAppState({ editingDataTableId: "new" });
    return false;
  },
  PanelComponent: ({ updateData }) => (
    <IconButton
      type="button"
      icon={dataTableIcon}
      aria-label={t("labels.insertDataTable")}
      title={t("labels.insertDataTable")}
      data-testid="toolbar-data-table"
      onClick={() => updateData(null)}
    />
  ),
});
export const actionEditDataTable = register({
  name: "editDataTable",
  label: "labels.editDataTable",
  icon: dataTableIcon,
  keywords: ["table", "data", "cells", "rows", "columns"],
  trackEvent: { category: "element" },
  predicate: (elements, state) => {
    const selected = getSelectedElements(elements, state);
    return (
      !state.viewModeEnabled &&
      selected.length === 1 &&
      !selected[0].locked &&
      !!getTableData(selected[0])
    );
  },
  perform: (elements, state, _value, app) => {
    const selected = getSelectedElements(elements, state);
    if (
      !state.viewModeEnabled &&
      selected.length === 1 &&
      !selected[0].locked &&
      getTableData(selected[0])
    ) {
      app.setAppState({ editingDataTableId: selected[0].id });
    }
    return false;
  },
});
