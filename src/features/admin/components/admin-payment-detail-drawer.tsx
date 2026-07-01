"use client";

import { LuX } from "react-icons/lu";

import { formatPaymentStatusLabel, mapProviderLabel } from "@/features/admin/services/admin-payments-filters.service";
import type { AdminPaymentActionRow } from "@/features/admin/types/admin-payments";
import s from "./admin-payment-detail-drawer.module.css";

type AdminPaymentDetailDrawerProps = {
  row: AdminPaymentActionRow | null;
  onClose: () => void;
  onConfirmPayment: (paymentId: number) => void;
  onActivatePlan: (organizationId: number) => void;
  onExtendTrial: (organizationId: number) => void;
  onRejectPayment: (paymentId: number) => void;
};

function formatClp(value: number | null) {
  if (!value) return "—";
  return `$${value.toLocaleString("es-CL")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminPaymentDetailDrawer({
  row,
  onClose,
  onConfirmPayment,
  onActivatePlan,
  onExtendTrial,
  onRejectPayment,
}: AdminPaymentDetailDrawerProps) {
  if (!row) {
    return null;
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <aside className={s.drawer} onClick={(event) => event.stopPropagation()} role="dialog">
        <div className={s.header}>
          <div>
            <h2>{row.empresaNombre}</h2>
            <p>{row.situation}</p>
          </div>
          <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Cerrar detalle">
            <LuX aria-hidden />
          </button>
        </div>

        <dl className={s.grid}>
          <div><dt>Plan</dt><dd>{row.planLabel}</dd></div>
          <div><dt>Monto</dt><dd>{formatClp(row.amountClp)}</dd></div>
          <div><dt>Medio</dt><dd>{row.paymentProvider ? mapProviderLabel(row.paymentProvider) : "—"}</dd></div>
          <div><dt>Referencia</dt><dd>{row.reference ?? "—"}</dd></div>
          <div><dt>Fecha</dt><dd>{formatDate(row.fecha)}</dd></div>
          <div><dt>Estado del pago</dt><dd>{formatPaymentStatusLabel(row.paymentStatus)}</dd></div>
          <div><dt>Estado de suscripción</dt><dd>{row.accountStatus}</dd></div>
          <div><dt>Próxima acción</dt><dd>{row.proximaAccion}</dd></div>
        </dl>

        <div className={s.actions}>
          {row.paymentId && row.paymentStatus === "pendiente" ? (
            <button type="button" className={s.primaryBtn} onClick={() => onConfirmPayment(row.paymentId!)}>
              Confirmar pago
            </button>
          ) : null}
          <button type="button" className={s.primaryBtn} onClick={() => onActivatePlan(row.organizationId)}>
            Activar plan
          </button>
          <button type="button" className={s.secondaryBtn} onClick={() => onExtendTrial(row.organizationId)}>
            Extender trial
          </button>
          {row.whatsappUrl ? (
            <a href={row.whatsappUrl} target="_blank" rel="noreferrer" className={s.secondaryBtn}>
              Abrir WhatsApp
            </a>
          ) : null}
          <a href={`/admin/clientes/${row.organizationId}`} className={s.secondaryBtn}>
            Ver ficha
          </a>
          {row.paymentId ? (
            <button type="button" className={s.dangerBtn} onClick={() => onRejectPayment(row.paymentId!)}>
              Marcar como rechazado
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
