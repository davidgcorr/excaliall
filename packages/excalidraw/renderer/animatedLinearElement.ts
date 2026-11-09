import type {
  ElementsMap,
  ExcalidrawLinearElement,
} from "@excalidraw/element/types";

import {
  getAnimatedLinearPath,
  pointOnAnimatedLinearPath,
} from "./animatedLinearPath";

import type { AnimatedLinearPath } from "./animatedLinearPath";

type AnimatedLinearElementConfig = {
  context: CanvasRenderingContext2D;
  element: ExcalidrawLinearElement;
  elementsMap: ElementsMap;
  scrollX: number;
  scrollY: number;
  zoom: number;
  animationTime: number;
};

const drawPath = (
  context: CanvasRenderingContext2D,
  path: AnimatedLinearPath,
  scrollX: number,
  scrollY: number,
) => {
  context.beginPath();
  for (const command of path.commands) {
    const [x, y] = command.point;
    if (command.type === "move") {
      context.moveTo(x + scrollX, y + scrollY);
    } else if (command.type === "line") {
      context.lineTo(x + scrollX, y + scrollY);
    } else if (command.type === "curve") {
      context.bezierCurveTo(
        command.control1[0] + scrollX,
        command.control1[1] + scrollY,
        command.control2[0] + scrollX,
        command.control2[1] + scrollY,
        x + scrollX,
        y + scrollY,
      );
    }
  }
  context.stroke();
};

export const drawAnimatedLinearElement = ({
  context,
  element,
  elementsMap,
  scrollX,
  scrollY,
  zoom,
  animationTime,
}: AnimatedLinearElementConfig) => {
  const animation = element.animation;
  if (!animation || element.points.length < 2) {
    return;
  }

  const path = getAnimatedLinearPath(element, elementsMap);
  const totalLength = path.length;

  if (totalLength === 0) {
    return;
  }

  const speed = animation.speed;
  const reverse = animation.direction === "reverse";
  const size = animation.size ?? 1;
  const color = animation.color ?? element.strokeColor;
  const spacingFor = (fallback: number) =>
    animation.amount ? totalLength / animation.amount : fallback / zoom;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  if (animation.type === "pulse" && !animation.amount) {
    const intensity = (Math.sin(animationTime * speed * 0.004) + 1) / 2;
    context.strokeStyle = color;
    context.globalAlpha = 0.2 + intensity * 0.5;
    context.lineWidth =
      (element.strokeWidth + (2 + intensity * 5) / zoom) * size;
    context.shadowColor = color;
    context.shadowBlur = (4 + intensity * 8) / zoom;
    drawPath(context, path, scrollX, scrollY);
  } else if (animation.type === "dashes" || animation.type === "pulse") {
    const pulse = animation.type === "pulse";
    const spacing = spacingFor(pulse ? 100 : 34);
    const dashLength = Math.min(
      ((pulse ? 18 : 10) * size) / zoom,
      spacing * 0.75,
    );
    const gapLength = spacing - dashLength;
    if (pulse) {
      context.shadowColor = color;
      context.shadowBlur = (8 * size) / zoom;
    }
    const phase =
      ((animationTime * speed * 0.025) / zoom) % (dashLength + gapLength);
    context.setLineDash([dashLength, gapLength]);
    context.lineDashOffset = reverse ? phase : -phase;
    context.strokeStyle = "#ffffff";
    context.globalAlpha = 0.95;
    context.lineWidth =
      Math.max(element.strokeWidth + 4 / zoom, 6 / zoom) * size;
    drawPath(context, path, scrollX, scrollY);
    context.strokeStyle =
      animation.color ?? (pulse ? element.strokeColor : "#3b82f6");
    context.globalAlpha = 1;
    context.lineWidth =
      Math.max(element.strokeWidth + 1 / zoom, 3 / zoom) * size;
    drawPath(context, path, scrollX, scrollY);
  } else {
    const spacing = spacingFor(animation.type === "arrows" ? 56 : 36);
    const radius = Math.max(3 / zoom, element.strokeWidth * 1.5) * size;
    const phase = ((animationTime * speed * 0.06) / zoom) % spacing;
    context.lineWidth = 2 / zoom;
    context.fillStyle = color;
    context.strokeStyle = "#ffffff";
    context.globalAlpha = 1;

    for (let distance = phase; distance < totalLength; distance += spacing) {
      const traveledDistance = reverse ? totalLength - distance : distance;
      const [x, y] = pointOnAnimatedLinearPath(path, traveledDistance);
      context.beginPath();
      if (animation.type === "arrows") {
        const before = pointOnAnimatedLinearPath(
          path,
          Math.max(0, traveledDistance - 0.1),
        );
        const after = pointOnAnimatedLinearPath(
          path,
          Math.min(totalLength, traveledDistance + 0.1),
        );
        const angle =
          Math.atan2(after[1] - before[1], after[0] - before[0]) +
          (reverse ? Math.PI : 0);
        const tip = radius * 2;
        const vertex = (along: number, across: number) =>
          [
            x + scrollX + along * Math.cos(angle) - across * Math.sin(angle),
            y + scrollY + along * Math.sin(angle) + across * Math.cos(angle),
          ] as const;
        const a = vertex(tip, 0);
        const b = vertex(-tip / 2, radius);
        const c = vertex(-tip / 2, -radius);
        context.moveTo(...a);
        context.lineTo(...b);
        context.lineTo(...c);
        context.closePath();
      } else {
        context.arc(x + scrollX, y + scrollY, radius, 0, Math.PI * 2);
      }
      context.fill();
      context.stroke();
    }
  }

  context.restore();
};
