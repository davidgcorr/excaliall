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
  const color = applyDarkModeFilter(
    animation.color ?? element.strokeColor,
    darkMode,
  );
  const size = animation.size ?? 1;
  const spacingFor = (fallback: number) =>
    animation.amount ? geometry.length / animation.amount : fallback;
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
  if (animation.type === "arrows") {
    const count =
      animation.amount ?? Math.max(1, Math.ceil(geometry.length / 56));
    const radius = Math.max(3, element.strokeWidth * 1.5) * size;
    const duration = geometry.length / (speed * 0.06);
    for (let index = 0; index < count; index++) {
      const marker = ownerDocument.createElementNS(SVG_NS, "path");
      marker.setAttribute(
        "d",
        `M ${radius * 2} 0 L ${-radius} ${radius} L ${-radius} ${-radius} Z`,
      );
      marker.setAttribute("fill", color);
      marker.setAttribute("stroke", "#ffffff");
      marker.setAttribute("stroke-width", "2");
      const motion = ownerDocument.createElementNS(SVG_NS, "animateMotion");
      motion.setAttribute("path", d);
      motion.setAttribute("dur", `${duration}ms`);
      motion.setAttribute("begin", `${(-duration * index) / count}ms`);
      motion.setAttribute("repeatCount", "indefinite");
      motion.setAttribute(
        "rotate",
        animation.direction === "reverse" ? "auto-reverse" : "auto",
      );
      motion.setAttribute(
        "keyPoints",
        animation.direction === "reverse" ? "1;0" : "0;1",
      );
      motion.setAttribute("keyTimes", "0;1");
      motion.setAttribute("calcMode", "linear");
      marker.appendChild(motion);
      group.appendChild(marker);
    }
  } else if (animation.type === "pulse" && !animation.amount) {
    const pulse = path(color, (element.strokeWidth + 4.5) * size);
    pulse.style.filter = `drop-shadow(0 0 6px ${color})`;
    animate(pulse, "opacity", "0.45;0.7;0.45;0.2;0.45", Math.PI * 500);
    animate(
      pulse,
      "stroke-width",
      [4.5, 7, 4.5, 2, 4.5]
        .map((width) => (width + element.strokeWidth) * size)
        .join(";"),
      Math.PI * 500,
    );
  } else {
    const dots = animation.type === "dots";
    const pulse = animation.type === "pulse";
    const radius = Math.max(3, element.strokeWidth * 1.5) * size;
    const period = spacingFor(dots ? 36 : pulse ? 100 : 34);
    const duration = period / (dots ? 0.06 : 0.025);
    const dashLength = Math.min((pulse ? 18 : 10) * size, period * 0.75);
    const dasharray = dots
      ? `0 ${period}`
      : `${dashLength} ${period - dashLength}`;
    const outline = path(
      "#ffffff",
      dots ? radius * 2 + 2 : Math.max(element.strokeWidth + 4, 6) * size,
    );
    const fill = path(
      dots || pulse || animation.color
        ? color
        : applyDarkModeFilter("#3b82f6", darkMode),
      dots ? radius * 2 : Math.max(element.strokeWidth + 1, 3) * size,
    );
    if (pulse) {
      fill.style.filter = `drop-shadow(0 0 ${8 * size}px ${color})`;
    }
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
