import { useLayoutEffect, useRef, type ReactNode } from "react";

// Menus belong to the editor's stacking context, but must fit the visible
// viewport even when the caret is near the bottom of a long description.
export function ViewportOverlay({
  top,
  left,
  position,
  className,
  children,
}: {
  top: number;
  left: number;
  position: "absolute" | "fixed";
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const place = () => {
      const viewport = window.visualViewport;
      const minY = (viewport?.offsetTop ?? 0) + 8;
      const minX = (viewport?.offsetLeft ?? 0) + 8;
      const height = viewport?.height ?? window.innerHeight;
      const width = viewport?.width ?? window.innerWidth;
      element.style.maxHeight = `${Math.max(0, height - 16)}px`;
      element.style.maxWidth = `${Math.max(0, width - 16)}px`;
      element.style.top = `${top}px`;
      element.style.left = `${left}px`;
      const box = element.getBoundingClientRect();
      const y = Math.max(
        minY,
        Math.min(box.top, minY + height - 16 - box.height),
      );
      const x = Math.max(
        minX,
        Math.min(box.left, minX + width - 16 - box.width),
      );
      element.style.top = `${top + y - box.top}px`;
      element.style.left = `${left + x - box.left}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [top, left, position]);

  useLayoutEffect(() => {
    const menu = ref.current;
    const selected = menu?.querySelector<HTMLElement>(".is-selected");
    if (!menu || !selected) return;
    const bounds = menu.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    if (item.bottom > bounds.bottom - 4) {
      menu.scrollTop += item.bottom - bounds.bottom + 4;
    } else if (item.top < bounds.top + 4) {
      menu.scrollTop -= bounds.top + 4 - item.top;
    }
  });

  return (
    <div
      ref={ref}
      className={className}
      style={{ top, left, position, overflowY: "auto" }}
    >
      {children}
    </div>
  );
}
