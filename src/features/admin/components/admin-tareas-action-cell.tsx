"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { LuEllipsisVertical, LuMessageCircle } from "react-icons/lu";

import {
  AdminFloatingMenu,
  adminFloatingMenuStyles as ms,
} from "@/features/admin/components/admin-floating-menu";
import type { AdminTask } from "@/features/admin/types/admin-tareas";
import s from "./admin-payment-action-cell.module.css";

type AdminTareasActionCellProps = {
  task: AdminTask;
  onComplete: (task: AdminTask) => void;
  onPostpone: (task: AdminTask) => void;
  onDeleteManual: (task: AdminTask) => void;
};

export function AdminTareasActionCell({
  task,
  onComplete,
  onPostpone,
  onDeleteManual,
}: AdminTareasActionCellProps) {
  const menuId = useId();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function handlePrimary() {
    if (task.actionType === "ver_solicitud" && task.solicitudId && task.organizationId) {
      window.location.href = `/admin/clientes/${task.organizationId}?solicitud=${task.solicitudId}`;
      return;
    }
    if (task.whatsappUrl) {
      window.open(task.whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = task.href;
  }

  const isPublicChannelTask = task.origin === "solicitud_publica";

  return (
    <div className={s.cell}>
      <button type="button" className={s.primaryBtn} onClick={handlePrimary}>
        {task.whatsappUrl ? <LuMessageCircle aria-hidden /> : null}
        <span>{task.primaryActionLabel}</span>
      </button>
      <div className={s.menuWrap}>
        <button
          ref={menuBtnRef}
          type="button"
          className={s.menuBtn}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <LuEllipsisVertical aria-hidden />
        </button>
        <AdminFloatingMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={menuBtnRef}
          menuId={menuId}
          align="right"
          estimatedHeight={320}
        >
          {isPublicChannelTask && task.solicitudId && task.organizationId ? (
            <Link
              href={`/admin/clientes/${task.organizationId}?solicitud=${task.solicitudId}`}
              className={ms.menuItem}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              Ver solicitud
            </Link>
          ) : null}
          <Link
            href={task.href}
            className={ms.menuItem}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            {isPublicChannelTask ? "Ver cuenta" : "Ver ficha"}
          </Link>
          {isPublicChannelTask && task.publicPageUrl ? (
            <Link
              href={task.publicPageUrl}
              className={ms.menuItem}
              role="menuitem"
              target="_blank"
              onClick={() => setMenuOpen(false)}
            >
              Abrir página pública
            </Link>
          ) : null}
          {task.whatsappUrl ? (
            <a
              href={task.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={ms.menuItem}
              role="menuitem"
            >
              Abrir WhatsApp
            </a>
          ) : null}
          <button
            type="button"
            className={ms.menuItem}
            role="menuitem"
            onClick={() => {
              onComplete(task);
              setMenuOpen(false);
            }}
          >
            Marcar completada
          </button>
          <button
            type="button"
            className={ms.menuItem}
            role="menuitem"
            onClick={() => {
              onPostpone(task);
              setMenuOpen(false);
            }}
          >
            Posponer para mañana
          </button>
          {task.kind === "manual" && task.manualTaskId ? (
            <>
              <div className={ms.menuDivider} />
              <button
                type="button"
                className={ms.menuItemDanger}
                role="menuitem"
                onClick={() => {
                  if (window.confirm("¿Eliminar esta tarea manual?")) {
                    onDeleteManual(task);
                  }
                  setMenuOpen(false);
                }}
              >
                Eliminar tarea manual
              </button>
            </>
          ) : null}
        </AdminFloatingMenu>
      </div>
    </div>
  );
}
