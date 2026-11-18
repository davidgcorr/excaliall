import { APP_NAME } from "@excalidraw/common";

import "./ExcalidrawLogo.scss";

const LogoIcon = () => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="ExcalidrawLogo-icon"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="60" height="60" rx="15" fill="#6965db" />
    <path
      d="M15 19C19 28 23 37 29 47C35 36 42 25 49 17"
      stroke="#fff"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="48" cy="44" r="5" fill="#8ce6c3" />
  </svg>
);

const LogoText = () => (
  <svg viewBox="0 0 180 64" className="ExcalidrawLogo-text" aria-hidden="true">
    <text
      x="0"
      y="49"
      fill="currentColor"
      fontFamily="Caveat, sans-serif"
      fontSize="54"
      fontWeight="700"
    >
      {APP_NAME}
    </text>
  </svg>
);

type LogoSize = "xs" | "small" | "normal" | "large" | "custom" | "mobile";

interface LogoProps {
  size?: LogoSize;
  withText?: boolean;
  style?: React.CSSProperties;
  /**
   * If true, the logo will not be wrapped in a Link component.
   * The link prop will be ignored as well.
   * It will merely be a plain div.
   */
  isNotLink?: boolean;
}

export const ExcalidrawLogo = ({
  style,
  size = "small",
  withText,
}: LogoProps) => (
  <div
    className={`ExcalidrawLogo is-${size}`}
    style={style}
    role="img"
    aria-label={APP_NAME}
  >
    <LogoIcon />
    {withText && <LogoText />}
  </div>
);
