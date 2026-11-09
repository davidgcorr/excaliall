import {
  randomId,
  normalizeInputColor,
  ROUNDNESS,
  viewportCoordsToSceneCoords,
} from "@excalidraw/common";
import { CaptureUpdateAction, newElementWith } from "@excalidraw/element";
import {
  newArrowElement,
  newElement,
  newTextElement,
} from "@excalidraw/element/newElement";
import { pointFrom } from "@excalidraw/math";

import type { LocalPoint } from "@excalidraw/math";
import type {
  ExcalidrawElement,
  ExcalidrawRectangleElement,
  NonDeleted,
} from "@excalidraw/element/types";

import type { AppClassProperties } from "../../types";

export type MindMapNode = {
  version: 1;
  mapId: string;
  parentId: string | null;
  side: "left" | "right";
  color: string;
};
const COLORS = [
  "#1971c2",
  "#2f9e44",
  "#e03131",
  "#9c36b5",
  "#f08c00",
  "#0c8599",
];
export const getMindMapNode = (
  element: ExcalidrawElement | null | undefined,
): MindMapNode | null => {
  const data = element?.customData?.mindMap as MindMapNode | undefined;
  return element?.type === "rectangle" &&
    data?.version === 1 &&
    typeof data.mapId === "string" &&
    (data.parentId === null || typeof data.parentId === "string") &&
    (data.side === "left" || data.side === "right") &&
    typeof data.color === "string"
    ? data
    : null;
};
export const resolveMindMapNode = (
  elements: readonly ExcalidrawElement[],
  id: string,
) => {
  let element = elements.find(
    (element) => element.id === id && !element.isDeleted,
  );
  if (element?.type === "text" && element.containerId) {
    const containerId = element.containerId;
    element = elements.find(
      (item) => item.id === containerId && !item.isDeleted,
    );
  }
  if (!getMindMapNode(element)) {
    const edge = element?.customData?.mindMapEdge;
    if (edge && typeof edge.childId === "string") {
      element = elements.find(
        (item) => item.id === edge.childId && !item.isDeleted,
      );
    }
  }
  return element?.type === "rectangle" && getMindMapNode(element)
    ? element
    : null;
};

const makeTopic = (
  app: AppClassProperties,
  mapId: string,
  parentId: string | null,
  side: MindMapNode["side"],
  color: string,
  title: string,
) => {
  const text = newTextElement({
    text: title,
    x: 0,
    y: 0,
    fontSize: parentId ? 20 : 26,
    strokeColor: parentId ? color : "#1e1e1e",
    textAlign: "center",
    verticalAlign: "middle",
    renderEnvironment: app.renderEnvironment,
  });
  const node = newElement({
    type: "rectangle",
    x: 0,
    y: 0,
    width: Math.max(parentId ? 140 : 200, text.width + 32),
    height: Math.max(parentId ? 52 : 84, text.height + 24),
    strokeColor: parentId ? "transparent" : "#1e1e1e",
    backgroundColor: parentId ? "transparent" : "#ffffff",
    fillStyle: "solid",
    roundness: { type: ROUNDNESS.ADAPTIVE_RADIUS },
    roughness: 1,
    strokeWidth: 1,
    customData: { mindMap: { version: 1, mapId, parentId, side, color } },
    boundElements: [{ type: "text", id: text.id }],
  }) as NonDeleted<ExcalidrawRectangleElement>;
  return { node, text: newElementWith(text, { containerId: node.id }) };
};

/** Native nodes/text/arrows remain editable and participate in normal bindings. */
export const layoutMindMap = (
  elements: readonly ExcalidrawElement[],
  mapId: string,
): ExcalidrawElement[] => {
  const nodes = elements.filter(
    (element): element is ExcalidrawRectangleElement =>
      !element.isDeleted &&
      !!getMindMapNode(element) &&
      getMindMapNode(element)!.mapId === mapId,
  );
  const root = nodes.find((node) => getMindMapNode(node)!.parentId === null);
  if (!root || nodes.length > 1000 || nodes.some((node) => node.locked)) {
    return [...elements];
  }
  const children = (id: string) =>
    nodes.filter((node) => getMindMapNode(node)!.parentId === id);
  const heights = new Map<string, number>();
  const measure = (
    node: ExcalidrawRectangleElement,
    ancestors = new Set<string>(),
  ): number => {
    if (ancestors.has(node.id) || ancestors.size > 50) {
      return node.height;
    }
    const next = new Set(ancestors).add(node.id);
    const kids = children(node.id);
    const height = Math.max(
      node.height,
      kids.reduce((sum, child) => sum + measure(child, next), 0) +
        Math.max(0, kids.length - 1) * 28,
    );
    heights.set(node.id, height);
    return height;
  };
  measure(root);
  const positions = new Map<string, { x: number; y: number }>([
    [root.id, { x: root.x, y: root.y }],
  ]);
  const place = (
    parent: ExcalidrawRectangleElement,
    kids: ExcalidrawRectangleElement[],
    side: MindMapNode["side"],
    depth = 0,
  ) => {
    if (depth > 50) {
      return;
    }
    const position = positions.get(parent.id)!;
    const total =
      kids.reduce(
        (sum, node) => sum + (heights.get(node.id) ?? node.height),
        0,
      ) +
      Math.max(0, kids.length - 1) * 28;
    let cursor = position.y + parent.height / 2 - total / 2;
    for (const node of kids) {
      if (positions.has(node.id)) {
        continue;
      }
      const height = heights.get(node.id) ?? node.height;
      positions.set(node.id, {
        x:
          side === "right"
            ? position.x + parent.width + 120
            : position.x - node.width - 120,
        y: cursor + (height - node.height) / 2,
      });
      cursor += height + 28;
      place(node, children(node.id), side, depth + 1);
    }
  };
  for (const side of ["left", "right"] as const) {
    place(
      root,
      children(root.id).filter((node) => getMindMapNode(node)!.side === side),
      side,
    );
  }
  const updates = new Map<string, ExcalidrawElement>();
  nodes.forEach((node) => {
    const pos = positions.get(node.id);
    if (pos) {
      updates.set(node.id, newElementWith(node, pos));
    }
  });
  const edges: ExcalidrawElement[] = [];
  for (const node of nodes) {
    const data = getMindMapNode(node)!;
    const parent = updates.get(data.parentId ?? "");
    const child = updates.get(node.id);
    if (!parent || !child) {
      continue;
    }
    const right = data.side === "right";
    const x = parent.x + (right ? parent.width : 0);
    const y = parent.y + parent.height / 2;
    const dx = child.x + (right ? 0 : child.width) - x;
    const dy = child.y + child.height / 2 - y;
    const points = [
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(dx * 0.55, dy * 0.25),
      pointFrom<LocalPoint>(dx, dy),
    ];
    const previous = elements.find(
      (item) =>
        !item.isDeleted &&
        item.type === "arrow" &&
        item.customData?.mindMapEdge?.mapId === mapId &&
        item.customData.mindMapEdge.childId === node.id,
    );
    const edge =
      previous?.type === "arrow"
        ? newElementWith(previous, {
            x,
            y,
            points,
            width: Math.abs(dx),
            height: Math.abs(dy),
          })
        : newArrowElement({
            type: "arrow",
            elbowed: false,
            x,
            y,
            points,
            width: Math.abs(dx),
            height: Math.abs(dy),
            startArrowhead: null,
            endArrowhead: null,
            strokeColor: data.color,
            strokeWidth: getMindMapNode(parent)?.parentId === null ? 5 : 2,
            roughness: 1,
            roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
            customData: {
              mindMapEdge: { mapId, parentId: parent.id, childId: child.id },
            },
          });
    const bound = newElementWith(edge, {
      startBinding: {
        elementId: parent.id,
        fixedPoint: [right ? 1 : 0, 0.5],
        mode: "orbit",
      },
      endBinding: {
        elementId: child.id,
        fixedPoint: [right ? 0 : 1, 0.5],
        mode: "orbit",
      },
    });
    if (previous) {
      updates.set(bound.id, bound);
    } else {
      edges.push(bound);
    }
    for (const target of [parent, child]) {
      const current = updates.get(target.id)!;
      updates.set(
        target.id,
        newElementWith(current, {
          boundElements: [
            ...(current.boundElements ?? []).filter(
              (binding) => binding.id !== bound.id,
            ),
            { type: "arrow", id: bound.id },
          ],
        }),
      );
    }
  }
  elements.forEach((element) => {
    if (element.type !== "text" || !element.containerId || element.locked) {
      return;
    }
    const container = updates.get(element.containerId);
    if (container) {
      updates.set(
        element.id,
        newElementWith(element, {
          x: container.x + (container.width - element.width) / 2,
          y: container.y + (container.height - element.height) / 2,
        }),
      );
    }
  });
  return [
    ...edges,
    ...elements.map((element) => updates.get(element.id) ?? element),
  ];
};

const commit = (
  app: AppClassProperties,
  elements: readonly ExcalidrawElement[],
  selectedId: string,
) =>
  app.api.updateScene({
    elements,
    appState: {
      selectedElementIds: { [selectedId]: true },
      selectedGroupIds: {},
      editingGroupId: null,
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
export const insertMindMap = (app: AppClassProperties) => {
  const state = app.api.getAppState();
  if (state.viewModeEnabled) {
    return;
  }
  const center = viewportCoordsToSceneCoords(
    {
      clientX: state.offsetLeft + state.width / 2,
      clientY: state.offsetTop + state.height / 2,
    },
    state,
  );
  const mapId = randomId();
  const root = makeTopic(app, mapId, null, "right", "#1e1e1e", "Central topic");
  const elements: ExcalidrawElement[] = [
    newElementWith(root.node, {
      x: center.x - root.node.width / 2,
      y: center.y - root.node.height / 2,
    }),
    root.text,
  ];
  ["Ideas", "Projects", "Resources", "Goals"].forEach((title, index) => {
    const topic = makeTopic(
      app,
      mapId,
      root.node.id,
      index < 2 ? "right" : "left",
      COLORS[index],
      title,
    );
    elements.push(topic.node, topic.text);
  });
  commit(
    app,
    [
      ...app.api.getSceneElementsIncludingDeleted(),
      ...layoutMindMap(elements, mapId),
    ],
    root.node.id,
  );
  return root.node.id;
};
export const addMindMapTopic = (
  app: AppClassProperties,
  selectedId: string,
  sibling = false,
) => {
  const elements = app.api.getSceneElementsIncludingDeleted();
  const selected = resolveMindMapNode(elements, selectedId);
  const metadata = getMindMapNode(selected);
  if (!selected || !metadata || selected.locked || app.state.viewModeEnabled) {
    return;
  }
  const parent =
    sibling && metadata.parentId
      ? resolveMindMapNode(elements, metadata.parentId)
      : selected;
  if (!parent || parent.locked) {
    return;
  }
  const parentData = getMindMapNode(parent)!;
  const topics = elements.filter(
    (item) => !item.isDeleted && getMindMapNode(item)?.mapId === metadata.mapId,
  );
  if (topics.length >= 1000 || topics.some((node) => node.locked)) {
    throw new Error(
      "Unlock the mind map before adding topics (maximum 1,000 topics).",
    );
  }
  const siblings = topics.filter(
    (node) => getMindMapNode(node)?.parentId === parent.id,
  );
  const isRoot = parentData.parentId === null;
  const side =
    sibling && metadata.parentId
      ? metadata.side
      : isRoot
      ? siblings.filter((node) => getMindMapNode(node)!.side === "right")
          .length <=
        siblings.filter((node) => getMindMapNode(node)!.side === "left").length
        ? "right"
        : "left"
      : parentData.side;
  const topic = makeTopic(
    app,
    metadata.mapId,
    parent.id,
    side,
    isRoot ? COLORS[siblings.length % COLORS.length] : parentData.color,
    "New topic",
  );
  commit(
    app,
    layoutMindMap([...elements, topic.node, topic.text], metadata.mapId),
    topic.node.id,
  );
  return topic.node.id;
};
export const arrangeMindMap = (app: AppClassProperties, id: string) => {
  const node = resolveMindMapNode(
    app.api.getSceneElementsIncludingDeleted(),
    id,
  );
  const data = getMindMapNode(node);
  if (!node || !data || app.state.viewModeEnabled || node.locked) {
    return;
  }
  commit(
    app,
    layoutMindMap(app.api.getSceneElementsIncludingDeleted(), data.mapId),
    node.id,
  );
};

export const renameMindMapTopic = (
  app: AppClassProperties,
  id: string,
  title: string,
) => {
  const elements = app.api.getSceneElementsIncludingDeleted();
  const node = resolveMindMapNode(elements, id);
  const data = getMindMapNode(node);
  if (
    !node ||
    !data ||
    node.locked ||
    app.state.viewModeEnabled ||
    !title.trim() ||
    title.length > 1000
  ) {
    return;
  }
  const text = elements.find(
    (item) =>
      item.type === "text" && item.containerId === node.id && !item.isDeleted,
  );
  if (
    !text ||
    text.type !== "text" ||
    text.locked ||
    text.text === title.trim()
  ) {
    return;
  }
  const measured = newTextElement({
    ...text,
    text: title.trim(),
    renderEnvironment: app.renderEnvironment,
  });
  const updated = elements.map((item) =>
    item.id === node.id
      ? newElementWith(node, {
          width: Math.max(data.parentId ? 140 : 200, measured.width + 32),
          height: Math.max(data.parentId ? 52 : 84, measured.height + 24),
        })
      : item.id === text.id
      ? newElementWith(text, {
          text: title.trim(),
          originalText: title.trim(),
          width: measured.width,
          height: measured.height,
        })
      : item,
  );
  commit(app, layoutMindMap(updated, data.mapId), node.id);
};
export const updateMindMapBranch = (
  app: AppClassProperties,
  id: string,
  operation: "flip" | "delete" | "color",
  color?: string,
) => {
  const elements = app.api.getSceneElementsIncludingDeleted();
  const node = resolveMindMapNode(elements, id);
  const data = getMindMapNode(node);
  if (!node || !data || node.locked || app.state.viewModeEnabled) {
    return;
  }
  if (operation === "color" && (!color || !normalizeInputColor(color))) {
    throw new Error("Choose a valid branch color.");
  }
  if (
    operation === "flip" &&
    (!data.parentId ||
      getMindMapNode(resolveMindMapNode(elements, data.parentId))?.parentId !==
        null)
  ) {
    return;
  }
  const ids = new Set([node.id]);
  for (let count = 0; count < 1000; count++) {
    const size = ids.size;
    elements.forEach((element) => {
      const meta = getMindMapNode(element);
      if (
        !element.isDeleted &&
        meta?.mapId === data.mapId &&
        meta.parentId &&
        ids.has(meta.parentId)
      ) {
        ids.add(element.id);
      }
    });
    if (ids.size === size) {
      break;
    }
  }
  const affected = (element: ExcalidrawElement) =>
    ids.has(element.id) ||
    (element.type === "text" &&
      !!element.containerId &&
      ids.has(element.containerId)) ||
    ids.has(element.customData?.mindMapEdge?.childId);
  if (
    elements.some(
      (element) => !element.isDeleted && affected(element) && element.locked,
    )
  ) {
    throw new Error("Unlock this branch before editing it.");
  }
  const side = data.side === "right" ? "left" : "right";
  const updated = elements.map((element) => {
    if (element.isDeleted || !affected(element)) {
      return element;
    }
    if (operation === "delete") {
      return newElementWith(element, { isDeleted: true });
    }
    const meta = getMindMapNode(element);
    if (operation === "flip") {
      return meta
        ? newElementWith(element, {
            customData: { ...element.customData, mindMap: { ...meta, side } },
          })
        : element;
    }
    return newElementWith(element, {
      ...(element.type === "text" ||
      element.type === "arrow" ||
      (meta && !meta.parentId)
        ? { strokeColor: color! }
        : {}),
      ...(meta
        ? { customData: { ...element.customData, mindMap: { ...meta, color } } }
        : {}),
    });
  });
  const deleted = new Set(
    updated.filter((element) => element.isDeleted).map((element) => element.id),
  );
  const cleaned =
    operation === "delete"
      ? updated.map((element) =>
          !element.isDeleted &&
          element.boundElements?.some((binding) => deleted.has(binding.id))
            ? newElementWith(element, {
                boundElements: element.boundElements.filter(
                  (binding) => !deleted.has(binding.id),
                ),
              })
            : element,
        )
      : updated;
  const selected = operation === "delete" ? data.parentId : node.id;
  app.api.updateScene({
    elements: layoutMindMap(cleaned, data.mapId),
    appState: {
      selectedElementIds: selected ? { [selected]: true } : {},
      selectedGroupIds: {},
      editingGroupId: null,
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
};
