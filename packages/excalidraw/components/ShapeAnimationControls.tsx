import type {
  AnimatedShapeElement,
  ShapeElementAnimation,
} from "@excalidraw/element/types";

import { useUIAppState } from "../context/ui-appState";
import { t } from "../i18n";
import { shapeAnimationTypes } from "../renderer/shapeAnimation";

import { useApp, useExcalidrawSetAppState } from "./App";
import { ColorPicker } from "./ColorPicker/ColorPicker";

import "./LinearElementAnimationControls.scss";

import type { ChangeLinearAnimationData } from "../actions/actionAnimation";

const common = <T,>(values: T[]): T | "mixed" =>
  values.every((v) => v === values[0]) ? values[0] : "mixed";
const labels = {
  pulse: "animationPulse",
  glow: "animationGlow",
  fade: "animationFade",
  bounce: "animationBounce",
  shake: "animationShake",
  spin: "animationSpin",
} as const;

export const ShapeAnimationControls = ({
  elements,
  onChange,
}: {
  elements: readonly AnimatedShapeElement[];
  onChange: (data: ChangeLinearAnimationData) => void;
}) => {
  const app = useApp();
  const appState = useUIAppState();
  const setAppState = useExcalidrawSetAppState();
  if (!elements.length) {
    return null;
  }
  const animated = elements.filter((element) => element.shapeAnimation);
  const type = common(
    elements.map((element) => element.shapeAnimation?.type ?? "none"),
  );
  const speed = common(
    animated.map((element) => element.shapeAnimation!.speed),
  );
  const size = common(
    animated.map((element) => element.shapeAnimation!.size ?? 1),
  );
  const color = common(
    animated.map(
      (element) => element.shapeAnimation!.color ?? element.strokeColor,
    ),
  );
  return (
    <div
      className="linear-element-animation-controls"
      data-testid="shape-animation-controls"
    >
      <label>
        {t("labels.animationType")}
        <select
          aria-label={t("labels.animationType")}
          data-testid="shape-animation-type"
          value={type}
          onChange={(event) =>
            onChange(
              event.currentTarget.value === "none"
                ? { shapeAnimation: null }
                : {
                    shapePatch: {
                      type: event.currentTarget
                        .value as ShapeElementAnimation["type"],
                    },
                  },
            )
          }
        >
          {type === "mixed" && (
            <option value="mixed" disabled>
              {t("labels.animationMixed")}
            </option>
          )}
          <option value="none">{t("labels.animationNone")}</option>
          {shapeAnimationTypes.map((type) => (
            <option key={type} value={type}>
              {t(`labels.${labels[type]}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("labels.animationSpeed")}
        <span className="linear-element-animation-controls__speed">
          <input
            type="range"
            aria-label={t("labels.animationSpeed")}
            data-testid="shape-animation-speed"
            min="1"
            max="5"
            step="1"
            disabled={!animated.length}
            value={speed === "mixed" ? 3 : speed ?? 3}
            onChange={(event) =>
              onChange({
                shapePatch: { speed: Number(event.currentTarget.value) },
              })
            }
          />
          <output>
            {speed === "mixed" ? t("labels.animationMixed") : `${speed ?? 3}×`}
          </output>
        </span>
      </label>
      {!!animated.length && (
        <div
          className="linear-element-animation-controls__color"
          data-testid="shape-animation-color"
        >
          <span>{t("labels.animationColor")}</span>
          <ColorPicker
            type="shapeAnimationColor"
            label={t("labels.animationColor")}
            color={color === "mixed" ? null : color ?? null}
            onChange={(color) => onChange({ shapePatch: { color } })}
            elements={app.scene.getNonDeletedElements()}
            appState={appState}
            updateData={setAppState}
          />
        </div>
      )}
      {type !== "fade" && type !== "spin" && (
        <label>
          {t("labels.animationStrength")}
          <span className="linear-element-animation-controls__speed">
            <input
              type="range"
              aria-label={t("labels.animationStrength")}
              data-testid="shape-animation-size"
              min="0.5"
              max="4"
              step="0.25"
              disabled={!animated.length}
              value={size === "mixed" ? 1 : size ?? 1}
              onChange={(event) =>
                onChange({
                  shapePatch: { size: Number(event.currentTarget.value) },
                })
              }
            />
            <output>
              {size === "mixed" ? t("labels.animationMixed") : `${size ?? 1}×`}
            </output>
          </span>
        </label>
      )}
    </div>
  );
};
