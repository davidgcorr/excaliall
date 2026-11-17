import { blurShadowAlpha } from "../stickyNoteShadow";

describe("note shadow diffusion", () => {
  it("spreads the mask smoothly past its original rectangular bounds", () => {
    const size = 160;
    const pixels = new Uint8ClampedArray(size * size * 4);
    for (let y = 50; y < 110; y++) {
      for (let x = 50; x < 110; x++) {
        pixels[(y * size + x) * 4 + 3] = 255;
      }
    }
    blurShadowAlpha(pixels, size, size, 12);
    const alpha = (x: number, y: number) => pixels[(y * size + x) * 4 + 3];
    expect(alpha(40, 80)).toBeGreaterThan(0);
    expect(alpha(50, 80)).toBeGreaterThan(100);
    expect(alpha(50, 80)).toBeLessThan(150);
    for (let x = 0; x < 79; x++) {
      expect(alpha(x, 80)).toBeLessThanOrEqual(alpha(x + 1, 80));
      expect(alpha(x + 1, 80) - alpha(x, 80)).toBeLessThan(12);
      expect(alpha(x, 80)).toBe(alpha(159 - x, 80));
      expect(alpha(x, 0)).toBe(0);
      expect(alpha(0, x)).toBe(0);
    }
  });

  it("preserves a sharp shadow when diffusion is zero", () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0,
    ]);
    const before = pixels.slice();
    blurShadowAlpha(pixels, 3, 1, 0);
    expect(pixels).toEqual(before);
  });
});
