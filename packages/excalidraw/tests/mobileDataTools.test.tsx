import React from "react";

import { Excalidraw } from "../index";
import { getTableData } from "../components/DataTable/data";

import {
  act,
  fireEvent,
  mockBoundingClientRect,
  render,
  restoreOriginalGetBoundingClientRect,
  screen,
  waitFor,
} from "./test-utils";

const { h } = window;
const renderMobile = async (ui: React.ReactElement) => {
  const result = await render(ui);
  act(() => {
    h.app.refreshEditorInterface();
    h.app.refresh();
  });
  return result;
};

afterEach(() => restoreOriginalGetBoundingClientRect());

describe("mobile data tools", () => {
  it.each([280, 375, 430])(
    "inserts tables and opens charts from the bottom toolbar at %ipx",
    async (width) => {
      mockBoundingClientRect({ width, height: 700 });
      const openChart = vi.fn();
      await renderMobile(<Excalidraw onOpenDataChart={openChart} />);
      const tableButton = screen.getByTestId("toolbar-data-table");
      const chartButton = screen.getByTestId("toolbar-data-chart");
      expect(tableButton.closest(".mobile-toolbar")).not.toBeNull();
      expect(chartButton.closest(".mobile-toolbar")).not.toBeNull();
      fireEvent.click(chartButton);
      expect(openChart).toHaveBeenCalledWith();
      fireEvent.click(tableButton);
      await waitFor(() =>
        expect(h.elements.some((element) => !!getTableData(element))).toBe(
          true,
        ),
      );
    },
  );

  it("keeps hand and eraser accessible in More tools on narrow phones", async () => {
    mockBoundingClientRect({ width: 280, height: 700 });
    await renderMobile(<Excalidraw onOpenDataChart={() => {}} />);
    fireEvent.click(screen.getByTitle("More tools"));
    fireEvent.click(screen.getByTestId("toolbar-hand"));
    expect(h.state.activeTool.type).toBe("hand");
    fireEvent.click(screen.getByTitle("More tools"));
    fireEvent.click(screen.getByTestId("toolbar-eraser"));
    expect(h.state.activeTool.type).toBe("eraser");
  });

  it("keeps table insertion available when the host has no chart integration", async () => {
    mockBoundingClientRect({ width: 375, height: 700 });
    await renderMobile(<Excalidraw />);
    expect(
      screen.getByTestId("toolbar-data-table").closest(".mobile-toolbar"),
    ).not.toBeNull();
    expect(screen.queryByTestId("toolbar-data-chart")).not.toBeInTheDocument();
  });

  it("hides insertion controls in view mode", async () => {
    mockBoundingClientRect({ width: 375, height: 700 });
    await renderMobile(
      <Excalidraw viewModeEnabled onOpenDataChart={() => {}} />,
    );
    expect(screen.queryByTestId("toolbar-data-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("toolbar-data-chart")).not.toBeInTheDocument();
  });
});
