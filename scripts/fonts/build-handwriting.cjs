// Usage: node scripts/fonts/build-handwriting.cjs Caveat-Regular.ttf PatrickHand-Regular.ttf
// Official sources and OFL notices: packages/excalidraw/fonts/{Caveat,PatrickHand}.
const fs = require("node:fs");
const path = require("node:path");
const { Font } = require("fonteditor-core");
const { compress } = require("wawoff2");
const glyf2svg = require("fonteditor-core/lib/ttf/util/glyf2svg").default;

async function main() {
  const root = path.resolve(__dirname, "../..");
  for (const [index, name] of ["Caveat", "PatrickHand"].entries()) {
    const input = process.argv[index + 2];
    if (!input) {
      throw new Error(
        "Supply the official Caveat and Patrick Hand regular TTF files.",
      );
    }
    const buffer = fs.readFileSync(input);
    const font = Font.create(buffer, { type: "ttf" }).get();
    const dir = path.join(root, "packages/excalidraw/fonts", name);
    fs.writeFileSync(
      path.join(dir, `${name}-Regular.woff2`),
      await compress(buffer),
    );
    const glyphs = {};
    for (let code = 33; code <= 126; code++) {
      const glyph = font.glyf[font.cmap[code]];
      if (glyph?.contours?.length || glyph?.compound) {
        glyphs[String.fromCodePoint(code)] = {
          d: glyf2svg(glyph, font),
          xMin: glyph.xMin,
          yMin: glyph.yMin,
          xMax: glyph.xMax,
          yMax: glyph.yMax,
        };
      }
    }
    fs.mkdirSync(path.join(root, "public/licenses/fonts"), { recursive: true });
    fs.copyFileSync(
      path.join(dir, "OFL.txt"),
      path.join(root, `public/licenses/fonts/${name}-OFL.txt`),
    );
    fs.writeFileSync(
      path.join(dir, "glyphs.json"),
      `${JSON.stringify(glyphs, null, 2)}\n`,
    );
    console.log(
      `${name}: em=${font.head.unitsPerEm}, ascender=${
        font.hhea.ascent
      }, descender=${font.hhea.descent}, glyphs=${Object.keys(glyphs).length}`,
    );
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
