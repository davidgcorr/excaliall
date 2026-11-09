import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";

import type {
  LinearElementAnimation,
  ShapeElementAnimation,
} from "@excalidraw/element/types";

import {
  isAnimatedPathElement,
  isAnimatedShapeElement,
} from "../renderer/shapeAnimation";
import { ShapeAnimationControls } from "../components/ShapeAnimationControls";

import { getSelectedElements } from "../scene";

import { LinearElementAnimationControls } from "../components/LinearElementAnimationControls";
import { t } from "../i18n";

import { register } from "./register";

export type ChangeLinearAnimationData =
  | { animation: LinearElementAnimation | null }
  | { patch: Partial<LinearElementAnimation> }
  | { shapeAnimation: ShapeElementAnimation | null }
  | { shapePatch: Partial<ShapeElementAnimation> };

export const actionChangeLinearAnimation = register<ChangeLinearAnimationData>({
  name: "changeLinearAnimation",
  label: "labels.animate",
  trackEvent: false,
  predicate: (elements, appState) =>
    !appState.viewModeEnabled &&
    getSelectedElements(elements, appState).some(
      (element) =>
        (isAnimatedPathElement(element) || isAnimatedShapeElement(element)) &&
        !element.locked,
    ),
  PanelComponent: ({ elements, appState, updateData }) => {
    const selected = getSelectedElements(elements, appState).filter(
      (element) =>
        !element.locked &&
        (isAnimatedPathElement(element) || isAnimatedShapeElement(element)),
    );
    if (!selected.length || appState.viewModeEnabled) {
      return null;
    }
    return (
      <fieldset data-testid="selected-animation-controls">
        <legend>{t("labels.animate")}</legend>
        {!!selected.filter(isAnimatedPathElement).length && (
          <LinearElementAnimationControls
            elements={selected.filter(isAnimatedPathElement)}
            idPrefix="selection-animation"
            onChange={updateData}
          />
        )}
        {!!selected.filter(isAnimatedShapeElement).length && (
          <ShapeAnimationControls
            elements={selected.filter(isAnimatedShapeElement)}
            onChange={updateData}
          />
        )}
      </fieldset>
    );
  },
  perform: (elements, appState, value) => {
    if (!value || appState.viewModeEnabled) {
      return false;
    }

    const selectedIds = new Set(
      getSelectedElements(elements, appState)
        .filter(
          (element) =>
            (isAnimatedPathElement(element) ||
              isAnimatedShapeElement(element)) &&
            !element.locked,
        )
        .map((element) => element.id),
    );

    return {
      elements: elements.map((element) => {
        if (
          !selectedIds.has(element.id) ||
          !(isAnimatedPathElement(element) || isAnimatedShapeElement(element))
        ) {
          return element;
        }
        if (isAnimatedShapeElement(element)) {
          if (!("shapeAnimation" in value) && !("shapePatch" in value)) {
            return element;
          }
          if (
            "shapePatch" in value &&
            !element.shapeAnimation &&
            !value.shapePatch.type
          ) {
            return element;
          }
          const shapeAnimation =
            "shapeAnimation" in value
              ? value.shapeAnimation
              : {
                  type: "pulse" as const,
                  speed: 3,
                  ...element.shapeAnimation,
                  ...value.shapePatch,
                };
          return newElementWith(element, { shapeAnimation });
        }
        if (
          !isAnimatedPathElement(element) ||
          (!("animation" in value) && !("patch" in value))
        ) {
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
