import React from "react";

import { EXPORT_IMAGE_TYPES } from "@excalidraw/common";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { fireEvent, render, waitFor } from "./test-utils";

const { h } = window;

it("downloads GIFs using the selected frame rate and duration", async () => {
  const arrow = {
    ...API.createElement({ type: "arrow", width: 100, height: 100 }),
    animation: { type: "dots", speed: 1, direction: "forward" } as const,
  };
  const { getByTestId, getByLabelText, getByRole } = await render(
    <Excalidraw initialData={{ elements: [arrow] }} />,
  );
  const download = vi.spyOn(h.app, "onExportImage").mockResolvedValue();
  try {
    fireEvent.click(getByTestId("export-formats-button"));
    const rate = await waitFor(() => getByLabelText("GIF frame rate"));
    fireEvent.change(rate, { target: { value: "5" } });
    fireEvent.change(getByLabelText("GIF duration"), {
      target: { value: "1" },
    });
    fireEvent.click(getByRole("button", { name: "Export animated GIF" }));
    await waitFor(() =>
      expect(download).toHaveBeenCalledWith(
        EXPORT_IMAGE_TYPES.gif,
        expect.any(Array),
        expect.objectContaining({
          gif: expect.objectContaining({ duration: 1, fps: 5 }),
        }),
      ),
    );
  } finally {
    download.mockRestore();
  }
});
