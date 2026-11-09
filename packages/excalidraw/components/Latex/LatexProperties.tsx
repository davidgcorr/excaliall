import { useEffect, useRef, useState } from "react";

import type { ExcalidrawImageElement } from "@excalidraw/element/types";

import { useUIAppState } from "../../context/ui-appState";
import { t } from "../../i18n";
import { useApp, useExcalidrawSetAppState } from "../App";
import { ColorPicker } from "../ColorPicker/ColorPicker";

import { getLatexData, saveLatex } from "./data";

import "./LatexProperties.scss";

import type { LatexData } from "./data";

type Style = Pick<
  LatexData,
  "style" | "handFont" | "variation" | "fontSize" | "color"
>;
const styleOf = (data: LatexData): Style => ({
  style: data.style ?? "normal",
  handFont: data.handFont ?? "Patrick Hand",
  variation: data.variation ?? 1,
  fontSize: data.fontSize,
  color: data.color,
});

export const LatexProperties = ({
  element,
  onEdit,
}: {
  element: ExcalidrawImageElement;
  onEdit: () => void;
}) => {
  const app = useApp();
  const appState = useUIAppState();
  const setAppState = useExcalidrawSetAppState();
  const [draft, setDraft] = useState(() => styleOf(getLatexData(element)!));
  const [error, setError] = useState("");
  const latest = useRef(draft);
  const revision = useRef(0);
  const completed = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const running = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);

  const flush = () => {
    app.ownerWindow.clearTimeout(timer.current);
    if (running.current) {
      return running.current;
    }
    running.current = (async () => {
      while (!app.api.isDestroyed && completed.current < revision.current) {
        const currentRevision = revision.current;
        const target = app.scene.getElement(element.id);
        const data = getLatexData(target);
        if (
          !data ||
          !target ||
          target.isDeleted ||
          target.locked ||
          app.state.viewModeEnabled
        ) {
          completed.current = currentRevision;
          break;
        }
        try {
          const result = await saveLatex(
            app,
            { ...data, ...latest.current },
            element.id,
            {
              preserveSelection: true,
              isCurrent: () =>
                revision.current === currentRevision &&
                getLatexData(app.scene.getElement(element.id))?.source ===
                  data.source,
            },
          );
          if (result) {
            completed.current = currentRevision;
            if (mounted.current) {
              setError("");
            }
          }
        } catch (failure) {
          completed.current = currentRevision;
          if (mounted.current) {
            setError((failure as Error).message);
          }
        }
      }
    })().finally(() => {
      running.current = null;
    });
    return running.current;
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      app.ownerWindow.clearTimeout(timer.current);
      void flushRef.current();
    };
  }, [app]);
  useEffect(() => {
    if (completed.current >= revision.current && !running.current) {
      const data = getLatexData(element);
      if (data) {
        const next = styleOf(data);
        latest.current = next;
        setDraft(next);
        setError("");
      }
    }
  }, [element]);

  const change = (patch: Partial<Style>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setDraft(next);
    revision.current++;
    app.ownerWindow.clearTimeout(timer.current);
    timer.current = app.ownerWindow.setTimeout(() => {
      void flushRef.current();
    }, 180);
  };
  return (
    <fieldset className="latex-properties" data-testid="latex-properties">
      <legend>{t("labels.latexProperties")}</legend>
      <label>
        {t("labels.latexStyle")}
        <select
          aria-label={t("labels.latexStyle")}
          value={draft.style}
          onChange={(event) =>
            change({ style: event.currentTarget.value as Style["style"] })
          }
        >
          <option value="normal">{t("labels.latexNormal")}</option>
          <option value="handdrawn">{t("labels.latexHanddrawn")}</option>
        </select>
      </label>
      {draft.style === "handdrawn" && (
        <>
          <label>
            {t("labels.latexHandFont")}
            <select
              aria-label={t("labels.latexHandFont")}
              value={draft.handFont}
              onChange={(event) =>
                change({
                  handFont: event.currentTarget.value as Style["handFont"],
                })
              }
            >
              <option value="Patrick Hand">Patrick Hand</option>
              <option value="Caveat">Caveat</option>
            </select>
          </label>
          <label>
            {t("labels.latexVariation")}
            <input
              type="range"
              aria-label={t("labels.latexVariation")}
              min="0"
              max="2"
              step="0.25"
              value={draft.variation}
              onChange={(event) =>
                change({ variation: Number(event.currentTarget.value) })
              }
            />
          </label>
        </>
      )}
      <label>
        {t("labels.fontSize")}
        <input
          type="number"
          aria-label={t("labels.fontSize")}
          min="12"
          max="128"
          value={draft.fontSize}
          onChange={(event) =>
            change({ fontSize: Number(event.currentTarget.value) })
          }
        />
      </label>
      <div>
        <span>{t("labels.latexColor")}</span>
        <ColorPicker
          type="latexColor"
          label={t("labels.latexColor")}
          color={draft.color}
          elements={app.scene.getNonDeletedElements()}
          appState={appState}
          updateData={setAppState}
          onChange={(color) => change({ color })}
        />
      </div>
      {!!error && <div role="alert">{error}</div>}
      <button
        type="button"
        onClick={() => {
          void flush().then(onEdit);
        }}
      >
        {t("labels.editLatex")}
      </button>
    </fieldset>
  );
};
