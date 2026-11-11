import React from "react";

import { KEYS } from "@excalidraw/common";

import { Excalidraw } from "../index";
import { getTableData } from "../components/DataTable/data";
import { getMindMapNode } from "../components/MindMap/data";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { fireEvent, render, screen, waitFor } from "./test-utils";

describe("shortcuts", () => {
  it("Clear canvas shortcut should display confirm dialog", async () => {
    await render(
      <Excalidraw
        initialData={{ elements: [API.createElement({ type: "rectangle" })] }}
        handleKeyboardGlobally
      />,
    );

    expect(window.h.elements.length).toBe(1);

    Keyboard.withModifierKeys({ ctrl: true }, () => {
      Keyboard.keyDown(KEYS.DELETE);
    });
    const confirmDialog = document.querySelector(".confirm-dialog")!;
    expect(confirmDialog).not.toBe(null);

    fireEvent.click(confirmDialog.querySelector('[aria-label="Confirm"]')!);

    await waitFor(() => {
      expect(window.h.elements[0].isDeleted).toBe(true);
    });
  });
});

describe("knowledge tool shortcuts", () => {
  it.each(["u", "c", "j", "m", "U", "C", "J", "M"])(
    "inserts with %s",
    async (key) => {
      const onOpenDataChart = vi.fn();
      await render(
        <Excalidraw handleKeyboardGlobally onOpenDataChart={onOpenDataChart} />,
      );

      fireEvent.keyDown(document, { key });

      if (key.toLowerCase() === "u") {
        await waitFor(() =>
          expect(
            window.h.elements.some((element) => getTableData(element)),
          ).toBe(true),
        );
      } else if (key.toLowerCase() === "c") {
        expect(onOpenDataChart).toHaveBeenCalledOnce();
      } else if (key.toLowerCase() === "j") {
        expect(screen.getByLabelText("LaTeX source")).toHaveValue("E = mc^2");
      } else {
        expect(
          window.h.elements.filter((element) => getMindMapNode(element)),
        ).toHaveLength(5);
      }
    },
  );

  it.each(["u", "c", "j", "m", "U", "C", "J", "M"])(
    "does not insert with %s in view mode",
    async (key) => {
      const onOpenDataChart = vi.fn();
      await render(
        <Excalidraw
          handleKeyboardGlobally
          viewModeEnabled
          onOpenDataChart={onOpenDataChart}
        />,
      );

      fireEvent.keyDown(document, { key });

      expect(window.h.elements).toHaveLength(0);
      expect(window.h.state.openDialog).toBeNull();
      expect(onOpenDataChart).not.toHaveBeenCalled();
    },
  );

  it("keeps typing in the formula editor from triggering insert shortcuts", async () => {
    const onOpenDataChart = vi.fn();
    await render(
      <Excalidraw handleKeyboardGlobally onOpenDataChart={onOpenDataChart} />,
    );
    fireEvent.keyDown(document, { key: "j" });
    const input = screen.getByLabelText("LaTeX source");

    for (const key of ["u", "c", "j", "m", "U", "C", "J", "M"]) {
      fireEvent.keyDown(input, { key });
    }

    expect(window.h.elements).toHaveLength(0);
    expect(onOpenDataChart).not.toHaveBeenCalled();
    expect(screen.getByLabelText("LaTeX source")).toBe(input);
  });
});
