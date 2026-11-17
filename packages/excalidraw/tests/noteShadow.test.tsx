import React from "react";

import { getStickyNoteShadow } from "@excalidraw/element";

import { restoreElements } from "../data/restore";
import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { act, fireEvent, render } from "./test-utils";

const { h } = window;

describe("note shadow controls", () => {
  it("changes strength and distance independently and supports undo", async () => {
    const note = API.createElement({ type: "stickynote" });
    const { getByTestId } = await render(
      <Excalidraw handleKeyboardGlobally initialData={{ elements: [note] }} />,
    );
    act(() => API.setSelectedElements([note]));
    expect(getByTestId("note-shadow-strength")).toHaveValue("16");
    expect(getByTestId("note-shadow-distance")).toHaveValue("3");
    fireEvent.change(getByTestId("note-shadow-strength"), {
      target: { value: "40" },
    });
    fireEvent.change(getByTestId("note-shadow-distance"), {
      target: { value: "9" },
    });
    expect(getStickyNoteShadow(h.elements[0] as typeof note)).toEqual({
      blur: 4,
      opacity: 0.4,
      offset: 9,
    });
    fireEvent.change(getByTestId("note-shadow-diffusion"), {
      target: { value: "10" },
    });
    expect(getStickyNoteShadow(h.elements[0] as typeof note).blur).toBe(10);
    Keyboard.undo();
    expect(getStickyNoteShadow(h.elements[0] as typeof note).blur).toBe(4);
    Keyboard.undo();
    expect(getStickyNoteShadow(h.elements[0] as typeof note)).toEqual({
      blur: 4,
      opacity: 0.4,
      offset: 3,
    });
    Keyboard.redo();
    expect(getStickyNoteShadow(h.elements[0] as typeof note)).toEqual({
      blur: 4,
      opacity: 0.4,
      offset: 9,
    });
    const [restored] = restoreElements(
      JSON.parse(JSON.stringify(h.elements)),
      null,
    );
    expect(getStickyNoteShadow(restored as typeof note)).toEqual({
      blur: 4,
      opacity: 0.4,
      offset: 9,
    });
    fireEvent.change(getByTestId("note-shadow-strength"), {
      target: { value: "0" },
    });
    expect(getStickyNoteShadow(h.elements[0] as typeof note).opacity).toBe(0);
  });

  it("updates selected notes together without changing other elements", async () => {
    const first = API.createElement({ type: "stickynote" });
    const second = API.createElement({ type: "stickynote" });
    const rectangle = API.createElement({ type: "rectangle" });
    const { getByTestId } = await render(
      <Excalidraw initialData={{ elements: [first, second, rectangle] }} />,
    );
    act(() => API.setSelectedElements([first, second, rectangle]));
    fireEvent.change(getByTestId("note-shadow-distance"), {
      target: { value: "12" },
    });
    expect(
      h.elements
        .slice(0, 2)
        .map((note) => getStickyNoteShadow(note as typeof first).offset),
    ).toEqual([12, 12]);
    expect(h.elements[2]).not.toHaveProperty("shadowOffset");
  });

  it("preserves old note defaults and safely handles invalid saved values", () => {
    const note = API.createElement({ type: "stickynote" });
    expect(getStickyNoteShadow(note)).toEqual({
      opacity: 0.16,
      offset: 3,
      blur: 4,
    });
    expect(
      getStickyNoteShadow({ ...note, shadowOpacity: 200, shadowOffset: -5 }),
    ).toEqual({ opacity: 1, offset: 0, blur: 4 });
    expect(
      getStickyNoteShadow({
        ...note,
        shadowOpacity: NaN,
        shadowOffset: Infinity,
      }),
    ).toEqual({ opacity: 0.16, offset: 3, blur: 4 });
  });
});
