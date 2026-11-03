/* eslint-disable no-template-curly-in-string -- electron-builder expands these macros */
module.exports = {
  appId: "com.davidgcorr.excalidraw-animation",
  productName: "Excalidraw Animation",
  directories: { output: "dist", buildResources: "resources" },
  files: ["main.cjs", "paths.cjs", "package.json"],
  extraResources: [
    { from: "web", to: "web" },
    { from: "../LICENSE", to: "LICENSE.excalidraw.txt" },
    { from: "resources/roughviz-LICENSE.txt", to: "licenses/roughviz.txt" },
  ],
  artifactName: "Excalidraw-Animation-${version}-${arch}.${ext}",
  extraMetadata: {
    desktopUpdatesEnabled: process.env.DESKTOP_SIGNED === "true",
  },
  publish: [
    {
      provider: "github",
      owner: "davidgcorr",
      repo: "excalidraw",
      releaseType: "draft",
    },
  ],
  mac: {
    icon: "../public/android-chrome-512x512.png",
    category: "public.app-category.graphics-design",
    target: ["dmg", "zip"],
    hardenedRuntime: true,
    entitlements: "resources/entitlements.mac.plist",
    entitlementsInherit: "resources/entitlements.mac.plist",
    notarize: process.env.DESKTOP_SIGNED === "true",
  },
  dmg: { title: "Excalidraw Animation ${version}" },
};
