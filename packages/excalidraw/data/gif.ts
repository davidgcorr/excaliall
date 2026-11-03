import { GIFEncoder, applyPalette, quantize } from "gifenc";

import { MIME_TYPES } from "@excalidraw/common";

import { AbortError } from "../errors";

export type GifExportOptions = {
  /** Length of the repeating clip, in seconds (1–10). Defaults to 3. */
  duration?: number;
  /** Frames per second (10 or 20). Defaults to 20. */
  fps?: 10 | 20;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

export const validateGifOptions = (options: GifExportOptions = {}) => {
  const { duration = 3, fps = 20, signal } = options;
  if (signal?.aborted) {
    throw new AbortError();
  }
  if (
    !Number.isFinite(duration) ||
    duration < 1 ||
    duration > 10 ||
    ![10, 20].includes(fps)
  ) {
    throw new Error(
      "GIF duration must be between 1 and 10 seconds, at 10 or 20 fps.",
    );
  }
};

/** Encode one frame at a time so we never retain all the full RGBA frames. */
export const encodeGif = async (
  renderFrame: (time: number) => HTMLCanvasElement,
  options: GifExportOptions = {},
): Promise<Blob> => {
  validateGifOptions(options);
  const { duration = 3, fps = 20, signal, onProgress } = options;
  const encoder = GIFEncoder();
  const frameCount = Math.round(duration * fps);
  const delay = 1000 / fps;
  onProgress?.(0);

  for (let frame = 0; frame < frameCount; frame++) {
    if (signal?.aborted) {
      throw new AbortError();
    }
    const canvas = renderFrame(frame * delay);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create a canvas context for GIF export.");
    }
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = false;
    // GIF supports binary transparency. Normalize before palette mapping so
    // antialiased pixels map consistently and transparent pixels share a color.
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] < 128) {
        data[offset] =
          data[offset + 1] =
          data[offset + 2] =
          data[offset + 3] =
            0;
        transparent = true;
      } else {
        data[offset + 3] = 255;
      }
    }
    const format = transparent ? "rgba4444" : "rgb565";
    const palette = quantize(data, 256, { format, oneBitAlpha: true });
    const index = applyPalette(data, palette, format);
    const transparentIndex = transparent
      ? palette.findIndex((color) => color[3] === 0)
      : -1;
    encoder.writeFrame(index, canvas.width, canvas.height, {
      palette,
      delay,
      repeat: 0,
      transparent: transparentIndex >= 0,
      transparentIndex: Math.max(0, transparentIndex),
      // Restore the background before every full frame, preventing trails.
      dispose: 2,
    });
    onProgress?.((frame + 1) / frameCount);
    // Yield to this canvas's window so progress, cancellation, and the editor
    // stay responsive even when exporting outside the main document.
    const ownerWindow = canvas.ownerDocument.defaultView;
    if (ownerWindow) {
      await new Promise<void>((resolve) => ownerWindow.setTimeout(resolve, 0));
    }
  }
  if (signal?.aborted) {
    throw new AbortError();
  }
  encoder.finish();
  return new Blob([encoder.bytes()], { type: MIME_TYPES.gif });
};
