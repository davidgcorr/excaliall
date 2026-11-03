import { useCallback, useId, useRef } from "react";
import { STROKE_WIDTH, isTransparent } from "@excalidraw/common";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { t } from "../i18n";
import { getShortcutKey } from "../shortcut";

import { useApp, useExcalidrawAppState, useExcalidrawElements } from "./App";
import { ColorPicker } from "./ColorPicker/ColorPicker";
import { RadioSelection } from "./RadioSelection";
import {
  EdgeRoundIcon,
  EdgeSharpIcon,
  FillCrossHatchIcon,
  FillHachureIcon,
  FillSolidIcon,
  FillZigZagIcon,
  SloppinessArchitectIcon,
  SloppinessArtistIcon,
  SloppinessCartoonistIcon,
  StrokeStyleDashedIcon,
  StrokeStyleDottedIcon,
  StrokeWidthBaseIcon,
  StrokeWidthBoldIcon,
  StrokeWidthExtraBoldIcon,
} from "./icons";

export type DataElementStyle = Pick<
  ExcalidrawElement,
  | "strokeColor"
  | "backgroundColor"
  | "fillStyle"
  | "strokeStyle"
  | "strokeWidth"
  | "roughness"
> & { rounded?: boolean };

/** Shared palette and radio primitives used by the ordinary shape properties. */
export const DataElementStyleControls = ({
  style,
  onChange,
  corners = false,
}: {
  style: DataElementStyle;
  onChange: (patch: Partial<DataElementStyle>) => void;
  corners?: boolean;
}) => {
  // ColorPicker memoizes its callbacks; palette picks must use the latest data.
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const change = useCallback(
    (patch: Partial<DataElementStyle>) => changeRef.current(patch),
    [],
  );
  const app = useApp();
  const appState = useExcalidrawAppState();
  const elements = useExcalidrawElements();
  return (
    <div
      className="data-element-style-controls"
      data-testid="data-element-style-controls"
    >
      <h3 aria-hidden="true">{t("labels.stroke")}</h3>
      <ColorPicker
        type="elementStroke"
        color={style.strokeColor}
        label={t("labels.stroke")}
        elements={elements}
        appState={appState}
        updateData={(data) => app.setAppState(data)}
        customizableTopPicks="elementStroke"
        onChange={(strokeColor) => change({ strokeColor })}
      />
      <h3 aria-hidden="true">{t("labels.background")}</h3>
      <ColorPicker
        type="elementBackground"
        color={style.backgroundColor}
        label={t("labels.background")}
        elements={elements}
        appState={appState}
        updateData={(data) => app.setAppState(data)}
        customizableTopPicks="elementBackground"
        onChange={(backgroundColor) => change({ backgroundColor })}
      />
      {!isTransparent(style.backgroundColor) && (
        <fieldset>
          <legend>{t("labels.fill")}</legend>
          <div className="buttonList">
            <RadioSelection
              type="button"
              value={style.fillStyle}
              options={[
                {
                  value: "hachure",
                  text: `${
                    style.fillStyle === "zigzag"
                      ? t("labels.zigzag")
                      : t("labels.hachure")
                  } (${getShortcutKey("Alt-Click")})`,
                  icon:
                    style.fillStyle === "zigzag"
                      ? FillZigZagIcon
                      : FillHachureIcon,
                  active:
                    style.fillStyle === "hachure" ||
                    style.fillStyle === "zigzag",
                  testId: "fill-hachure",
                },
                {
                  value: "cross-hatch",
                  text: t("labels.crossHatch"),
                  icon: FillCrossHatchIcon,
                  testId: "fill-cross-hatch",
                },
                {
                  value: "solid",
                  text: t("labels.solid"),
                  icon: FillSolidIcon,
                  testId: "fill-solid",
                },
              ]}
              onClick={(fillStyle, event) =>
                change({
                  fillStyle:
                    event.altKey &&
                    fillStyle === "hachure" &&
                    style.fillStyle === "hachure"
                      ? "zigzag"
                      : (fillStyle as DataElementStyle["fillStyle"]),
                })
              }
            />
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend>{t("labels.strokeWidth")}</legend>
        <div className="buttonList">
          <RadioSelection
            group="stroke-width"
            value={style.strokeWidth}
            options={[
              {
                value: STROKE_WIDTH.thin,
                text: t("labels.thin"),
                icon: StrokeWidthBaseIcon,
                testId: "strokeWidth-thin",
              },
              {
                value: STROKE_WIDTH.medium,
                text: t("labels.medium"),
                icon: StrokeWidthBoldIcon,
                testId: "strokeWidth-medium",
              },
              {
                value: STROKE_WIDTH.bold,
                text: t("labels.bold"),
                icon: StrokeWidthExtraBoldIcon,
                testId: "strokeWidth-bold",
              },
            ]}
            onChange={(strokeWidth) => change({ strokeWidth })}
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>{t("labels.strokeStyle")}</legend>
        <div className="buttonList">
          <RadioSelection
            group="strokeStyle"
            value={style.strokeStyle}
            options={[
              {
                value: "solid",
                text: t("labels.strokeStyle_solid"),
                icon: StrokeWidthBaseIcon,
                testId: "strokeStyle-solid",
              },
              {
                value: "dashed",
                text: t("labels.strokeStyle_dashed"),
                icon: StrokeStyleDashedIcon,
                testId: "strokeStyle-dashed",
              },
              {
                value: "dotted",
                text: t("labels.strokeStyle_dotted"),
                icon: StrokeStyleDottedIcon,
                testId: "strokeStyle-dotted",
              },
            ]}
            onChange={(strokeStyle) =>
              change({
                strokeStyle: strokeStyle as DataElementStyle["strokeStyle"],
              })
            }
          />
        </div>
      </fieldset>
      <DataElementRoughnessControls
        value={style.roughness}
        onChange={(roughness) => change({ roughness })}
      />
      {corners && (
        <fieldset>
          <legend>{t("labels.edges")}</legend>
          <div className="buttonList">
            <RadioSelection
              group="edges"
              value={style.rounded ? "round" : "sharp"}
              options={[
                {
                  value: "sharp",
                  text: t("labels.sharp"),
                  icon: EdgeSharpIcon,
                  testId: "table-edges-sharp",
                },
                {
                  value: "round",
                  text: t("labels.round"),
                  icon: EdgeRoundIcon,
                  testId: "table-edges-round",
                },
              ]}
              onChange={(value) => change({ rounded: value === "round" })}
            />
          </div>
        </fieldset>
      )}
    </div>
  );
};

export const DataElementRoughnessControls = ({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) => {
  const group = useId();
  return (
    <fieldset disabled={disabled} data-testid="data-element-roughness">
      <legend>{t("labels.sloppiness")}</legend>
      <div className="buttonList">
        <RadioSelection
          group={`sloppiness-${group}`}
          value={value}
          options={[
            {
              value: 0,
              text: t("labels.architect"),
              icon: SloppinessArchitectIcon,
              testId: "roughness-0",
            },
            {
              value: 1,
              text: t("labels.artist"),
              icon: SloppinessArtistIcon,
              testId: "roughness-1",
            },
            {
              value: 2,
              text: t("labels.cartoonist"),
              icon: SloppinessCartoonistIcon,
              testId: "roughness-2",
            },
          ]}
          onChange={onChange}
        />
      </div>
    </fieldset>
  );
};
