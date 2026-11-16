import {
  fileOpen as nativeOpen,
  fileSave as nativeSave,
} from "browser-fs-access";

import { MIME_TYPES } from "@excalidraw/common";

import { fileOpen, fileSave } from "../../data/filesystem";

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

describe("restricted browser upload fallback", () => {
  const openOptions = {
    description: "Excalidraw files",
    ownerDocument: document,
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(nativeOpen).mockReset();
  });

  it("preserves successful native opens and their file handles", async () => {
    const file = new File(["{}"], "drawing.json", { type: "application/json" });
    const handle = {} as FileSystemFileHandle;
    Object.assign(file, { handle });
    vi.mocked(nativeOpen).mockResolvedValue(file);
    expect(await fileOpen(openOptions)).toBe(file);
    expect(file.handle).toBe(handle);
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it.each(["SecurityError", "NotAllowedError"])(
    "opens a downloaded drawing with a standard file input after %s",
    async (name) => {
      vi.mocked(nativeOpen).mockRejectedValue(
        new DOMException("Blocked", name),
      );
      const file = new File(["{}"], "drawing.excalidraw");
      const click = vi
        .spyOn(HTMLInputElement.prototype, "click")
        .mockImplementation(function (this: HTMLInputElement) {
          expect(this.ownerDocument).toBe(document);
          expect(this.isConnected).toBe(true);
          expect(this.multiple).toBe(false);
          // Scene loading intentionally permits any extension.
          expect(this.accept).toBe("");
          Object.defineProperty(this, "files", { value: [file] });
          this.dispatchEvent(new Event("change"));
        });
      expect(await fileOpen(openOptions)).toMatchObject({
        name: file.name,
        size: file.size,
        type: MIME_TYPES.excalidraw,
      });
      expect(click).toHaveBeenCalledTimes(1);
      expect(document.querySelector('input[type="file"]')).toBeNull();
    },
  );

  it("preserves multiple selection and JPEG extension filters", async () => {
    vi.mocked(nativeOpen).mockRejectedValue(
      new DOMException("Blocked", "SecurityError"),
    );
    const files = [new File(["a"], "one.jpg"), new File(["b"], "two.jpeg")];
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
      this: HTMLInputElement,
    ) {
      expect(this.multiple).toBe(true);
      expect(this.accept.split(",")).toEqual(["image/jpeg", ".jpg", ".jpeg"]);
      Object.defineProperty(this, "files", { value: files });
      this.dispatchEvent(new Event("change"));
    });
    expect(
      await fileOpen({ ...openOptions, extensions: ["jpg"], multiple: true }),
    ).toEqual(files);
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it.each(["cancel", "change"])(
    "cleans up a cancelled upload (%s)",
    async (event) => {
      vi.mocked(nativeOpen).mockRejectedValue(
        new DOMException("Blocked", "SecurityError"),
      );
      vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(
        function (this: HTMLInputElement) {
          this.dispatchEvent(new Event(event));
        },
      );
      await expect(fileOpen(openOptions)).rejects.toMatchObject({
        name: "AbortError",
      });
      expect(document.querySelector('input[type="file"]')).toBeNull();
    },
  );

  it.each(["AbortError", "NotReadableError", "UnknownError"])(
    "does not reopen the picker after %s",
    async (name) => {
      const error = new DOMException("Open failed", name);
      vi.mocked(nativeOpen).mockRejectedValue(error);
      const click = vi.spyOn(HTMLInputElement.prototype, "click");
      await expect(fileOpen(openOptions)).rejects.toBe(error);
      expect(click).not.toHaveBeenCalled();
    },
  );
});

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
