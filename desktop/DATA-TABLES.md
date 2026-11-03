# Sketch data tables

Click the **table icon** in the central toolbar, or search **Insert data table** in the command palette (Cmd+/). The table is inserted and selected. Its editing controls appear in the normal properties side panel, and cells are editable directly on the canvas.

- Type in any header or cell. Tab moves between cells.
- Paste a rectangular range copied from Excel, Google Sheets, or a TSV file into a cell. Rows and columns expand to fit, up to 100 rows and 12 columns. Each cell supports 500 characters.
- Use the small **Add row / Add column** icons attached to the table’s top edge to expand it. Focus a cell before using **Delete row / Delete column** in that same on-table toolbar to remove its row or column. The last column cannot be removed.
- Use the same **Stroke** and **Background** palettes as other Excalidraw elements: quick picks plus the full color picker, including transparency and custom colors.
- Choose **Hachure**, **Cross-hatch**, or **Solid** fill; Alt-click Hachure for Zigzag. A chosen background applies to the table body.
- Choose the standard **Thin / Medium / Bold** stroke width and **Solid / Dashed / Dotted** stroke style.
- **Edges → Round** curves the table's actual border and clips its fill and grid to the rounded outline. It does not round the containing image. **Sharp** restores square corners.
- Adjust **Roughness** for the sketch effect.
- Scroll horizontally or vertically to pan the canvas while editing large tables.
- Click an empty part of the canvas or select another element to save the table automatically as one undoable change. Escape or Cmd/Ctrl+Enter from a cell also deselects and saves. No Save button is required. Deselect before exporting to include your latest edits.

Select a saved table to reopen its properties and editable cells. You can also double-click it, right-click → **Edit table data**, or select it and search **Edit table data** in the command palette. Editing preserves its identity, position, rotation, grouping, and bindings. Adding/removing rows or columns adjusts the dimensions while preserving the existing cell scale. Locked tables and view-only canvases cannot be edited.

Tables use the [shadcn DataTable composition pattern](https://ui.shadcn.com/docs/components/data-table), adapted Table primitives, and TanStack Table 8.21.3. The grid and hatching are drawn by the bundled rough.js renderer. Editing happens in HTML inputs positioned over the table on the canvas; no external service is used.

The current table is saved as an SVG image, with editable headers, rows, and styling in `customData.dataTable`. `.excalidraw` files retain both the data and rendered image for offline reopening. PNG, SVG, GIF, and standalone HTML/iframe exports contain the rendered table; those display exports do not contain editable HTML inputs. Save a separate `.excalidraw` file to keep editing it.

This first version edits plain text values. Spreadsheet formulas, merged cells, live data URLs, sorting, filtering, and pagination are not implemented. Pasted formula results are treated as text.
