import { updateActiveTool } from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/element";

import { presentationIcon } from "../components/icons";

import { register } from "./register";

export const actionTogglePresentationMode = register({
  name: "presentationMode",
  label: "buttons.present",
  icon: presentationIcon,
  viewMode: true,
  trackEvent: false,
  predicate: (_elements, appState, props, app) =>
    !!appState.presentationMode ||
    (app.isInteractionEnabled() &&
      app.isToolSupported("laser") &&
      (!props.activeTool || props.activeTool.type === "laser")),
  perform: (_elements, appState, _value, app) => {
    app.focusContainer();
    if (appState.presentationMode) {
      return {
        appState: {
          ...appState,
          activeTool: appState.presentationMode.previousTool,
          viewModeEnabled: appState.presentationMode.previousViewMode,
          presentationMode: null,
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      };
    }
    if (
      !app.isToolSupported("laser") ||
      (app.props.activeTool && app.props.activeTool.type !== "laser")
    ) {
      return false;
    }
    return {
      appState: {
        ...appState,
        presentationMode: {
          previousTool: appState.activeTool,
          previousViewMode: appState.viewModeEnabled,
        },
        activeTool: updateActiveTool(appState, {
          type: "laser",
          locked: false,
          lastActiveTool: null,
        }),
        viewModeEnabled: true,
        selectedElementIds: {},
        selectedGroupIds: {},
        openMenu: null,
        openSidebar: null,
        openDialog: null,
        openPopup: null,
        contextMenu: null,
        showHyperlinkPopup: false,
        activeEmbeddable: null,
        toast: null,
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
});
