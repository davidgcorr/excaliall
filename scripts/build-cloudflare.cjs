const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const result = spawnSync(
  process.execPath,
  [path.join(root, "node_modules/vite/bin/vite.js"), "build"],
  {
    cwd: path.join(root, "excalidraw-app"),
    stdio: "inherit",
    env: {
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
process.exit(result.status ?? 1);
