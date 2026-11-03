import { useExcalidrawAppState } from "@excalidraw/excalidraw/components/App";
import { Footer } from "@excalidraw/excalidraw/index";
import React from "react";

import { isExcalidrawPlusSignedUser } from "../app_constants";

import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { EncryptedIcon } from "./EncryptedIcon";

export const AppFooter = React.memo(
  ({ onChange }: { onChange: () => void }) => {
    const { hidePromotions } = useExcalidrawAppState();
    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          {!hidePromotions && !isExcalidrawPlusSignedUser && <EncryptedIcon />}
        </div>
      </Footer>
    );
  },
);
