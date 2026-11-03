# Excalidraw Animation for macOS

The desktop app bundles this checkout's editor and fonts. Drawing, animated connectors, local autosave, file import, and export work locally. Collaboration, shared libraries, and other online services still need internet access. The app stores its own drawing data in `~/Library/Application Support/Excalidraw Animation`; browser data is separate. Save important drawings as `.excalidraw` files before upgrading.

## Install or upgrade

Download a DMG from [GitHub Releases](https://github.com/davidgcorr/excalidraw/releases), or build one using the commands below. Open it and drag **Excalidraw Animation.app** to **Applications**. Quit any running copy before replacing the app, then launch it from Applications or Spotlight.

Use **☰ → Preferences / Preferencias** to read the installed version and build revision. **Excalidraw Animation → About** shows the native app version. Both use the version in `desktop/package.json`. Local builds with uncommitted changes show `-modified` after the Git revision; source archives without Git metadata show `unknown`.

## Build and run on your Mac

Install Node.js 22.12 or newer, then run from the repository root:

```sh
corepack yarn install --frozen-lockfile
corepack yarn desktop:install
corepack yarn desktop:dist
```

Open the `.dmg` in `desktop/dist`, drag **Excalidraw Animation.app** to Applications, and launch it. Local builds target your Mac's architecture. To build a universal installer for Intel and Apple Silicon:

```sh
node desktop/scripts/build-web.cjs
npm --prefix desktop run dist -- --universal
```

For development, `corepack yarn desktop:build` builds an unpacked app, and `corepack yarn desktop:start` runs the bundled editor. Rebuild after editing the editor. No dev server or Node.js installation is needed to run the installed app.

## Release a new version

Releases and update checks use <https://github.com/davidgcorr/excalidraw>. Push this project to that repository. The workflow does not push code or publish releases on your behalf.

1. Bump `desktop/package.json` and its lockfile together:

   ```sh
   npm --prefix desktop version 0.1.3 --no-git-tag-version
   ```

2. Commit your changes, then tag that commit and push to your repository:

   ```sh
   git tag desktop-v0.1.3
   git push https://github.com/davidgcorr/excalidraw.git HEAD
   git push https://github.com/davidgcorr/excalidraw.git desktop-v0.1.3
   ```

3. GitHub Actions builds a universal DMG and update ZIP, then creates a **draft** release. Test the installer and publish the draft in GitHub Releases when ready. Drafts are invisible to the updater. Keep the ZIP, blockmaps, and `latest-mac.yml` attached to the release.

You can also run **macOS desktop release** manually in Actions to download build artifacts without creating a release. Version tags must match the package version exactly. Use increasing stable versions (`0.1.0`, `0.1.1`, `0.2.0`).

## Signing and automatic upgrades

Unsigned builds support manual upgrades: download the latest DMG and replace the app in Applications. macOS may require allowing your locally built app in System Settings → Privacy & Security on first launch.

For signed, notarized releases, add these GitHub Actions secrets:

| Secret | Value |
| --- | --- |
| `MAC_CERTIFICATE` | Base64-encoded Developer ID Application `.p12` certificate including its private key |
| `MAC_CERTIFICATE_PASSWORD` | Password used to export the `.p12` |
| `APPLE_ID` | Apple Developer account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for notarization |
| `APPLE_TEAM_ID` | Your Apple Developer team ID |

The workflow enables notarization and in-app updates when `MAC_CERTIFICATE` is present. Supply all five secrets together. For signed local builds, use the corresponding electron-builder environment variables (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) and set `DESKTOP_SIGNED=true`.

Choose **Excalidraw Animation → Check for Updates…** to check GitHub, download a new release, and choose when to restart. Save your drawing first. Unsigned builds open GitHub Releases for manual download. Upgrades preserve the app's data directory and use the same stable app identifier and origin. Automatic updates expect a public repository; never embed a GitHub token in the app for private releases.

References: [electron-builder updates](https://www.electron.build/docs/features/auto-update/) and [macOS signing](https://www.electron.build/code-signing-mac.html).

## Export animated diagrams as GIF

Select **Export image** from the editor menu (Cmd+Shift+E). When the diagram or selected elements contain animated lines or arrows, choose a **GIF duration** (1–10 seconds), then **GIF**. The clip loops at 20 frames per second and uses the current selection, background, dark mode, and scale settings. Progress and cancellation are available while encoding.

GIF supports a maximum of 256 colors per frame and binary transparency. Scene data cannot be embedded in GIF; save a separate `.excalidraw` file to keep the editable animation settings. For diagrams over 2 million pixels per frame, lower the export scale or export a smaller selection.
