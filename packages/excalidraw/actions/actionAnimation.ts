import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";
import { isLinearElement } from "@excalidraw/element";

import type { LinearElementAnimation } from "@excalidraw/element/types";

import { getSelectedElements } from "../scene";

import { register } from "./register";

export type ChangeLinearAnimationData = {
  animation: LinearElementAnimation | null;
};

export const actionChangeLinearAnimation = register<ChangeLinearAnimationData>(
  {
    name: "changeLinearAnimation",
    label: "labels.animate",
    trackEvent: false,
    predicate: (elements, appState) =>
      getSelectedElements(elements, appState).some(
        (element) => isLinearElement(element) && !element.locked,
      ),
    perform: (elements, appState, value) => {
      if (!value) {
        return false;
      }

      const selectedIds = new Set(
        getSelectedElements(elements, appState)
          .filter((element) => isLinearElement(element) && !element.locked)
          .map((element) => element.id),
      );

      return {
        elements: elements.map((element) =>
          selectedIds.has(element.id) && isLinearElement(element)
            ? newElementWith(element, { animation: value.animation })
            : element,
        ),
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      };
    },
  },
);
