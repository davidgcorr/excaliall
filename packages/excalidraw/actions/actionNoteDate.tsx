import {
  CaptureUpdateAction,
  isStickyNoteElement,
  newElementWith,
} from "@excalidraw/element";

import { register } from "./register";

export const actionChangeNoteDate = register<{
  elementId: string;
  noteDate: string;
}>({
  name: "changeNoteDate",
  label: "labels.noteDate",
  trackEvent: false,
  perform: (elements, _appState, value) => ({
    elements: elements.map((element) =>
      value &&
      element.id === value.elementId &&
      isStickyNoteElement(element) &&
      !element.locked
        ? newElementWith(element, { noteDate: value.noteDate || undefined })
        : element,
    ),
    appState: { openDialog: null },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  }),
});
