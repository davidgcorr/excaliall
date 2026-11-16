import type { AnimationMarker } from "@excalidraw/element/types";

export const animationMarkers = [
  "triangle",
  "circle",
  "circle_outline",
  "cross",
  "plus",
  "diamond",
  "square",
  "chevron",
] as const;

type Point = readonly [number, number];
type MarkerGeometry = {
  paths: readonly (readonly Point[])[];
  closed: boolean;
  filled: boolean;
  circle?: number;
};

/** Shared marker geometry keeps Canvas/GIF and SVG/HTML symbols consistent. */
export const getAnimationMarkerGeometry = (
  marker: AnimationMarker,
  radius: number,
): MarkerGeometry => {
  const r = radius;
  switch (marker) {
    case "circle":
    case "circle_outline":
      return {
        paths: [],
        circle: r,
        closed: true,
        filled: marker === "circle",
      };
    case "cross":
      return {
        paths: [
          [
            [-r, -r],
            [r, r],
          ],
          [
            [-r, r],
            [r, -r],
          ],
        ],
        closed: false,
        filled: false,
      };
    case "plus":
      return {
        paths: [
          [
            [-r, 0],
            [r, 0],
          ],
          [
            [0, -r],
            [0, r],
          ],
        ],
        closed: false,
        filled: false,
      };
    case "diamond":
      return {
        paths: [
          [
            [r * 1.5, 0],
            [0, r],
            [-r * 1.5, 0],
            [0, -r],
          ],
        ],
        closed: true,
        filled: true,
      };
    case "square":
      return {
        paths: [
          [
            [-r, -r],
            [r, -r],
            [r, r],
            [-r, r],
          ],
        ],
        closed: true,
        filled: true,
      };
    case "chevron":
      return {
        paths: [
          [
            [-r, -r],
            [r, 0],
            [-r, r],
          ],
        ],
        closed: false,
        filled: false,
      };
    case "triangle":
      return {
        paths: [
          [
            [r * 2, 0],
            [-r, r],
            [-r, -r],
          ],
        ],
        closed: true,
        filled: true,
      };
  }
};

export const animationMarkerToSvg = (geometry: MarkerGeometry) => {
  if (geometry.circle !== undefined) {
    const r = geometry.circle;
    return `M ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 Z`;
  }
  return geometry.paths
    .map(
      (points) =>
        points
          .map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`)
          .join(" ") + (geometry.closed ? " Z" : ""),
    )
    .join(" ");
};

export const drawAnimationMarker = (
  context: CanvasRenderingContext2D,
  geometry: MarkerGeometry,
  x: number,
  y: number,
  angle: number,
  color: string,
  zoom: number,
) => {
  const vertex = ([along, across]: Point): Point => [
    x + along * Math.cos(angle) - across * Math.sin(angle),
    y + along * Math.sin(angle) + across * Math.cos(angle),
  ];
  context.beginPath();
  if (geometry.circle !== undefined) {
    context.arc(x, y, geometry.circle, 0, Math.PI * 2);
  } else {
    for (const points of geometry.paths) {
      points.forEach((point, index) => {
        const transformed = vertex(point);
        if (index === 0) {
          context.moveTo(...transformed);
        } else {
          context.lineTo(...transformed);
        }
      });
      if (geometry.closed) {
        context.closePath();
      }
    }
  }
  context.strokeStyle = "#ffffff";
  if (geometry.filled) {
    context.fillStyle = color;
    context.lineWidth = 2 / zoom;
    context.fill();
    context.stroke();
  } else {
    context.lineWidth = 5 / zoom;
    context.stroke();
    context.strokeStyle = color;
    context.lineWidth = 2 / zoom;
    context.stroke();
  }
};
