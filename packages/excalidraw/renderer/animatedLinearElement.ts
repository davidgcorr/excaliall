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

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  if (animation.type === "pulse") {
    const intensity = (Math.sin(animationTime * speed * 0.004) + 1) / 2;
    context.strokeStyle = element.strokeColor;
    context.globalAlpha = 0.2 + intensity * 0.5;
    context.lineWidth = element.strokeWidth + (2 + intensity * 5) / zoom;
    context.shadowColor = element.strokeColor;
    context.shadowBlur = (4 + intensity * 8) / zoom;
    drawPath(context, path, scrollX, scrollY);
  } else if (animation.type === "dashes") {
    const dashLength = 10 / zoom;
    const gapLength = 24 / zoom;
    const phase =
      ((animationTime * speed * 0.025) / zoom) % (dashLength + gapLength);
    context.setLineDash([dashLength, gapLength]);
    context.lineDashOffset = reverse ? phase : -phase;
    context.strokeStyle = "#ffffff";
    context.globalAlpha = 0.95;
    context.lineWidth = Math.max(element.strokeWidth + 4 / zoom, 6 / zoom);
    drawPath(context, path, scrollX, scrollY);
    context.strokeStyle = "#3b82f6";
    context.globalAlpha = 1;
    context.lineWidth = Math.max(element.strokeWidth + 1 / zoom, 3 / zoom);
    drawPath(context, path, scrollX, scrollY);
  } else {
    const spacing = 36 / zoom;
    const radius = Math.max(3 / zoom, element.strokeWidth * 1.5);
    const phase = ((animationTime * speed * 0.06) / zoom) % spacing;
    context.lineWidth = 2 / zoom;
    context.fillStyle = element.strokeColor;
    context.strokeStyle = "#ffffff";
    context.globalAlpha = 1;

    for (let distance = phase; distance < totalLength; distance += spacing) {
      const traveledDistance = reverse ? totalLength - distance : distance;
      const [x, y] = pointOnAnimatedLinearPath(path, traveledDistance);
      context.beginPath();
      context.arc(x + scrollX, y + scrollY, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }

  context.restore();
};
