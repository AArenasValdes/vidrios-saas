"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { LuEllipsisVertical, LuMessageCircle } from "react-icons/lu";

import {
  AdminFloatingMenu,
  adminFloatingMenuStyles as ms,
} from "@/features/admin/components/admin-floating-menu";
import { primaryActionLabel } from "@/features/admin/services/admin-activacion-filters.service";
import type { ActivacionAttentionRow } from "@/features/admin/types/admin-activacion";
import s from "./admin-payment-action-cell.module.css";

type AdminActivacionActionCellProps = {
  row: ActivacionAttentionRow;
  appOrigin: string;
  onExtendTrial: (organizationId: number) => void;
  onActivatePlan: (organizationId: number) => void;
  onRegisterPayment: (organizationId: number) => void;
  onMarkLost: (organizationId: number) => void;
  onArchiveTest: (organizationId: number) => void;
  onMarkActivated: (organizationId: number) => void;
  onCopyPublicLink: (url: string) => void;
  onOpenTemplates: () => void;
};

const ACTIVACION_MENU_ITEM_COUNT = 12;

export function AdminActivacionActionCell({
  row,
  appOrigin,
  onExtendTrial,
  onActivatePlan,
  onRegisterPayment,
  onMarkLost,
  onArchiveTest,
  onMarkActivated,
  onCopyPublicLink,
  onOpenTemplates,
}: AdminActivacionActionCellProps) {
  const menuId = useId();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function handlePrimary() {
    if (
      (row.primaryAction === "remind" ||
        row.primaryAction === "contact" ||
        row.primaryAction === "activate_account" ||
        row.primaryAction === "guide_send") &&
      row.whatsappUrl
    ) {
      window.open(row.whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (row.primaryAction === "recover") {
      onExtendTrial(row.organizationId);
      return;
    }

    onOpenTemplates();
  }

  const showWhatsappIcon =
    row.whatsappUrl &&
    (row.primaryAction === "remind" ||
      row.primaryAction === "contact" ||
      row.primaryAction === "activate_account" ||
      row.primaryAction === "guide_send");

  return (
    <div className={s.cell}>
      <button type="button" className={s.primaryBtn} onClick={handlePrimary}>
        {showWhatsappIcon ? <LuMessageCircle aria-hidden /> : null}
        <span>{primaryActionLabel(row.primaryAction)}</span>
      </button>
      <div className={s.menuWrap}>
        <button
          ref={menuBtnRef}
          type="button"
          className={s.menuBtn}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          title="Más acciones"
          aria-label={`Más acciones para ${row.empresaNombre}`}
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
          estimatedHeight={Math.min(420, 44 * ACTIVACION_MENU_ITEM_COUNT + 24)}
        >
          <Link
            href={`/admin/clientes/${row.organizationId}`}
            className={ms.menuItem}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Ver ficha del cliente
          </Link>
          {row.whatsappUrl ? (
            <a
              href={row.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className={ms.menuItem}
              role="menuitem"
            >
              Abrir WhatsApp
            </a>
          ) : null}
          <Link
            href={`/admin/clientes/${row.organizationId}`}
            className={ms.menuItem}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Ver cotizaciones
          </Link>
          <Link
            href={`/admin/clientes/${row.organizationId}`}
            className={ms.menuItem}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Abrir onboarding
          </Link>
          <button
            type="button"
            className={ms.menuItem}
            role="menuitem"
            onClick={() => {
              onExtendTrial(row.organizationId);
              setMenuOpen(false);
            }}
          >
            Extender trial 7 días
          </button>
          <button
            type="button"
            className={ms.menuItem}
            role="menuitem"
            onClick={() => {
              onRegisterPayment(row.organizationId);
              setMenuOpen(false);
            }}
          >
            Registrar pago
          </button>
          <button
            type="button"
            className={ms.menuItem}
            role="menuitem"
            onClick={() => {
              onActivatePlan(row.organizationId);
              setMenuOpen(false);
            }}
          >
            Activar plan
          </button>
          <button
            type="button"
            className={ms.menuItem}
            role="menuitem"
            onClick={() => {
              onMarkActivated(row.organizationId);
              setMenuOpen(false);
            }}
          >
            Marcar como activada
          </button>
          {row.publicPageUrl ? (
            <button
              type="button"
              className={ms.menuItem}
              role="menuitem"
              onClick={() => {
                onCopyPublicLink(`${appOrigin}${row.publicPageUrl}`);
                setMenuOpen(false);
              }}
            >
              Copiar enlace de página pública
            </button>
          ) : null}
          <div className={ms.menuDivider} role="separator" />
          <button
            type="button"
            className={ms.menuItemDanger}
            role="menuitem"
            onClick={() => {
              if (window.confirm("¿Marcar esta cuenta como perdida?")) {
                onMarkLost(row.organizationId);
              }
              setMenuOpen(false);
            }}
          >
            Marcar como perdido
          </button>
          {!row.isTestAccount ? (
            <button
              type="button"
              className={ms.menuItemDanger}
              role="menuitem"
              onClick={() => {
                if (window.confirm("¿Archivar como cuenta de prueba?")) {
                  onArchiveTest(row.organizationId);
                }
                setMenuOpen(false);
              }}
            >
              Archivar cuenta de prueba
            </button>
          ) : null}
        </AdminFloatingMenu>
      </div>
    </div>
  );
}
