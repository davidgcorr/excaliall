import { blobToArrayBuffer } from "../../data/blob";
import { createIframeSnippet, createStandaloneHtml } from "../../data/html";
import { exportScene } from "../../scene/export";
import { API } from "../helpers/api";

const readHtml = async (blob: Blob) =>
  new TextDecoder().decode(await blobToArrayBuffer(blob));
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");

const arrow = (
  type: "dots" | "dashes" | "pulse" | "arrows",
  direction: "forward" | "reverse" = "forward",
) => ({
  ...API.createElement({ type: "arrow", x: 40, y: 20, width: 120, height: 40 }),
  animation: { type, direction, speed: 2 },
});

describe("standalone HTML export", () => {
  it.each(["dots", "dashes", "pulse", "arrows"] as const)(
    "embeds %s animation without scripts or external runtime",
    async (type) => {
      const blob = await exportScene({
        type: "html",
        data: { elements: [arrow(type)] },
        config: { title: "My animated diagram" },
      });
      const page = parse(await readHtml(blob));
      expect(blob.type).toBe("text/html");
      expect(page.title).toBe("My animated diagram");
      expect(page.querySelector("svg")?.getAttribute("viewBox")).toBeTruthy();
      expect(
        page.querySelectorAll(
          ".html-animation animate, .html-animation animateMotion",
        ).length,
      ).toBeGreaterThan(0);
      expect(
        page
          .querySelector("animate, animateMotion")
          ?.getAttribute("repeatCount"),
      ).toBe("indefinite");
      expect(page.querySelectorAll("script, iframe, link")).toHaveLength(0);
      expect(
        page
          .querySelector('meta[http-equiv="Content-Security-Policy"]')
          ?.getAttribute("content"),
      ).toContain("default-src 'none'");
    },
  );

  it("preserves speed, direction, clipping, and element order", async () => {
    const frame = API.createElement({
      type: "frame",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    const line = { ...arrow("dashes", "reverse"), frameId: frame.id };
    const rectangle = API.createElement({
      type: "rectangle",
      x: 50,
      y: 30,
      width: 20,
      height: 20,
      frameId: frame.id,
    });
    const page = parse(
      await readHtml(
        await exportScene({
          type: "html",
          data: { elements: [frame, line, rectangle] },
          config: { exportingFrame: frame },
        }),
      ),
    );
    expect(
      page
        .querySelector(".html-animation animate, .html-animation animateMotion")
        ?.getAttribute("dur"),
    ).toBe("680ms");
    expect(
      page
        .querySelector(".html-animation animate, .html-animation animateMotion")
        ?.getAttribute("values"),
    ).toBe("0;34");
    expect(
      page.querySelector(".html-animation")?.closest("[clip-path]"),
    ).not.toBeNull();
    const order = [...page.querySelectorAll("[data-id]")].map((node) =>
      node.getAttribute("data-id"),
    );
    expect(order.indexOf(line.id)).toBeLessThan(order.indexOf(rectangle.id));
  });

  it("leaves ordinary SVG export static", async () => {
    const svg = await exportScene({
      type: "svg",
      data: { elements: [arrow("dots")] },
    });
    expect(svg.querySelector("animate")).toBeNull();
  });

  it("escapes page titles and iframe srcdoc without breaking the embedded document", async () => {
    const title = '</title><script>alert("test")</script>&"';
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const link = document.createElementNS("http://www.w3.org/2000/svg", "a");
    link.setAttribute("href", "https://example.com");
    svg.appendChild(link);
    const html = await readHtml(createStandaloneHtml(svg, title));
    const page = parse(html);
    expect(page.title).toBe(title);
    expect(page.querySelector("script, a")).toBeNull();
    const host = parse(createIframeSnippet(html, title));
    const iframe = host.querySelector("iframe")!;
    expect(host.querySelectorAll("iframe")).toHaveLength(1);
    expect(iframe.getAttribute("title")).toBe(title);
    expect(iframe.getAttribute("srcdoc")).toBe(html);
    expect(iframe.getAttribute("sandbox")).toBe("");
    expect(host.querySelector("script")).toBeNull();
  });
});
