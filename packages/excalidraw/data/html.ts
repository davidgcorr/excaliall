/** Wrap an SVG with its inlined assets into a responsive, script-free page. */
export const createStandaloneHtml = (
  svg: SVGSVGElement,
  title = "Excaliall",
): Blob => {
  const ownerDocument = svg.ownerDocument;
  const page = ownerDocument.implementation.createHTMLDocument(title);
  page.documentElement.lang = "en";
  const charset = page.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  page.head.prepend(charset);
  const viewport = page.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  page.head.appendChild(viewport);
  const policy = page.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content =
    "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
  page.head.appendChild(policy);
  const style = page.createElement("style");
  style.textContent =
    "html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}svg{display:block;width:100%;height:100%}@media(prefers-reduced-motion:reduce){.html-animation{display:none}}";
  page.head.appendChild(style);
  const drawing = page.importNode(svg, true);
  drawing.setAttribute("role", "img");
  drawing.setAttribute("aria-label", title);
  drawing.setAttribute("preserveAspectRatio", "xMidYMid meet");
  // The exported artifact is a display, not a navigation surface.
  drawing
    .querySelectorAll("a")
    .forEach((link) => link.replaceWith(...Array.from(link.childNodes)));
  page.body.appendChild(drawing);
  return new Blob(["<!DOCTYPE html>\n", page.documentElement.outerHTML], {
    type: "text/html",
  });
};

const escapeAttribute = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** A single pasteable element containing the complete artifact. */
export const createIframeSnippet = (html: string, title = "Excaliall") =>
  `<iframe title="${escapeAttribute(title)}" srcdoc="${escapeAttribute(
    html,
  )}" sandbox="" loading="lazy" style="width:100%;height:480px;border:0;display:block"></iframe>`;
