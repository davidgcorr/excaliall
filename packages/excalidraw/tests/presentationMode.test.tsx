import React from "react";

import { actionTogglePresentationMode } from "../actions/actionPresentation";
import {
  cleanAppStateForExport,
  clearAppStateForLocalStorage,
} from "../appState";
import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { fireEvent, render, GlobalTestState, act } from "./test-utils";

const { h } = window;

describe("presentation mode", () => {
  it("hides all controls except exit, selects the laser, and restores the previous tool", async () => {
    const { getByTestId, getAllByRole, queryByTestId } = await render(
      <Excalidraw renderTopRightUI={() => <button>Share</button>} />,
    );
    act(() => h.app.setActiveTool({ type: "rectangle" }));
    const previousTool = h.state.activeTool;
    fireEvent.click(getByTestId("presentation-mode-button"));
    expect(h.state.activeTool.type).toBe("laser");
    expect(h.state.viewModeEnabled).toBe(true);
    expect(getAllByRole("button")).toEqual([
      getByTestId("exit-presentation-button"),
    ]);
    expect(queryByTestId("main-menu-trigger")).toBeNull();
    expect(queryByTestId("save-to-disk-button")).toBeNull();
    expect(queryByTestId("export-formats-button")).toBeNull();
    fireEvent.click(getByTestId("exit-presentation-button"));
    expect(h.state.presentationMode).toBeNull();
    expect(h.state.viewModeEnabled).toBe(false);
    expect(h.state.activeTool).toEqual(previousTool);
    expect(getByTestId("main-menu-trigger")).toBeVisible();
  });

  it("keeps the laser active, prevents context menus and editing, and exits with Escape", async () => {
    const element = API.createElement({ type: "rectangle" });
    const { getByTestId, container } = await render(
      <Excalidraw
        handleKeyboardGlobally
        initialData={{ elements: [element] }}
      />,
    );
    fireEvent.click(getByTestId("presentation-mode-button"));
    const before = JSON.stringify(h.elements);
    fireEvent.keyDown(document, { key: "r" });
    fireEvent.keyDown(document, { key: "Delete" });
    fireEvent.keyDown(document, { key: "s", ctrlKey: true, shiftKey: true });
    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      clientX: 50,
      clientY: 50,
      button: 2,
    });
    fireEvent.pointerDown(GlobalTestState.interactiveCanvas, {
      clientX: 50,
      clientY: 50,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
    });
    fireEvent.pointerMove(GlobalTestState.interactiveCanvas, {
      clientX: 80,
      clientY: 80,
      pointerId: 1,
      pointerType: "mouse",
      buttons: 1,
    });
    fireEvent.pointerUp(GlobalTestState.interactiveCanvas, {
      clientX: 80,
      clientY: 80,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
    });
    expect(h.state.activeTool.type).toBe("laser");
    expect(JSON.stringify(h.elements)).toBe(before);
    expect(container.querySelector(".context-menu")).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(h.state.presentationMode).toBeNull();
    expect(getByTestId("presentation-mode-button")).toBeVisible();
  });

  it("does not persist a presentation session and preserves an existing view mode", async () => {
    await render(<Excalidraw viewModeEnabled />);
    API.executeAction(actionTogglePresentationMode);
    expect(h.state.activeTool.type).toBe("laser");
    expect(cleanAppStateForExport(h.state)).not.toHaveProperty(
      "presentationMode",
    );
    expect(clearAppStateForLocalStorage(h.state)).not.toHaveProperty(
      "presentationMode",
    );
    API.executeAction(actionTogglePresentationMode);
    expect(h.state.viewModeEnabled).toBe(true);
  });

  it("respects non-interactive editors", async () => {
    const { queryByTestId } = await render(<Excalidraw interaction={false} />);
    expect(queryByTestId("presentation-mode-button")).toBeNull();
    API.executeAction(actionTogglePresentationMode);
    expect(h.state.presentationMode).toBeUndefined();
  });
});
