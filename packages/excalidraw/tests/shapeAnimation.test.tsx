import React from "react";
import { within } from "@testing-library/react";

import { pointFrom } from "@excalidraw/math";

import { isLinearElement } from "@excalidraw/element";

import type { LocalPoint, Radians } from "@excalidraw/math";

import type {
  AnimatedPathElement,
  AnimatedShapeElement,
  ElementsMap,
} from "@excalidraw/element/types";

import { Excalidraw } from "../index";
import { restoreElements } from "../data/restore";
import { blobToArrayBuffer } from "../data/blob";
import { exportScene } from "../scene/export";
import { getAnimatedLinearPath } from "../renderer/animatedLinearPath";
import { createAnimatedSvgElement } from "../renderer/animatedSvgElement";
import {
  applyShapeAnimationToCanvas,
  getAnimationColoredShape,
  hasElementAnimation,
  isAnimatedShapeElement,
  shapeAnimationTypes,
  shapeAnimationValue,
} from "../renderer/shapeAnimation";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { render, screen, fireEvent } from "./test-utils";

const { h } = window;
const mapFor = (element: AnimatedPathElement) =>
  new Map([[element.id, element]]) as ElementsMap;
const selectedShape = () => h.elements.filter(isAnimatedShapeElement)[0];

describe("shape and pencil animations", () => {
  it.each(["rectangle", "ellipse", "diamond"] as const)(
    "configures %s animation from the side panel and saves it",
    async (type) => {
      await render(<Excalidraw handleKeyboardGlobally />);
      const element = API.createElement({ type, width: 100, height: 70 });
      API.setElements([element]);
      API.setSelectedElements([element]);
      fireEvent.change(screen.getByTestId("shape-animation-type"), {
        target: { value: "glow" },
      });
      fireEvent.change(screen.getByTestId("shape-animation-speed"), {
        target: { value: "5" },
      });
      fireEvent.change(screen.getByTestId("shape-animation-size"), {
        target: { value: "2" },
      });
      fireEvent.click(
        within(screen.getByTestId("shape-animation-color")).getByTestId(
          "color-top-pick-#e03131",
        ),
      );
      const animated = selectedShape();
      expect(animated.shapeAnimation).toEqual({
        type: "glow",
        speed: 5,
        size: 2,
        color: "#e03131",
      });
      expect(animated.x).toBe(element.x);
      expect(animated.width).toBe(element.width);
      expect(
        restoreElements([animated], null).filter(isAnimatedShapeElement)[0]
          .shapeAnimation,
      ).toEqual(animated.shapeAnimation);
      Keyboard.undo();
      expect(selectedShape().shapeAnimation?.color).toBeUndefined();
      Keyboard.redo();
      expect(selectedShape().shapeAnimation?.color).toBe("#e03131");
      fireEvent.change(screen.getByTestId("shape-animation-type"), {
        target: { value: "none" },
      });
      expect(selectedShape().shapeAnimation).toBeNull();
    },
  );

  it("keeps mixed shape/path selections and locked elements independent", async () => {
    await render(<Excalidraw />);
    const rectangle = API.createElement({ type: "rectangle" });
    const locked = API.createElement({ type: "diamond", locked: true });
    const arrow = API.createElement({ type: "arrow" });
    API.setElements([rectangle, locked, arrow]);
    API.setSelectedElements([rectangle, locked, arrow]);
    fireEvent.change(screen.getByTestId("shape-animation-type"), {
      target: { value: "bounce" },
    });
    fireEvent.change(screen.getByTestId("selection-animation-type"), {
      target: { value: "arrows" },
    });
    expect(
      h.elements.filter(isAnimatedShapeElement)[0].shapeAnimation?.type,
    ).toBe("bounce");
    expect(
      h.elements.filter(isAnimatedShapeElement)[1].shapeAnimation,
    ).toBeUndefined();
    expect(h.elements.filter(isLinearElement)[0].animation?.type).toBe(
      "arrows",
    );
  });

  it.each(["dots", "dashes", "pulse", "arrows"] as const)(
    "supports %s on pencil strokes with saved settings and HTML motion",
    async (type) => {
      await render(<Excalidraw />);
      const pencil = API.createElement({
        type: "freedraw",
        x: 50,
        y: 70,
        points: [
          pointFrom<LocalPoint>(0, 0),
          pointFrom<LocalPoint>(50, 40),
          pointFrom<LocalPoint>(100, 0),
          pointFrom<LocalPoint>(150, 70),
        ],
        width: 150,
        height: 70,
      });
      API.setElements([pencil]);
      API.setSelectedElements([pencil]);
      fireEvent.change(screen.getByTestId("selection-animation-type"), {
        target: { value: type },
      });
      fireEvent.change(screen.getByTestId("selection-animation-amount"), {
        target: { value: "4" },
      });
      const animated = h.elements[0];
      if (animated.type !== "freedraw") {
        throw new Error("Expected pencil stroke");
      }
      expect(animated.animation).toEqual({
        type,
        speed: 3,
        direction: "forward",
        amount: 4,
      });
      expect(
        (restoreElements([animated], null)[0] as AnimatedPathElement).animation,
      ).toEqual(animated.animation);
      const geometry = getAnimatedLinearPath(animated, mapFor(animated));
      expect(geometry.length).toBeGreaterThan(100);
      expect(
        geometry.commands.some((command) => command.type === "curve"),
      ).toBe(true);
      expect(
        geometry.commands.every((command) =>
          command.point.every(Number.isFinite),
        ),
      ).toBe(true);
      const svg = createAnimatedSvgElement(
        animated,
        mapFor(animated),
        document,
        0,
        0,
        false,
        1,
      )!;
      expect(svg.querySelector("animate, animateMotion")).not.toBeNull();
      const blob = await exportScene({
        type: "html",
        data: { elements: [{ ...animated, isDeleted: false }] },
      });
      expect(new TextDecoder().decode(await blobToArrayBuffer(blob))).toContain(
        "html-animation",
      );
    },
  );

  it.each(shapeAnimationTypes)(
    "exports %s for shapes with the same timing as canvas",
    async (type) => {
      const shape = {
        ...API.createElement({
          type: "rectangle",
          x: 100,
          y: 120,
          width: 200,
          height: 100,
          angle: 0.3 as Radians,
        }),
        type: "rectangle" as const,
        shapeAnimation: { type, speed: 2, color: "#e03131", size: 2 },
      };
      expect(hasElementAnimation(shape)).toBe(true);
      const blob = await exportScene({
        type: "html",
        data: { elements: [shape] },
      });
      const page = new DOMParser().parseFromString(
        new TextDecoder().decode(await blobToArrayBuffer(blob)),
        "text/html",
      );
      const motion = page.querySelector(
        ".html-shape-animation animate, .html-shape-animation animateTransform",
      )!;
      expect(motion).not.toBeNull();
      expect(motion.getAttribute("dur")).toBe("1000ms");
      expect(motion.getAttribute("repeatCount")).toBe("indefinite");
      expect(page.querySelector("script")).toBeNull();
      expect(page.querySelector('[stroke="#e03131"]')).not.toBeNull();
      const ctx = {
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        shadowColor: "",
        shadowBlur: 0,
      };
      const alpha = applyShapeAnimationToCanvas(
        ctx as unknown as CanvasRenderingContext2D,
        shape,
        250,
        10,
        -20,
        1,
      );
      const value = shapeAnimationValue(shape.shapeAnimation, 250);
      if (type === "fade") {
        expect(alpha).toBe(0.5);
      }
      if (type === "glow") {
        expect(ctx.shadowColor).toBe("#e03131");
        expect(ctx.shadowBlur).toBe(40);
      }
      if (type === "pulse") {
        expect(ctx.scale).toHaveBeenCalledWith(1.24, 1.24);
      }
      if (type === "bounce") {
        expect(ctx.translate).toHaveBeenCalledWith(0, value);
      }
      if (type === "spin") {
        expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2);
      }
      const colored = getAnimationColoredShape(shape);
      expect(getAnimationColoredShape(shape)).toBe(colored);
      expect(shape.strokeColor).not.toBe("#e03131");
    },
  );

  it("moves bound labels with the shape and leaves room for animation in HTML exports", async () => {
    const text = API.createElement({
      type: "text",
      containerId: "animated-box",
      x: 120,
      y: 140,
      text: "Animated label",
    });
    const shape = {
      ...API.createElement({
        type: "rectangle",
        id: "animated-box",
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      }),
      type: "rectangle" as const,
      boundElements: [{ type: "text" as const, id: text.id }],
      shapeAnimation: { type: "spin" as const, speed: 1 },
    };
    const blob = await exportScene({
      type: "html",
      data: { elements: [shape, text] },
    });
    const page = new DOMParser().parseFromString(
      new TextDecoder().decode(await blobToArrayBuffer(blob)),
      "text/html",
    );
    const animations = page.querySelectorAll(
      ".html-shape-animation animateTransform",
    );
    expect(animations).toHaveLength(2);
    expect(animations[0].getAttribute("values")).toBe(
      animations[1].getAttribute("values"),
    );
    expect(page.querySelector("text")?.textContent).toContain("Animated label");
    const [, , width, height] = page
      .querySelector("svg")!
      .getAttribute("viewBox")!
      .split(" ")
      .map(Number);
    expect(width).toBeGreaterThan(250);
    expect(height).toBeGreaterThan(220);
  });

  it("sanitizes shape animation settings and drops unsupported modes", () => {
    const element = {
      ...API.createElement({ type: "ellipse" }),
      shapeAnimation: {
        type: "glow",
        speed: 100,
        size: -1,
        color: "url(unsafe)",
      },
    } as AnimatedShapeElement;
    expect(
      restoreElements([element], null).filter(isAnimatedShapeElement)[0]
        .shapeAnimation,
    ).toEqual({ type: "glow", speed: 5, size: 0.5 });
    const bad = {
      ...element,
      shapeAnimation: { ...element.shapeAnimation!, type: "unknown" },
    } as unknown as AnimatedShapeElement;
    expect(
      restoreElements([bad], null).filter(isAnimatedShapeElement)[0]
        .shapeAnimation,
    ).toBeUndefined();
  });
});
