import { createContext, useContext, type CSSProperties } from "react";

export type EmailDirection = "ltr" | "rtl";
export const EmailDirectionContext = createContext<EmailDirection>("ltr");
export const useEmailDirection = () => useContext(EmailDirectionContext);

export function emailDirection(locale: string): EmailDirection {
  return locale.toLowerCase().split("-")[0] === "he" ? "rtl" : "ltr";
}

// Inline physical fallbacks work in mail clients that ignore logical CSS.
export function directionalStyle(
  style: CSSProperties,
  direction: EmailDirection,
): CSSProperties {
  if (direction === "ltr") return style;
  const mirrored = { ...style };
  for (const [left, right] of [
    ["marginLeft", "marginRight"],
    ["paddingLeft", "paddingRight"],
  ] as const) {
    delete mirrored[left];
    delete mirrored[right];
    if (style[left] !== undefined) mirrored[right] = style[left];
    if (style[right] !== undefined) mirrored[left] = style[right];
  }
  if (style.textAlign === "left") mirrored.textAlign = "right";
  if (style.textAlign === "right") mirrored.textAlign = "left";
  return mirrored;
}

/** Isolate inserted names/identifiers in both HTML and generated plain text. */
export function isolateText(value: string): string {
  return `\u2068${value}\u2069`;
}
