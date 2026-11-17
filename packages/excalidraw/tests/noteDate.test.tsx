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

describe("editable note footer", () => {
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
    const input = getByTestId("note-footer-editor");
    expect(input).toHaveValue("7 Mar 2025");
    fireEvent.change(input, { target: { value: "Draft / David" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(queryByTestId("note-footer-editor")).toBeNull();
    const live = () => h.elements[0] as typeof note;
    expect(live().footerText).toBe("Draft / David");
    expect(live().created).toBe(note.created);
    expect(getStickyNoteFooter(live())?.text).toBe("Draft / David");
    const [restored] = restoreElements(
      JSON.parse(JSON.stringify(h.elements)),
      null,
    );
    expect(getStickyNoteFooter(restored as typeof note)?.text).toBe(
      "Draft / David",
    );
    const svg = await exportScene({
      type: "svg",
      data: { elements: h.app.scene.getNonDeletedElements(), files: {} },
    });
    expect(svg.textContent).toContain("Draft / David");
    expect(svg.querySelector("image[data-note-shadow]")).not.toBeNull();
    Keyboard.undo();
    expect(live().footerText).toBeUndefined();
    Keyboard.redo();
    expect(live().footerText).toBe("Draft / David");
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
    fireEvent.change(getByTestId("note-footer-editor"), {
      target: { value: "Draft / David" },
    });
    fireEvent.keyDown(getByTestId("note-footer-editor"), { key: "Escape" });
    expect(queryByTestId("note-footer-editor")).toBeNull();
    expect((h.elements[0] as typeof note).footerText).toBeUndefined();
    open();
    fireEvent.change(getByTestId("note-footer-editor"), {
      target: { value: "Draft / David" },
    });
    fireEvent.blur(getByTestId("note-footer-editor"));
    expect((h.elements[0] as typeof note).footerText).toBe("Draft / David");
  });

  it("keeps an empty footer deleted after reopening and allows editing it again", async () => {
    const note = API.createElement({
      type: "stickynote",
      x: 100,
      y: 100,
      width: 250,
      height: 250,
    });
    const { getByTestId } = await render(
      <Excalidraw initialData={{ elements: [note] }} />,
    );
    const footer = getStickyNoteFooter(note)!;
    const open = () =>
      mouse.doubleClickAt(note.x + footer.x - 10, note.y + footer.y - 5);
    open();
    fireEvent.change(getByTestId("note-footer-editor"), {
      target: { value: "" },
    });
    fireEvent.keyDown(getByTestId("note-footer-editor"), { key: "Enter" });
    const [restored] = restoreElements(
      JSON.parse(JSON.stringify(h.elements)),
      null,
    );
    expect(getStickyNoteFooter(restored as typeof note)?.text).toBe("");
    open();
    expect(getByTestId("note-footer-editor")).toHaveValue("");
    fireEvent.change(getByTestId("note-footer-editor"), {
      target: { value: "Review" },
    });
    fireEvent.keyDown(getByTestId("note-footer-editor"), { key: "Enter" });
    expect(getStickyNoteFooter(h.elements[0] as typeof note)?.text).toBe(
      "Review",
    );
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
