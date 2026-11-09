import React from "react";
import { within } from "@testing-library/react";

import { FONT_FAMILY, FONT_METADATA } from "@excalidraw/common";

import { Excalidraw } from "../index";
import { Fonts } from "../fonts";
import { restoreElements } from "../data/restore";
import {
  getLatexData,
  renderLatex,
  sampleLatex,
  saveLatex,
  validateLatex,
} from "../components/Latex/data";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { act, render, screen, fireEvent, waitFor } from "./test-utils";

const { h } = window;

describe("handwritten LaTeX", () => {
  it.each(["Patrick Hand", "Caveat"] as const)(
    "uses %s outlines while preserving mathematical layout",
    async (handFont) => {
      const source = String.raw`\frac{x^2+12}{y} = \sqrt{\alpha} + \mathbb{R}`;
      const base = await renderLatex({ ...sampleLatex(), source }, document);
      const hand = await renderLatex(
        { ...sampleLatex(), source, style: "handdrawn", handFont },
        document,
      );
      expect(
        hand.svg.querySelectorAll("[data-handwriting-glyph]").length,
      ).toBeGreaterThan(3);
      expect(hand.svg.querySelector("[data-handwriting-rule]")).not.toBeNull();
      expect(hand.svg.querySelector('[data-c="1D6FC"]')).not.toBeNull();
      expect(
        hand.svg.querySelector("image, text, foreignObject, script, filter"),
      ).toBeNull();
      expect(hand.width - base.width).toBe(4);
      expect(hand.height - base.height).toBe(4);
      expect(hand.svg.getAttribute("color")).toBe(
        base.svg.getAttribute("color"),
      );
      expect(base.svg.querySelector("[data-handwriting-glyph]")).toBeNull();
      expect(hand.svg.querySelector('[data-c="211D"]')?.getAttribute("d")).toBe(
        base.svg.querySelector('[data-c="211D"]')?.getAttribute("d"),
      );
    },
  );

  it("renders deterministically and switches cleanly back to normal", async () => {
    const data = {
      ...sampleLatex(),
      source: String.raw`E = mc^2 + \int_0^1 x\,dx`,
      style: "handdrawn" as const,
      variation: 1.5,
    };
    const first = await renderLatex(data, document);
    const second = await renderLatex(data, document);
    expect(first.svg.outerHTML).toBe(second.svg.outerHTML);
    const normal = await renderLatex({ ...data, style: "normal" }, document);
    expect(normal.svg.querySelector("[data-handwriting-glyph]")).toBeNull();
    const caveat = await renderLatex({ ...data, handFont: "Caveat" }, document);
    expect(
      caveat.svg.querySelector("[data-handwriting-glyph]")?.getAttribute("d"),
    ).not.toBe(
      first.svg.querySelector("[data-handwriting-glyph]")?.getAttribute("d"),
    );
  });

  it("saves the selected style, font, and variation for editing and export", async () => {
    await render(<Excalidraw />);
    await act(async () => {
      await saveLatex(h.app, {
        ...sampleLatex(),
        style: "handdrawn",
        handFont: "Caveat",
        variation: 0.75,
      });
    });
    const data = getLatexData(h.elements[0])!;
    expect(data).toMatchObject({
      style: "handdrawn",
      handFont: "Caveat",
      variation: 0.75,
    });
    expect(getLatexData(restoreElements(h.elements, null)[0])).toEqual(data);
  });

  it("edits appearance in the side panel and keeps the formula dialog source-only", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    await act(async () => {
      await saveLatex(h.app, sampleLatex());
    });
    const id = h.elements[0].id;
    const panel = within(screen.getByTestId("latex-properties"));
    expect(panel.queryByLabelText("LaTeX source")).toBeNull();
    fireEvent.change(panel.getByLabelText("Formula style"), {
      target: { value: "handdrawn" },
    });
    fireEvent.change(panel.getByLabelText("Handwriting font"), {
      target: { value: "Caveat" },
    });
    fireEvent.change(panel.getByLabelText("Handwritten variation"), {
      target: { value: "1.5" },
    });
    fireEvent.change(panel.getByLabelText("Font size"), {
      target: { value: "48" },
    });
    fireEvent.click(panel.getByTestId("color-top-pick-#e03131"));
    await waitFor(() =>
      expect(getLatexData(h.elements[0])).toMatchObject({
        style: "handdrawn",
        handFont: "Caveat",
        variation: 1.5,
        fontSize: 48,
        color: "#e03131",
      }),
    );
    expect(h.elements[0].id).toBe(id);
    Keyboard.undo();
    await waitFor(() =>
      expect(getLatexData(h.elements[0])?.style).toBeUndefined(),
    );
    Keyboard.redo();
    await waitFor(() =>
      expect(panel.getByLabelText("Formula style")).toHaveValue("handdrawn"),
    );
    fireEvent.click(panel.getByRole("button", { name: "Edit formula" }));
    await waitFor(() =>
      expect(screen.getByLabelText("LaTeX source")).toHaveValue("E = mc^2"),
    );
    const dialog = screen
      .getByLabelText("LaTeX source")
      .closest(".latex-editor")!;
    expect(
      dialog.querySelector(
        "select, input[type=number], .color-picker-container",
      ),
    ).toBeNull();
    await waitFor(() =>
      expect(
        within(dialog as HTMLElement)
          .getByLabelText("Formula preview")
          .querySelector('[data-handwriting-font="Caveat"]'),
      ).not.toBeNull(),
    );
    fireEvent.change(screen.getByLabelText("LaTeX source"), {
      target: { value: String.raw`\frac{1}{2}` },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(getLatexData(h.elements[0])).toMatchObject({
        source: String.raw`\frac{1}{2}`,
        style: "handdrawn",
        color: "#e03131",
        fontSize: 48,
      }),
    );
  });

  it("flushes the last appearance changes on deselection without reselecting the formula", async () => {
    await render(<Excalidraw />);
    await act(async () => {
      await saveLatex(h.app, sampleLatex());
    });
    const id = h.elements[0].id;
    fireEvent.change(screen.getByLabelText("Font size"), {
      target: { value: "64" },
    });
    API.setSelectedElements([]);
    await waitFor(() =>
      expect(
        getLatexData(h.elements.find((element) => element.id === id))?.fontSize,
      ).toBe(64),
    );
    expect(h.state.selectedElementIds[id]).not.toBe(true);
    expect(screen.queryByTestId("latex-properties")).toBeNull();
  });

  it("keeps legacy formulas normal and rejects malformed style settings", () => {
    expect(validateLatex(sampleLatex()).style).toBeUndefined();
    expect(() =>
      validateLatex({ ...sampleLatex(), style: "invalid" }),
    ).toThrow();
    expect(() =>
      validateLatex({ ...sampleLatex(), variation: Infinity }),
    ).toThrow();
  });
});

describe("bundled handwriting text fonts", () => {
  beforeEach(() =>
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    ),
  );
  afterEach(() => vi.unstubAllGlobals());
  it.each(["Caveat", "Patrick Hand"] as const)(
    "makes %s available and preserves it in saved text",
    async (family) => {
      const id = FONT_FAMILY[family];
      expect(Fonts.registered.get(id)?.metadata.private).toBeUndefined();
      expect(Fonts.registered.get(id)?.fontFaces).toHaveLength(1);
      expect(FONT_METADATA[id].metrics.lineHeight).toBeGreaterThan(1);
      const text = API.createElement({
        type: "text",
        text: "Hola, mañana!",
        fontFamily: id,
      });
      const restored = restoreElements([text], null)[0];
      expect(restored.type === "text" && restored.fontFamily).toBe(id);
      await render(<Excalidraw handleKeyboardGlobally />);
      fireEvent.click(screen.getByTestId("toolbar-text"));
      fireEvent.click(screen.getByTestId("font-family-show-fonts"));
      expect(screen.getByText(family)).toBeInTheDocument();
    },
  );
});
