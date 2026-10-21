export type TextDirection = "ltr" | "rtl";

export function localeDirection(locale?: string): TextDirection {
  return locale?.split("-")[0].toLowerCase() === "he" ? "rtl" : "ltr";
}

/** Convert a physical pointer movement into progression along a date axis. */
export function timelineDayDelta(
  deltaPixels: number,
  pixelsPerDay: number,
  direction: TextDirection,
) {
  return Math.round(
    (deltaPixels * (direction === "rtl" ? -1 : 1)) /
      Math.max(pixelsPerDay, 1e-6),
  );
}

/** Arrow keys describe screen positions; stored column order is logical. */
export function logicalArrow<T extends string>(
  arrow: T,
  direction: TextDirection,
): T {
  if (direction !== "rtl") return arrow;
  return (arrow === "left" ? "right" : arrow === "right" ? "left" : arrow) as T;
}
