import { pointsOnPath } from "points-on-path";

import caveat from "../../fonts/Caveat/glyphs.json";
import patrick from "../../fonts/PatrickHand/glyphs.json";

export type HandwritingFont = "Caveat" | "Patrick Hand";
type Glyph = {
  d: string;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
};
const glyphSets: Record<HandwritingFont, Record<string, Glyph>> = {
  Caveat: caveat,
  "Patrick Hand": patrick,
};
const NS = "http://www.w3.org/2000/svg";

const bounds = (d: string) => {
  const points = pointsOnPath(d, 1).flat();
  if (!points.length) {
    return null;
  }
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  for (const [x, y] of points) {
    xMin = Math.min(xMin, x);
    yMin = Math.min(yMin, y);
    xMax = Math.max(xMax, x);
    yMax = Math.max(yMax, y);
  }
  return { xMin, yMin, xMax, yMax };
};
// Formula-local randomness makes preview, saved images, and exports identical.
const randomFor = (source: string) => {
  let seed = 2166136261;
  for (const char of source) {
    seed = Math.imul(seed ^ char.codePointAt(0)!, 16777619);
  }
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed);
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };
};

/** Independently authored SVG treatment inspired by Tex2Hand's glyph/ink variation.
 * Keep MathJax's layout, replace ordinary Latin/digit outlines with real handwriting,
 * and retain specialized math glyphs (blackboard, bold, Greek, integrals, etc.).
 */
export const applyHandwriting = (
  svg: SVGSVGElement,
  source: string,
  font: HandwritingFont,
  variation: number,
) => {
  const random = randomFor(`${source}:${font}`);
  const jitter = (amount: number) => (random() * 2 - 1) * amount * variation;
  const glyphs = glyphSets[font];
  svg.setAttribute("data-latex-style", "handdrawn");
  svg.setAttribute("data-handwriting-font", font);
  for (const path of svg.querySelectorAll<SVGPathElement>("path[data-c]")) {
    const d = path.getAttribute("d");
    const code = Number.parseInt(path.getAttribute("data-c")!, 16);
    if (!d || !Number.isFinite(code)) {
      continue;
    }
    const box = bounds(d);
    if (!box) {
      continue;
    }
    const isPlain = code < 128 || (code >= 0x1d434 && code <= 0x1d467);
    const char = isPlain ? String.fromCodePoint(code).normalize("NFKD") : "";
    const glyph = glyphs[char];
    if (glyph && /^[a-zA-Z0-9+\-=()[\]{}.,:;!?]$/.test(char)) {
      const scale = Math.min(
        (box.xMax - box.xMin) / Math.max(1, glyph.xMax - glyph.xMin),
        (box.yMax - box.yMin) / Math.max(1, glyph.yMax - glyph.yMin),
      );
      const tx = (box.xMin + box.xMax - (glyph.xMin + glyph.xMax) * scale) / 2;
      const ty = box.yMin - glyph.yMin * scale;
      path.setAttribute("d", glyph.d);
      path.setAttribute(
        "transform",
        `${
          path.getAttribute("transform") ?? ""
        } translate(${tx} ${ty}) scale(${scale})`,
      );
      path.setAttribute("data-handwriting-glyph", char);
    }
    // Wrap instead of overwriting MathJax's positioning or the glyph fit transform.
    const group = svg.ownerDocument.createElementNS(NS, "g");
    const cx = (box.xMin + box.xMax) / 2;
    const cy = (box.yMin + box.yMax) / 2;
    group.setAttribute(
      "transform",
      `translate(${jitter(5)} ${jitter(5)}) rotate(${jitter(
        1.1,
      )} ${cx} ${cy}) skewX(${jitter(0.6)})`,
    );
    path.replaceWith(group);
    group.appendChild(path);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", String(2 + random() * 3 * variation));
    path.setAttribute("stroke-linejoin", "round");
    // A low-opacity second ink impression adds weight variation without blur.
    const ink = path.cloneNode(true) as SVGPathElement;
    ink.removeAttribute("data-c");
    ink.removeAttribute("data-handwriting-glyph");
    ink.setAttribute("opacity", "0.12");
    ink.setAttribute(
      "transform",
      `translate(${jitter(3)} ${jitter(3)}) ${
        path.getAttribute("transform") ?? ""
      }`,
    );
    group.appendChild(ink);
  }
  // Fraction/overbar rules are MathJax rectangles. Give them a gentle pen curve.
  for (const rect of svg.querySelectorAll("rect")) {
    const width = Number(rect.getAttribute("width"));
    const height = Number(rect.getAttribute("height"));
    if (!width || !height || width < height * 4) {
      continue;
    }
    const x = Number(rect.getAttribute("x") ?? 0);
    const y = Number(rect.getAttribute("y") ?? 0) + height / 2;
    const line = svg.ownerDocument.createElementNS(NS, "path");
    line.setAttribute(
      "d",
      `M ${x} ${y} C ${x + width / 3} ${y + jitter(9)} ${x + (width * 2) / 3} ${
        y + jitter(9)
      } ${x + width} ${y}`,
    );
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", String(height * (0.95 + random() * 0.1)));
    line.setAttribute("stroke-linecap", "round");
    if (rect.hasAttribute("transform")) {
      line.setAttribute("transform", rect.getAttribute("transform")!);
    }
    line.setAttribute("data-handwriting-rule", "true");
    rect.replaceWith(line);
  }
};
