# Data-driven roughViz charts

Choose **☰ → Data chart (roughViz)…** / **Gráfico de datos (roughViz)…**.

1. Paste CSV with a header row or JSON, import a `.csv`/`.json` file, or enter an HTTP(S) data URL and choose **Load / refresh data URL**.
2. Choose **Bar**, **Horizontal bar**, **Line**, **Scatter**, **Pie**, **Donut**, or **Stacked bar**.
3. Pick the label/X column and value/Y columns. Line and stacked bar support multiple value series; use Cmd-click to select them. Scatter requires numeric X and Y values.
4. Set a title, color, and roughness. Choose **Preview**, then **Insert chart**.

Example CSV:

```csv
Month,Revenue,Costs
Jan,40,22
Feb,65,35
Mar,52,29
Apr,85,43
```

JSON can be an array of rows (`[{"Month":"Jan","Revenue":40},…]`) or roughViz-style column arrays (`{"labels":["Jan","Feb"],"values":[40,65]}`). Each row must have the same columns. Limits: 1 MB, 500 rows, and 20 columns. Labels for bar charts must be unique. All value columns must contain finite numbers; non-scatter charts require non-negative values, and pie/donut need a positive total.

## Edit and refresh

Select one chart on the canvas and reopen the same menu item. Change its data, chart type, title, or styling, then choose **Update chart**. The update retains the element's identity, position, size, rotation, grouping, and bindings. Locked charts cannot be edited.

URLs are fetched only when you click **Load / refresh data URL**; there is no automatic polling. The source server must allow browser CORS requests. Private authenticated endpoints are not supported. The current data snapshot and source URL are saved with the diagram, so reopening a chart does not require internet access.

## Saving and exporting

A chart is stored as an SVG image element with its editable data/configuration in `customData.roughViz`. You can move, resize, rotate, group, duplicate, undo, and redo it like other image elements. Save a `.excalidraw` file to retain the data and future editing ability.

PNG, SVG, GIF, and standalone HTML/iframe exports include the chart's rendered appearance. These display exports do not retain an editable chart or live data connection. You can animate connector arrows around charts and export those animations normally.

The renderer is the user's [roughViz fork](https://github.com/davidgcorr/roughViz), pinned to commit `17c7ea86bfa2e9f1d76fbc8ebcff3f414d374d76`. Its source is bundled locally and runs in a disposable sandboxed frame when generating charts; SVG output is then stored in Excalidraw. No CDN or roughViz runtime is needed to display saved charts. Network and force-layout charts are not included in this integration.
