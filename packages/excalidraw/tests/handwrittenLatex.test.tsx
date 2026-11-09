import React from "react";

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

  it("shows handwriting options and updates the live preview", async () => {
    await render(<Excalidraw />);
    fireEvent.click(screen.getByTestId("toolbar-latex"));
    fireEvent.change(screen.getByLabelText("Formula style"), {
      target: { value: "handdrawn" },
    });
    fireEvent.change(screen.getByLabelText("Handwriting font"), {
      target: { value: "Caveat" },
    });
    await waitFor(() =>
      expect(
        screen
          .getByLabelText("Formula preview")
          .querySelector('[data-handwriting-font="Caveat"]'),
      ).not.toBeNull(),
    );
    fireEvent.change(screen.getByLabelText("Formula style"), {
      target: { value: "normal" },
    });
    expect(screen.queryByLabelText("Handwriting font")).toBeNull();
    await waitFor(() =>
      expect(
        screen
          .getByLabelText("Formula preview")
          .querySelector('[data-latex-style="normal"]'),
      ).not.toBeNull(),
    );
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
