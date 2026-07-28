"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LuMessageCircle, LuX } from "react-icons/lu";

import { AdminClientPublicChannelSection } from "@/features/admin/components/admin-client-public-channel-section";
import { ClientStatusBadge } from "@/features/admin/components/client-status-badge";
import {
  buildClientActivityTimeline,
  buildRecommendedAction,
  formatStatusLabel,
  resolveClientHealth,
} from "@/features/admin/services/admin-clientes-workspace.service";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";
import type { AdminClientDetail } from "@/features/admin/types/admin-client";
import type { BillingPlanCode } from "@/features/billing/types/plans";
import s from "./admin-client-detail-workspace.module.css";

const PLAN_OPTIONS: Array<{ value: BillingPlanCode; label: string }> = [
  { value: "founder_monthly", label: "Founder mensual ($8.990)" },
  { value: "founder_full_annual", label: "Founder anual ($79.990)" },
  { value: "quote_only_annual", label: "Solo cotización anual ($59.990)" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatClp(value: number | null) {
  if (!value) return "—";
  return `$${value.toLocaleString("es-CL")}`;
}

type AdminClientDetailWorkspaceProps = {
  client: AdminClientDetail;
  highlightSolicitudId?: string | null;
};

export function AdminClientDetailWorkspace({
  client,
  highlightSolicitudId = null,
}: AdminClientDetailWorkspaceProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTestConfirmOpen, setIsTestConfirmOpen] = useState(false);
  const [planCode, setPlanCode] = useState<BillingPlanCode>("founder_monthly");
  const [reference, setReference] = useState("");

  const displayName = client.profile.empresaNombre ?? client.organizationName;
  const health = resolveClientHealth({
    estadoEfectivo: client.subscription.effectiveStatus,
    cotizacionesCount: client.usage.cotizacionesCount,
    lastActivityAt: client.usage.lastActivityAt,
  });

  const recommended = useMemo(() => buildRecommendedAction(client), [client]);
  const timeline = useMemo(() => buildClientActivityTimeline(client), [client]);

  async function handleActivatePayment() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/clientes/activate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: client.organizationId,
          planCode,
          reference,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        result?: { periodEndsAt: string };
      };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos registrar el pago.");
      setMessage(`Pago activo hasta ${formatDate(payload.result?.periodEndsAt ?? null)}.`);
      setIsPaymentOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al pagar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExtendTrial() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/clientes/extend-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: client.organizationId, extraDays: 7 }),
      });
      const payload = (await response.json()) as {
        error?: string;
        result?: { trialEndsAt: string };
      };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos extender el trial.");
      setMessage(`Trial extendido hasta ${formatDate(payload.result?.trialEndsAt ?? null)}.`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al extender.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivateTrial() {
    if (
      !window.confirm(
        `¿Desactivar el trial de ${displayName}? La cuenta quedará vencida. Si fue un error, también puedes marcarla como cuenta de prueba.`
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/clientes/deactivate-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: client.organizationId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos desactivar el trial.");
      setMessage("Trial desactivado. La cuenta quedó vencida.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al desactivar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleTestAccount(nextValue: boolean) {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/clientes/set-test-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: client.organizationId,
          isTestAccount: nextValue,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos actualizar la cuenta.");
      setMessage(nextValue ? "Marcada como cuenta de prueba." : "Marcada como cuenta real.");
      setIsTestConfirmOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al actualizar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={s.page}>
      {error ? <div className={s.bannerError}>{error}</div> : null}
      {message ? <div className={s.bannerSuccess}>{message}</div> : null}

      <header className={s.header}>
        <div>
          <Link href="/admin/clientes" className={s.backLink}>← Volver a Clientes</Link>
          <h1>{displayName}</h1>
          <div className={s.metaRow}>
            <ClientStatusBadge status={client.subscription.effectiveStatus} />
            <span>{getPlanLabel(client.subscription.planCode)}</span>
            <span className={`${s.healthBadge} ${s[`health_${health.tone}`]}`}>{health.label}</span>
          </div>
          <p className={s.summaryLine}>
            {formatStatusLabel(client.subscription.effectiveStatus)} · {getPlanLabel(client.subscription.planCode)} ·{" "}
            {client.usage.cotizacionesCount} cotizaciones ·{" "}
            {client.usage.lastActivityAt ? "Actividad reciente" : "Sin actividad reciente"}
          </p>
        </div>
        <div className={s.quickActions}>
          {client.quickLinks.whatsappUrl ? (
            <a href={client.quickLinks.whatsappUrl} target="_blank" rel="noreferrer" className={s.secondaryBtn}>
              <LuMessageCircle aria-hidden /> WhatsApp
            </a>
          ) : null}
          <button type="button" className={s.secondaryBtn} onClick={() => setIsPaymentOpen(true)}>
            Registrar pago
          </button>
          <button type="button" className={s.secondaryBtn} onClick={() => void handleExtendTrial()}>
            Extender trial
          </button>
          {client.subscription.effectiveStatus === "trial_active" ||
          client.subscription.effectiveStatus === "trial_expiring" ? (
            <button
              type="button"
              className={s.ghostBtn}
              disabled={isSubmitting}
              onClick={() => void handleDeactivateTrial()}
            >
              Desactivar trial
            </button>
          ) : null}
          {client.quickLinks.publicPageUrl ? (
            <Link href={client.quickLinks.publicPageUrl} className={s.secondaryBtn}>
              Ver página pública
            </Link>
          ) : null}
          <button type="button" className={s.ghostBtn} onClick={() => setIsTestConfirmOpen(true)}>
            {client.isTestAccount ? "Marcar real" : "Marcar prueba"}
          </button>
        </div>
      </header>

      <div className={s.grid}>
        <section className={s.panel}>
          <h2>Resumen de cuenta</h2>
          <dl className={s.summaryGrid}>
            <div><dt>Tipo</dt><dd>{client.isTestAccount ? "Prueba" : "Real"}</dd></div>
            <div><dt>Estado</dt><dd>{formatStatusLabel(client.subscription.effectiveStatus)}</dd></div>
            <div><dt>Plan</dt><dd>{getPlanLabel(client.subscription.planCode)}</dd></div>
            <div><dt>Trial hasta</dt><dd>{formatDate(client.subscription.trialEndsAt)}</dd></div>
            <div><dt>Activo hasta</dt><dd>{formatDate(client.subscription.subscriptionEndsAt)}</dd></div>
            <div><dt>Último pago</dt><dd>{formatDate(client.subscription.lastPaymentAt)}</dd></div>
            <div><dt>Creada</dt><dd>{formatDate(client.createdAt)}</dd></div>
          </dl>
        </section>

        <section className={s.panel}>
          <h2>Contacto de registro</h2>
          <dl className={s.summaryGrid}>
            <div>
              <dt>Nombre</dt>
              <dd>{client.principalUser?.nombre ?? "Sin informar"}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{client.principalUser?.correo ?? client.organizationEmail ?? "Sin informar"}</dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>{client.principalUser?.whatsapp ?? client.organizationPhone ?? "Sin informar"}</dd>
            </div>
            <div>
              <dt>Ciudad o comuna</dt>
              <dd>{client.principalUser?.ciudadComuna ?? client.profile.publicZone ?? "Sin informar"}</dd>
            </div>
            <div>
              <dt>Registro</dt>
              <dd>{formatDate(client.principalUser?.createdAt ?? client.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className={s.panel}>
          <h2>Uso del producto</h2>
          <dl className={s.summaryGrid}>
            <div><dt>Cotizaciones</dt><dd>{client.usage.cotizacionesCount}</dd></div>
            <div>
              <dt>Primera cotizacion</dt>
              <dd>{client.usage.firstQuoteAt ? formatDate(client.usage.firstQuoteAt) : "Aun no creada"}</dd>
            </div>
            <div><dt>PDFs generados</dt><dd>{client.usage.pdfsGeneradosCount}</dd></div>
            <div><dt>Clientes registrados</dt><dd>{client.usage.clientesRegistradosCount}</dd></div>
            <div><dt>Página pública</dt><dd>{client.publicChannel.pageStatusLabel}</dd></div>
            <div><dt>Última actividad</dt><dd>{formatDate(client.usage.lastActivityAt)}</dd></div>
          </dl>
        </section>

        <AdminClientPublicChannelSection
          client={client}
          highlightSolicitudId={highlightSolicitudId}
        />

        <section className={`${s.panel} ${s.recommendedPanel}`}>
          <h2>Acción recomendada</h2>
          <strong>{recommended.title}</strong>
          <p>{recommended.detail}</p>
          <div className={s.quickActions}>
            {recommended.ctaType === "whatsapp" && recommended.whatsappUrl ? (
              <a href={recommended.whatsappUrl} target="_blank" rel="noreferrer" className={s.primaryBtn}>
                {recommended.ctaLabel}
              </a>
            ) : null}
            {recommended.ctaType === "payment" ? (
              <button type="button" className={s.primaryBtn} onClick={() => setIsPaymentOpen(true)}>
                {recommended.ctaLabel}
              </button>
            ) : null}
            {recommended.ctaType === "extend" ? (
              <button type="button" className={s.primaryBtn} onClick={() => void handleExtendTrial()}>
                {recommended.ctaLabel}
              </button>
            ) : null}
            {recommended.ctaType === "detail" ? (
              <Link href="/cotizaciones" className={s.secondaryBtn}>{recommended.ctaLabel}</Link>
            ) : null}
          </div>
        </section>

        <section className={s.panel}>
          <h2>Actividad de la cuenta</h2>
          {timeline.length === 0 ? (
            <p className={s.emptyCompact}>Sin eventos registrados todavía.</p>
          ) : (
            <ul className={s.timeline}>
              {timeline.map((event) => (
                <li key={event.id}>
                  <strong>{event.label}</strong>
                  <span>{formatDate(event.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.panel}>
          <div className={s.panelHeader}>
            <h2>Pagos</h2>
            <button type="button" className={s.secondaryBtn} onClick={() => setIsPaymentOpen(true)}>
              Registrar pago
            </button>
          </div>
          {client.payments.length === 0 ? (
            <div className={s.emptyCompact}>
              No hay pagos registrados todavía.
              <button type="button" className={s.primaryBtn} onClick={() => setIsPaymentOpen(true)}>
                Registrar pago
              </button>
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Plan</th>
                    <th>Referencia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {client.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.paidAt ?? payment.createdAt)}</td>
                      <td>{formatClp(payment.amountClp)}</td>
                      <td>{getPlanLabel(payment.planCode)}</td>
                      <td>{payment.buyOrder ?? "—"}</td>
                      <td>{payment.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isPaymentOpen ? (
        <div className={s.modalBackdrop} onClick={() => setIsPaymentOpen(false)}>
          <div className={s.modal} onClick={(event) => event.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Registrar pago</h3>
              <button type="button" className={s.iconBtn} onClick={() => setIsPaymentOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <div className={s.form}>
              <label>
                Plan
                <select value={planCode} onChange={(e) => setPlanCode(e.target.value as BillingPlanCode)}>
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Referencia
                <input value={reference} onChange={(e) => setReference(e.target.value)} />
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.secondaryBtn} onClick={() => setIsPaymentOpen(false)}>Cancelar</button>
                <button type="button" className={s.primaryBtn} disabled={isSubmitting} onClick={() => void handleActivatePayment()}>
                  Registrar pago
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isTestConfirmOpen ? (
        <div className={s.modalBackdrop} onClick={() => setIsTestConfirmOpen(false)}>
          <div className={s.modal} onClick={(event) => event.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Cambiar tipo de cuenta</h3>
              <button type="button" className={s.iconBtn} onClick={() => setIsTestConfirmOpen(false)}>
                <LuX aria-hidden />
              </button>
            </div>
            <p className={s.modalHint}>
              {client.isTestAccount
                ? "Esta cuenta pasará a contarse como cliente real en métricas."
                : "Esta cuenta quedará fuera de métricas comerciales reales."}
            </p>
            <div className={s.modalActions}>
              <button type="button" className={s.secondaryBtn} onClick={() => setIsTestConfirmOpen(false)}>Cancelar</button>
              <button
                type="button"
                className={s.primaryBtn}
                disabled={isSubmitting}
                onClick={() => void handleToggleTestAccount(!client.isTestAccount)}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
