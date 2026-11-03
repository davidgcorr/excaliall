# Embed an animated diagram in a web page

Open **☰ → Export image** (Cmd+Shift+E). The export respects **Only selected**, background, dark mode, and frame clipping.

## Paste a single iframe element

Choose **Copy iframe**, then paste the result into your page's HTML or HTML embed block. The iframe's `srcdoc` contains the complete diagram, fonts, images, and animation. There are no files to upload and no Excalidraw runtime, JavaScript, or CDN to install. Adjust the iframe's `height:480px` to fit your layout; its width defaults to 100%.

Your page builder must accept iframe elements and the `srcdoc` attribute. Some editors strip these attributes. In that case, use the hosted-file option below.

## Host a standalone HTML file

Choose **HTML** to save a standalone `.html` file. Upload it alongside your site, then embed it:

```html
<iframe
  src="/diagrams/my-diagram.html"
  title="My animated diagram"
  sandbox=""
  loading="lazy"
  style="width:100%;height:480px;border:0;display:block"
></iframe>
```

The file can also be opened directly in a browser without a server. The drawing scales to fit the iframe while preserving its aspect ratio. Background transparency follows the export setting. Dots, dashes, and pulse animations run continuously using native SVG animation, including their speed and direction. The GIF duration setting does not apply to HTML.

The export is a display of your diagram. It has no editor controls or embedded editable scene data, and hyperlinks are removed. Keep a separate `.excalidraw` file for future edits. Fonts and images are inlined; online embeds are represented by placeholders. Motion is hidden when the viewer requests reduced motion, leaving the static diagram visible.

The iframe uses an empty sandbox and the exported page blocks scripts and network requests. No `allow-scripts` or `allow-same-origin` permissions are needed. Your site's own content security policy must permit the iframe, inline styles, and data images/fonts; hosting the HTML file can help when a strict policy prevents `srcdoc` content.
