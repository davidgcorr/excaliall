// Cross-build Windows/Linux installers from macOS using the official builder image.
const { existsSync, mkdirSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const output = path.join(root, "desktop/dist-cross");
if (!existsSync(path.join(root, "desktop/web/index.html"))) {
  throw new Error("Build the editor first: node desktop/scripts/build-web.cjs");
}
mkdirSync(output, { recursive: true });
const image =
  "electronuserland/builder@sha256:f3a8d451994c881d0972e7b1846ee4d4fdc15eb41fc6b1f350b38cbf99ca90fe";
const nativeWindowsBuild = process.platform === "darwin";
const command = `
if ! cmp -s /source/desktop/package-lock.json /app/package-lock.json; then
  cp /source/desktop/package.json /source/desktop/package-lock.json /app/
  cd /app
  npm ci --ignore-scripts --no-audit --no-fund
fi
cp /source/desktop/package.json /source/desktop/main.cjs /source/desktop/paths.cjs /source/desktop/electron-builder.cjs /app/
rm -rf /app/web /app/resources
cp -R /source/desktop/web /source/desktop/resources /app/
ln -sfn /source/public /public
ln -sfn /source/LICENSE /LICENSE
cd /app
./node_modules/.bin/electron-builder --linux ${
  nativeWindowsBuild ? "" : "--win"
} --x64 --publish never -c.directories.output=/out
`;
const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "--platform",
    "linux/amd64",
    "--entrypoint",
    "/bin/bash",
    "-e",
    "APPIMAGE_EXTRACT_AND_RUN=1",
    "-e",
    "CSC_IDENTITY_AUTO_DISCOVERY=false",
    "-v",
    `${root}:/source:ro`,
    "-v",
    `${output}:/out`,
    "-v",
    "excalidraw-builder-app:/app",
    "-v",
    "excalidraw-builder-cache:/root/.cache",
    "-v",
    "excalidraw-builder-npm:/root/.npm",
    "-v",
    "excalidraw-builder-wine:/root/.wine",
    image,
    "-euc",
    command,
  ],
  { stdio: "inherit" },
);
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
if (nativeWindowsBuild) {
  // On macOS, the native NSIS extractor avoids Wine's ARM-emulation limits.
  const windows = spawnSync(
    process.execPath,
    [
      path.join(root, "desktop/node_modules/electron-builder/cli.js"),
      "--win",
      "--x64",
      "--publish",
      "never",
      "-c.directories.output=dist-cross",
    ],
    { cwd: path.join(root, "desktop"), stdio: "inherit" },
  );
  if (windows.error) {
    throw windows.error;
  }
  process.exit(windows.status ?? 1);
}
process.exit(0);
