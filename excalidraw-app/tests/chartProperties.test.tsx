import React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { API } from "@excalidraw/excalidraw/tests/helpers/api";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  togglePopover,
} from "@excalidraw/excalidraw/tests/test-utils";

import { ChartProperties } from "../charts/ChartProperties";
import { parseChartData, SAMPLE_DATA } from "../charts/data";
import { renderChart } from "../charts/render";

vi.mock("../charts/render", () => ({
  renderChart: vi.fn(
    async (chart) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><text>${chart.title}</text></svg>`,
  ),
}));
const { h } = window;
const setup = async () => {
  await render(
    <Excalidraw
      renderDataChartProperties={(id) => (
        <ChartProperties key={id} elementId={id} />
      )}
    />,
  );
  const image = {
    ...API.createElement({
      type: "image",
      x: 40,
      y: 50,
      width: 640,
      height: 420,
    }),
    customData: {
      roughViz: {
        version: 1,
        type: "Bar",
        title: "Revenue",
        rows: parseChartData(SAMPLE_DATA),
        labelColumn: "Month",
        valueColumns: ["Revenue"],
        color: "#1971c2",
        roughness: 1,
        sourceUrl: "",
      },
    },
  };
  API.setElements([image]);
  API.setSelectedElements([image]);
  return image;
};
describe("graph property editing", () => {
  it("updates axis titles and styles without opening an import dialog or changing geometry", async () => {
    const image = await setup();
    expect(screen.getByTestId("chart-x-axis-title")).toHaveValue("Month");
    fireEvent.change(screen.getByTestId("chart-title"), {
      target: { value: "Quarterly revenue" },
    });
    fireEvent.change(screen.getByTestId("chart-x-axis-title"), {
      target: { value: "Period" },
    });
    fireEvent.change(screen.getByTestId("chart-y-axis-title"), {
      target: { value: "Revenue (€)" },
    });
    fireEvent.click(screen.getByTestId("strokeWidth-bold"));
    fireEvent.click(screen.getByTestId("fill-solid"));
    fireEvent.click(screen.getByTestId("strokeStyle-dashed"));
    const pickers = screen
      .getByTestId("chart-properties")
      .querySelectorAll(".color-picker-container");
    const strokePick = pickers[0].querySelectorAll<HTMLButtonElement>(
      "[data-top-pick-index]",
    )[1];
    const fillPick = pickers[1].querySelectorAll<HTMLButtonElement>(
      "[data-top-pick-index]",
    )[2];
    fireEvent.click(strokePick);
    fireEvent.click(fillPick);
    await waitFor(() =>
      expect(h.elements[0].customData?.roughViz).toMatchObject({
        title: "Quarterly revenue",
        xAxisTitle: "Period",
        yAxisTitle: "Revenue (€)",
        strokeWidth: 4,
        fillStyle: "solid",
        strokeStyle: "dashed",
        strokeColor: strokePick.title,
        color: fillPick.title,
      }),
    );
    expect(h.elements[0]).toMatchObject({
      id: image.id,
      x: 40,
      y: 50,
      width: 640,
      height: 420,
    });
    expect(screen.getByTestId("chart-title")).toHaveValue("Quarterly revenue");
  });
  it("opens the native full palette and preserves the latest chart fields", async () => {
    await setup();
    fireEvent.change(screen.getByTestId("chart-title"), {
      target: { value: "Custom palette chart" },
    });
    const styles = screen.getByTestId("data-element-style-controls");
    togglePopover("Stroke");
    const input = styles.ownerDocument.querySelector<HTMLInputElement>(
      ".color-picker-input",
    )!;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: "aabbcc" } });
    await waitFor(() =>
      expect(h.elements[0].customData?.roughViz).toMatchObject({
        title: "Custom palette chart",
        strokeColor: "#aabbcc",
      }),
    );
  });
  it("commits a valid last edit on deselection and keeps the new selection", async () => {
    const image = await setup();
    fireEvent.change(screen.getByTestId("chart-title"), {
      target: { value: "Saved on deselection" },
    });
    const rectangle = API.createElement({ type: "rectangle", x: 800, y: 40 });
    API.setElements([...h.elements, rectangle]);
    API.setSelectedElements([rectangle]);
    await waitFor(() =>
      expect(
        h.elements.find((item) => item.id === image.id)?.customData?.roughViz
          .title,
      ).toBe("Saved on deselection"),
    );
    expect(h.state.selectedElementIds).toEqual({ [rectangle.id]: true });
  });
  it("discards a delayed render when external data changes", async () => {
    const image = await setup();
    let finishRender!: (svg: string) => void;
    vi.mocked(renderChart).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRender = resolve;
        }),
    );
    fireEvent.change(screen.getByTestId("chart-title"), {
      target: { value: "Pending render" },
    });
    await waitFor(() => expect(finishRender).toBeDefined());
    API.setElements([
      {
        ...image,
        customData: {
          roughViz: { ...image.customData.roughViz, title: "Restored chart" },
        },
      },
    ]);
    await waitFor(() =>
      expect(screen.getByTestId("chart-title")).toHaveValue("Restored chart"),
    );
    await act(async () => {
      finishRender(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"/>',
      );
    });
    expect(h.elements[0].customData?.roughViz.title).toBe("Restored chart");
  });
  it("keeps the last valid chart when the selected value column is non-numeric", async () => {
    await setup();
    vi.mocked(renderChart).mockClear();
    fireEvent.change(screen.getByTestId("chart-value-columns"), {
      target: { value: "Month" },
    });
    await screen.findByRole("alert");
    expect(h.elements[0].customData?.roughViz.valueColumns).toEqual([
      "Revenue",
    ]);
    expect(renderChart).not.toHaveBeenCalled();
  });
});
