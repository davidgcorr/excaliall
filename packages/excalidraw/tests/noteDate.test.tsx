import React from "react";

import {
  getStickyNoteFooter,
  isPointInStickyNoteFooter,
} from "@excalidraw/element";
import {
  pointFrom,
  pointRotateRads,
  type GlobalPoint,
  type Radians,
} from "@excalidraw/math";

import { restoreElements } from "../data/restore";
import { Excalidraw } from "../index";
import { exportScene } from "../scene/export";

import { API } from "./helpers/api";
import { Keyboard, Pointer } from "./helpers/ui";
import { fireEvent, render } from "./test-utils";

const { h } = window;
const mouse = new Pointer("mouse");

describe("editable note date", () => {
  it("opens from the footer, saves separately from creation time, and supports undo and export", async () => {
    const note = API.createElement({
      type: "stickynote",
      x: 100,
      y: 100,
      width: 250,
      height: 250,
      created: new Date(2025, 2, 7, 12).getTime(),
    });
    const { getByTestId, queryByTestId } = await render(
      <Excalidraw handleKeyboardGlobally initialData={{ elements: [note] }} />,
    );
    const footer = getStickyNoteFooter(note)!;
    mouse.doubleClickAt(note.x + footer.x - 10, note.y + footer.y - 5);
    const input = getByTestId("note-date-editor");
    expect(input).toHaveValue("2025-03-07");
    fireEvent.change(input, { target: { value: "2024-06-15" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(queryByTestId("note-date-editor")).toBeNull();
    const live = () => h.elements[0] as typeof note;
    expect(live().noteDate).toBe("2024-06-15");
    expect(live().created).toBe(note.created);
    expect(getStickyNoteFooter(live())?.text).toBe("15 Jun 2024");
    const [restored] = restoreElements(
      JSON.parse(JSON.stringify(h.elements)),
      null,
    );
    expect(getStickyNoteFooter(restored as typeof note)?.text).toBe(
      "15 Jun 2024",
    );
    const svg = await exportScene({
      type: "svg",
      data: { elements: h.app.scene.getNonDeletedElements(), files: {} },
    });
    expect(svg.textContent).toContain("15 Jun 2024");
    expect(
      svg.querySelector("feGaussianBlur")?.getAttribute("stdDeviation"),
    ).toBe("4");
    Keyboard.undo();
    expect(live().noteDate).toBeUndefined();
    Keyboard.redo();
    expect(live().noteDate).toBe("2024-06-15");
  });

  it("cancels with Escape and commits on blur", async () => {
    const note = API.createElement({
      type: "stickynote",
      x: 100,
      y: 100,
      width: 250,
      height: 250,
    });
    const { getByTestId, queryByTestId } = await render(
      <Excalidraw initialData={{ elements: [note] }} />,
    );
    const footer = getStickyNoteFooter(note)!;
    const open = () =>
      mouse.doubleClickAt(note.x + footer.x - 10, note.y + footer.y - 5);
    open();
    fireEvent.change(getByTestId("note-date-editor"), {
      target: { value: "2024-06-15" },
    });
    fireEvent.keyDown(getByTestId("note-date-editor"), { key: "Escape" });
    expect(queryByTestId("note-date-editor")).toBeNull();
    expect((h.elements[0] as typeof note).noteDate).toBeUndefined();
    open();
    fireEvent.change(getByTestId("note-date-editor"), {
      target: { value: "2024-06-15" },
    });
    fireEvent.blur(getByTestId("note-date-editor"));
    expect((h.elements[0] as typeof note).noteDate).toBe("2024-06-15");
  });

  it("hits the date on rotated notes without intercepting the body", () => {
    const note = {
      ...API.createElement({ type: "stickynote", width: 250, height: 250 }),
      angle: (Math.PI / 4) as Radians,
    };
    const footer = getStickyNoteFooter(note)!;
    const hit = pointRotateRads(
      pointFrom<GlobalPoint>(note.x + footer.x - 10, note.y + footer.y - 5),
      pointFrom<GlobalPoint>(note.x + 125, note.y + 125),
      note.angle,
    );
    expect(isPointInStickyNoteFooter(note, { x: hit[0], y: hit[1] })).toBe(
      true,
    );
    expect(
      isPointInStickyNoteFooter(note, { x: note.x + 125, y: note.y + 125 }),
    ).toBe(false);
    expect(getStickyNoteFooter({ ...note, noteDate: "2024-02-31" })?.text).toBe(
      getStickyNoteFooter(note)?.text,
    );
  });
});
