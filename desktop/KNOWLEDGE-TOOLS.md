# LaTeX formulas and mind maps

Both tools are in the desktop and mobile toolbars, just before the final tools menu. They are also available by searching **Insert LaTeX formula** or **Insert mind map** in the command palette.

## LaTeX formulas

Choose the **Σ icon**, enter a mathematical LaTeX expression, and use the live preview. Fractions, roots, sums, integrals, AMS environments, matrices, and local `\newcommand` definitions are supported. Enter the expression directly, without `$` delimiters or a full LaTeX document. Choose **Normal** for conventional math typography or **Hand drawn** for a handwritten formula. In Hand drawn mode, choose **Patrick Hand** or **Caveat** and adjust **Handwritten variation**. The live preview follows all changes. Choose a font size (12–128) and a color using the standard swatches and palette, then choose **Insert formula**.

For example:

```latex
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
```

Double-click the formula, choose **Edit formula** in the selection properties or context menu, or use the command palette to edit it. Applying changes updates the same element and preserves its position, rotation, grouping, and resize scale. Undo/redo restores the earlier formula.

Formulas are rendered with the bundled [MathJax SVG renderer](https://docs.mathjax.org/en/v3.2/output/svg.html). Glyphs are paths within the saved SVG image: displaying or exporting a saved formula needs no external fonts or math service. Desktop rendering works offline; on the website, open the formula editor once online to cache the renderer before offline use. Input is limited to 5,000 characters, and invalid expressions show an error before insertion.

The handwritten option is inspired by [Tex2Hand](https://github.com/lihuss/Tex2Hand/blob/master/tex2hand.py): mathematical layout is preserved, ordinary letters/digits use real handwriting outlines, and small deterministic rotations, offsets, ink impressions, and curved rules give a pen-like finish. Specialized math glyphs keep their notation. This is an independently implemented browser renderer; Python, XeLaTeX, and an external conversion service are not needed. Rendering a saved formula again produces the same appearance.

Save a `.excalidraw` file to retain the source, size, and color in `customData.latex`. PNG, SVG, GIF, and HTML/iframe exports include its rendered appearance; use the `.excalidraw` file for later source editing.

## Handwriting fonts for regular text

**Caveat** and **Patrick Hand** are available in the normal **Font family → More fonts** picker, with previews and search. They can be pinned to the font quick picks, used for ordinary text and bound labels, and saved in drawings. Font files are bundled for desktop/offline use and included in normal SVG/HTML font embedding. Existing font IDs and the default Excalifont choice are unchanged.

Official sources: [Caveat](https://github.com/googlefonts/caveat), [Patrick Hand](https://github.com/google/fonts/tree/main/ofl/patrickhand). Both are distributed under the SIL Open Font License; notices are included with the source fonts and under `public/licenses/fonts` in the web/desktop distribution. Formula handwriting outlines are generated from these same fonts. To regenerate from the official regular TTF files, run `node scripts/fonts/build-handwriting.cjs <Caveat-Regular.ttf> <PatrickHand-Regular.ttf>`.

## Mind maps

Choose the **branching icon** to create a central topic and four colored branches, split between left and right. Each topic is a native rectangle with bound text, and each branch is a curved native arrow without an arrowhead. The root is boxed; other topics have an invisible container so their text and branches remain visually light. Main branches are thicker than sub-branches.

Select a topic or its branch to show **Mind map** in the side panel:

- **Topic:** edit its text; leaving the field applies the change and arranges the map. You can also double-click a topic to use the normal canvas text editor.
- **Branch color:** choose from the standard palette. The color applies to the selected topic, its descendants, and their connectors.
- **Add child / Add sibling:** grow the tree. A new child of the root is placed on the less populated side; a sibling stays on the same side.
- **Arrange map:** arrange all topics from their parent relationships while preserving the root’s position and native styling.
- **Switch side:** move a main branch and its descendants to the other side of the root.
- **Delete branch:** remove a topic, its descendants, labels, and connectors. Undo restores them.

Drag topics with the normal selection tool; connectors use native bindings. Normal stroke, fill, font, and roughness controls remain available. Manually moving topics does not force a new layout; use **Arrange map** when wanted. Locked maps cannot be rearranged, and locked branches cannot be edited or deleted through these controls. Each map supports up to 1,000 topics.

Mind maps are ordinary editable canvas elements with parent/side metadata in `customData.mindMap` and connector metadata in `customData.mindMapEdge`. Save the `.excalidraw` file to retain the tree controls. Native text, curves, colors, and existing element animations are included in normal exports.
