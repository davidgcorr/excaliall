import { atom, appJotaiStore } from "../app-jotai";

// null target creates a new chart; undefined retains menu-based selection editing.
export const roughVizDialogAtom = atom<{ elementId?: string | null } | null>(
  null,
);
export const openRoughVizDialog = (elementId?: string) => {
  appJotaiStore.set(roughVizDialogAtom, { elementId: elementId ?? null });
};
