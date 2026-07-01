"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { LuEllipsisVertical, LuMessageCircle } from "react-icons/lu";

import {
  AdminFloatingMenu,
  adminFloatingMenuStyles as ms,
} from "@/features/admin/components/admin-floating-menu";
import type { AdminPaymentActionRow, AdminPaymentPrimaryAction } from "@/features/admin/types/admin-payments";
import s from "./admin-payment-action-cell.module.css";

type AdminPaymentActionCellProps = {
  row: AdminPaymentActionRow;
  onConfirmPayment: (paymentId: number) => void;
  onActivatePlan: (organizationId: number) => void;
  onExtendTrial: (organizationId: number) => void;
  onRejectPayment: (paymentId: number) => void;
  onMarkLost: (organizationId: number) => void;
  onArchiveTest: (organizationId: number) => void;
  onCopyPublicLink: (url: string) => void;
  onOpenDetail: (row: AdminPaymentActionRow) => void;
};

function primaryLabel(action: AdminPaymentPrimaryAction) {
  if (action === "confirm") return "Confirmar pago";
  if (action === "activate") return "Activar plan";
  if (action === "remind") return "Recordar";
  if (action === "recover") return "Recuperar cuenta";
  if (action === "contact") return "Contactar";
  return "Revisar pago";
}

export function AdminPaymentActionCell({
  row,
  onConfirmPayment,
  onActivatePlan,
  onExtendTrial,
  onRejectPayment,
  onMarkLost,
  onArchiveTest,
  onCopyPublicLink,
  onOpenDetail,
}: AdminPaymentActionCellProps) {
  const menuId = useId();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function handlePrimary() {
    if (row.primaryAction === "confirm" && row.paymentId) {
      onConfirmPayment(row.paymentId);
      return;
    }
    if (row.primaryAction === "activate") {
      onActivatePlan(row.organizationId);
      return;
    }
    if (row.primaryAction === "remind" && row.whatsappUrl) {
      window.open(row.whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (row.primaryAction === "recover") {
      onActivatePlan(row.organizationId);
      return;
    }
    if (row.primaryAction === "contact" && row.whatsappUrl) {
      window.open(row.whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }
    onOpenDetail(row);
  }

  const showWhatsappIcon =
    (row.primaryAction === "remind" || row.primaryAction === "contact") && row.whatsappUrl;

  return (
    <div className={s.cell}>
      <button
        type="button"
        className={s.primaryBtn}
        onClick={handlePrimary}
        title={primaryLabel(row.primaryAction)}
      >
        {showWhatsappIcon ? <LuMessageCircle aria-hidden /> : null}
        <span>{primaryLabel(row.primaryAction)}</span>
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
          estimatedHeight={400}
        >
          <Link
            href={`/admin/clientes/${row.organizationId}`}
            className={ms.menuItem}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Ver ficha de cliente
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
          {row.paymentId && row.paymentStatus === "pendiente" ? (
            <button
              type="button"
              className={ms.menuItem}
              role="menuitem"
              onClick={() => {
                onConfirmPayment(row.paymentId!);
                setMenuOpen(false);
              }}
            >
              Confirmar pago
            </button>
          ) : null}
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
              onActivatePlan(row.organizationId);
              setMenuOpen(false);
            }}
          >
            Cambiar plan
          </button>
          <Link
            href={`/admin/clientes/${row.organizationId}`}
            className={ms.menuItem}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            Ver cotizaciones
          </Link>
          {row.publicPageUrl ? (
            <button
              type="button"
              className={ms.menuItem}
              role="menuitem"
              onClick={() => {
                onCopyPublicLink(row.publicPageUrl!);
                setMenuOpen(false);
              }}
            >
              Copiar enlace de página pública
            </button>
          ) : null}
          <div className={ms.menuDivider} role="separator" />
          {row.paymentId ? (
            <button
              type="button"
              className={ms.menuItemDanger}
              role="menuitem"
              onClick={() => {
                onRejectPayment(row.paymentId!);
                setMenuOpen(false);
              }}
            >
              Marcar como rechazado
            </button>
          ) : null}
          <button
            type="button"
            className={ms.menuItemDanger}
            role="menuitem"
            onClick={() => {
              onMarkLost(row.organizationId);
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
                onArchiveTest(row.organizationId);
                setMenuOpen(false);
              }}
            >
              Archivar prueba
            </button>
          ) : null}
        </AdminFloatingMenu>
      </div>
    </div>
  );
}
