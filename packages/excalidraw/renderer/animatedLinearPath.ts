import {
  elementCenterPoint,
  generateLinearCollisionShape,
} from "@excalidraw/element";

import type {
  ElementsMap,
  ExcalidrawLinearElement,
} from "@excalidraw/element/types";

type Point = readonly [number, number];
type Command =
  | { type: "move" | "line"; point: Point }
  | { type: "curve"; control1: Point; control2: Point; point: Point };
type Sample = { t: number; length: number };
type Segment = {
  start: Point;
  end: Point;
  controls?: readonly [Point, Point];
  samples: Sample[];
  length: number;
  offset: number;
};
export type AnimatedLinearPath = {
  commands: Command[];
  segments: Segment[];
  length: number;
};
const cache = new WeakMap<
  ExcalidrawLinearElement,
  { version: number; path: AnimatedLinearPath }
>();
const distance = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const midpoint = (a: Point, b: Point): Point => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
];
const interpolate = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

// Sample arc length adaptively, retaining t so dots are evaluated on the actual
// cubic rather than on the straight chords between the samples.
const curveSamples = (start: Point, c1: Point, c2: Point, end: Point) => {
  const samples: Sample[] = [{ t: 0, length: 0 }];
  let length = 0;
  let previous = start;
  const visit = (
    a: Point,
    b: Point,
    c: Point,
    d: Point,
    t0: number,
    t1: number,
    depth: number,
  ) => {
    const deviation = Math.max(
      distance(b, interpolate(a, d, 1 / 3)),
      distance(c, interpolate(a, d, 2 / 3)),
    );
    if (deviation <= 0.05 || depth >= 12) {
      length += distance(previous, d);
      samples.push({ t: t1, length });
      previous = d;
      return;
    }
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const cd = midpoint(c, d);
    const abc = midpoint(ab, bc);
    const bcd = midpoint(bc, cd);
    const middle = midpoint(abc, bcd);
    const tm = (t0 + t1) / 2;
    visit(a, ab, abc, middle, t0, tm, depth + 1);
    visit(middle, bcd, cd, d, tm, t1, depth + 1);
  };
  visit(start, c1, c2, end, 0, 1, 0);
  return { samples, length };
};

/** Arrow shaft geometry, sharing the editor's rounded-elbow/spline generator. */
export const getAnimatedLinearPath = (
  element: ExcalidrawLinearElement,
  elementsMap: ElementsMap,
): AnimatedLinearPath => {
  const cached = cache.get(element);
  if (cached?.version === element.version) {
    return cached.path;
  }
  const center = elementCenterPoint(element, elementsMap);
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);
  const transform = (x: number, y: number): Point => {
    const dx = element.x + x - center[0];
    const dy = element.y + y - center[1];
    return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos];
  };
  // Collision geometry has no sketch jitter and contains only the shaft, without
  // arrowheads. Apply rotation consistently to straight, curved and elbow paths.
  const ops = generateLinearCollisionShape(
    { ...element, angle: 0 as ExcalidrawLinearElement["angle"] },
    elementsMap,
  );
  const commands: Command[] = [];
  const segments: Segment[] = [];
  let current: Point | null = null;
  let length = 0;
  for (const op of ops) {
    if (op.op === "move") {
      current = transform(op.data[0], op.data[1]);
      commands.push({ type: "move", point: current });
    } else if (current && op.op === "lineTo") {
      const end = transform(op.data[0], op.data[1]);
      const segmentLength = distance(current, end);
      segments.push({
        start: current,
        end,
        samples: [],
        length: segmentLength,
        offset: length,
      });
      commands.push({ type: "line", point: end });
      length += segmentLength;
      current = end;
    } else if (current && op.op === "bcurveTo") {
      const c1 = transform(op.data[0], op.data[1]);
      const c2 = transform(op.data[2], op.data[3]);
      const end = transform(op.data[4], op.data[5]);
      const sampled = curveSamples(current, c1, c2, end);
      segments.push({
        start: current,
        end,
        controls: [c1, c2],
        ...sampled,
        offset: length,
      });
      commands.push({ type: "curve", control1: c1, control2: c2, point: end });
      length += sampled.length;
      current = end;
    }
  }
  const path = { commands, segments, length };
  cache.set(element, { version: element.version, path });
  return path;
};

export const pointOnAnimatedLinearPath = (
  path: AnimatedLinearPath,
  distanceAlong: number,
): Point => {
  const target = Math.max(0, Math.min(path.length, distanceAlong));
  const segment =
    path.segments.find(
      (segment) => target <= segment.offset + segment.length,
    ) ?? path.segments.at(-1);
  if (!segment) {
    return path.commands[0]?.point ?? [0, 0];
  }
  const local = target - segment.offset;
  if (!segment.controls) {
    return interpolate(
      segment.start,
      segment.end,
      segment.length ? local / segment.length : 0,
    );
  }
  let low = 1;
  let high = segment.samples.length - 1;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (segment.samples[mid].length < local) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  const before = segment.samples[low - 1];
  const after = segment.samples[low];
  const fraction =
    after.length === before.length
      ? 0
      : (local - before.length) / (after.length - before.length);
  const t = before.t + (after.t - before.t) * fraction;
  const u = 1 - t;
  const [c1, c2] = segment.controls;
  return [
    u ** 3 * segment.start[0] +
      3 * u * u * t * c1[0] +
      3 * u * t * t * c2[0] +
      t ** 3 * segment.end[0],
    u ** 3 * segment.start[1] +
      3 * u * u * t * c1[1] +
      3 * u * t * t * c2[1] +
      t ** 3 * segment.end[1],
  ];
};

export const animatedLinearPathToSvg = (
  path: AnimatedLinearPath,
  offsetX = 0,
  offsetY = 0,
) => {
  const point = ([x, y]: Point) => `${x + offsetX} ${y + offsetY}`;
  return path.commands
    .map((command) =>
      command.type === "curve"
        ? `C ${point(command.control1)} ${point(command.control2)} ${point(
            command.point,
          )}`
        : `${command.type === "move" ? "M" : "L"} ${point(command.point)}`,
    )
    .join(" ");
};
