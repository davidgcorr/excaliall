import React from "react";

import { Excalidraw } from "../index";
import { exportScene } from "../scene/export";
import {
  getLatexData,
  renderLatex,
  sampleLatex,
  saveLatex,
} from "../components/Latex/data";
import {
  addMindMapTopic,
  arrangeMindMap,
  getMindMapNode,
  insertMindMap,
  layoutMindMap,
  renameMindMapTopic,
  resolveMindMapNode,
  updateMindMapBranch,
} from "../components/MindMap/data";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { act, fireEvent, render, screen, waitFor } from "./test-utils";

const { h } = window;

describe("LaTeX formulas", () => {
  it.each([
    String.raw`E=mc^2`,
    String.raw`\frac{-b\pm\sqrt{b^2-4ac}}{2a}`,
    String.raw`\int_0^\infty e^{-x^2}\,dx=\frac{\sqrt\pi}{2}`,
    String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`,
  ])("renders %s to self-contained SVG paths", async (source) => {
    const { svg, width, height } = await renderLatex(
      { ...sampleLatex(), source, color: "#e03131" },
      document,
    );
    expect(width).toBeGreaterThan(8);
    expect(height).toBeGreaterThan(8);
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(svg.querySelector("image, foreignObject, script, style")).toBeNull();
    expect(svg.getAttribute("color")).toBe("#e03131");
    expect(svg.getAttribute("width")).toBe(String(width));
  });
  it("isolates user macros between formulas", async () => {
    await renderLatex(
      {
        ...sampleLatex(),
        source: String.raw`\newcommand{\myformula}{x^2}\myformula`,
      },
      document,
    );
    await expect(
      renderLatex(
        { ...sampleLatex(), source: String.raw`\myformula` },
        document,
      ),
    ).rejects.toThrow();
  });
  it("reports invalid or unsupported input instead of adding a broken image", async () => {
    await expect(
      renderLatex(
        { ...sampleLatex(), source: String.raw`\frac{a}{` },
        document,
      ),
    ).rejects.toThrow();
    await expect(
      renderLatex(
        { ...sampleLatex(), source: String.raw`\href{javascript:alert(1)}{x}` },
        document,
      ),
    ).rejects.toThrow();
    await expect(
      renderLatex({ ...sampleLatex(), source: "" }, document),
    ).rejects.toThrow();
  });
  it("inserts a formula, preserves its source, and updates it with undo support", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    await act(async () => {
      await saveLatex(h.app, sampleLatex());
    });
    await waitFor(() => expect(h.elements).toHaveLength(1));
    const original = h.elements[0];
    const data = getLatexData(original)!;
    expect(data.source).toBe("E = mc^2");
    expect(original.type).toBe("image");
    await act(async () => {
      await saveLatex(
        h.app,
        { ...data, source: String.raw`\frac{1}{2}`, fontSize: 48 },
        original.id,
      );
    });
    await waitFor(() =>
      expect(getLatexData(h.elements[0])?.source).toBe(String.raw`\frac{1}{2}`),
    );
    expect(h.elements[0].id).toBe(original.id);
    expect(h.elements).toHaveLength(1);
    Keyboard.undo();
    expect(getLatexData(h.elements[0])?.source).toBe(data.source);
    const svg = await exportScene({
      type: "svg",
      data: {
        elements: h.app.api.getSceneElements(),
        files: h.app.api.getFiles(),
      },
    });
    expect(svg.querySelector("image")).not.toBeNull();
  });
  it("opens the formula editor from its toolbar icon", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    fireEvent.click(screen.getByTestId("toolbar-latex"));
    expect(screen.getByLabelText("LaTeX source")).toHaveValue("E = mc^2");
    expect(
      screen.getByRole("button", { name: "Insert formula" }),
    ).toBeInTheDocument();
  });
});

describe("native mind maps", () => {
  it("creates two-sided topics, editable labels, and curved bound branches", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    fireEvent.click(screen.getByTestId("toolbar-mind-map"));
    const nodes = h.elements.filter((element) => getMindMapNode(element));
    expect(nodes).toHaveLength(5);
    expect(
      nodes.filter((node) => getMindMapNode(node)?.side === "left"),
    ).toHaveLength(2);
    const edges = h.elements.filter((element) => element.type === "arrow");
    expect(edges).toHaveLength(4);
    for (const edge of edges) {
      if (edge.type !== "arrow") {
        throw new Error("Expected arrow");
      }
      expect(edge.points).toHaveLength(3);
      expect(edge.roundness).not.toBeNull();
      expect(edge.startBinding?.elementId).toBeTruthy();
      expect(edge.endBinding?.elementId).toBeTruthy();
    }
    expect(screen.getByTestId("mind-map-properties")).toBeInTheDocument();
    expect(screen.getByLabelText("Topic")).toHaveValue("Central topic");
    const root = nodes.find((node) => getMindMapNode(node)?.parentId === null)!;
    const text = h.elements.find(
      (element) => element.type === "text" && element.containerId === root.id,
    )!;
    expect(resolveMindMapNode(h.elements, text.id)?.id).toBe(root.id);
  });
  it("adds, edits, flips, colors, and deletes branches with undo/redo", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    let rootId = "";
    act(() => {
      rootId = insertMindMap(h.app)!;
    });
    let childId = "";
    act(() => {
      childId = addMindMapTopic(h.app, rootId)!;
    });
    let grandchildId = "";
    act(() => {
      grandchildId = addMindMapTopic(h.app, childId)!;
    });
    act(() => {
      renameMindMapTopic(h.app, grandchildId, "A longer topic title");
    });
    const label = h.elements.find(
      (element) =>
        element.type === "text" && element.containerId === grandchildId,
    );
    expect(label?.type === "text" && label.text).toBe("A longer topic title");
    const child = () => h.elements.find((element) => element.id === childId)!;
    const oldSide = getMindMapNode(child())!.side;
    act(() => {
      updateMindMapBranch(h.app, childId, "flip");
    });
    expect(getMindMapNode(child())!.side).not.toBe(oldSide);
    const grandchild = () =>
      h.elements.find((element) => element.id === grandchildId)!;
    expect(getMindMapNode(grandchild())!.side).toBe(
      getMindMapNode(child())!.side,
    );
    act(() => {
      updateMindMapBranch(h.app, childId, "color", "#e03131");
    });
    expect(getMindMapNode(grandchild())!.color).toBe("#e03131");
    expect(
      h.elements.find(
        (element) => element.customData?.mindMapEdge?.childId === grandchildId,
      )?.strokeColor,
    ).toBe("#e03131");
    act(() => {
      updateMindMapBranch(h.app, childId, "delete");
    });
    expect(child().isDeleted).toBe(true);
    expect(grandchild().isDeleted).toBe(true);
    Keyboard.undo();
    expect(child().isDeleted).toBe(false);
    expect(grandchild().isDeleted).toBe(false);
    Keyboard.redo();
    expect(child().isDeleted).toBe(true);
  });
  it("keeps normal canvas objects and locked maps intact while arranging", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    const unrelated = API.createElement({ type: "rectangle", x: 999, y: 999 });
    API.setElements([unrelated]);
    let rootId = "";
    act(() => {
      rootId = insertMindMap(h.app)!;
    });
    const root = h.elements.find((element) => element.id === rootId)!;
    const arranged = layoutMindMap(h.elements, getMindMapNode(root)!.mapId);
    expect(arranged.find((element) => element.id === unrelated.id)).toBe(
      unrelated,
    );
    API.setElements(
      h.elements.map((element) =>
        element.id === rootId ? { ...element, locked: true } : element,
      ),
    );
    const before = h.elements;
    act(() => arrangeMindMap(h.app, rootId));
    expect(h.elements).toBe(before);
  });
});
