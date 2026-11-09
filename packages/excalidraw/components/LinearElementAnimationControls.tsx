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
  const color = commonValue(
    animated.map(
      (element) =>
        element.animation!.color ??
        (element.animation!.type === "dashes"
          ? "#3b82f6"
          : element.strokeColor),
    ),
  );
  const inheritColor = animated.every((element) => !element.animation!.color);
  const amount = commonValue(
    animated.map((element) => element.animation!.amount),
  );
  const size = commonValue(
    animated.map((element) => element.animation!.size ?? 1),
  );
  const changeType = (value: string) => {
    if (value === "none") {
      onChange({ animation: null });
    } else if (
      value === "dots" ||
      value === "pulse" ||
      value === "dashes" ||
      value === "arrows"
    ) {
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
          <option value="arrows">{t("labels.animationArrows")}</option>
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
        {t("labels.animationColor")}
        <input
          type="color"
          aria-label={t("labels.animationColor")}
          data-testid={`${idPrefix}-color`}
          disabled={!enabled}
          value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#1971c2"}
          onChange={(event) =>
            onChange({ patch: { color: event.currentTarget.value } })
          }
        />
      </label>
      <label className="linear-element-animation-controls__inherit">
        <input
          type="checkbox"
          disabled={!enabled}
          checked={inheritColor}
          onChange={(event) =>
            onChange({
              patch: {
                color: event.currentTarget.checked
                  ? undefined
                  : /^#[0-9a-f]{6}$/i.test(color)
                  ? color
                  : "#1971c2",
              },
            })
          }
        />
        {t("labels.animationInheritColor")}
      </label>
      {(
        [
          ["amount", amount, 1, 50, 1, "animationAmount"],
          ["size", size, 0.5, 4, 0.25, "animationSize"],
        ] as const
      ).map(([parameter, value, min, max, step, label]) => (
        <label key={parameter}>
          {t(`labels.${label}`)}
          <span className="linear-element-animation-controls__speed">
            <input
              type="range"
              aria-label={t(`labels.${label}`)}
              data-testid={`${idPrefix}-${parameter}`}
              min={min}
              max={max}
              step={step}
              disabled={!enabled}
              value={value === "mixed" ? min : value ?? 6}
              aria-valuetext={
                value === "mixed"
                  ? t("labels.animationMixed")
                  : value === undefined
                  ? t("labels.animationAuto")
                  : `${value}${parameter === "size" ? "×" : ""}`
              }
              onChange={(event) =>
                onChange({
                  patch: { [parameter]: Number(event.currentTarget.value) },
                })
              }
            />
            <output>
              {value === "mixed"
                ? t("labels.animationMixed")
                : value === undefined
                ? t("labels.animationAuto")
                : `${value}${parameter === "size" ? "×" : ""}`}
            </output>
          </span>
        </label>
      ))}
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
