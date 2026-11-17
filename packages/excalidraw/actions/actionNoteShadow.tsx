import {
  CaptureUpdateAction,
  getStickyNoteShadow,
  isStickyNoteElement,
  newElementWith,
} from "@excalidraw/element";

import { Range } from "../components/Range";
import { t } from "../i18n";
import { getSelectedElements } from "../scene";

import { register } from "./register";

type ShadowUpdate = { shadowOpacity?: number; shadowOffset?: number };

export const actionChangeNoteShadow = register<ShadowUpdate>({
  name: "changeNoteShadow",
  label: "labels.noteShadow",
  trackEvent: false,
  perform: (elements, appState, value = {}) => {
    const selected = new Set(
      getSelectedElements(elements, appState)
        .filter((element) => isStickyNoteElement(element) && !element.locked)
        .map((element) => element.id),
    );
    return {
      elements: elements.map((element) =>
        selected.has(element.id) && isStickyNoteElement(element)
          ? newElementWith(element, {
              ...(value.shadowOpacity !== undefined
                ? {
                    shadowOpacity: Math.max(
                      0,
                      Math.min(100, value.shadowOpacity),
                    ),
                  }
                : {}),
              ...(value.shadowOffset !== undefined
                ? {
                    shadowOffset: Math.max(0, Math.min(12, value.shadowOffset)),
                  }
                : {}),
            })
          : element,
      ),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  PanelComponent: ({ elements, appState, updateData }) => {
    const notes = getSelectedElements(elements, appState)
      .filter(isStickyNoteElement)
      .filter((element) => !element.locked);
    if (!notes.length || appState.viewModeEnabled) {
      return null;
    }
    const shadows = notes.map(getStickyNoteShadow);
    const first = shadows[0];
    return (
      <fieldset data-testid="note-shadow-controls">
        <legend>{t("labels.noteShadow")}</legend>
        <Range
          label={t("labels.shadowStrength")}
          value={Math.round(first.opacity * 100)}
          hasCommonValue={shadows.every(
            ({ opacity }) => opacity === first.opacity,
          )}
          min={0}
          max={100}
          step={1}
          testId="note-shadow-strength"
          onChange={(shadowOpacity) => updateData({ shadowOpacity })}
        />
        <Range
          label={t("labels.shadowDistance")}
          value={first.offset}
          hasCommonValue={shadows.every(
            ({ offset }) => offset === first.offset,
          )}
          min={0}
          max={12}
          step={1}
          testId="note-shadow-distance"
          onChange={(shadowOffset) => updateData({ shadowOffset })}
        />
      </fieldset>
    );
  },
});
