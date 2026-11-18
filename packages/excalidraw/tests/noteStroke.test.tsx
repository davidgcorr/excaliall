import React from "react";

import { COLOR_PALETTE } from "@excalidraw/common";
import { getStickyNoteOutlineShape } from "@excalidraw/element";

import { actionChangeNoteOutlineColor } from "../actions/actionNoteOutline";
import { restoreElements } from "../data/restore";
import { Excalidraw } from "../index";
import { exportScene } from "../scene/export";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { act, fireEvent, render } from "./test-utils";

const { h } = window;

describe("note stroke controls", () => {
  it("styles the paper outline independently of text and persists it in exports", async () => {
    const note = API.createElement({
      type: "stickynote",
      strokeColor: "#1e1e1e",
    });
    const { getByTestId } = await render(
      <Excalidraw handleKeyboardGlobally initialData={{ elements: [note] }} />,
    );
    act(() => API.setSelectedElements([note]));
    const controls = getByTestId("note-stroke-color-controls");
    const red = COLOR_PALETTE.red[4];
    fireEvent.click(controls.querySelector(`button[title="${red}"]`)!);
    fireEvent.click(getByTestId("strokeWidth-bold"));
    const live = () => h.elements[0] as typeof note;
    expect(live().outlineColor).toBe(red);
    expect(live().strokeColor).toBe("#1e1e1e");
    expect(live().strokeWidth).toBe(4);
    expect(getStickyNoteOutlineShape(live())?.options).toMatchObject({
      stroke: red,
      strokeWidth: 4,
    });
    const [restored] = restoreElements(
      JSON.parse(JSON.stringify(h.elements)),
      null,
    );
    expect(
      getStickyNoteOutlineShape(restored as typeof note)?.options,
    ).toMatchObject({ stroke: red, strokeWidth: 4 });
    const svg = await exportScene({
      type: "svg",
      data: { elements: h.app.scene.getNonDeletedElements(), files: {} },
    });
    expect(
      svg.querySelector(`path[stroke="${red}"][stroke-width="4"]`),
    ).not.toBeNull();
    Keyboard.undo();
    expect(live().strokeWidth).toBe(note.strokeWidth);
    Keyboard.redo();
    expect(live().strokeWidth).toBe(4);
  });

  it("updates several selected notes, leaves other shapes alone, and allows no stroke", async () => {
    const first = API.createElement({ type: "stickynote", roughness: 0 });
    const second = API.createElement({ type: "stickynote" });
    const rectangle = API.createElement({ type: "rectangle" });
    await render(
      <Excalidraw initialData={{ elements: [first, second, rectangle] }} />,
    );
    act(() => API.setSelectedElements([first, second, rectangle]));
    act(() =>
      h.app.actionManager.executeAction(actionChangeNoteOutlineColor, "ui", {
        color: "#1971c2",
      }),
    );
    expect(h.elements[2]).not.toHaveProperty("outlineColor");
    expect(
      getStickyNoteOutlineShape(h.elements[0] as typeof first)?.options,
    ).toMatchObject({ roughness: 0, stroke: "#1971c2" });
    act(() =>
      h.app.actionManager.executeAction(actionChangeNoteOutlineColor, "ui", {
        color: "transparent",
      }),
    );
    expect(
      h.elements
        .slice(0, 2)
        .map((note) => getStickyNoteOutlineShape(note as typeof first)),
    ).toEqual([null, null]);
  });
});
