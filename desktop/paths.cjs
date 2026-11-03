const path = require("node:path");

// Only bundled files are served. Do not fall back to index.html for missing assets.
function resolveAsset(root, requestUrl) {
  const url = new URL(requestUrl);
  if (url.protocol !== "excalidraw:" || url.host !== "app") {
    throw new Error("Invalid app origin");
  }
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.includes("\0") || pathname.includes("\\")) {
    throw new Error("Invalid asset path");
  }
  const file = path.resolve(
    root,
    `.${pathname === "/" ? "/index.html" : pathname}`,
  );
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Asset outside app bundle");
  }
  return file;
}
module.exports = { resolveAsset };
