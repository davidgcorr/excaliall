import {
  loginIcon,
  ExcalLogo,
  eyeIcon,
} from "@excalidraw/excalidraw/components/icons";
import { useI18n } from "@excalidraw/excalidraw/i18n";
import { MainMenu } from "@excalidraw/excalidraw/index";
import React, { lazy, Suspense } from "react";

import {
  useApp,
  useExcalidrawAppState,
} from "@excalidraw/excalidraw/components/App";
import { isDevEnv } from "@excalidraw/common";

import type { Theme } from "@excalidraw/element/types";

import { LanguageList } from "../app-language/LanguageList";
import { isExcalidrawPlusSignedUser } from "../app_constants";

import { useAtom } from "../app-jotai";
import { roughVizDialogAtom } from "../charts/state";

import { saveDebugState } from "./DebugCanvas";

const RoughVizDialog = lazy(() =>
  import("../charts/RoughVizDialog").then((module) => ({
    default: module.RoughVizDialog,
  })),
);

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  theme: Theme | "system";
  refresh: () => void;
}> = React.memo((props) => {
  const { t } = useI18n();
  const app = useApp();
  const { hidePromotions } = useExcalidrawAppState();
  const [chartRequest, setChartRequest] = useAtom(roughVizDialogAtom);
  return (
    <>
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveToActiveFile />
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.SaveAsImage />
        {props.isCollabEnabled && (
          <MainMenu.DefaultItems.LiveCollaborationTrigger
            isCollaborating={props.isCollaborating}
            onSelect={() => props.onCollabDialogOpen()}
          />
        )}
        <MainMenu.DefaultItems.CommandPalette className="highlighted" />
        <MainMenu.DefaultItems.SearchMenu />
        <MainMenu.DefaultItems.Help />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.Separator />
        {!hidePromotions && (
          <MainMenu.ItemLink
            icon={ExcalLogo}
            href={`${
              import.meta.env.VITE_APP_PLUS_LP
            }/plus?utm_source=excalidraw&utm_medium=app&utm_content=hamburger`}
            className=""
          >
            Excalidraw+
          </MainMenu.ItemLink>
        )}
        <MainMenu.DefaultItems.Socials />
        {!hidePromotions && (
          <MainMenu.ItemLink
            icon={loginIcon}
            href={`${import.meta.env.VITE_APP_PLUS_APP}${
              isExcalidrawPlusSignedUser ? "" : "/sign-up"
            }?utm_source=signin&utm_medium=app&utm_content=hamburger`}
            className="highlighted"
          >
            {isExcalidrawPlusSignedUser
              ? t("labels.signIn")
              : t("labels.signUp")}
          </MainMenu.ItemLink>
        )}
        {isDevEnv() && (
          <MainMenu.Item
            icon={eyeIcon}
            onSelect={() => {
              if (window.visualDebug) {
                delete window.visualDebug;
                saveDebugState({ enabled: false });
              } else {
                window.visualDebug = { data: [] };
                saveDebugState({ enabled: true });
              }
              props?.refresh();
            }}
          >
            Visual Debug
          </MainMenu.Item>
        )}
        <MainMenu.Separator />
        <MainMenu.DefaultItems.Preferences
          additionalItems={
            <>
              <MainMenu.Item
                icon={eyeIcon}
                selected={hidePromotions}
                aria-pressed={hidePromotions}
                data-testid="toggle-upstream-promotions"
                onSelect={() =>
                  app.setAppState({ hidePromotions: !app.state.hidePromotions })
                }
              >
                {hidePromotions
                  ? t("labels.showUpstreamPromotions")
                  : t("labels.hideUpstreamPromotions")}
              </MainMenu.Item>
              <MainMenu.Separator />
              <MainMenu.ItemCustom className="AppMainMenu__version">
                <span data-testid="app-version">
                  {t("labels.appVersion", {
                    version: import.meta.env.VITE_APP_VERSION,
                  })}
                </span>
                <small data-testid="app-build-revision">
                  {t("labels.appBuild", {
                    revision: import.meta.env.VITE_APP_BUILD_REVISION,
                  })}
                </small>
              </MainMenu.ItemCustom>
            </>
          }
        />
        <MainMenu.DefaultItems.ToggleTheme
          allowSystemTheme
          theme={props.theme}
        />
        <MainMenu.ItemCustom>
          <LanguageList style={{ width: "100%" }} />
        </MainMenu.ItemCustom>
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
      {chartRequest && (
        <Suspense fallback={null}>
          <RoughVizDialog
            elementId={chartRequest.elementId}
            onClose={() => setChartRequest(null)}
          />
        </Suspense>
      )}
    </>
  );
});
