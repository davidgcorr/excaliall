import runtimeUrl from "./runtime?worker&url";
import { validateChart } from "./data";

import type { RoughVizChart } from "./data";

/** The upstream library uses document selectors and resize listeners. An
 * isolated, disposable document keeps them outside the editor's DOM. */
export const renderChart = (
  chart: RoughVizChart,
  ownerDocument: Document,
  ownerWindow: Window & typeof globalThis,
  signal?: AbortSignal,
): Promise<string> => {
  validateChart(chart);
  if (signal?.aborted) {
    return Promise.reject(
      new ownerWindow.DOMException("Cancelled", "AbortError"),
    );
  }
  return new Promise((resolve, reject) => {
    const token = ownerWindow.crypto.randomUUID();
    const frame = ownerDocument.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;left:-10000px;top:0;width:640px;height:420px;border:0;visibility:hidden";
    const scriptUrl = new URL(runtimeUrl, ownerDocument.baseURI).href
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    frame.srcdoc = `<!DOCTYPE html><html><head><style>html,body{margin:0}#roughviz-mount{width:640px;height:420px}</style></head><body><div id="roughviz-mount" data-token="${token}"></div><script${
      import.meta.env.DEV ? ' type="module"' : ""
    } src="${scriptUrl}"></script></body></html>`;
    const cleanup = () => {
      ownerWindow.clearTimeout(timeout);
      ownerWindow.removeEventListener("message", receive);
      signal?.removeEventListener("abort", abort);
      frame.remove();
    };
    const abort = () => {
      cleanup();
      reject(new ownerWindow.DOMException("Cancelled", "AbortError"));
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.data?.token !== token) {
        return;
      }
      if (event.data.type === "chart-ready") {
        frame.contentWindow?.postMessage(
          { type: "render-chart", token, chart },
          "*",
        );
      } else if (
        event.data.type === "chart-rendered" &&
        typeof event.data.svg === "string"
      ) {
        cleanup();
        resolve(event.data.svg);
      } else if (event.data.type === "chart-error") {
        cleanup();
        reject(new Error(String(event.data.error)));
      }
    };
    const timeout = ownerWindow.setTimeout(() => {
      cleanup();
      reject(
        new Error("Chart rendering timed out. Check the data and try again."),
      );
    }, 20000);
    ownerWindow.addEventListener("message", receive);
    signal?.addEventListener("abort", abort, { once: true });
    ownerDocument.body.appendChild(frame);
  });
};
