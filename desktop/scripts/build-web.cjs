const { spawnSync } = require("node:child_process");
const { cpSync, rmSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
// Keep online service configuration consistent with the production web app.
const { loadEnv } = require("vite");
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/vite/bin/vite.js"),
    "build",
    "--mode",
    "desktop",
  ],
  {
    cwd: path.join(root, "excalidraw-app"),
    stdio: "inherit",
    env: {
      ...loadEnv("production", root),
      ...process.env,
      VITE_APP_DISABLE_SENTRY: "true",
      VITE_APP_ENABLE_TRACKING: "false",
      VITE_APP_ENABLE_ESLINT: "false",
    },
  },
);
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status || 1);
}
const destination = path.join(root, "desktop/web");
rmSync(destination, { recursive: true, force: true });
cpSync(path.join(root, "excalidraw-app/build"), destination, {
  recursive: true,
});
