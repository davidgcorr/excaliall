import React from "react";

import { AppMainMenu } from "../../../excalidraw-app/components/AppMainMenu";
import { AppWelcomeScreen } from "../../../excalidraw-app/components/AppWelcomeScreen";

import {
  clearAppStateForLocalStorage,
  cleanAppStateForExport,
} from "../appState";
import { Excalidraw } from "../index";
import { actionClearCanvas } from "../actions/actionCanvas";

import { API } from "./helpers/api";
import { fireEvent, render, screen } from "./test-utils";

const { h } = window;
const setup = () =>
  render(
    <Excalidraw>
      <AppMainMenu
        onCollabDialogOpen={() => {}}
        isCollaborating={false}
        isCollabEnabled={false}
        theme="light"
        refresh={() => {}}
      />
      <AppWelcomeScreen onCollabDialogOpen={() => {}} isCollabEnabled={false} />
    </Excalidraw>,
  );
const openPreferences = () => {
  fireEvent.click(screen.getByTestId("main-menu-trigger"));
  fireEvent.click(screen.getByText("Preferences"));
};

describe("upstream promotion preference", () => {
  it("toggles from Preferences and removes paid menu entries while retaining fork links", async () => {
    await setup();
    openPreferences();
    fireEvent.click(screen.getByTestId("toggle-upstream-promotions"));
    expect(h.state.hidePromotions).toBe(true);
    fireEvent.click(screen.getByTestId("main-menu-trigger"));
    expect(screen.queryByText("Excalidraw+")).not.toBeInTheDocument();
    const github = screen.getByRole("menuitem", { name: "GitHub" });
    expect(github).toHaveAttribute(
      "href",
      "https://github.com/davidgcorr/excalidraw",
    );
    fireEvent.click(screen.getByText("Preferences"));
    expect(screen.getByTestId("toggle-upstream-promotions")).toHaveTextContent(
      "Show upstream promotions",
    );
    fireEvent.click(screen.getByTestId("toggle-upstream-promotions"));
    expect(h.state.hidePromotions).toBe(false);
  });
  it("stores the preference locally and excludes it from shared/exported scene settings", async () => {
    await setup();
    API.setAppState({ hidePromotions: true });
    expect(clearAppStateForLocalStorage(h.state).hidePromotions).toBe(true);
    expect(cleanAppStateForExport(h.state)).not.toHaveProperty(
      "hidePromotions",
    );
    API.executeAction(actionClearCanvas);
    expect(h.state.hidePromotions).toBe(true);
  });
});
