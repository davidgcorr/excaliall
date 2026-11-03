# Excalidraw Animation

Animated connectors, data-driven roughViz graphs, editable sketch tables, and standalone diagram exports. This fork is maintained at [davidgcorr/excalidraw](https://github.com/davidgcorr/excalidraw).

## Install

Download installers from [GitHub Releases](https://github.com/davidgcorr/excalidraw/releases):

| Platform | Installer | Installation |
| --- | --- | --- |
| macOS | `.dmg` (universal in CI; local builds match your Mac) | Open and drag the app into Applications. |
| Windows x64 | `windows-x64-setup.exe` | Run the setup wizard; no administrator access is required for a per-user installation. |
| Linux x64 | `.AppImage` or `.deb` | Make the AppImage executable and run it, or install the Debian package. |

The installed app runs without Node.js. Quit an older copy before upgrading. Save important drawings as `.excalidraw` files; upgrades preserve the application data directory. **☰ → Preferences / Preferencias** shows the running version and Git revision.

See the [desktop installation, build, signing, and release guide](desktop/README.md).

## Features

- Animated arrows and lines: dots, pulse, or dashes, with speed and direction controls in the selection side panel.
- [GIF export and standalone HTML / iframe embedding](desktop/HTML-EXPORT.md).
- [Data-driven roughViz graphs](desktop/ROUGHVIZ.md) from CSV, JSON, and data URLs. Select to edit styling, columns, titles, and axes; double-click to edit/import data.
- [Editable sketch tables](desktop/DATA-TABLES.md), with on-table row/column icons, native color/fill/stroke/roughness controls, and actual rounded table corners. Deselect to save edits.
- PNG/SVG export, offline editing, fonts bundled in the desktop app, local autosave, and the original Excalidraw drawing tools.
- **☰ → Preferences → Hide upstream promotions** hides Excalidraw+ banners, sign-up links, paid-service commands, and paid export options. The choice is saved locally and can be reversed from the same menu.

## Build from source

Use Node.js 22.12 or newer:

```sh
corepack yarn install --frozen-lockfile
corepack yarn desktop:install
corepack yarn desktop:dist
```

Installers appear in `desktop/dist`. This command builds for the current platform. Explicit packaging commands, after building the editor, are:

```sh
node desktop/scripts/build-web.cjs
npm --prefix desktop run dist:mac -- --universal
npm --prefix desktop run dist:windows
npm --prefix desktop run dist:linux
```

Use the corresponding native OS or the documented Docker builder for Windows/Linux. GitHub Actions builds all three platforms on native runners and creates a draft release for `desktop-v*` tags. Nothing is published automatically.

For browser development, run `corepack yarn start`. For the reusable editor package, see [packages/excalidraw/README.md](packages/excalidraw/README.md).

## Project links

- [Source](https://github.com/davidgcorr/excalidraw)
- [Issues and feature requests](https://github.com/davidgcorr/excalidraw/issues)
- [Releases](https://github.com/davidgcorr/excalidraw/releases)
- [Feature milestone tags](desktop/MILESTONES.md)
- [Contributing](CONTRIBUTING.md)

## License and attribution

MIT; see [LICENSE](LICENSE). Based on the original [Excalidraw project](https://github.com/excalidraw/excalidraw). Original copyright and dependency license notices are retained. The roughViz integration uses [davidgcorr/roughViz](https://github.com/davidgcorr/roughViz).
