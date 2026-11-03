import { LinearElementEditor } from "@excalidraw/element";

import type {
  ElementsMap,
  ExcalidrawLinearElement,
} from "@excalidraw/element/types";

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
  points: readonly [number, number][],
) => {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index++) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.stroke();
};

const pointAtDistance = (
  points: readonly [number, number][],
  distance: number,
): [number, number] => {
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (distance <= segmentLength) {
      const progress = segmentLength === 0 ? 0 : distance / segmentLength;
      return [
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
      ];
    }
    distance -= segmentLength;
  }
  return points[points.length - 1];
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

  const path = LinearElementEditor.getPointsGlobalCoordinates(
    element,
    elementsMap,
  ).map(([x, y]) => [x + scrollX, y + scrollY] as [number, number]);
  const totalLength = path.reduce((length, point, index) => {
    if (index === 0) {
      return length;
    }
    const previous = path[index - 1];
    return length + Math.hypot(point[0] - previous[0], point[1] - previous[1]);
  }, 0);

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
    drawPath(context, path);
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
    drawPath(context, path);
    context.strokeStyle = "#3b82f6";
    context.globalAlpha = 1;
    context.lineWidth = Math.max(element.strokeWidth + 1 / zoom, 3 / zoom);
    drawPath(context, path);
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
      const [x, y] = pointAtDistance(path, traveledDistance);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }

  context.restore();
};
