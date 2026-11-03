import { encodeGif } from "../../data/gif";
import { blobToArrayBuffer } from "../../data/blob";

// Read GIF blocks rather than relying on encoder implementation details.
const readGif = async (blob: Blob) => {
  const bytes = new Uint8Array(await blobToArrayBuffer(blob));
  const word = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
  const frames: {
    delay: number;
    transparent: boolean;
    disposal: number;
    data: number[];
  }[] = [];
  let offset = 13 + (bytes[10] & 0x80 ? 3 * 2 ** ((bytes[10] & 7) + 1) : 0);
  let delay = 0;
  let transparent = false;
  let disposal = 0;
  const blocks = () => {
    const data: number[] = [];
    let length = bytes[offset++];
    while (length) {
      data.push(...bytes.slice(offset, offset + length));
      offset += length;
      length = bytes[offset++];
    }
    return data;
  };
  while (offset < bytes.length && bytes[offset] !== 0x3b) {
    const marker = bytes[offset++];
    if (marker === 0x21) {
      const label = bytes[offset++];
      if (label === 0xf9) {
        transparent = !!(bytes[offset + 1] & 1);
        disposal = (bytes[offset + 1] >> 2) & 7;
        delay = word(offset + 2) * 10;
      }
      blocks();
    } else if (marker === 0x2c) {
      const packed = bytes[offset + 8];
      offset += 9 + (packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0);
      offset++; // LZW minimum code size
      frames.push({ delay, transparent, disposal, data: blocks() });
    } else {
      throw new Error(`Unexpected GIF block ${marker}`);
    }
  }
  return {
    header: String.fromCharCode(...bytes.slice(0, 6)),
    width: word(6),
    height: word(8),
    frames,
    bytes,
  };
};

const createFrames = (transparent = false) => {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 2;
  const context = canvas.getContext("2d")!;
  let time = 0;
  vi.spyOn(context, "getImageData").mockImplementation(() => {
    const pixels = new Uint8ClampedArray(4 * 2 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = (time < 500 ? i % 8 === 0 : i % 8 !== 0) ? 255 : 0;
      pixels[i + 2] = time < 500 ? 0 : 255;
      pixels[i + 3] = transparent && i === 0 ? 0 : 255;
    }
    return { data: pixels, width: 4, height: 2, colorSpace: "srgb" };
  });
  return vi.fn((timestamp: number) => {
    time = timestamp;
    return canvas;
  });
};

describe("animated GIF encoding", () => {
  it("writes timed, changing frames and an infinite loop", async () => {
    const render = createFrames();
    const progress = vi.fn();
    const blob = await encodeGif(render, {
      duration: 1,
      fps: 20,
      onProgress: progress,
    });
    const gif = await readGif(blob);
    expect(blob.type).toBe("image/gif");
    expect(gif.header).toBe("GIF89a");
    expect([gif.width, gif.height]).toEqual([4, 2]);
    expect(gif.frames).toHaveLength(20);
    expect(
      gif.frames.every((frame) => frame.delay === 50 && frame.disposal === 2),
    ).toBe(true);
    expect(gif.frames[0].data).not.toEqual(gif.frames[10].data);
    expect(String.fromCharCode(...gif.bytes)).toContain(
      "NETSCAPE2.0\x03\x01\x00\x00",
    );
    expect(render.mock.calls.map(([time]) => time)).toEqual(
      Array.from({ length: 20 }, (_, index) => index * 50),
    );
    expect(progress).toHaveBeenLastCalledWith(1);
  });

  it("encodes transparent frames with background disposal", async () => {
    const gif = await readGif(
      await encodeGif(createFrames(true), { duration: 1, fps: 10 }),
    );
    expect(gif.frames).toHaveLength(10);
    expect(
      gif.frames.every((frame) => frame.transparent && frame.disposal === 2),
    ).toBe(true);
  });

  it("stops rendering when cancelled and rejects invalid durations", async () => {
    const controller = new AbortController();
    const render = createFrames();
    await expect(
      encodeGif(render, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (progress > 0) {
            controller.abort();
          }
        },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(render).toHaveBeenCalledTimes(1);
    for (const duration of [0, NaN, Infinity, 11]) {
      await expect(encodeGif(render, { duration })).rejects.toThrow(
        "GIF duration",
      );
    }
  });
});
