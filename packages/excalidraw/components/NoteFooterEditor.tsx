import { useRef, useState } from "react";

import { sceneCoordsToViewportCoords } from "@excalidraw/common";
import { getStickyNoteFooter, isStickyNoteElement } from "@excalidraw/element";
import { pointFrom, pointRotateRads, type GlobalPoint } from "@excalidraw/math";

import { actionChangeNoteFooter } from "../actions/actionNoteFooter";
import { t } from "../i18n";

import {
  useApp,
  useExcalidrawAppState,
  useExcalidrawSetAppState,
  useExcalidrawActionManager,
} from "./App";

export const NoteFooterEditor = ({ elementId }: { elementId: string }) => {
  const app = useApp();
  const setAppState = useExcalidrawSetAppState();
  const actionManager = useExcalidrawActionManager();
  const finished = useRef(false);
  const appState = useExcalidrawAppState();
  const element = app.scene.getNonDeletedElement(elementId);
  const [value, setValue] = useState(() => {
    if (!element || !isStickyNoteElement(element)) {
      return "";
    }
    return getStickyNoteFooter(element)?.text ?? "";
  });
  if (!element || !isStickyNoteElement(element) || element.locked) {
    return null;
  }
  const footer = getStickyNoteFooter(element);
  if (!footer) {
    return null;
  }
  const anchor = pointRotateRads(
    pointFrom<GlobalPoint>(element.x + footer.x, element.y + footer.y),
    pointFrom<GlobalPoint>(
      element.x + element.width / 2,
      element.y + element.height / 2,
    ),
    element.angle,
  );
  const position = sceneCoordsToViewportCoords(
    { sceneX: anchor[0], sceneY: anchor[1] },
    appState,
  );
  const close = () => {
    finished.current = true;
    setAppState({ openDialog: null });
    app.focusContainer();
  };
  const save = () => {
    if (finished.current) {
      return;
    }
    finished.current = true;
    actionManager.executeAction(actionChangeNoteFooter, "ui", {
      elementId,
      footerText: value,
    });
    app.focusContainer();
  };
  return (
    <input
      autoFocus
      type="text"
      maxLength={200}
      onFocus={(event) => event.currentTarget.select()}
      aria-label={t("labels.noteFooter")}
      data-testid="note-footer-editor"
      value={value}
      style={{
        position: "absolute",
        left: position.x - appState.offsetLeft,
        top: position.y - appState.offsetTop,
        transform: "translate(-100%, -75%)",
        width: "10rem",
        padding: "0.3rem",
        border: "1px solid var(--color-primary)",
        borderRadius: "var(--border-radius-md)",
        background: "var(--island-bg-color)",
        color: "var(--text-primary-color)",
        pointerEvents: "auto",
        zIndex: "var(--zIndex-layerUI)",
      }}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        } else if (event.key === "Enter") {
          event.preventDefault();
          save();
        }
      }}
    />
  );
};
