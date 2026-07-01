"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { getAdminPortalElement } from "@/features/admin/components/admin-portal";
import { useFloatingMenuPosition } from "@/features/admin/components/use-floating-menu-position";
import s from "./admin-floating-menu.module.css";

type AdminFloatingMenuProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  menuId?: string;
  align?: "right" | "left";
  estimatedHeight?: number;
  children: ReactNode;
  ignoreRefs?: Array<RefObject<HTMLElement | null>>;
};

export function AdminFloatingMenu({
  open,
  onClose,
  anchorRef,
  menuId,
  align = "right",
  estimatedHeight = 320,
  children,
  ignoreRefs = [],
}: AdminFloatingMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const position = useFloatingMenuPosition(open, anchorRef, { align, estimatedHeight });

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) {
        return;
      }
      if (menuRef.current?.contains(target)) {
        return;
      }
      for (const ref of ignoreRefs) {
        if (ref.current?.contains(target)) {
          return;
        }
      }
      onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, anchorRef, ignoreRefs, onClose]);

  const portalTarget =
    typeof document === "undefined" ? null : getAdminPortalElement() ?? document.body;

  if (!open || !position || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      id={menuId}
      className={s.menu}
      style={{ top: position.top, left: position.left }}
      role="menu"
    >
      {children}
    </div>,
    portalTarget
  );
}

export { s as adminFloatingMenuStyles };
