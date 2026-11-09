import { useEffect, useRef, useState } from "react";

import { t } from "../../i18n";
import { useApp, useExcalidrawSetAppState } from "../App";
import { Dialog } from "../Dialog";
import { ColorPicker } from "../ColorPicker/ColorPicker";
import { useUIAppState } from "../../context/ui-appState";

import { getLatexData, renderLatex, sampleLatex, saveLatex } from "./data";

import "./LatexDialog.scss";

export const LatexDialog = ({ elementId }: { elementId?: string }) => {
  const app = useApp();
  const appState = useUIAppState();
  const setAppState = useExcalidrawSetAppState();
  const [data, setData] = useState(
    () =>
      getLatexData(elementId ? app.scene.getElement(elementId) : null) ??
      sampleLatex(),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const close = () => setAppState({ openDialog: null, openPopup: null });
  useEffect(() => {
    let active = true;
    const timer = app.ownerWindow.setTimeout(() => {
      renderLatex(data, app.ownerDocument)
        .then(({ svg }) => {
          if (active && preview.current) {
            preview.current.replaceChildren(svg);
            setError("");
          }
        })
        .catch((error) => {
          if (active) {
            preview.current?.replaceChildren();
            setError(error.message);
          }
        });
    }, 180);
    return () => {
      active = false;
      app.ownerWindow.clearTimeout(timer);
    };
  }, [app, data]);
  return (
    <Dialog title={t("labels.insertLatex")} onCloseRequest={close} size="small">
      <div className="latex-editor">
        <label>
          {t("labels.latexSource")}
          <textarea
            autoFocus
            rows={5}
            value={data.source}
            spellCheck={false}
            onChange={(event) =>
              setData({ ...data, source: event.currentTarget.value })
            }
          />
        </label>
        <div className="latex-editor__examples">
          {[
            String.raw`E = mc^2`,
            String.raw`\frac{-b \pm \sqrt{b^2-4ac}}{2a}`,
            String.raw`\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}`,
            String.raw`\begin{pmatrix}a & b \\ c & d\end{pmatrix}`,
          ].map((source, index) => (
            <button
              key={source}
              type="button"
              onClick={() => setData({ ...data, source })}
            >
              {t("labels.latexExample")} {index + 1}
            </button>
          ))}
        </div>
        <label>
          {t("labels.latexStyle")}
          <select
            aria-label={t("labels.latexStyle")}
            value={data.style ?? "normal"}
            onChange={(event) =>
              setData({
                ...data,
                style: event.currentTarget.value as "normal" | "handdrawn",
              })
            }
          >
            <option value="normal">{t("labels.latexNormal")}</option>
            <option value="handdrawn">{t("labels.latexHanddrawn")}</option>
          </select>
        </label>
        {data.style === "handdrawn" && (
          <>
            <label>
              {t("labels.latexHandFont")}
              <select
                aria-label={t("labels.latexHandFont")}
                value={data.handFont ?? "Patrick Hand"}
                onChange={(event) =>
                  setData({
                    ...data,
                    handFont: event.currentTarget.value as
                      | "Caveat"
                      | "Patrick Hand",
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
                value={data.variation ?? 1}
                onChange={(event) =>
                  setData({
                    ...data,
                    variation: Number(event.currentTarget.value),
                  })
                }
              />
            </label>
          </>
        )}
        <label>
          {t("labels.fontSize")}
          <input
            type="number"
            min="12"
            max="128"
            value={data.fontSize}
            onChange={(event) =>
              setData({ ...data, fontSize: Number(event.currentTarget.value) })
            }
          />
        </label>
        <div>
          <span>{t("labels.stroke")}</span>
          <ColorPicker
            type="latexColor"
            color={data.color}
            label={t("labels.latexColor")}
            elements={app.scene.getNonDeletedElements()}
            appState={appState}
            updateData={setAppState}
            onChange={(color) => setData((data) => ({ ...data, color }))}
          />
        </div>
        <div
          className="latex-editor__preview"
          ref={preview}
          aria-label={t("labels.latexPreview")}
        />
        {!!error && <div role="alert">{error}</div>}
        <button
          className="latex-editor__apply"
          type="button"
          disabled={busy || !!error || !data.source.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await saveLatex(app, data, elementId);
              close();
            } catch (error) {
              setError((error as Error).message);
              setBusy(false);
            }
          }}
        >
          {elementId ? t("labels.latexApply") : t("labels.latexInsert")}
        </button>
      </div>
    </Dialog>
  );
};
