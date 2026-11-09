import { fileSave as nativeSave } from "browser-fs-access";

import { fileSave } from "../../data/filesystem";

vi.mock("browser-fs-access", () => ({
  fileSave: vi.fn(),
  fileOpen: vi.fn(),
  supported: true,
}));

const options = {
  name: "animation",
  extension: "gif" as const,
  description: "Animated GIF",
  ownerDocument: document,
};

describe("restricted browser export fallback", () => {
  const createObjectURL = vi.fn(() => "blob:export");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps successful native saves and existing handles", async () => {
    const handle = {} as FileSystemFileHandle;
    vi.mocked(nativeSave).mockResolvedValue(handle);
    const blob = new Blob(["GIF89a"], { type: "image/gif" });
    expect(await fileSave(blob, { ...options, fileHandle: handle })).toBe(
      handle,
    );
    expect(nativeSave).toHaveBeenCalledWith(
      blob,
      expect.objectContaining({ fileName: "animation.gif" }),
      handle,
      false,
    );
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it.each(["SecurityError", "NotAllowedError"])(
    "downloads the original animated GIF after %s",
    async (name) => {
      vi.mocked(nativeSave).mockRejectedValue(
        new DOMException("Blocked", name),
      );
      const blob = new Blob(["GIF89a"], { type: "image/gif" });
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(function (this: HTMLAnchorElement) {
          expect(this.download).toBe("animation.gif");
          expect(this.href).toBe("blob:export");
          expect(this.isConnected).toBe(true);
        });
      expect(await fileSave(Promise.resolve(blob), options)).toBeNull();
      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(click).toHaveBeenCalledTimes(1);
      expect(document.querySelector('a[download="animation.gif"]')).toBeNull();
      expect(revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(30_000);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:export");
    },
  );

  it.each(["AbortError", "NotReadableError", "UnknownError"])(
    "does not download after %s",
    async (name) => {
      const error = new DOMException("Save failed", name);
      vi.mocked(nativeSave).mockRejectedValue(error);
      await expect(fileSave(new Blob(), options)).rejects.toBe(error);
      expect(createObjectURL).not.toHaveBeenCalled();
    },
  );
});
