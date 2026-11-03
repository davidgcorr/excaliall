# Sketch data tables

Click the **table icon** in the central toolbar, or search **Insert data table** in the command palette (Cmd+/). The table opens directly on the canvas.

- Type in any header or cell. Tab moves between cells.
- Paste a rectangular range copied from Excel, Google Sheets, or a TSV file into a cell. Rows and columns expand to fit, up to 100 rows and 12 columns. Each cell supports 500 characters.
- Use **Add row / Add column** to expand the table. Focus a cell before choosing **Delete row / Delete column** to remove its row or column. The last column cannot be removed.
- Set **Color** and **Roughness** to customize the rough.js grid and header shading.
- Scroll horizontally or vertically to pan the canvas while editing large tables.
- Choose **Save table** or Cmd/Ctrl+Enter to apply the edit as one undoable change. **Cancel** or Escape discards the draft.

Double-click a saved table, right-click → **Edit table data**, or select it and search **Edit table data** in the command palette. Editing preserves its identity, position, rotation, grouping, and bindings. Adding/removing rows or columns adjusts the dimensions while preserving the existing cell scale. Locked tables and view-only canvases cannot be edited.

Tables use the [shadcn DataTable composition pattern](https://ui.shadcn.com/docs/components/data-table), adapted Table primitives, and TanStack Table 8.21.3. The grid and hatching are drawn by the bundled rough.js renderer. Editing happens in HTML inputs positioned over the table on the canvas; no external service is used.

The current table is saved as an SVG image, with editable headers, rows, and styling in `customData.dataTable`. `.excalidraw` files retain both the data and rendered image for offline reopening. PNG, SVG, GIF, and standalone HTML/iframe exports contain the rendered table; those display exports do not contain editable HTML inputs. Save a separate `.excalidraw` file to keep editing it.

This first version edits plain text values. Spreadsheet formulas, merged cells, live data URLs, sorting, filtering, and pagination are not implemented. Pasted formula results are treated as text.
