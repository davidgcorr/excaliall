import { getCurvePathOps } from "@excalidraw/utils/shape";
import {
  elementCenterPoint,
  generateElbowArrowShape,
  ELBOW_ARROW_CORNER_RADIUS,
  ShapeCache,
} from "@excalidraw/element";
import { pointFrom } from "@excalidraw/math";

import type { LocalPoint, Radians } from "@excalidraw/math";

import type {
  ElementsMap,
  AnimatedPathElement,
} from "@excalidraw/element/types";

import {
  getAnimatedLinearPath,
  pointOnAnimatedLinearPath,
  animatedLinearPathToSvg,
} from "../renderer/animatedLinearPath";
import { drawAnimatedLinearElement } from "../renderer/animatedLinearElement";
import { createAnimatedSvgElement } from "../renderer/animatedSvgElement";

import { API } from "./helpers/api";

const points = (...values: [number, number][]) =>
  values.map(([x, y]) => pointFrom<LocalPoint>(x, y));
const elbow = () => ({
  ...API.createElement({
    type: "arrow",
    x: 40,
    y: 30,
    width: 240,
    height: 100,
    points: points([0, 0], [120, 0], [120, 100], [240, 100]),
    elbowed: true,
    roughness: 0,
  }),
  animation: { type: "dots" as const, speed: 1, direction: "forward" as const },
});
const mapFor = (element: AnimatedPathElement) =>
  new Map([[element.id, element]]) as ElementsMap;

const context = () => ({
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  setLineDash: vi.fn(),
});

describe("animation shaft geometry", () => {
  it.each(["rectangle", "diamond", "ellipse"] as const)(
    "builds one continuous, closed %s outline and preserves rotation",
    (type) => {
      const element = {
        ...API.createElement({
          type,
          x: 20,
          y: 30,
          width: 200,
          height: 100,
          roundness: null,
        }),
        type,
      };
      const path = getAnimatedLinearPath(element, mapFor(element));
      expect(path.closed).toBe(true);
      expect(
        path.commands.filter((command) => command.type === "move"),
      ).toHaveLength(1);
      expect(path.commands.at(-1)!.point).toEqual(path.commands[0].point);
      expect(path.length).toBeGreaterThan(400);
      if (type === "rectangle") {
        expect(path.length).toBeCloseTo(600, 4);
        for (let i = 0; i < 40; i++) {
          const [x, y] = pointOnAnimatedLinearPath(
            path,
            (path.length * i) / 40,
          );
          expect(
            Math.min(
              Math.abs(x - 20),
              Math.abs(x - 220),
              Math.abs(y - 30),
              Math.abs(y - 130),
            ),
          ).toBeLessThan(1e-5);
        }
      }
      if (type === "ellipse") {
        for (let i = 0; i < 40; i++) {
          const [x, y] = pointOnAnimatedLinearPath(
            path,
            (path.length * i) / 40,
          );
          // Four cubic arcs have a maximum radial error below 0.03%.
          expect(
            Math.abs(((x - 120) / 100) ** 2 + ((y - 80) / 50) ** 2 - 1),
          ).toBeLessThan(0.0006);
        }
      }
      const rotated = { ...element, angle: (Math.PI / 2) as Radians };
      const rotatedPath = getAnimatedLinearPath(rotated, mapFor(rotated));
      expect(rotatedPath.length).toBeCloseTo(path.length, 6);
      path.commands.forEach((command, index) => {
        expect(rotatedPath.commands[index].point[0]).toBeCloseTo(
          120 - (command.point[1] - 80),
          6,
        );
        expect(rotatedPath.commands[index].point[1]).toBeCloseTo(
          80 + (command.point[0] - 120),
          6,
        );
      });
      expect(animatedLinearPathToSvg(path)).toMatch(/ Z$/);
    },
  );

  it.each(["rectangle", "diamond"] as const)(
    "follows %s rounded corners without resetting the path",
    (type) => {
      const element = {
        ...API.createElement({
          type,
          width: 200,
          height: 100,
          roundness: { type: 2 },
        }),
        type,
      };
      const path = getAnimatedLinearPath(element, mapFor(element));
      expect(
        path.commands.filter((command) => command.type === "move"),
      ).toHaveLength(1);
      expect(path.segments.some((segment) => segment.controls)).toBe(true);
      expect(path.commands.at(-1)!.point).toEqual(path.commands[0].point);
      const sharp = { ...element, roundness: null };
      expect(path.length).toBeLessThan(
        getAnimatedLinearPath(sharp, mapFor(sharp)).length,
      );
    },
  );

  it.each(["dots", "dashes", "arrows"] as const)(
    "draws %s around all four sides and loops its marker spacing",
    (type) => {
      const element = {
        ...API.createElement({
          type: "rectangle",
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          roundness: null,
        }),
        type: "rectangle" as const,
        animation: { type, speed: 1, amount: 4, direction: "forward" as const },
      };
      const path = getAnimatedLinearPath(element, mapFor(element));
      const ctx = context();
      drawAnimatedLinearElement({
        context: ctx as unknown as CanvasRenderingContext2D,
        element,
        elementsMap: mapFor(element),
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        animationTime: 100,
      });
      if (type === "dashes") {
        expect(ctx.closePath).toHaveBeenCalledTimes(2);
        expect(
          ctx.setLineDash.mock.calls[0][0].reduce(
            (a: number, b: number) => a + b,
            0,
          ),
        ).toBeCloseTo(path.length / 4);
      } else {
        expect(ctx.fill).toHaveBeenCalledTimes(4);
        if (type === "dots") {
          ctx.arc.mock.calls.forEach((args, index) => {
            expect(args.slice(0, 2)).toEqual(
              pointOnAnimatedLinearPath(path, 6 + (index * path.length) / 4),
            );
          });
        }
      }
      const svg = createAnimatedSvgElement(
        element,
        mapFor(element),
        document,
        0,
        0,
        false,
        1,
      )!;
      expect(
        svg.querySelector(type === "arrows" ? "animateMotion" : "animate"),
      ).not.toBeNull();
      expect(
        type === "arrows"
          ? svg.querySelector("animateMotion")!.getAttribute("path")
          : svg.querySelector("path")!.getAttribute("d"),
      ).toMatch(/ Z$/);
    },
  );

  it("follows the rounded elbow rather than its sharp logical corner", () => {
    const element = elbow();
    const path = getAnimatedLinearPath(element, mapFor(element));
    const corner = path.segments.find(
      (segment) =>
        segment.controls &&
        Math.abs(segment.end[0] - 160) < 1e-6 &&
        Math.abs(segment.end[1] - 46) < 1e-6,
    )!;
    expect(corner).toBeDefined();
    const point = pointOnAnimatedLinearPath(
      path,
      corner.offset + corner.length / 2,
    );
    expect(point[0]).toBeCloseTo(156, 2);
    expect(point[1]).toBeCloseTo(34, 2);
    expect(path.length).toBeLessThan(340);
    expect(animatedLinearPathToSvg(path)).toContain("C ");
  });

  it("uses the same cubic commands as the rendered smooth shaft", () => {
    const element = API.createElement({
      type: "arrow",
      x: 10,
      y: 20,
      points: points([0, 0], [90, 130], [240, 0]),
      width: 240,
      height: 130,
      roundness: { type: 2 },
      roughness: 0,
      strokeStyle: "dashed",
    });
    const path = getAnimatedLinearPath(element, mapFor(element));
    const ops = getCurvePathOps(
      ShapeCache.generateElementShape(element, null)[0],
    );
    const curves = path.commands.filter((command) => command.type === "curve");
    const expected = ops.filter((op) => op.op === "bcurveTo");
    expect(curves).toHaveLength(expected.length);
    curves.forEach((command, index) => {
      if (command.type !== "curve") {
        return;
      }
      expect([
        ...command.control1,
        ...command.control2,
        ...command.point,
      ]).toEqual(
        expected[index].data.map((v, i) => v + (i % 2 ? element.y : element.x)),
      );
    });
  });

  it("rotates the curved path around the same center as the arrow and preserves export offsets", () => {
    const element = elbow();
    const rotated = { ...element, angle: (Math.PI / 2) as Radians };
    const map = mapFor(rotated);
    const center = elementCenterPoint(rotated, map);
    const original = getAnimatedLinearPath(element, mapFor(element));
    const result = getAnimatedLinearPath(rotated, map);
    original.commands.forEach((command, index) => {
      const [x, y] = command.point;
      expect(result.commands[index].point[0]).toBeCloseTo(
        center[0] - (y - center[1]),
        8,
      );
      expect(result.commands[index].point[1]).toBeCloseTo(
        center[1] + (x - center[0]),
        8,
      );
    });
    const node = createAnimatedSvgElement(
      rotated,
      map,
      document,
      17,
      -8,
      false,
      1,
    )!;
    expect(node.querySelector("path")?.getAttribute("d")).toBe(
      animatedLinearPathToSvg(result, 17, -8),
    );
    expect(result.length).toBeCloseTo(original.length, 8);
  });

  it("retains straight segments and handles repeated or zero-length points", () => {
    const element = API.createElement({
      type: "line",
      x: 20,
      y: 30,
      points: points([0, 0], [0, 0], [100, 0], [100, 100]),
      width: 100,
      height: 100,
      roundness: null,
    });
    const path = getAnimatedLinearPath(element, mapFor(element));
    expect(path.length).toBe(200);
    expect(pointOnAnimatedLinearPath(path, 125)).toEqual([120, 55]);
    const zero = { ...element, points: points([0, 0], [0, 0]) };
    expect(getAnimatedLinearPath(zero, mapFor(zero)).length).toBe(0);
  });

  it("matches the renderer's short-jog simplification for elbows", () => {
    const element = {
      ...elbow(),
      points: points([0, 0], [100, 0], [100, 0.5], [240, 0.5]),
    };
    const d = generateElbowArrowShape(
      element.points,
      ELBOW_ARROW_CORNER_RADIUS,
    );
    expect(d).not.toContain("Q");
    const path = getAnimatedLinearPath(element, mapFor(element));
    expect(
      path.commands.every((command) => command.point.every(Number.isFinite)),
    ).toBe(true);
    expect(path.length).toBeCloseTo(Math.hypot(240, 0.5), 2);
  });

  it.each(["pulse", "dashes"] as const)(
    "draws %s with the arrow's cubic corner commands",
    (type) => {
      const element = {
        ...elbow(),
        animation: { type, speed: 1, direction: "forward" as const },
      };
      const ctx = context();
      drawAnimatedLinearElement({
        context: ctx as unknown as CanvasRenderingContext2D,
        element,
        elementsMap: mapFor(element),
        scrollX: 7,
        scrollY: -3,
        zoom: 1,
        animationTime: 100,
      });
      expect(ctx.bezierCurveTo).toHaveBeenCalled();
      const command = getAnimatedLinearPath(
        element,
        mapFor(element),
      ).commands.find((command) => command.type === "curve")!;
      if (command.type === "curve") {
        expect(ctx.bezierCurveTo).toHaveBeenCalledWith(
          command.control1[0] + 7,
          command.control1[1] - 3,
          command.control2[0] + 7,
          command.control2[1] - 3,
          command.point[0] + 7,
          command.point[1] - 3,
        );
      }
    },
  );

  it("places moving dots on the curved corner in both directions", () => {
    const element = elbow();
    const path = getAnimatedLinearPath(element, mapFor(element));
    for (const direction of ["forward", "reverse"] as const) {
      const arrow = {
        ...element,
        animation: { type: "dots" as const, speed: 1, direction },
      };
      const ctx = context();
      drawAnimatedLinearElement({
        context: ctx as unknown as CanvasRenderingContext2D,
        element: arrow,
        elementsMap: mapFor(arrow),
        scrollX: 5,
        scrollY: 9,
        zoom: 1,
        animationTime: 100,
      });
      expect(ctx.arc).toHaveBeenCalled();
      ctx.arc.mock.calls.forEach((args, index) => {
        const distance = 6 + index * 36;
        const expected = pointOnAnimatedLinearPath(
          path,
          direction === "reverse" ? path.length - distance : distance,
        );
        expect(args[0]).toBeCloseTo(expected[0] + 5, 8);
        expect(args[1]).toBeCloseTo(expected[1] + 9, 8);
      });
    }
  });
  it.each(["dots", "arrows", "dashes", "pulse"] as const)(
    "applies custom marker settings to %s in canvas and SVG",
    (type) => {
      const element = {
        ...elbow(),
        animation: {
          type,
          speed: 2,
          direction: "reverse" as const,
          amount: 4,
          size: 2,
          color: "#e03131",
        },
      };
      const ctx = context();
      drawAnimatedLinearElement({
        context: ctx as unknown as CanvasRenderingContext2D,
        element,
        elementsMap: mapFor(element),
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        animationTime: 100,
      });
      const svg = createAnimatedSvgElement(
        element,
        mapFor(element),
        document,
        10,
        20,
        false,
        1,
      )!;
      if (type === "dots" || type === "arrows") {
        expect(ctx.fill).toHaveBeenCalledTimes(4);
        expect((ctx as unknown as CanvasRenderingContext2D).fillStyle).toBe(
          "#e03131",
        );
      } else {
        expect((ctx as unknown as CanvasRenderingContext2D).strokeStyle).toBe(
          "#e03131",
        );
        const [dash, gap] = ctx.setLineDash.mock.calls[0][0];
        expect(dash + gap).toBeCloseTo(
          getAnimatedLinearPath(element, mapFor(element)).length / 4,
        );
      }
      if (type === "arrows") {
        expect(svg.querySelectorAll("animateMotion")).toHaveLength(4);
        const motion = svg.querySelector("animateMotion")!;
        expect(motion.getAttribute("rotate")).toBe("auto-reverse");
        expect(motion.getAttribute("keyPoints")).toBe("1;0");
        expect(svg.querySelector("path")!.getAttribute("fill")).toBe("#e03131");
        expect(svg.querySelector("path")!.getAttribute("d")).toBe(
          "M 12 0 L -6 6 L -6 -6 Z",
        );
      } else {
        expect(svg.querySelectorAll("path")[1].getAttribute("stroke")).toBe(
          "#e03131",
        );
      }
      if (type === "dots") {
        expect(ctx.arc.mock.calls[0][2]).toBe(6);
        expect(
          svg.querySelectorAll("path")[1].getAttribute("stroke-width"),
        ).toBe("12");
      }
    },
  );
});
