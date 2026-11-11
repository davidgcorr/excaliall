import { CaptureUpdateAction } from "@excalidraw/element";

import { IconButton } from "../components/IconButton";
import { latexIcon, mindMapIcon } from "../components/icons";
import { LatexProperties } from "../components/Latex/LatexProperties";
import { getLatexData } from "../components/Latex/data";
import { MindMapProperties } from "../components/MindMap/MindMapProperties";
import { insertMindMap, resolveMindMapNode } from "../components/MindMap/data";
import { t } from "../i18n";
import { getSelectedElements } from "../scene";

import { register } from "./register";
import { getShortcutFromShortcutName } from "./shortcuts";

export const actionInsertLatex = register({
  name: "insertLatex",
  keyTest: (event) =>
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.repeat &&
    event.key.toLowerCase() === "j",
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
      keyBindingLabel={getShortcutFromShortcutName("insertLatex")}
      title={`${t("labels.insertLatex")} (${getShortcutFromShortcutName(
        "insertLatex",
      )})`}
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
      selected[0].type === "image" &&
      getLatexData(selected[0]) ? (
      <LatexProperties
        key={selected[0].id}
        element={selected[0]}
        onEdit={() => updateData(null)}
      />
    ) : null;
  },
});
export const actionInsertMindMap = register({
  name: "insertMindMap",
  keyTest: (event) =>
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.repeat &&
    event.key.toLowerCase() === "m",
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
      keyBindingLabel={getShortcutFromShortcutName("insertMindMap")}
      title={`${t("labels.insertMindMap")} (${getShortcutFromShortcutName(
        "insertMindMap",
      )})`}
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
