# Excaliall

**Sketch ideas. Animate connections. Bring data onto the canvas.**

Excaliall combines freehand diagrams, animated connectors, data-driven graphs and editable tables in one sketch-style whiteboard. Built on Excalidraw, with desktop apps for macOS, Windows and Linux.

No ads or Excalidraw+ promotions by default. No separate Excaliall Plus edition.

[Download](https://github.com/davidgcorr/excalidraw/releases) · [Report an issue](https://github.com/davidgcorr/excalidraw/issues) · [Source code](https://github.com/davidgcorr/excalidraw)

## One canvas for ideas and data

| Feature | What you can do |
| --- | --- |
| **Draw** | Sketch diagrams with shapes, arrows, text and the familiar Excalidraw tools. |
| **Animate** | Add moving dots, pulses or flowing dashes to arrows and lines. Set speed and direction in the side panel. |
| **Graph** | Import CSV or JSON into roughViz charts. Edit colors, titles, axes, data columns and sketch styles. |
| **Tabulate** | Edit table cells directly on the canvas. Add or remove rows and columns with the table's icon controls; deselect to save. |
| **Share** | Export PNG, SVG, animated GIF or standalone HTML. Copy an iframe to embed a diagram in your page. |

Graphs and tables use the same color palettes, fill patterns, stroke controls and roughness presets as the rest of your drawing. Save a `.excalidraw` file to keep everything editable, including data and animation settings.

## Install

Choose an installer from [GitHub Releases](https://github.com/davidgcorr/excalidraw/releases):

| Platform | Download | Install |
| --- | --- | --- |
| macOS | `.dmg` | Open it and drag **Excaliall** into Applications. |
| Windows | `windows-x64-setup.exe` | Run the setup wizard. |
| Linux | `.AppImage` or `.deb` | Make the AppImage executable and launch it, or install the Debian package. |

The desktop app includes the editor and fonts; Node.js is not required. Drawing, local saving and exports work offline. Online collaboration and fetching remote data require an internet connection.

To upgrade, quit the app and install the newer release. Your local drawing data is retained. Older releases may still use the name **Excalidraw Animation**; quit that copy before opening Excaliall. Keep `.excalidraw` backups of important drawings.

Find the running version and Git revision under **☰ → Preferences / Preferencias**. See the [desktop guide](desktop/README.md) for installation details, signing and update support.

## Get started

- **Animate a connection:** select an arrow or line, then use **Animate** in the properties side panel.
- **Add a graph:** use the chart icon in the central toolbar, import CSV/JSON, then select the graph to edit its properties. Double-click to reopen the data editor.
- **Add a table:** use the table icon in the central toolbar, then edit headers and cells on the canvas. Changes save when you deselect it.
- **Embed a diagram:** open **Export image**, then choose **HTML** or **Copy iframe**. Animated connections keep moving in the exported HTML.

Detailed guides: [Graphs](desktop/ROUGHVIZ.md) · [Tables](desktop/DATA-TABLES.md) · [HTML and iframe export](desktop/HTML-EXPORT.md).

Promotional content is hidden on new installations. Existing installations retain their saved preference; use **☰ → Preferences → Hide upstream promotions** if needed.

## Run from source

Use Node.js 22.12 or newer. From the repository root:

```sh
corepack yarn install --frozen-lockfile
corepack yarn start
```

To build a desktop installer for your current platform:

```sh
corepack yarn desktop:install
corepack yarn desktop:dist
```

Installers are written to `desktop/dist`. The [desktop guide](desktop/README.md) covers platform-specific builds and GitHub releases. The reusable editor package is documented [here](packages/excalidraw/README.md).

## Open source

Excaliall is maintained at [davidgcorr/excalidraw](https://github.com/davidgcorr/excalidraw). Contributions and [feature requests](https://github.com/davidgcorr/excalidraw/issues) are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md) and the [feature milestones](desktop/MILESTONES.md).

Licensed under [MIT](LICENSE). Based on [Excalidraw](https://github.com/excalidraw/excalidraw), with graphs powered by [roughViz](https://github.com/davidgcorr/roughViz). Original copyright and dependency license notices are retained.
