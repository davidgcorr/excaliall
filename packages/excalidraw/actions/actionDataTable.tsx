import { IconButton } from "../components/IconButton";
import { dataTableIcon } from "../components/icons";
import {
  getTableData,
  sampleTable,
  saveTable,
} from "../components/DataTable/data";
import { DataTableEditor } from "../components/DataTable/DataTableEditor";
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
  perform: async (_elements, state, _value, app) => {
    if (state.viewModeEnabled) {
      return false as const;
    }
    app.setActiveTool({ type: state.preferredSelectionTool.type });
    try {
      await saveTable(app, sampleTable());
    } catch (failure) {
      app.setAppState({ errorMessage: (failure as Error).message });
    }
    return false as const;
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
  PanelComponent: ({ elements, appState }) => {
    const selected = getSelectedElements(elements, appState);
    const element = selected[0];
    return !appState.viewModeEnabled &&
      selected.length === 1 &&
      !element.locked &&
      getTableData(element) ? (
      <DataTableEditor
        key={`${element.id}:${element.type === "image" ? element.fileId : ""}`}
        elementId={element.id}
      />
    ) : null;
  },
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
      app.setAppState({
        selectedElementIds: { [selected[0].id]: true },
        selectedGroupIds: {},
        editingGroupId: null,
      });
    }
    return false;
  },
});
