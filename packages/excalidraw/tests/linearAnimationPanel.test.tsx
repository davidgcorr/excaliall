import React from "react";

import { isLinearElement } from "@excalidraw/element";

import { Excalidraw } from "../index";
import { restoreElements } from "../data/restore";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { render, screen, fireEvent } from "./test-utils";

const { h } = window;
const getArrow = (id: string) => {
  const element = h.elements.find((element) => element.id === id)!;
  if (!isLinearElement(element)) {
    throw new Error("Expected a linear element");
  }
  return element;
};

describe("selected arrow animation controls", () => {
  it("enables, configures, undoes, and disables animation from the side panel", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    const arrow = API.createElement({ type: "arrow" });
    API.setElements([arrow]);
    API.setSelectedElements([arrow]);
    expect(
      screen.getByTestId("selected-animation-controls"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("selection-animation-speed")).toBeDisabled();
    fireEvent.change(screen.getByTestId("selection-animation-type"), {
      target: { value: "dots" },
    });
    expect(getArrow(arrow.id).animation).toEqual({
      type: "dots",
      speed: 3,
      direction: "forward",
    });
    fireEvent.change(screen.getByTestId("selection-animation-speed"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByTestId("selection-animation-direction"), {
      target: { value: "reverse" },
    });
    expect(getArrow(arrow.id).animation).toEqual({
      type: "dots",
      speed: 5,
      direction: "reverse",
    });
    Keyboard.undo();
    expect(getArrow(arrow.id).animation?.direction).toBe("forward");
    Keyboard.redo();
    expect(getArrow(arrow.id).animation?.direction).toBe("reverse");
    fireEvent.change(screen.getByTestId("selection-animation-type"), {
      target: { value: "none" },
    });
    expect(getArrow(arrow.id).animation).toBeNull();
  });
  it("updates multiple arrows while preserving unrelated animation parameters", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    const first = {
      ...API.createElement({ type: "arrow" }),
      animation: {
        type: "dots" as const,
        speed: 2,
        direction: "forward" as const,
      },
    };
    const second = {
      ...API.createElement({ type: "arrow" }),
      animation: {
        type: "pulse" as const,
        speed: 4,
        direction: "reverse" as const,
      },
    };
    const third = API.createElement({ type: "line" });
    API.setElements([first, second, third]);
    API.setSelectedElements([first, second, third]);
    expect(screen.getByTestId("selection-animation-type")).toHaveValue("mixed");
    fireEvent.change(screen.getByTestId("selection-animation-speed"), {
      target: { value: "3" },
    });
    expect(getArrow(first.id).animation).toEqual({
      type: "dots",
      speed: 3,
      direction: "forward",
    });
    expect(getArrow(second.id).animation).toEqual({
      type: "pulse",
      speed: 3,
      direction: "reverse",
    });
    expect(getArrow(third.id).animation).toBeFalsy();
    fireEvent.change(screen.getByTestId("selection-animation-type"), {
      target: { value: "dashes" },
    });
    expect(getArrow(first.id).animation?.type).toBe("dashes");
    expect(getArrow(second.id).animation?.direction).toBe("reverse");
    expect(getArrow(third.id).animation).toEqual({
      type: "dashes",
      speed: 3,
      direction: "forward",
    });
  });
  it("configures marker color, amount, and size, and restores flowing arrows", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    const arrow = API.createElement({ type: "arrow" });
    API.setElements([arrow]);
    API.setSelectedElements([arrow]);
    fireEvent.change(screen.getByTestId("selection-animation-type"), {
      target: { value: "arrows" },
    });
    for (const [parameter, value] of [
      ["color", "#e03131"],
      ["amount", "8"],
      ["size", "2.5"],
    ]) {
      fireEvent.change(screen.getByTestId(`selection-animation-${parameter}`), {
        target: { value },
      });
    }
    const configured = getArrow(arrow.id);
    expect(configured.animation).toEqual({
      type: "arrows",
      speed: 3,
      direction: "forward",
      color: "#e03131",
      amount: 8,
      size: 2.5,
    });
    expect(
      restoreElements([configured], null).filter(isLinearElement)[0].animation,
    ).toEqual(configured.animation);
    Keyboard.undo();
    expect(getArrow(arrow.id).animation?.size).toBeUndefined();
    Keyboard.redo();
    expect(getArrow(arrow.id).animation?.size).toBe(2.5);
    fireEvent.click(screen.getByLabelText("Use default color"));
    expect(getArrow(arrow.id).animation?.color).toBeUndefined();
    const invalid = {
      ...configured,
      animation: {
        ...configured.animation!,
        amount: 1000,
        size: -1,
        color: "url(unsafe)",
      },
    };
    expect(
      restoreElements([invalid], null).filter(isLinearElement)[0].animation,
    ).toEqual({
      type: "arrows",
      speed: 3,
      direction: "forward",
      amount: 50,
      size: 0.5,
    });
  });
  it("hides animation controls for other shapes and locked arrows", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);
    expect(screen.queryByTestId("selected-animation-controls")).toBeNull();
    const arrow = API.createElement({ type: "arrow", locked: true });
    API.setElements([arrow]);
    API.setSelectedElements([arrow]);
    expect(screen.queryByTestId("selected-animation-controls")).toBeNull();
  });
});
