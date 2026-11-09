import { CaptureUpdateAction } from "@excalidraw/element";

import { IconButton } from "../components/IconButton";
import { latexIcon, mindMapIcon } from "../components/icons";
import { getLatexData } from "../components/Latex/data";
import { MindMapProperties } from "../components/MindMap/MindMapProperties";
import { insertMindMap, resolveMindMapNode } from "../components/MindMap/data";
import { t } from "../i18n";
import { getSelectedElements } from "../scene";

import { register } from "./register";

export const actionInsertLatex = register({
  name: "insertLatex",
  label: "labels.insertLatex",
  icon: latexIcon,
  keywords: ["latex", "tex", "math", "equation", "formula"],
  trackEvent: false,
  predicate: (_elements, state) => !state.viewModeEnabled,
  perform: (_elements, state) =>
    state.viewModeEnabled
      ? false
      : {
          appState: { ...state, openDialog: { name: "latex" } },
          captureUpdate: CaptureUpdateAction.NEVER,
        },
  PanelComponent: ({ updateData }) => (
    <IconButton
      type="button"
      icon={latexIcon}
      aria-label={t("labels.insertLatex")}
      title={t("labels.insertLatex")}
      data-testid="toolbar-latex"
      onClick={() => updateData(null)}
    />
  ),
});
export const actionEditLatex = register({
  name: "editLatex",
  keywords: ["latex", "tex", "math", "equation", "formula"],
  label: "labels.editLatex",
  icon: latexIcon,
  trackEvent: false,
  predicate: (elements, state) =>
    !state.viewModeEnabled &&
    getSelectedElements(elements, state).length === 1 &&
    !!getLatexData(getSelectedElements(elements, state)[0]) &&
    !getSelectedElements(elements, state)[0].locked,
  perform: (elements, state) => {
    const selected = getSelectedElements(elements, state);
    if (
      state.viewModeEnabled ||
      selected.length !== 1 ||
      selected[0].locked ||
      !getLatexData(selected[0])
    ) {
      return false;
    }
    return {
      appState: {
        ...state,
        openDialog: { name: "latex", elementId: selected[0].id },
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
  PanelComponent: ({ elements, appState, updateData }) => {
    const selected = getSelectedElements(elements, appState);
    return !appState.viewModeEnabled &&
      selected.length === 1 &&
      !selected[0].locked &&
      getLatexData(selected[0]) ? (
      <button
        type="button"
        className="excalidraw-button"
        onClick={() => updateData(null)}
      >
        {t("labels.editLatex")}
      </button>
    ) : null;
  },
});
export const actionInsertMindMap = register({
  name: "insertMindMap",
  label: "labels.insertMindMap",
  icon: mindMapIcon,
  keywords: ["mindmap", "mind map", "tree", "topic", "branch", "brainstorm"],
  trackEvent: false,
  predicate: (_elements, state) => !state.viewModeEnabled,
  perform: (_elements, state, _value, app) => {
    if (!state.viewModeEnabled) {
      app.setActiveTool({ type: state.preferredSelectionTool.type });
      insertMindMap(app);
    }
    return false;
  },
  PanelComponent: ({ updateData }) => (
    <IconButton
      type="button"
      icon={mindMapIcon}
      aria-label={t("labels.insertMindMap")}
      title={t("labels.insertMindMap")}
      data-testid="toolbar-mind-map"
      onClick={() => updateData(null)}
    />
  ),
});
export const actionEditMindMap = register({
  name: "editMindMap",
  label: "labels.mindMap",
  icon: mindMapIcon,
  trackEvent: false,
  perform: () => false,
  PanelComponent: ({ elements, appState }) => {
    const selected = getSelectedElements(elements, appState);
    const node =
      selected.length === 1
        ? resolveMindMapNode(elements, selected[0].id)
        : null;
    return !appState.viewModeEnabled && node && !node.locked ? (
      <MindMapProperties
        key={`${node.id}:${
          elements.find(
            (element) =>
              element.type === "text" && element.containerId === node.id,
          )?.version
        }`}
        node={node}
      />
    ) : null;
  },
});
