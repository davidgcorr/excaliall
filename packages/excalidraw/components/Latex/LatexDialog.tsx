import { useEffect, useMemo, useRef, useState } from "react";

import { t } from "../../i18n";
import {
  useApp,
  useExcalidrawElements,
  useExcalidrawSetAppState,
} from "../App";
import { Dialog } from "../Dialog";

import { getLatexData, renderLatex, sampleLatex, saveLatex } from "./data";

import "./LatexDialog.scss";

export const LatexDialog = ({ elementId }: { elementId?: string }) => {
  const app = useApp();
  const elements = useExcalidrawElements();
  const target = elements.find((element) => element.id === elementId);
  const settings = useMemo(
    () => getLatexData(target) ?? sampleLatex(),
    [target],
  );
  const setAppState = useExcalidrawSetAppState();
  const [source, setSource] = useState(settings.source);
  const data = useMemo(() => ({ ...settings, source }), [settings, source]);
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
            value={source}
            spellCheck={false}
            onChange={(event) => setSource(event.currentTarget.value)}
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
              onClick={() => setSource(source)}
            >
              {t("labels.latexExample")} {index + 1}
            </button>
          ))}
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
              await saveLatex(
                app,
                {
                  ...(getLatexData(
                    elementId ? app.scene.getElement(elementId) : null,
                  ) ?? settings),
                  source,
                },
                elementId,
              );
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
