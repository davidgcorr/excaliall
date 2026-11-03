import type {
  ExcalidrawLinearElement,
  LinearElementAnimation,
} from "@excalidraw/element/types";

import { t } from "../i18n";

import "./LinearElementAnimationControls.scss";

import type { ChangeLinearAnimationData } from "../actions/actionAnimation";

const commonValue = <T,>(values: T[]): T | "mixed" =>
  values.every((value) => value === values[0]) ? values[0] : "mixed";

export const LinearElementAnimationControls = ({
  elements,
  onChange,
  idPrefix = "animation",
}: {
  elements: readonly ExcalidrawLinearElement[];
  onChange: (data: ChangeLinearAnimationData) => void;
  idPrefix?: string;
}) => {
  if (!elements.length) {
    return null;
  }
  const animated = elements.filter((element) => element.animation);
  const type = commonValue(
    elements.map((element) => element.animation?.type ?? "none"),
  );
  const speed = animated.length
    ? commonValue(animated.map((element) => element.animation!.speed))
    : 3;
  const direction = animated.length
    ? commonValue(animated.map((element) => element.animation!.direction))
    : "forward";
  const enabled = animated.length > 0;
  const changeType = (value: string) => {
    if (value === "none") {
      onChange({ animation: null });
    } else if (value === "dots" || value === "pulse" || value === "dashes") {
      onChange({ patch: { type: value } });
    }
  };
  return (
    <div className="linear-element-animation-controls">
      <label>
        {t("labels.animationType")}
        <select
          aria-label={t("labels.animationType")}
          data-testid={`${idPrefix}-type`}
          value={type}
          onChange={(event) => changeType(event.currentTarget.value)}
        >
          {type === "mixed" && (
            <option value="mixed" disabled>
              {t("labels.animationMixed")}
            </option>
          )}
          <option value="none">{t("labels.animationNone")}</option>
          <option value="dots">{t("labels.animationDots")}</option>
          <option value="pulse">{t("labels.animationPulse")}</option>
          <option value="dashes">{t("labels.animationDashes")}</option>
        </select>
      </label>
      <label>
        {t("labels.animationSpeed")}
        <span className="linear-element-animation-controls__speed">
          <input
            aria-label={t("labels.animationSpeed")}
            aria-valuetext={
              speed === "mixed" ? t("labels.animationMixed") : `${speed}×`
            }
            data-testid={`${idPrefix}-speed`}
            type="range"
            min="1"
            max="5"
            step="1"
            disabled={!enabled}
            value={
              speed === "mixed" ? animated[0]?.animation?.speed ?? 3 : speed
            }
            onChange={(event) =>
              onChange({ patch: { speed: Number(event.currentTarget.value) } })
            }
          />
          <output>
            {speed === "mixed" ? t("labels.animationMixed") : `${speed}×`}
          </output>
        </span>
      </label>
      <label>
        {t("labels.animationDirection")}
        <select
          aria-label={t("labels.animationDirection")}
          data-testid={`${idPrefix}-direction`}
          disabled={!enabled}
          value={direction}
          onChange={(event) =>
            onChange({
              patch: {
                direction: event.currentTarget
                  .value as LinearElementAnimation["direction"],
              },
            })
          }
        >
          {direction === "mixed" && (
            <option value="mixed" disabled>
              {t("labels.animationMixed")}
            </option>
          )}
          <option value="forward">{t("labels.animationForward")}</option>
          <option value="reverse">{t("labels.animationReverse")}</option>
        </select>
      </label>
    </div>
  );
};
