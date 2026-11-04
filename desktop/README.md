# Excaliall desktop

The desktop app bundles this checkout's editor and fonts. Drawing, animated connectors, local autosave, file import, and export work locally. Collaboration, shared libraries, and other online services still need internet access. The app stores its own drawing data in `~/Library/Application Support/excalidraw-animation-desktop`; browser data is separate. Save important drawings as `.excalidraw` files before upgrading.

## Install or upgrade on macOS

Download a DMG from [GitHub Releases](https://github.com/davidgcorr/excaliall/releases), or build one using the commands below. Open it and drag **Excaliall.app** to **Applications**. Quit any running copy before replacing the app, then launch it from Applications or Spotlight.

Use **☰ → Preferences / Preferencias** to read the installed version and build revision. **Excaliall → About** shows the native app version. Both use the version in `desktop/package.json`. Local builds with uncommitted changes show `-modified` after the Git revision; source archives without Git metadata show `unknown`.

## Install or upgrade on Windows

Download `Excaliall-<version>-windows-x64-setup.exe` from [Releases](https://github.com/davidgcorr/excaliall/releases), quit the existing app, and run the wizard. The default installation is per-user; the wizard lets you choose a directory and creates a desktop shortcut. Uninstalling does not delete your drawing data.

## Install or upgrade on Linux

Download the x64 `.AppImage` or `.deb` from [Releases](https://github.com/davidgcorr/excaliall/releases). For the AppImage:

```sh
chmod +x Excaliall-*-linux-x86_64.AppImage
./Excaliall-<version>-linux-x86_64.AppImage
```

Some distributions require FUSE 2 support to launch AppImages. Alternatively, install the Debian package with `sudo apt install ./Excaliall-<version>-linux-amd64.deb` (use the exact downloaded filename). Quit before replacing the executable or upgrading the package. Drawing data is normally under `~/.config/excalidraw-animation-desktop` on Linux and `%APPDATA%\excalidraw-animation-desktop` on Windows.

## Hide upstream promotions

Promotions are hidden by default in new installations. This hides the paid-service banner, sign-up/sign-in shortcuts, welcome-screen promotion, paid export/overwrite options, and paid command-palette entries. Choose **Show upstream promotions** in the same menu to restore them. Existing installations keep their saved preference. The preference is local to this installation; exported drawings do not carry it. Drawing, collaboration, local exports, libraries, and license notices remain available.

## Build and run from source

Install Node.js 22.12 or newer, then run from the repository root:

```sh
corepack yarn install --frozen-lockfile
corepack yarn desktop:install
corepack yarn desktop:dist
```

Open the installer in `desktop/dist` using the platform instructions above. Local builds target the current platform and architecture. To build a universal installer for Intel and Apple Silicon:

```sh
node desktop/scripts/build-web.cjs
npm --prefix desktop run dist:mac -- --universal
```

For development, `corepack yarn desktop:build` builds an unpacked app, and `corepack yarn desktop:start` runs the bundled editor. Rebuild after editing the editor. No dev server or Node.js installation is needed to run the installed app.

## Windows and Linux builds

After `node desktop/scripts/build-web.cjs`, run `npm --prefix desktop run dist:windows` on Windows or `npm --prefix desktop run dist:linux` on Linux. Use `npm --prefix desktop run dist:mac -- --universal` on macOS. Cross-building Windows/Linux from a Mac uses the pinned official [electron-builder Docker image](https://www.electron.build/docs/features/multi-platform-build/). With Docker Desktop running:

```sh
corepack yarn desktop:dist:cross
```

This builds x64 Windows NSIS and Linux AppImage/Debian installers under `desktop/dist-cross`, using isolated Docker volumes for Linux dependencies and a read-only source mount. On macOS, Windows packaging uses the native NSIS extractor to avoid Wine under ARM emulation. It requires downloading the build image on first use. The native GitHub Actions matrix avoids Docker for releases.

Windows and Linux builds currently use manual upgrades from Releases. The existing signed macOS update flow is unchanged. Local unsigned builds and public downloads may show the operating system's standard unsigned-app prompt.

## Release a new version

Releases and update checks use <https://github.com/davidgcorr/excaliall>. Push this project to that repository. The workflow does not push code or publish releases on your behalf.

1. Bump `desktop/package.json` and its lockfile together:

   ```sh
   npm --prefix desktop version 0.1.12 --no-git-tag-version
   ```

2. Commit your changes, then tag that commit and push to your repository:

   ```sh
   git tag desktop-v0.1.12
   git push https://github.com/davidgcorr/excaliall.git HEAD
   git push https://github.com/davidgcorr/excaliall.git desktop-v0.1.12
   ```

3. GitHub Actions builds a universal macOS DMG/ZIP, Windows x64 NSIS installer, and Linux x64 AppImage/Debian package, then creates a **draft** release. Test the installer and publish the draft in GitHub Releases when ready. Drafts are invisible to the updater. Keep the ZIP, blockmaps, and `latest-mac.yml` attached to the release.

You can also run **Desktop release (macOS, Windows, Linux)** manually in Actions to download build artifacts without creating a release. Version tags must match the package version exactly. Use increasing stable versions (`0.1.0`, `0.1.1`, `0.2.0`).

See [feature milestone tags](MILESTONES.md) for the annotated history.

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

Choose **Excaliall → Check for Updates…** to check GitHub, download a new release, and choose when to restart. Save your drawing first. Unsigned builds open GitHub Releases for manual download. Upgrades preserve the app's data directory and use the same stable app identifier and origin. Automatic updates expect a public repository; never embed a GitHub token in the app for private releases.

References: [electron-builder updates](https://www.electron.build/docs/features/auto-update/) and [macOS signing](https://www.electron.build/code-signing-mac.html).

## Export animated diagrams as GIF

Select **Export image** from the editor menu (Cmd+Shift+E). When the diagram or selected elements contain animated lines or arrows, choose a **GIF duration** (1–10 seconds), then **GIF**. The clip loops at 20 frames per second and uses the current selection, background, dark mode, and scale settings. Progress and cancellation are available while encoding.

GIF supports a maximum of 256 colors per frame and binary transparency. Scene data cannot be embedded in GIF; save a separate `.excalidraw` file to keep the editable animation settings. For diagrams over 2 million pixels per frame, lower the export scale or export a smaller selection.

## Data-driven charts and embedding

Use **☰ → Data chart (roughViz)…** to import CSV/JSON or fetch a data URL. Select a chart to use the standard color palettes, fill styles, stroke widths and styles, and edit data-column mappings, title, X/Y axis titles, and roughness in the properties side panel. Double-click to open the CSV/JSON data-import dialog or refresh its source. See the [roughViz guide](ROUGHVIZ.md) for chart types, supported data, saving, and exports.

Use **Export image → HTML** or **Copy iframe** for standalone embedding; see the [HTML export guide](HTML-EXPORT.md).

## Animate arrows and lines

Select an arrow or line to show **Animate / Animar** in the properties side panel. Choose **Moving dots**, **Pulse**, or **Flowing dashes**, set speed (1×–5×), and choose forward or reverse direction. Choose **None** to stop the animation. The controls are also available in compact properties popovers and the right-click Animate submenu.

Multiple selected lines/arrows can be changed together. Speed and direction changes preserve each element's other animation settings; locked elements are left unchanged. Changes support undo/redo and are saved in `.excalidraw` files. GIF and standalone HTML exports preserve animations.

## Editable sketch tables

Click the **table icon** in the central toolbar to insert a rough.js data table. Use the small icon toolbar on the table to add/remove rows or columns. Use the properties side panel for standard color palettes, fill styles, stroke widths/styles, and the standard roughness buttons (Architect, Artist, Cartoonist). The edge selector rounds the actual table border and fill. Edit headers and cells directly on the canvas or paste spreadsheet ranges. Deselect the table to save changes automatically. Double-click a saved table or choose **Edit table data** from its context menu to edit it again. See the [data table guide](DATA-TABLES.md).
