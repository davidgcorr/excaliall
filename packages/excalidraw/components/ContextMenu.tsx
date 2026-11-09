import clsx from "clsx";
import React from "react";

import {
  isAnimatedPathElement,
  isAnimatedShapeElement,
} from "../renderer/shapeAnimation";

import { actionChangeLinearAnimation } from "../actions/actionAnimation";
import { getShortcutFromShortcutName } from "../actions/shortcuts";
import { t } from "../i18n";

import { ShapeAnimationControls } from "./ShapeAnimationControls";

import { useExcalidrawAppState, useExcalidrawElements } from "./App";

import { Popover } from "./Popover";
import { LinearElementAnimationControls } from "./LinearElementAnimationControls";

import "./ContextMenu.scss";

import type { ActionManager } from "../actions/manager";
import type { ShortcutName } from "../actions/shortcuts";
import type { Action } from "../actions/types";

import type { TranslationKeys } from "../i18n";

type ContextMenuAnimationItem = { type: "animation"; name: "animate" };
export const CONTEXT_MENU_ANIMATION: ContextMenuAnimationItem = {
  type: "animation",
  name: "animate",
};

export type ContextMenuItem =
  | typeof CONTEXT_MENU_SEPARATOR
  | ContextMenuAnimationItem
  | Action;

export type ContextMenuItems = (ContextMenuItem | false | null | undefined)[];

type ContextMenuProps = {
  actionManager: ActionManager;
  items: ContextMenuItems;
  top: number;
  left: number;
  onClose: (callback?: () => void) => void;
};

export const CONTEXT_MENU_SEPARATOR = "separator";

export const ContextMenu = React.memo(
  ({ actionManager, items, top, left, onClose }: ContextMenuProps) => {
    const appState = useExcalidrawAppState();
    const elements = useExcalidrawElements();
    const [isAnimationMenuOpen, setIsAnimationMenuOpen] = React.useState(false);

    const filteredItems = items.reduce((acc: ContextMenuItem[], item) => {
      if (
        item &&
        (item === CONTEXT_MENU_SEPARATOR ||
          (typeof item !== "string" && "type" in item) ||
          !("predicate" in item) ||
          !item.predicate ||
          item.predicate(
            elements,
            appState,
            actionManager.app.props,
            actionManager.app,
          ))
      ) {
        acc.push(item);
      }
      return acc;
    }, []);

    return (
      <Popover
        onCloseRequest={() => {
          onClose();
        }}
        top={top}
        left={left}
        fitInViewport={true}
        viewportWidth={appState.width}
        viewportHeight={appState.height}
        className="context-menu-popover"
      >
        <ul
          className="context-menu"
          onContextMenu={(event) => event.preventDefault()}
        >
          {filteredItems.map((item, idx) => {
            if (item === CONTEXT_MENU_SEPARATOR) {
              if (
                !filteredItems[idx - 1] ||
                filteredItems[idx - 1] === CONTEXT_MENU_SEPARATOR
              ) {
                return null;
              }
              return <hr key={idx} className="context-menu-item-separator" />;
            }

            if ("type" in item) {
              const selectedElements = elements
                .filter(
                  (element) =>
                    appState.selectedElementIds[element.id] &&
                    !element.isDeleted &&
                    !element.locked,
                )
                .filter(
                  (element) =>
                    isAnimatedPathElement(element) ||
                    isAnimatedShapeElement(element),
                );

              return (
                <li
                  key={idx}
                  data-testid={item.name}
                  className="context-menu-animation-submenu"
                >
                  <button
                    type="button"
                    className="context-menu-item"
                    aria-expanded={isAnimationMenuOpen}
                    onClick={() => setIsAnimationMenuOpen(!isAnimationMenuOpen)}
                  >
                    <div className="context-menu-item__label">
                      {t("labels.animate")}
                    </div>
                    <span aria-hidden="true">
                      {isAnimationMenuOpen ? "v" : ">"}
                    </span>
                  </button>
                  {isAnimationMenuOpen && (
                    <div className="context-menu-animation">
                      {!!selectedElements.filter(isAnimatedPathElement)
                        .length && (
                        <LinearElementAnimationControls
                          elements={selectedElements.filter(
                            isAnimatedPathElement,
                          )}
                          onChange={(data) =>
                            actionManager.executeAction(
                              actionChangeLinearAnimation,
                              "contextMenu",
                              data,
                            )
                          }
                        />
                      )}
                      {!!selectedElements.filter(isAnimatedShapeElement)
                        .length && (
                        <ShapeAnimationControls
                          elements={selectedElements.filter(
                            isAnimatedShapeElement,
                          )}
                          onChange={(data) =>
                            actionManager.executeAction(
                              actionChangeLinearAnimation,
                              "contextMenu",
                              data,
                            )
                          }
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            }

            const actionName = item.name;
            let label = "";
            if (item.label) {
              if (typeof item.label === "function") {
                label = t(
                  item.label(
                    elements,
                    appState,
                    actionManager.app,
                  ) as unknown as TranslationKeys,
                );
              } else {
                label = t(item.label as unknown as TranslationKeys);
              }
            }

            return (
              <li
                key={idx}
                data-testid={actionName}
                onClick={() => {
                  // we need update state before executing the action in case
                  // the action uses the appState it's being passed (that still
                  // contains a defined contextMenu) to return the next state.
                  onClose(() => {
                    actionManager.executeAction(item, "contextMenu");
                  });
                }}
              >
                <button
                  type="button"
                  className={clsx("context-menu-item", {
                    dangerous: actionName === "deleteSelectedElements",
                    checkmark: item.checked?.(appState),
                  })}
                >
                  <div className="context-menu-item__label">{label}</div>
                  <kbd className="context-menu-item__shortcut">
                    {actionName
                      ? getShortcutFromShortcutName(actionName as ShortcutName)
                      : ""}
                  </kbd>
                </button>
              </li>
            );
          })}
        </ul>
      </Popover>
    );
  },
);
