const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");

const { resolveAsset } = require("./paths.cjs");
const root = path.resolve("/tmp/bundled-web");

test("serves the entry point and nested encoded assets", () => {
  assert.equal(
    resolveAsset(root, "excalidraw://app/"),
    path.join(root, "index.html"),
  );
  assert.equal(
    resolveAsset(root, "excalidraw://app/fonts/My%20Font.woff2?v=1"),
    path.join(root, "fonts/My Font.woff2"),
  );
});

test("rejects other origins, encoded traversal and malformed paths", () => {
  for (const url of [
    "https://app/index.html",
    "excalidraw://other/index.html",
    "excalidraw://app/..%2fsecret",
    "excalidraw://app/%00",
    "excalidraw://app/%5csecret",
    "excalidraw://app/%ZZ",
  ]) {
    assert.throws(() => resolveAsset(root, url), url);
  }
});
