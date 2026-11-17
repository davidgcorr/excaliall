import {
  getStickyNotePathCommands,
  getStickyNoteShadow,
  getStickyNoteShadowPadding,
} from "./stickyNote";

import type { RenderEnvironment } from "./renderEnvironment";
import type { ExcalidrawStickyNoteElement } from "./types";

/** Three separable box passes approximate a Gaussian without browser filter bounds. */
export const blurShadowAlpha = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  sigma: number,
) => {
  if (sigma <= 0) {
    return;
  }
  const alpha = new Float32Array(width * height);
  const temporary = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    alpha[i] = pixels[i * 4 + 3];
  }
  const ideal = Math.sqrt(4 * sigma * sigma + 1);
  const lower = Math.max(
    1,
    Math.floor(ideal) % 2 ? Math.floor(ideal) : Math.floor(ideal) - 1,
  );
  const lowerPasses = Math.round(
    (12 * sigma * sigma - 3 * lower * lower - 12 * lower - 9) /
      (-4 * lower - 4),
  );
  for (let pass = 0; pass < 3; pass++) {
    const radius = ((pass < lowerPasses ? lower : lower + 2) - 1) / 2;
    const diameter = radius * 2 + 1;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let sum = 0;
      for (let x = 0; x <= Math.min(radius, width - 1); x++) {
        sum += alpha[row + x];
      }
      for (let x = 0; x < width; x++) {
        temporary[row + x] = sum / diameter;
        if (x - radius >= 0) {
          sum -= alpha[row + x - radius];
        }
        if (x + radius + 1 < width) {
          sum += alpha[row + x + radius + 1];
        }
      }
    }
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = 0; y <= Math.min(radius, height - 1); y++) {
        sum += temporary[y * width + x];
      }
      for (let y = 0; y < height; y++) {
        alpha[y * width + x] = sum / diameter;
        if (y - radius >= 0) {
          sum -= temporary[(y - radius) * width + x];
        }
        if (y + radius + 1 < height) {
          sum += temporary[(y + radius + 1) * width + x];
        }
      }
    }
  }
  for (let i = 0; i < alpha.length; i++) {
    pixels[i * 4 + 3] = Math.round(alpha[i]);
  }
};

export const createStickyNoteShadow = (
  element: ExcalidrawStickyNoteElement,
  scale: number,
  environment: RenderEnvironment,
) => {
  const padding = getStickyNoteShadowPadding(element);
  const width = element.width + padding * 2;
  const height = element.height + padding * 2;
  // Shadows stay inexpensive for very large notes or export resolutions.
  const pixelScale = Math.min(scale, 2048 / Math.max(width, height));
  const canvas = environment.createCanvas();
  canvas.width = Math.max(1, Math.ceil(width * pixelScale));
  canvas.height = Math.max(1, Math.ceil(height * pixelScale));
  const context = canvas.getContext("2d")!;
  context.scale(pixelScale, pixelScale);
  context.translate(padding, padding);
  context.fillStyle = "#000";
  context.beginPath();
  for (const command of getStickyNotePathCommands(element, { shadow: true })) {
    if (command.type === "move") {
      context.moveTo(command.point.x, command.point.y);
    } else if (command.type === "line") {
      context.lineTo(command.point.x, command.point.y);
    } else {
      context.quadraticCurveTo(
        command.control.x,
        command.control.y,
        command.point.x,
        command.point.y,
      );
    }
  }
  context.closePath();
  context.fill();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  blurShadowAlpha(
    pixels.data,
    canvas.width,
    canvas.height,
    getStickyNoteShadow(element).blur * pixelScale,
  );
  context.putImageData(pixels, 0, 0);
  return {
    canvas,
    padding,
    width: canvas.width / pixelScale,
    height: canvas.height / pixelScale,
  };
};
