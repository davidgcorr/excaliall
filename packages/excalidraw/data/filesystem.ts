import {
  fileOpen as _fileOpen,
  fileSave as _fileSave,
  supported as nativeFileSystemSupported,
} from "browser-fs-access";

import { MIME_TYPES } from "@excalidraw/common";

import { normalizeFile } from "./blob";

type FILE_EXTENSION = Exclude<keyof typeof MIME_TYPES, "binary">;

export const fileOpen = async <M extends boolean | undefined = false>(opts: {
  extensions?: FILE_EXTENSION[];
  description: string;
  multiple?: M;
}): Promise<M extends false | undefined ? File : File[]> => {
  // an unsafe TS hack, alas not much we can do AFAIK
  type RetType = M extends false | undefined ? File : File[];

  const mimeTypes = opts.extensions?.reduce((mimeTypes, type) => {
    mimeTypes.push(MIME_TYPES[type]);

    return mimeTypes;
  }, [] as string[]);

  const extensions = opts.extensions?.reduce((acc, ext) => {
    if (ext === "jpg") {
      return acc.concat(".jpg", ".jpeg");
    }
    return acc.concat(`.${ext}`);
  }, [] as string[]);

  const files = await _fileOpen({
    description: opts.description,
    extensions,
    mimeTypes,
    multiple: opts.multiple ?? false,
  });

  if (Array.isArray(files)) {
    return (await Promise.all(
      files.map((file) => normalizeFile(file)),
    )) as RetType;
  }
  return (await normalizeFile(files)) as RetType;
};

export const fileSave = async (
  blob: Blob | Promise<Blob>,
  opts: {
    /** supply without the extension */
    name: string;
    /** file extension */
    extension: FILE_EXTENSION;
    mimeTypes?: string[];
    description: string;
    /** existing FileSystemFileHandle */
    fileHandle?: FileSystemFileHandle | null;
    /** Document of the mounted editor, used for download fallback. */
    ownerDocument?: Document;
  },
) => {
  try {
    return await _fileSave(
      blob,
      {
        fileName: `${opts.name}.${opts.extension}`,
        description: opts.description,
        extensions: [`.${opts.extension}`],
        mimeTypes: opts.mimeTypes,
      },
      opts.fileHandle,
      false,
    );
  } catch (error) {
    // Some managed browsers expose the picker but deny its use. Keep the
    // native path (including cancellation) intact and only retry restrictions.
    if (
      !opts.ownerDocument?.defaultView ||
      !error ||
      typeof error !== "object" ||
      !("name" in error) ||
      (error.name !== "SecurityError" && error.name !== "NotAllowedError")
    ) {
      throw error;
    }

    const ownerDocument = opts.ownerDocument;
    const ownerWindow = ownerDocument.defaultView!;
    const url = ownerWindow.URL.createObjectURL(await blob);
    const anchor = ownerDocument.createElement("a");
    anchor.href = url;
    anchor.download = `${opts.name}.${opts.extension}`;
    anchor.hidden = true;
    ownerDocument.body.append(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      // Allow the browser to consume the URL before releasing the export.
      ownerWindow.setTimeout(
        () => ownerWindow.URL.revokeObjectURL(url),
        30_000,
      );
    }
    return null;
  }
};

export { nativeFileSystemSupported };
