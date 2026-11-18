import {
  DEFAULT_STICKY_NOTE_OUTLINE_COLOR,
  CaptureUpdateAction,
  isStickyNoteElement,
  newElementWith,
} from "@excalidraw/element";

import { ColorPicker } from "../components/ColorPicker/ColorPicker";
import { t } from "../i18n";
import { getSelectedElements } from "../scene";

import { register } from "./register";

import type { AppState } from "../types";

export const actionChangeNoteOutlineColor = register<
  Partial<AppState> & { color?: string }
>({
  name: "changeNoteOutlineColor",
  label: "labels.stroke",
  trackEvent: false,
  perform: (elements, appState, value) => {
    const { color, ...updates } = value ?? {};
    const selected = new Set(
      getSelectedElements(elements, appState).map((element) => element.id),
    );
    return {
      elements:
        color === undefined
          ? elements
          : elements.map((element) =>
              selected.has(element.id) &&
              isStickyNoteElement(element) &&
              !element.locked
                ? newElementWith(element, { outlineColor: color })
                : element,
            ),
      appState: {
        ...updates,
        ...(color !== undefined
          ? { currentItemStickynoteOutlineColor: color }
          : {}),
      },
      captureUpdate:
        color === undefined
          ? CaptureUpdateAction.EVENTUALLY
          : CaptureUpdateAction.IMMEDIATELY,
    };
  },
  PanelComponent: ({ elements, appState, updateData }) => {
    const notes = getSelectedElements(elements, appState)
      .filter(isStickyNoteElement)
      .filter((element) => !element.locked);
    if (
      appState.viewModeEnabled ||
      (!notes.length && appState.activeTool.type !== "stickynote")
    ) {
      return null;
    }
    const colors = notes.map(
      (note) => note.outlineColor ?? DEFAULT_STICKY_NOTE_OUTLINE_COLOR,
    );
    const color = colors.length
      ? colors.every((value) => value === colors[0])
        ? colors[0]
        : null
      : appState.currentItemStickynoteOutlineColor ??
        DEFAULT_STICKY_NOTE_OUTLINE_COLOR;
    return (
      <fieldset data-testid="note-stroke-color-controls">
        <legend>{t("labels.stroke")}</legend>
        <ColorPicker
          type="noteOutline"
          label={t("labels.stroke")}
          color={color}
          elements={elements}
          appState={appState}
          updateData={updateData}
          onChange={(color) => updateData({ color })}
        />
      </fieldset>
    );
  },
});
