import {
  CaptureUpdateAction,
  isStickyNoteElement,
  newElementWith,
} from "@excalidraw/element";

import { register } from "./register";

export const actionChangeNoteFooter = register<{
  elementId: string;
  footerText: string;
}>({
  name: "changeNoteFooter",
  label: "labels.noteFooter",
  trackEvent: false,
  perform: (elements, _appState, value) => ({
    elements: elements.map((element) =>
      value &&
      element.id === value.elementId &&
      isStickyNoteElement(element) &&
      !element.locked
        ? newElementWith(element, { footerText: value.footerText })
        : element,
    ),
    appState: { openDialog: null },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  }),
});
