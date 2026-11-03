import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";
import { isLinearElement } from "@excalidraw/element";

import type { LinearElementAnimation } from "@excalidraw/element/types";

import { getSelectedElements } from "../scene";

import { LinearElementAnimationControls } from "../components/LinearElementAnimationControls";
import { t } from "../i18n";

import { register } from "./register";

export type ChangeLinearAnimationData =
  | { animation: LinearElementAnimation | null }
  | { patch: Partial<LinearElementAnimation> };

export const actionChangeLinearAnimation = register<ChangeLinearAnimationData>({
  name: "changeLinearAnimation",
  label: "labels.animate",
  trackEvent: false,
  predicate: (elements, appState) =>
    !appState.viewModeEnabled &&
    getSelectedElements(elements, appState).some(
      (element) => isLinearElement(element) && !element.locked,
    ),
  PanelComponent: ({ elements, appState, updateData }) => {
    const selected = getSelectedElements(elements, appState)
      .filter(isLinearElement)
      .filter((element) => !element.locked);
    if (!selected.length || appState.viewModeEnabled) {
      return null;
    }
    return (
      <fieldset data-testid="selected-animation-controls">
        <legend>{t("labels.animate")}</legend>
        <LinearElementAnimationControls
          elements={selected}
          idPrefix="selection-animation"
          onChange={updateData}
        />
      </fieldset>
    );
  },
  perform: (elements, appState, value) => {
    if (!value || appState.viewModeEnabled) {
      return false;
    }

    const selectedIds = new Set(
      getSelectedElements(elements, appState)
        .filter((element) => isLinearElement(element) && !element.locked)
        .map((element) => element.id),
    );

    return {
      elements: elements.map((element) => {
        if (!selectedIds.has(element.id) || !isLinearElement(element)) {
          return element;
        }
        if ("patch" in value && !element.animation && !value.patch.type) {
          return element;
        }
        const animation =
          "animation" in value
            ? value.animation
            : {
                type: "dots" as const,
                speed: 3,
                direction: "forward" as const,
                ...element.animation,
                ...value.patch,
              };
        return newElementWith(element, { animation });
      }),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
});
