"use client";

import { useLayoutEffect, useState } from "react";

type FloatingMenuAlign = "right" | "left";

export function useFloatingMenuPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  options?: {
    align?: FloatingMenuAlign;
    minWidth?: number;
    offsetY?: number;
    estimatedHeight?: number;
  }
) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function update() {
      const element = anchorRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const minWidth = options?.minWidth ?? 220;
      const offsetY = options?.offsetY ?? 4;
      const estimatedHeight = options?.estimatedHeight ?? 320;
      const align = options?.align ?? "right";
      const viewportPadding = 8;

      let left =
        align === "right" ? rect.right - minWidth : rect.left;
      left = Math.max(
        viewportPadding,
        Math.min(left, window.innerWidth - minWidth - viewportPadding)
      );

      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

      const top = openUpward
        ? Math.max(viewportPadding, rect.top - estimatedHeight - offsetY)
        : rect.bottom + offsetY;

      setPosition({ top, left });
    }

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [
    open,
    anchorRef,
    options?.align,
    options?.minWidth,
    options?.offsetY,
    options?.estimatedHeight,
  ]);

  return open ? position : null;
}
