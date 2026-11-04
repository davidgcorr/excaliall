/* eslint-disable no-template-curly-in-string -- electron-builder expands these macros */
module.exports = {
  appId: "com.davidgcorr.excalidraw-animation",
  productName: "Excaliall",
  directories: { output: "dist", buildResources: "resources" },
  files: ["main.cjs", "paths.cjs", "package.json"],
  extraResources: [
    { from: "web", to: "web" },
    { from: "../LICENSE", to: "LICENSE.excalidraw.txt" },
    { from: "resources/roughviz-LICENSE.txt", to: "licenses/roughviz.txt" },
    { from: "resources/shadcn-LICENSE.txt", to: "licenses/shadcn.txt" },
    {
      from: "resources/tanstack-table-LICENSE.txt",
      to: "licenses/tanstack-table.txt",
    },
  ],
  artifactName: "Excaliall-${version}-${arch}.${ext}",
  extraMetadata: {
    desktopUpdatesEnabled: process.env.DESKTOP_SIGNED === "true",
  },
  publish: [
    {
      provider: "github",
      owner: "davidgcorr",
      repo: "excaliall",
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
  win: {
    icon: "../public/android-chrome-512x512.png",
    target: ["nsis"],
    artifactName: "Excaliall-${version}-windows-${arch}-setup.${ext}",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    deleteAppDataOnUninstall: false,
  },
  linux: {
    target: ["AppImage", "deb"],
    category: "Graphics",
    syncDesktopName: true,
    maintainer: "David Corr",
    icon: "../public/android-chrome-512x512.png",
    artifactName: "Excaliall-${version}-linux-${arch}.${ext}",
  },
  dmg: { title: "Excaliall ${version}" },
};
