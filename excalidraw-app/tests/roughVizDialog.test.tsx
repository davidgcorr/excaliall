import React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@excalidraw/excalidraw/tests/test-utils";

import { RoughVizDialog } from "../charts/RoughVizDialog";
import { renderChart } from "../charts/render";

vi.mock("../charts/render", () => ({ renderChart: vi.fn() }));

const svg = (title: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><text>${title}</text></svg>`;
const setup = async () => {
  vi.mocked(renderChart).mockReset();
  vi.mocked(renderChart).mockImplementation(async (chart) => svg(chart.title));
  return render(
    <Excalidraw>
      <RoughVizDialog elementId={null} onClose={() => {}} />
    </Excalidraw>,
  );
};

describe("live chart dialog", () => {
  it("previews on opening and updates title and roughness without a Preview button", async () => {
    await setup();
    expect(
      screen.getByRole("heading", { name: "Insert chart" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Preview" }),
    ).not.toBeInTheDocument();
    await screen.findByRole("img", { name: "Revenue by month" });
    expect(screen.getByTestId("roughviz-title")).not.toBeDisabled();
    const previous = screen.getByRole("img").getAttribute("src");
    fireEvent.change(screen.getByTestId("roughviz-title"), {
      target: { value: "Live title" },
    });
    fireEvent.click(screen.getByTestId("roughness-2"));
    await waitFor(() =>
      expect(renderChart).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: "Live title", roughness: 2 }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("img")).not.toHaveAttribute("src", previous),
    );
    expect(screen.getByTestId("roughness-2")).toBeChecked();
  });

  it("discards an older render that finishes after the latest preview", async () => {
    await setup();
    await screen.findByRole("img");
    let finishOld!: (value: string) => void;
    vi.mocked(renderChart).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    );
    fireEvent.change(screen.getByTestId("roughviz-title"), {
      target: { value: "Old title" },
    });
    await waitFor(() => expect(finishOld).toBeDefined());
    const oldSignal = vi.mocked(renderChart).mock.calls.at(-1)![3]!;
    fireEvent.change(screen.getByTestId("roughviz-title"), {
      target: { value: "Newest title" },
    });
    expect(oldSignal.aborted).toBe(true);
    await waitFor(() =>
      expect(renderChart).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: "Newest title" }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("img").getAttribute("src")).toContain(
        btoa(svg("Newest title")),
      ),
    );
    const latest = screen.getByRole("img").getAttribute("src");
    await act(async () => {
      finishOld(svg("Old title"));
    });
    expect(screen.getByRole("img")).toHaveAttribute("src", latest);
  });

  it("reports invalid data and automatically recovers when data becomes valid", async () => {
    await setup();
    await screen.findByRole("img");
    fireEvent.change(screen.getByTestId("roughviz-data"), {
      target: { value: "{" },
    });
    await screen.findByRole("alert");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId("roughviz-data"), {
      target: { value: "Label,Amount\nA,10\nB,20" },
    });
    await screen.findByRole("img");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(renderChart).toHaveBeenLastCalledWith(
      expect.objectContaining({
        labelColumn: "Label",
        valueColumns: ["Amount"],
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
