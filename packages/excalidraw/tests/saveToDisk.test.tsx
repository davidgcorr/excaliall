import { fileSave as nativeSave } from "browser-fs-access";

import { actionSaveToActiveFile } from "../actions/actionExport";
import { loadFromBlob } from "../data/blob";
import { Excalidraw } from "../index";
import { t } from "../i18n";

import { API } from "./helpers/api";
import { act, fireEvent, render, waitFor } from "./test-utils";

vi.mock("browser-fs-access", () => ({
  fileSave: vi.fn(),
  fileOpen: vi.fn(),
  supported: true,
}));

const { h } = window;

describe("save to disk", () => {
  const createObjectURL = vi.fn((_blob: Blob | MediaSource) => "blob:scene");

  beforeEach(() => {
    vi.mocked(nativeSave).mockReset();
    createObjectURL.mockClear();
    vi.spyOn(window.URL, "createObjectURL").mockImplementation(createObjectURL);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["SecurityError", "NotAllowedError"])(
    "saves an editable scene from the top-right button when the picker throws %s",
    async (name) => {
      vi.mocked(nativeSave).mockRejectedValue(
        new DOMException("Blocked", name),
      );
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(function (this: HTMLAnchorElement) {
          expect(this.download).toBe("My drawing.excalidraw");
        });
      const element = API.createElement({ type: "rectangle" });
      const { container, getByTestId } = await render(
        <Excalidraw
          name="My drawing"
          initialData={{ elements: [element] }}
          renderTopRightUI={() => <button>Share</button>}
        />,
      );
      const saveButton = getByTestId("save-to-disk-button");
      expect(saveButton.parentElement).toBe(
        container.querySelector(".layer-ui__wrapper__top-right"),
      );
      expect(saveButton.nextElementSibling).toBe(
        getByTestId("export-formats-button"),
      );
      expect(
        getByTestId("presentation-mode-button").nextElementSibling?.textContent,
      ).toBe("Share");
      expect(saveButton).toHaveAccessibleName(t("exportDialog.disk_title"));
      fireEvent.click(saveButton);

      await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      const scene = await loadFromBlob(blob, null, null);
      expect(scene.elements).toEqual([
        expect.objectContaining({ id: element.id, type: "rectangle" }),
      ]);
      await waitFor(() =>
        expect(h.state.toast?.message).toBe(t("toast.fileSaved")),
      );
      expect(h.state.fileHandle).toBeNull();
    },
  );

  it("falls back when saving to an existing file is blocked", async () => {
    vi.mocked(nativeSave).mockRejectedValue(
      new DOMException("Blocked", "NotAllowedError"),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    await render(<Excalidraw />);
    const fileHandle = { name: "drawing.excalidraw" } as FileSystemFileHandle;
    act(() => h.setState({ fileHandle }));
    API.executeAction(actionSaveToActiveFile);
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(h.state.fileHandle).toBeNull());
    expect(nativeSave).toHaveBeenCalledWith(
      expect.any(Promise),
      expect.any(Object),
      fileHandle,
      false,
    );
  });

  it("does not download or show success when the picker is cancelled", async () => {
    vi.mocked(nativeSave).mockRejectedValue(
      new DOMException("Cancelled", "AbortError"),
    );
    const { getByTestId } = await render(<Excalidraw />);
    fireEvent.click(getByTestId("save-to-disk-button"));
    await waitFor(() => expect(nativeSave).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(h.state.toast).toBeNull();
  });

  it.each([false, { saveFileToDisk: false }] as const)(
    "hides the shortcut when disk export is disabled (%j)",
    async (exportOption) => {
      const { queryByTestId } = await render(
        <Excalidraw UIOptions={{ canvasActions: { export: exportOption } }} />,
      );
      expect(queryByTestId("save-to-disk-button")).toBeNull();
    },
  );
});
