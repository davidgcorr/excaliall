import React from "react";

import { Excalidraw } from "../index";

import {
  actionEditDataChart,
  actionInsertDataChart,
} from "../actions/actionDataChart";

import { API } from "./helpers/api";
import { Pointer } from "./helpers/ui";
import { fireEvent, render, screen, GlobalTestState } from "./test-utils";

const { h } = window;
const chart = () => ({
  ...API.createElement({
    type: "image",
    x: 30,
    y: 30,
    width: 160,
    height: 100,
  }),
  customData: {
    roughViz: { version: 1, type: "Bar", rows: [{ label: "A", value: 1 }] },
  },
});

describe("data chart controls", () => {
  it("shows host graph properties on selection without opening the data dialog", async () => {
    const open = vi.fn();
    const properties = vi.fn((id) => (
      <fieldset data-testid="host-chart-properties">{id}</fieldset>
    ));
    await render(
      <Excalidraw
        onOpenDataChart={open}
        renderDataChartProperties={properties}
      />,
    );
    const image = chart();
    API.setElements([image]);
    API.setSelectedElements([image]);
    expect(
      screen
        .getByTestId("host-chart-properties")
        .closest(".selected-shape-actions"),
    ).not.toBeNull();
    expect(properties).toHaveBeenCalledWith(image.id);
    expect(open).not.toHaveBeenCalled();
    API.setSelectedElements([]);
    expect(
      screen.queryByTestId("host-chart-properties"),
    ).not.toBeInTheDocument();
  });
  it("does not show graph properties for locked images or mixed selections", async () => {
    const properties = vi.fn(() => <div data-testid="host-chart-properties" />);
    await render(<Excalidraw renderDataChartProperties={properties} />);
    const image = { ...chart(), locked: true };
    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([image, rectangle]);
    API.setSelectedElements([image]);
    expect(
      screen.queryByTestId("host-chart-properties"),
    ).not.toBeInTheDocument();
    API.setElements([{ ...image, locked: false }, rectangle]);
    API.setSelectedElements([image, rectangle]);
    expect(
      screen.queryByTestId("host-chart-properties"),
    ).not.toBeInTheDocument();
  });
  it("offers an icon button that creates a new chart even when a chart is selected", async () => {
    const open = vi.fn();
    await render(<Excalidraw onOpenDataChart={open} />);
    const image = chart();
    API.setElements([image]);
    API.setSelectedElements([image]);
    fireEvent.click(screen.getByTestId("toolbar-data-chart"));
    expect(open).toHaveBeenCalledWith();
  });
  it("opens the hit chart on double click, preserving image cropping for other images", async () => {
    const open = vi.fn();
    await render(<Excalidraw onOpenDataChart={open} />);
    const image = chart();
    API.setElements([image]);
    const mouse = new Pointer("mouse");
    mouse.doubleClickOn(image);
    expect(open).toHaveBeenCalledWith(image.id);
    expect(h.state.croppingElementId).toBeNull();
  });
  it("keeps ordinary image double clicks in the crop editor", async () => {
    const open = vi.fn();
    await render(<Excalidraw onOpenDataChart={open} />);
    const image = API.createElement({
      type: "image",
      x: 30,
      y: 30,
      width: 160,
      height: 100,
    });
    API.setElements([image]);
    API.setSelectedElements([image]);
    new Pointer("mouse").doubleClickOn(image);
    expect(open).not.toHaveBeenCalled();
    expect(h.state.croppingElementId).toBe(image.id);
  });

  it("edits a selected chart from its context menu", async () => {
    const open = vi.fn();
    await render(<Excalidraw onOpenDataChart={open} />);
    const image = chart();
    API.setElements([image]);
    API.setSelectedElements([image]);
    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      clientX: 70,
      clientY: 70,
      button: 2,
    });
    fireEvent.click(screen.getByTestId("editDataChart"));
    expect(open).toHaveBeenCalledWith(image.id);
  });
  it("hides chart editing for locked elements and view mode", async () => {
    const open = vi.fn();
    await render(<Excalidraw onOpenDataChart={open} />);
    const image = { ...chart(), locked: true };
    API.setElements([image]);
    const state = {
      ...h.state,
      selectedElementIds: { [image.id]: true as const },
    };
    expect(actionEditDataChart.predicate!([image], state, h.app.props)).toBe(
      false,
    );
    expect(
      actionInsertDataChart.predicate!(
        [image],
        { ...state, viewModeEnabled: true },
        h.app.props,
      ),
    ).toBe(false);
    actionEditDataChart.perform(
      h.app.scene.getElementsIncludingDeleted(),
      state,
      undefined,
      h.app,
    );
    expect(open).not.toHaveBeenCalled();
  });
  it("can edit the only chart in a selected group", async () => {
    const open = vi.fn();
    await render(<Excalidraw onOpenDataChart={open} />);
    const image = chart();
    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([image, rectangle]);
    API.setSelectedElements([image, rectangle]);
    API.executeAction(actionEditDataChart);
    expect(open).toHaveBeenCalledWith(image.id);
  });
});
