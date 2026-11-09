import {
  normalizeInputColor,
  viewportCoordsToSceneCoords,
} from "@excalidraw/common";
import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";
import { newImageElement } from "@excalidraw/element/newElement";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { generateIdFromFile, getDataURL } from "../../data/blob";

import type { AppClassProperties } from "../../types";

export type LatexData = {
  version: 1;
  source: string;
  fontSize: number;
  color: string;
  style?: "normal" | "handdrawn";
  handFont?: "Caveat" | "Patrick Hand";
  variation?: number;
  naturalWidth?: number;
  naturalHeight?: number;
};
export const sampleLatex = (): LatexData => ({
  version: 1,
  source: String.raw`E = mc^2`,
  fontSize: 32,
  color: "#1e1e1e",
});
export const validateLatex = (value: unknown): LatexData => {
  const data = value as LatexData;
  if (
    !data ||
    data.version !== 1 ||
    typeof data.source !== "string" ||
    !data.source.trim() ||
    data.source.length > 5000 ||
    !Number.isFinite(data.fontSize) ||
    data.fontSize < 12 ||
    data.fontSize > 128 ||
    typeof data.color !== "string" ||
    !normalizeInputColor(data.color) ||
    (data.style !== undefined &&
      data.style !== "normal" &&
      data.style !== "handdrawn") ||
    (data.handFont !== undefined &&
      data.handFont !== "Caveat" &&
      data.handFont !== "Patrick Hand") ||
    (data.variation !== undefined &&
      (!Number.isFinite(data.variation) ||
        data.variation < 0 ||
        data.variation > 2)) ||
    [data.naturalWidth, data.naturalHeight].some(
      (size) =>
        size !== undefined &&
        (!Number.isFinite(size) || size <= 0 || size > 1e6),
    )
  ) {
    throw new Error(
      "Enter a formula (up to 5,000 characters), a size from 12 to 128, and a valid color.",
    );
  }
  return { ...data, source: data.source.trim() };
};
export const getLatexData = (
  element: ExcalidrawElement | null | undefined,
): LatexData | null => {
  if (element?.type !== "image" || !element.customData?.latex) {
    return null;
  }
  try {
    return validateLatex(element.customData.latex);
  } catch {
    return null;
  }
};

// Loaded only when a formula is inserted/edited. Glyphs are SVG paths, not web fonts.
let engine: Promise<{ convert: (source: string) => string }> | undefined;
const getEngine = () =>
  (engine ??= Promise.all([
    import("mathjax-full/js/mathjax.js"),
    import("mathjax-full/js/input/tex.js"),
    import("mathjax-full/js/output/svg.js"),
    import("mathjax-full/js/adaptors/liteAdaptor.js"),
    import("mathjax-full/js/handlers/html.js"),
    import("mathjax-full/js/input/tex/ams/AmsConfiguration.js"),
    import("mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js"),
  ])
    .then(
      ([
        { mathjax },
        { TeX },
        { SVG },
        { liteAdaptor },
        { RegisterHTMLHandler },
      ]) => {
        const adaptor = liteAdaptor();
        RegisterHTMLHandler(adaptor);
        return {
          convert: (source: string) => {
            const input = new TeX({
              packages: ["base", "ams", "newcommand"],
              maxBuffer: 10000,
              maxMacros: 1000,
              formatError: (_jax: unknown, error: Error) => {
                throw new Error(error.message);
              },
            });
            const document = mathjax.document("", {
              InputJax: input,
              OutputJax: new SVG({ fontCache: "none" }),
            });
            input.reset(0);
            return adaptor.outerHTML(
              document.convert(source, { display: true }),
            );
          },
        };
      },
    )
    .catch((error) => {
      engine = undefined;
      throw error;
    }));

export const renderLatex = async (
  draft: LatexData,
  ownerDocument: Document,
) => {
  const data = validateLatex(draft);
  const engine = await getEngine();
  const holder = ownerDocument.createElement("div");
  holder.innerHTML = engine.convert(data.source);
  const svg = holder.querySelector("svg");
  if (!svg || svg.querySelector("[data-mml-node='merror']")) {
    throw new Error("Invalid LaTeX formula.");
  }
  const viewBox = svg.getAttribute("viewBox")!.split(/\s+/).map(Number);
  const width = Math.max(1, (viewBox[2] * data.fontSize) / 1000);
  const height = Math.max(1, (viewBox[3] * data.fontSize) / 1000);
  if (data.style === "handdrawn") {
    const { applyHandwriting } = await import("./handwriting");
    applyHandwriting(
      svg,
      data.source,
      data.handFont ?? "Patrick Hand",
      data.variation ?? 1,
    );
  } else {
    svg.setAttribute("data-latex-style", "normal");
  }
  // Padding keeps ascenders, subscripts, and strokes away from the image boundary.
  const paddingPixels =
    data.style === "handdrawn" ? Math.max(6, data.fontSize * 0.06) : 4;
  const padding = (paddingPixels * 1000) / data.fontSize;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute(
    "viewBox",
    `${viewBox[0] - padding} ${viewBox[1] - padding} ${
      viewBox[2] + padding * 2
    } ${viewBox[3] + padding * 2}`,
  );
  svg.setAttribute("width", String(width + paddingPixels * 2));
  svg.setAttribute("height", String(height + paddingPixels * 2));
  svg.setAttribute("color", data.color);
  svg.removeAttribute("style");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", data.source);
  return {
    svg,
    width: width + paddingPixels * 2,
    height: height + paddingPixels * 2,
  };
};

export const saveLatex = async (
  app: AppClassProperties,
  draft: LatexData,
  elementId?: string,
  options: { preserveSelection?: boolean; isCurrent?: () => boolean } = {},
) => {
  const data = validateLatex(draft);
  const { svg, width, height } = await renderLatex(data, app.ownerDocument);
  const file = new app.ownerWindow.File(
    [new app.ownerWindow.XMLSerializer().serializeToString(svg)],
    "formula.svg",
    { type: "image/svg+xml" },
  );
  const [fileId, dataURL] = await Promise.all([
    generateIdFromFile(file),
    getDataURL(file),
  ]);
  if (app.api.isDestroyed || options.isCurrent?.() === false) {
    return;
  }
  const target = elementId ? app.scene.getElement(elementId) : null;
  if (
    app.state.viewModeEnabled ||
    (elementId &&
      (!target ||
        target.type !== "image" ||
        target.isDeleted ||
        target.locked ||
        !getLatexData(target)))
  ) {
    throw new Error("This formula is no longer editable.");
  }
  const state = app.api.getAppState();
  const center = viewportCoordsToSceneCoords(
    {
      clientX: state.offsetLeft + state.width / 2,
      clientY: state.offsetTop + state.height / 2,
    },
    state,
  );
  const previous = target && getLatexData(target);
  const scaleX =
    target && previous?.naturalWidth ? target.width / previous.naturalWidth : 1;
  const scaleY =
    target && previous?.naturalHeight
      ? target.height / previous.naturalHeight
      : scaleX;
  const metadata = { ...data, naturalWidth: width, naturalHeight: height };
  const element =
    target?.type === "image"
      ? newElementWith(target, {
          fileId,
          width: width * scaleX,
          height: height * scaleY,
          crop: null,
          status: "saved",
          customData: { ...target.customData, latex: metadata },
        })
      : newImageElement({
          type: "image",
          x: center.x - width / 2,
          y: center.y - height / 2,
          width,
          height,
          fileId,
          status: "saved",
          customData: { latex: metadata },
        });
  app.api.addFiles([
    {
      id: fileId,
      dataURL,
      mimeType: "image/svg+xml",
      created: Date.now(),
      lastRetrieved: Date.now(),
    },
  ]);
  app.api.updateScene({
    elements: target
      ? app.api
          .getSceneElementsIncludingDeleted()
          .map((item) => (item.id === element.id ? element : item))
      : [...app.api.getSceneElementsIncludingDeleted(), element],
    appState: options.preserveSelection
      ? undefined
      : {
          selectedElementIds: { [element.id]: true },
          selectedGroupIds: {},
          editingGroupId: null,
        },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return element;
};
