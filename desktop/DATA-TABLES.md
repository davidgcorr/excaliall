# Sketch data tables

Click the **table icon** in the central toolbar, or search **Insert data table** in the command palette (Cmd+/). The table is inserted and selected. On phones, the icon is in the bottom toolbar. Its editing controls appear in the normal properties side panel, and cells are editable directly on the canvas.

- Type in any header or cell. Tab moves between cells.
- Paste a rectangular range copied from Excel, Google Sheets, or a TSV file into a cell. Rows and columns expand to fit, up to 100 rows and 12 columns. Each cell supports 500 characters.
- Use the small **Add row / Add column** icons attached to the table’s top edge to expand it. Focus a cell before using **Delete row / Delete column** in that same on-table toolbar to remove its row or column. The last column cannot be removed.
- Use the same **Stroke** and **Background** palettes as other Excalidraw elements: quick picks plus the full color picker, including transparency and custom colors.
- Choose **Hachure**, **Cross-hatch**, or **Solid** fill; Alt-click Hachure for Zigzag. A chosen background applies to the table body.
- Choose the standard **Thin / Medium / Bold** stroke width and **Solid / Dashed / Dotted** stroke style.
- **Edges → Round** curves the table's actual border and clips its fill and grid to the rounded outline. It does not round the containing image. **Sharp** restores square corners.
- Choose the standard roughness buttons: **Architect** (0), **Artist** (1), or **Cartoonist** (2), just like ordinary Excalidraw elements. Existing fractional settings remain saved until you choose a preset.
- Scroll horizontally or vertically to pan the canvas while editing large tables.
- Click an empty part of the canvas or select another element to save the table automatically as one undoable change. Escape or Cmd/Ctrl+Enter from a cell also deselects and saves. No Save button is required. Deselect before exporting to include your latest edits.

Select a saved table to reopen its properties and editable cells. You can also double-click it, right-click → **Edit table data**, or select it and search **Edit table data** in the command palette. Editing preserves its identity, position, rotation, grouping, and bindings. Adding/removing rows or columns adjusts the dimensions while preserving the existing cell scale. Locked tables and view-only canvases cannot be edited.

Tables use the [shadcn DataTable composition pattern](https://ui.shadcn.com/docs/components/data-table), adapted Table primitives, and TanStack Table 8.21.3. The grid and hatching are drawn by the bundled rough.js renderer. Editing happens in HTML inputs positioned over the table on the canvas; no external service is used.

The current table is saved as an SVG image, with editable headers, rows, and styling in `customData.dataTable`. `.excalidraw` files retain both the data and rendered image for offline reopening. PNG, SVG, GIF, and standalone HTML/iframe exports contain the rendered table; those display exports do not contain editable HTML inputs. Save a separate `.excalidraw` file to keep editing it.

This first version edits plain text values. Spreadsheet formulas, merged cells, live data URLs, sorting, filtering, and pagination are not implemented. Pasted formula results are treated as text.

Choose **Borders** in the table properties to select **Full** (default), **Outer**, **Inner**, or **Rows** using the icon buttons. Rows draws horizontal separators plus top and bottom lines; Inner omits the outside border. Border choices are saved with the table and included in exports.

**Borders** sits immediately below **Stroke width**. **Fill area** chooses the header only, the entire table (default), a full header with alternating body columns, or alternating entire columns including their headers. The selected background color and fill pattern apply to those areas; the other cells stay transparent.

## Import table data

Select a table and click its **Import table data** icon beside the on-table row and column controls. Choose a CSV, JSON or Excel `.xlsx` file, or paste CSV/JSON. For Excel, choose the worksheet to import. Review the preview, then choose **Replace table data** to replace all headers and rows while keeping the table's colors, fill, borders and other styling. Canceling or an invalid file leaves the current table unchanged. Older `.xls` files must first be saved as `.xlsx` in Excel.

CSV and Excel use the first row as column names. JSON accepts an array of objects, an array of arrays with a header row, or `{ "columns": ["Name"], "rows": [["Value"]] }`. Blank cells are preserved. Existing table limits apply: 100 data rows, 12 columns and 500 characters per cell; files must be smaller than 5 MB.

## Row and column pagination

Use **Pagination → Rows per page / Columns per page** in the selected table's properties panel. Each axis can show all data or a chosen page size. Use the arrow icons below the table to move through row pages and column pages independently. Headers repeat on every page; edits and row/column operations use the original dataset positions.

The full dataset, page sizes and selected page are saved when you deselect the table. The canvas and visual exports show the current page; pagination never deletes off-page data. Importing replacement data resets both page positions while retaining the chosen page sizes.
