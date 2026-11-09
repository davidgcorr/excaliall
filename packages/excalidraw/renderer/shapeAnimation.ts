import { SVG_NS } from "@excalidraw/common";

import type {
  AnimatedPathElement,
  AnimatedShapeElement,
  ExcalidrawElement,
  ShapeElementAnimation,
} from "@excalidraw/element/types";

export const isAnimatedPathElement = <T extends ExcalidrawElement>(
  element: T,
): element is T & AnimatedPathElement =>
  element.type === "line" ||
  element.type === "arrow" ||
  element.type === "freedraw";
export const isAnimatedShapeElement = <T extends ExcalidrawElement>(
  element: T,
): element is T & AnimatedShapeElement =>
  element.type === "rectangle" ||
  element.type === "ellipse" ||
  element.type === "diamond";
export const hasElementAnimation = (element: ExcalidrawElement) =>
  isAnimatedPathElement(element)
    ? !!element.animation
    : isAnimatedShapeElement(element) && !!element.shapeAnimation;

export const shapeAnimationTypes = [
  "pulse",
  "glow",
  "fade",
  "bounce",
  "shake",
  "spin",
] as const;

// Both Canvas and SVG use these keyframes, keeping GIF/HTML playback consistent.
export const shapeAnimationFrames = (animation: ShapeElementAnimation) => {
  const strength = animation.size ?? 1;
  switch (animation.type) {
    case "pulse":
      return [1, 1 + 0.12 * strength, 1, 1 - 0.12 * strength, 1];
    case "glow":
      return [4, 20, 4, 0, 4].map((value) => value * strength);
    case "fade":
      return [1, 0.5, 0, 0.5, 1];
    case "bounce":
      return [0, -12 * strength, 0, 0, 0];
    case "shake":
      return [0, -6 * strength, 6 * strength, -6 * strength, 0];
    case "spin":
      return [0, 90, 180, 270, 360];
  }
};
export const shapeAnimationValue = (
  animation: ShapeElementAnimation,
  time: number,
) => {
  const frames = shapeAnimationFrames(animation);
  const phase = ((((time * animation.speed) / 2000) % 1) + 1) % 1;
  const index = Math.floor(phase * 4);
  return (
    frames[index] + (frames[index + 1] - frames[index]) * (phase * 4 - index)
  );
};

const coloredShapes = new WeakMap<
  AnimatedShapeElement,
  { version: number; element: AnimatedShapeElement }
>();
/** Cache the recolored bitmap; movement/fading never changes document geometry. */
export const getAnimationColoredShape = <T extends AnimatedShapeElement>(
  element: T,
): T => {
  const color = element.shapeAnimation?.color;
  if (!color || color === element.strokeColor) {
    return element;
  }
  const cached = coloredShapes.get(element);
  if (cached?.version === element.version) {
    return cached.element as T;
  }
  const colored = { ...element, strokeColor: color };
  coloredShapes.set(element, { version: element.version, element: colored });
  return colored;
};

/** Apply around the displayed center, after frame clipping and before drawing. */
export const applyShapeAnimationToCanvas = (
  context: CanvasRenderingContext2D,
  element: AnimatedShapeElement,
  time: number,
  scrollX: number,
  scrollY: number,
  zoom: number,
) => {
  const animation = element.shapeAnimation;
  if (!animation) {
    return 1;
  }
  const value = shapeAnimationValue(animation, time);
  if (animation.type === "fade") {
    return value;
  }
  if (animation.type === "glow") {
    context.shadowColor = animation.color ?? element.strokeColor;
    context.shadowBlur = value * zoom;
    return 1;
  }
  const cx = element.x + element.width / 2 + scrollX;
  const cy = element.y + element.height / 2 + scrollY;
  context.translate(cx, cy);
  if (animation.type === "pulse") {
    context.scale(value, value);
  }
  if (animation.type === "bounce") {
    context.translate(0, value);
  }
  if (animation.type === "shake") {
    context.translate(value, 0);
  }
  if (animation.type === "spin") {
    context.rotate((value * Math.PI) / 180);
  }
  context.translate(-cx, -cy);
  return 1;
};

/** Wrappers preserve the original rotation and include the bound label. */
export const createShapeAnimationSvg = (
  element: AnimatedShapeElement,
  ownerDocument: Document,
  cx: number,
  cy: number,
  idSuffix = "shape",
): { root: SVGGElement; content: SVGGElement } => {
  const group = ownerDocument.createElementNS(SVG_NS, "g");
  const animation = element.shapeAnimation!;
  group.setAttribute("class", "html-shape-animation");
  const frames = shapeAnimationFrames(animation);
  const motion = ownerDocument.createElementNS(
    SVG_NS,
    animation.type === "fade" || animation.type === "glow"
      ? "animate"
      : "animateTransform",
  );
  motion.setAttribute("dur", `${2000 / animation.speed}ms`);
  motion.setAttribute("repeatCount", "indefinite");
  motion.setAttribute("calcMode", "linear");
  motion.setAttribute("keyTimes", "0;0.25;0.5;0.75;1");
  if (animation.type === "glow") {
    const filter = ownerDocument.createElementNS(SVG_NS, "filter");
    filter.id = `animation-glow-${element.id}-${idSuffix}`;
    filter.setAttribute("x", "-200%");
    filter.setAttribute("y", "-200%");
    filter.setAttribute("width", "500%");
    filter.setAttribute("height", "500%");
    const shadow = ownerDocument.createElementNS(SVG_NS, "feDropShadow");
    shadow.setAttribute("dx", "0");
    shadow.setAttribute("dy", "0");
    shadow.setAttribute("flood-color", animation.color ?? element.strokeColor);
    motion.setAttribute("attributeName", "stdDeviation");
    motion.setAttribute("values", frames.map((v) => v / 2).join(";"));
    shadow.appendChild(motion);
    filter.appendChild(shadow);
    const defs = ownerDocument.createElementNS(SVG_NS, "defs");
    defs.appendChild(filter);
    group.appendChild(defs);
    group.setAttribute("filter", `url(#${filter.id})`);
  } else {
    motion.setAttribute(
      "attributeName",
      animation.type === "fade" ? "opacity" : "transform",
    );
    motion.setAttribute(
      "values",
      frames
        .map((value) =>
          animation.type === "spin"
            ? `${value} ${cx} ${cy}`
            : animation.type === "bounce"
            ? `0 ${value}`
            : animation.type === "shake"
            ? `${value} 0`
            : String(value),
        )
        .join(";"),
    );
    if (animation.type !== "fade") {
      motion.setAttribute(
        "type",
        animation.type === "pulse"
          ? "scale"
          : animation.type === "spin"
          ? "rotate"
          : "translate",
      );
    }
    if (animation.type === "pulse") {
      group.setAttribute("transform", `translate(${cx} ${cy})`);
      const scale = ownerDocument.createElementNS(SVG_NS, "g");
      scale.appendChild(motion);
      const content = ownerDocument.createElementNS(SVG_NS, "g");
      content.setAttribute("transform", `translate(${-cx} ${-cy})`);
      scale.appendChild(content);
      group.appendChild(scale);
      return { root: group, content };
    }
    group.appendChild(motion);
  }
  return { root: group, content: group };
};

/** Extra room for a complete animation cycle in uncropped exports. */
export const getShapeAnimationPadding = (element: AnimatedShapeElement) => {
  const animation = element.shapeAnimation;
  if (!animation) {
    return 0;
  }
  const strength = Math.max(0.5, Math.min(4, animation.size ?? 1));
  const radius = Math.hypot(element.width, element.height) / 2;
  switch (animation.type) {
    case "pulse":
      return radius * 0.12 * strength + element.strokeWidth;
    case "glow":
      return 40 * strength + element.strokeWidth;
    case "bounce":
      return 12 * strength;
    case "shake":
      return 6 * strength;
    case "spin":
      return (
        radius -
        Math.min(element.width, element.height) / 2 +
        element.strokeWidth
      );
    case "fade":
      return 0;
    default:
      return 0;
  }
};
