export function overlayLeft(
  anchor: { left: number; right: number },
  width: number,
  viewportWidth: number,
  direction: string,
) {
  const preferred = direction === "rtl" ? anchor.right - width : anchor.left;
  return Math.max(8, Math.min(preferred, viewportWidth - width - 8));
}
