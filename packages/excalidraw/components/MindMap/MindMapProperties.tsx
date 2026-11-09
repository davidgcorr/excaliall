import { useState } from "react";

import type { ExcalidrawRectangleElement } from "@excalidraw/element/types";

import { t } from "../../i18n";
import { useUIAppState } from "../../context/ui-appState";
import { useApp, useExcalidrawSetAppState } from "../App";
import { ColorPicker } from "../ColorPicker/ColorPicker";

import {
  addMindMapTopic,
  arrangeMindMap,
  getMindMapNode,
  renameMindMapTopic,
  updateMindMapBranch,
} from "./data";

import "./MindMapProperties.scss";

export const MindMapProperties = ({
  node,
}: {
  node: ExcalidrawRectangleElement;
}) => {
  const app = useApp();
  const appState = useUIAppState();
  const setAppState = useExcalidrawSetAppState();
  const data = getMindMapNode(node)!;
  const canFlip =
    data.parentId &&
    getMindMapNode(app.scene.getElement(data.parentId))?.parentId === null;
  const text = app.scene
    .getNonDeletedElements()
    .find(
      (element) => element.type === "text" && element.containerId === node.id,
    );
  const [title, setTitle] = useState(text?.type === "text" ? text.text : "");
  const run = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      setAppState({ errorMessage: (error as Error).message });
    }
  };
  return (
    <fieldset className="mind-map-properties" data-testid="mind-map-properties">
      <legend>{t("labels.mindMap")}</legend>
      <label>
        {t("labels.mindMapTopic")}
        <textarea
          rows={2}
          value={title}
          maxLength={1000}
          onChange={(event) => setTitle(event.currentTarget.value)}
          onBlur={() => run(() => renameMindMapTopic(app, node.id, title))}
        />
      </label>
      <span>{t("labels.mindMapBranchColor")}</span>
      <ColorPicker
        type="mindMapColor"
        color={data.color}
        label={t("labels.mindMapBranchColor")}
        elements={app.scene.getNonDeletedElements()}
        appState={appState}
        updateData={setAppState}
        onChange={(color) =>
          run(() => updateMindMapBranch(app, node.id, "color", color))
        }
      />
      <div className="mind-map-properties__buttons">
        <button
          type="button"
          onClick={() =>
            run(() => {
              addMindMapTopic(app, node.id);
            })
          }
        >
          {t("labels.mindMapAddChild")}
        </button>
        {data.parentId && (
          <button
            type="button"
            onClick={() =>
              run(() => {
                addMindMapTopic(app, node.id, true);
              })
            }
          >
            {t("labels.mindMapAddSibling")}
          </button>
        )}
        <button
          type="button"
          onClick={() => run(() => arrangeMindMap(app, node.id))}
        >
          {t("labels.mindMapArrange")}
        </button>
        {canFlip && (
          <button
            type="button"
            onClick={() => run(() => updateMindMapBranch(app, node.id, "flip"))}
          >
            {t("labels.mindMapFlip")}
          </button>
        )}
        <button
          type="button"
          onClick={() => run(() => updateMindMapBranch(app, node.id, "delete"))}
        >
          {t("labels.mindMapDelete")}
        </button>
      </div>
      <span className="mind-map-properties__hint">
        {t("labels.mindMapHint")}
      </span>
    </fieldset>
  );
};
