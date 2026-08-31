"use client";

import { useState } from "react";

import { formatBillingPlanAmount, type BillingPlanCode } from "@/features/billing/types/plans";
import s from "./admin-ops.module.css";

const PLAN_OPTIONS: Array<{ value: BillingPlanCode; label: string }> = [
  { value: "quote_only_monthly", label: `Ventora Cotización mensual (${formatBillingPlanAmount("quote_only_monthly")})` },
  { value: "quote_only_annual", label: `Ventora Cotización anual (${formatBillingPlanAmount("quote_only_annual")})` },
  { value: "founder_monthly", label: `Ventora Comercial mensual (${formatBillingPlanAmount("founder_monthly")})` },
  { value: "founder_full_annual", label: `Ventora Comercial anual (${formatBillingPlanAmount("founder_full_annual")})` },
];

type AdminClientActionsProps = {
  organizationId: number;
  empresaNombre: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminClientActions({
  organizationId,
  empresaNombre,
}: AdminClientActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [planCode, setPlanCode] = useState<BillingPlanCode>("founder_monthly");
  const [reference, setReference] = useState("");

  async function handleActivatePayment() {
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/clientes/activate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          planCode,
          reference,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; result?: { periodEndsAt: string } }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos activar el pago.");
      }

      setMessage(
        `Pago activo hasta ${formatDate(payload?.result?.periodEndsAt ?? null)}. Recarga la ficha para ver cambios.`
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos activar el pago."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExtendTrial() {
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/clientes/extend-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, extraDays: 7 }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; result?: { trialEndsAt: string } }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos extender el trial.");
      }

      setMessage(
        `Trial extendido hasta ${formatDate(payload?.result?.trialEndsAt ?? null)}. Recarga la ficha para ver cambios.`
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos extender el trial."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={s.form}>
      <p className={s.muted}>
        Acciones para #{organizationId} · {empresaNombre}
      </p>

      {error ? <div className={s.bannerError}>{error}</div> : null}
      {message ? <div className={s.bannerSuccess}>{message}</div> : null}

      <label className={s.field}>
        <span>Plan a activar</span>
        <select
          className={s.select}
          value={planCode}
          onChange={(event) => setPlanCode(event.target.value as BillingPlanCode)}
        >
          {PLAN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={s.field}>
        <span>Referencia (opcional)</span>
        <input
          className={s.input}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Comprobante o nota"
        />
      </label>

      <div className={s.actionRow}>
        <button
          type="button"
          className={s.primaryButton}
          disabled={isSubmitting}
          onClick={() => void handleActivatePayment()}
        >
          Activar pago
        </button>
        <button
          type="button"
          className={s.secondaryButton}
          disabled={isSubmitting}
          onClick={() => void handleExtendTrial()}
        >
          +7 días trial
        </button>
      </div>
    </div>
  );
}
