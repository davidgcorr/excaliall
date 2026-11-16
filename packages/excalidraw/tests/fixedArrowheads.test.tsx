import React from "react";
import { within } from "@testing-library/react";

import {
  ShapeCache,
  isArrowElement,
  getArrowheadPoints,
} from "@excalidraw/element";
import { pointFrom } from "@excalidraw/math";

import type { LocalPoint } from "@excalidraw/math";

import { Excalidraw } from "../index";
import { restoreElements } from "../data/restore";
import { exportScene } from "../scene/export";
import { t } from "../i18n";

import { API } from "./helpers/api";
import { render, screen, fireEvent, act, waitFor } from "./test-utils";

const { h } = window;
const heads = ["cross", "plus", "square", "square_outline"] as const;
const points = (...values: [number, number][]) =>
  values.map(([x, y]) => pointFrom<LocalPoint>(x, y));

describe("fixed arrowhead symbols", () => {
  it.each(heads)(
    "selects %s at either endpoint, saves it, and supports undo",
    async (head) => {
      const arrow = API.createElement({
        type: "arrow",
        width: 200,
        height: 0,
        points: points([0, 0], [200, 0]),
      });
      await render(
        <Excalidraw
          handleKeyboardGlobally
          initialData={{ elements: [arrow] }}
        />,
      );
      API.setSelectedElements([arrow]);
      for (const position of ["start", "end"] as const) {
        fireEvent.click(
          screen.getByRole("button", { name: `arrowhead_${position}` }),
        );
        const picker = within(
          screen.getByRole("dialog", { name: `arrowhead_${position}` }),
        );
        const label = t(`labels.arrowhead_${head}`);
        if (!picker.queryByRole("button", { name: label })) {
          fireEvent.click(picker.getByText(t("labels.more_options")));
        }
        fireEvent.click(picker.getByRole("button", { name: label }));
        fireEvent.keyDown(
          screen.getByRole("dialog", { name: `arrowhead_${position}` }),
          { key: "Escape" },
        );
        const configured = h.elements.filter(isArrowElement)[0];
        expect(configured[`${position}Arrowhead`]).toBe(head);
        expect(
          restoreElements([configured], null).filter(isArrowElement)[0][
            `${position}Arrowhead`
          ],
        ).toBe(head);
        await act(async () => {});
        API.executeAction(h.app.actionManager.actions.undo);
        await waitFor(() =>
          expect(
            h.elements.filter(isArrowElement)[0][`${position}Arrowhead`],
          ).not.toBe(head),
        );
        API.executeAction(h.app.actionManager.actions.redo);
        expect(
          h.elements.filter(isArrowElement)[0][`${position}Arrowhead`],
        ).toBe(head);
      }
      const svg = await exportScene({
        type: "svg",
        data: {
          elements: h.elements
            .filter(isArrowElement)
            .map((element) => ({ ...element, isDeleted: false })),
        },
      });
      expect(svg.querySelectorAll("path").length).toBeGreaterThan(2);
    },
  );

  it.each(heads)(
    "renders %s on straight, curved, short, and elbow arrows",
    (head) => {
      for (const config of [
        { points: points([0, 0], [200, 0]), roundness: null },
        {
          points: points([0, 0], [80, 100], [200, 0]),
          roundness: { type: 2 as const },
        },
        { points: points([0, 0], [1, 0]), roundness: null },
        {
          points: points([0, 0], [100, 0], [100, 100], [200, 100]),
          elbowed: true,
        },
      ]) {
        const arrow = API.createElement({
          type: "arrow",
          ...config,
          startArrowhead: head,
          endArrowhead: head,
          strokeStyle: "dashed",
          strokeColor: "#e03131",
          roughness: 0,
        });
        const shapes = ShapeCache.generateElementShape(arrow, null);
        const open = head === "cross" || head === "plus";
        expect(shapes).toHaveLength(open ? 5 : 3);
        for (const position of ["start", "end"] as const) {
          const vertices = getArrowheadPoints(arrow, shapes, position, head)!;
          expect(vertices).toHaveLength(8);
          expect(vertices.every(Number.isFinite)).toBe(true);
        }
        for (const cap of shapes.slice(1)) {
          expect(cap.options.strokeLineDash).toBeUndefined();
          expect(
            cap.sets
              .flatMap((set) => set.ops)
              .flatMap((op) => op.data)
              .every(Number.isFinite),
          ).toBe(true);
          if (!open) {
            expect(cap.sets[0].type).toBe("fillPath");
            expect(cap.options.fill).toBe(
              head === "square" ? "#e03131" : "#ffffff",
            );
          }
        }
      }
    },
  );
});
