"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import type { AdminClientRow } from "@/features/admin/services/admin-clients.service";
import type { BillingPlanCode } from "@/features/billing/types/plans";
import s from "./page.module.css";

const PLAN_OPTIONS: Array<{ value: BillingPlanCode; label: string }> = [
  { value: "founder_monthly", label: "Founder mensual ($8.990)" },
  { value: "founder_full_annual", label: "Founder anual ($79.990)" },
  { value: "quote_only_annual", label: "Solo cotizacion anual ($59.990)" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("es-CL");
}

export function AdminClientesPageClient() {
  const [clients, setClients] = useState<AdminClientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [provisionForm, setProvisionForm] = useState({
    email: "",
    password: "",
    empresaNombre: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    planCode: "founder_monthly" as BillingPlanCode,
    reference: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/clientes");
      const payload = (await response.json().catch(() => null)) as
        | { clients?: AdminClientRow[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos cargar clientes.");
      }

      setClients(payload?.clients ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar clientes."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  async function handleProvision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/clientes/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provisionForm),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; result?: { organizationId: number } }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos crear la cuenta.");
      }

      setMessage(
        `Cuenta creada. Org #${payload?.result?.organizationId}. Completa datos en /configuracion/empresa.`
      );
      setProvisionForm({ email: "", password: "", empresaNombre: "" });
      await loadClients();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos crear la cuenta."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleActivatePayment() {
    const organizationId = Number(selectedOrganizationId);
    if (!organizationId) {
      setError("Selecciona una organizacion.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/clientes/activate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          planCode: paymentForm.planCode,
          reference: paymentForm.reference,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; result?: { periodEndsAt: string } }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos activar el pago.");
      }

      setMessage(
        `Pago activo hasta ${formatDate(payload?.result?.periodEndsAt ?? null)}.`
      );
      await loadClients();
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
    const organizationId = Number(selectedOrganizationId);
    if (!organizationId) {
      setError("Selecciona una organizacion.");
      return;
    }

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
        `Trial extendido hasta ${formatDate(payload?.result?.trialEndsAt ?? null)}.`
      );
      await loadClients();
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
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <p className={s.kicker}>Ventora Admin</p>
          <h1 className={s.title}>Clientes y activaciones</h1>
          <p className={s.subtitle}>
            Crea cuentas trial, activa pagos manuales y extiende pruebas. Los
            datos de empresa se completan en la app.
          </p>
        </div>
        <div className={s.headerActions}>
          <Link href="/dashboard" className={s.secondaryButton}>
            Volver al panel
          </Link>
          <button
            type="button"
            className={s.secondaryButton}
            onClick={() => void loadClients()}
            disabled={isLoading}
          >
            Actualizar
          </button>
        </div>
      </header>

      {error ? <div className={s.errorBanner}>{error}</div> : null}
      {message ? <div className={s.successBanner}>{message}</div> : null}

      <section className={s.grid}>
        <article className={s.card}>
          <h2 className={s.cardTitle}>Crear cuenta trial</h2>
          <form className={s.form} onSubmit={handleProvision}>
            <label className={s.field}>
              <span>Nombre empresa</span>
              <input
                className={s.input}
                value={provisionForm.empresaNombre}
                onChange={(event) =>
                  setProvisionForm((current) => ({
                    ...current,
                    empresaNombre: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className={s.field}>
              <span>Correo admin</span>
              <input
                className={s.input}
                type="email"
                value={provisionForm.email}
                onChange={(event) =>
                  setProvisionForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className={s.field}>
              <span>Contrasena inicial</span>
              <input
                className={s.input}
                type="password"
                minLength={8}
                value={provisionForm.password}
                onChange={(event) =>
                  setProvisionForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
              />
            </label>
            <button
              type="submit"
              className={s.primaryButton}
              disabled={isSubmitting}
            >
              Crear cuenta
            </button>
          </form>
        </article>

        <article className={s.card}>
          <h2 className={s.cardTitle}>Activar pago o extender trial</h2>
          <div className={s.form}>
            <label className={s.field}>
              <span>Organizacion</span>
              <select
                className={s.input}
                value={selectedOrganizationId}
                onChange={(event) => setSelectedOrganizationId(event.target.value)}
              >
                <option value="">Selecciona una empresa</option>
                {clients.map((client) => (
                  <option
                    key={client.organizationId}
                    value={String(client.organizationId)}
                  >
                    #{client.organizationId} · {client.empresaNombre}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span>Plan a activar</span>
              <select
                className={s.input}
                value={paymentForm.planCode}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    planCode: event.target.value as BillingPlanCode,
                  }))
                }
              >
                {PLAN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span>Referencia transferencia</span>
              <input
                className={s.input}
                value={paymentForm.reference}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
                placeholder="Comprobante o nota interna"
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
                +7 dias trial
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className={s.card}>
        <h2 className={s.cardTitle}>Listado</h2>
        {isLoading ? <p className={s.muted}>Cargando clientes...</p> : null}
        {!isLoading && clients.length === 0 ? (
          <p className={s.muted}>No hay clientes activos.</p>
        ) : null}
        {!isLoading && clients.length > 0 ? (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th>Plan</th>
                  <th>Trial hasta</th>
                  <th>Activo hasta</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.organizationId}>
                    <td>{client.organizationId}</td>
                    <td>{client.empresaNombre}</td>
                    <td>{client.adminEmail ?? "—"}</td>
                    <td>{client.subscriptionStatus ?? "—"}</td>
                    <td>{client.planCode ?? "—"}</td>
                    <td>{formatDate(client.trialEndsAt)}</td>
                    <td>{formatDate(client.subscriptionEndsAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
