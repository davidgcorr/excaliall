import { SVG_NS, applyDarkModeFilter } from "@excalidraw/common";

import type {
  ElementsMap,
  ExcalidrawLinearElement,
} from "@excalidraw/element/types";

import {
  getAnimatedLinearPath,
  animatedLinearPathToSvg,
} from "./animatedLinearPath";

/** Declarative animations keep exported HTML independent of JavaScript. */
export const createAnimatedSvgElement = (
  element: ExcalidrawLinearElement,
  elementsMap: ElementsMap,
  ownerDocument: Document,
  offsetX: number,
  offsetY: number,
  darkMode: boolean,
  opacity: number,
): SVGGElement | null => {
  const animation = element.animation;
  if (!animation || element.points.length < 2) {
    return null;
  }
  const geometry = getAnimatedLinearPath(element, elementsMap);
  if (!geometry.length) {
    return null;
  }
  const group = ownerDocument.createElementNS(SVG_NS, "g");
  group.setAttribute("class", "html-animation");
  group.setAttribute("pointer-events", "none");
  group.setAttribute("opacity", String(opacity));
  const d = animatedLinearPathToSvg(geometry, offsetX, offsetY);
  const color = applyDarkModeFilter(element.strokeColor, darkMode);
  const speed = animation.speed;
  const path = (stroke: string, width: number) => {
    const node = ownerDocument.createElementNS(SVG_NS, "path");
    node.setAttribute("d", d);
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", stroke);
    node.setAttribute("stroke-width", String(width));
    node.setAttribute("stroke-linecap", "round");
    node.setAttribute("stroke-linejoin", "round");
    group.appendChild(node);
    return node;
  };
  const animate = (
    node: SVGElement,
    attribute: string,
    values: string,
    duration: number,
  ) => {
    const motion = ownerDocument.createElementNS(SVG_NS, "animate");
    motion.setAttribute("attributeName", attribute);
    motion.setAttribute("values", values);
    motion.setAttribute("dur", `${duration / speed}ms`);
    motion.setAttribute("repeatCount", "indefinite");
    node.appendChild(motion);
  };
  if (animation.type === "pulse") {
    const pulse = path(color, element.strokeWidth + 4.5);
    pulse.style.filter = `drop-shadow(0 0 6px ${color})`;
    animate(pulse, "opacity", "0.45;0.7;0.45;0.2;0.45", Math.PI * 500);
    animate(
      pulse,
      "stroke-width",
      [4.5, 7, 4.5, 2, 4.5]
        .map((width) => width + element.strokeWidth)
        .join(";"),
      Math.PI * 500,
    );
  } else {
    const dots = animation.type === "dots";
    const radius = Math.max(3, element.strokeWidth * 1.5);
    const period = dots ? 36 : 34;
    const duration = dots ? 600 : 1360;
    const dasharray = dots ? "0 36" : "10 24";
    const outline = path(
      "#ffffff",
      dots ? radius * 2 + 2 : Math.max(element.strokeWidth + 4, 6),
    );
    const fill = path(
      dots ? color : applyDarkModeFilter("#3b82f6", darkMode),
      dots ? radius * 2 : Math.max(element.strokeWidth + 1, 3),
    );
    for (const node of [outline, fill]) {
      node.setAttribute("stroke-dasharray", dasharray);
      animate(
        node,
        "stroke-dashoffset",
        `0;${animation.direction === "reverse" ? period : -period}`,
        duration,
      );
    }
  }
  return group;
};
