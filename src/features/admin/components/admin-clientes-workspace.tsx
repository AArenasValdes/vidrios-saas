"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type FormEvent } from "react";

import { ClientStatusBadge } from "@/features/admin/components/client-status-badge";
import {
  buildProvisionCredentialsText,
  buildProvisionWhatsAppMessage,
} from "@/features/admin/services/admin-provision-message";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import type { BillingPlanCode } from "@/features/billing/types/plans";
import s from "./admin-ops.module.css";

const PLAN_OPTIONS: Array<{ value: BillingPlanCode; label: string }> = [
  { value: "founder_monthly", label: "Founder mensual ($8.990)" },
  { value: "founder_full_annual", label: "Founder anual ($79.990)" },
  { value: "quote_only_annual", label: "Solo cotización anual ($59.990)" },
];

type AdminClientesWorkspaceProps = {
  initialClients: AdminClientListItem[];
};

type ProvisionSuccess = {
  organizationId: number;
  empresaNombre: string;
  email: string;
  password: string;
  trialEndsAt: string | null;
};

type AccountFilter = "all" | "real" | "test";

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

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function AdminClientesWorkspace({
  initialClients,
}: AdminClientesWorkspaceProps) {
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<ProvisionSuccess | null>(
    null
  );
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    email: "",
    password: "",
    empresaNombre: "",
    isTestAccount: true,
  });
  const [paymentForm, setPaymentForm] = useState({
    planCode: "founder_monthly" as BillingPlanCode,
    reference: "",
  });

  const appOrigin = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.location.origin;
  }, []);

  const loadClients = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/admin/clientes");
      const payload = (await response.json().catch(() => null)) as
        | { clients?: AdminClientListItem[]; error?: string }
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
    }
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      if (accountFilter === "real" && client.isTestAccount) {
        return false;
      }

      if (accountFilter === "test" && !client.isTestAccount) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        String(client.organizationId),
        client.empresaNombre,
        client.correoPrincipal ?? "",
        client.planLabel,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [clients, search, accountFilter]);

  async function handleCopyCredentials() {
    if (!provisionSuccess) {
      return;
    }

    try {
      await copyToClipboard(
        buildProvisionCredentialsText({
          email: provisionSuccess.email,
          password: provisionSuccess.password,
        })
      );
      setCopyFeedback("Credenciales copiadas.");
    } catch {
      setCopyFeedback("No pudimos copiar. Selecciona y copia manualmente.");
    }
  }

  async function handleCopyWhatsAppMessage() {
    if (!provisionSuccess || !appOrigin) {
      return;
    }

    try {
      await copyToClipboard(
        buildProvisionWhatsAppMessage({
          appOrigin,
          empresaNombre: provisionSuccess.empresaNombre,
          email: provisionSuccess.email,
          password: provisionSuccess.password,
          trialEndsAt: provisionSuccess.trialEndsAt,
        })
      );
      setCopyFeedback("Mensaje WhatsApp copiado.");
    } catch {
      setCopyFeedback("No pudimos copiar. Selecciona y copia manualmente.");
    }
  }

  async function handleProvision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    setCopyFeedback(null);
    setProvisionSuccess(null);

    const submittedCredentials = { ...provisionForm };

    try {
      const response = await fetch("/api/admin/clientes/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: submittedCredentials.email,
          password: submittedCredentials.password,
          empresaNombre: submittedCredentials.empresaNombre,
          isTestAccount: submittedCredentials.isTestAccount,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            result?: {
              organizationId: number;
              email: string;
              empresaNombre: string;
              trialEndsAt: string | null;
            };
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos crear la cuenta.");
      }

      const result = payload?.result;
      if (result) {
        setProvisionSuccess({
          organizationId: result.organizationId,
          empresaNombre: result.empresaNombre,
          email: result.email,
          password: submittedCredentials.password,
          trialEndsAt: result.trialEndsAt ?? null,
        });
        setSelectedOrganizationId(String(result.organizationId));
      }

      setProvisionForm({
        email: "",
        password: "",
        empresaNombre: "",
        isTestAccount: true,
      });
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
      setError("Selecciona una organización.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    setCopyFeedback(null);

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
      setError("Selecciona una organización.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    setCopyFeedback(null);

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
    <div className={s.workspace}>
      {error ? <div className={s.bannerError}>{error}</div> : null}
      {message ? <div className={s.bannerSuccess}>{message}</div> : null}

      {provisionSuccess ? (
        <div className={s.bannerSuccess}>
          <p className={s.successTitle}>
            Cuenta #{provisionSuccess.organizationId} creada · trial 7 días hasta{" "}
            {formatDate(provisionSuccess.trialEndsAt)}
          </p>
          <p className={s.successMeta}>
            {provisionSuccess.empresaNombre} · {provisionSuccess.email}
          </p>
          <div className={s.actionRow}>
            <button
              type="button"
              className={s.secondaryButton}
              onClick={() => void handleCopyCredentials()}
            >
              Copiar credenciales
            </button>
            <button
              type="button"
              className={s.primaryButton}
              onClick={() => void handleCopyWhatsAppMessage()}
            >
              Copiar mensaje WhatsApp
            </button>
          </div>
          {copyFeedback ? <p className={s.copyFeedback}>{copyFeedback}</p> : null}
        </div>
      ) : null}

      <div className={s.opsGrid}>
        <section className={s.panel}>
          <h2 className={s.panelTitle}>Crear cuenta trial</h2>
          <p className={s.panelHint}>
            Trial 7 días con acceso Founder Full. No hace falta activar plan de pago.
          </p>
          <form className={s.form} onSubmit={handleProvision}>
            <label className={s.field}>
              <span>Empresa</span>
              <input
                className={s.input}
                value={provisionForm.empresaNombre}
                onChange={(event) =>
                  setProvisionForm((current) => ({
                    ...current,
                    empresaNombre: event.target.value,
                  }))
                }
                placeholder="Nombre comercial"
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
                placeholder="cliente@empresa.cl"
                required
              />
            </label>
            <label className={s.field}>
              <span>Contraseña inicial</span>
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
                placeholder="Mínimo 8 caracteres"
                required
              />
            </label>
            <label className={s.checkboxField}>
              <input
                type="checkbox"
                checked={provisionForm.isTestAccount}
                onChange={(event) =>
                  setProvisionForm((current) => ({
                    ...current,
                    isTestAccount: event.target.checked,
                  }))
                }
              />
              <span>Marcar como cuenta de prueba</span>
            </label>
            <button
              type="submit"
              className={s.primaryButton}
              disabled={isSubmitting}
            >
              Crear cuenta
            </button>
          </form>
        </section>

        <section className={s.panel}>
          <h2 className={s.panelTitle}>Activar pago o extender trial</h2>
          <p className={s.panelHint}>
            Solo cuando el cliente ya pagó, o si necesitas sumar 7 días extra.
          </p>
          <div className={s.form}>
            <label className={s.field}>
              <span>Organización</span>
              <select
                className={s.select}
                value={selectedOrganizationId}
                onChange={(event) => setSelectedOrganizationId(event.target.value)}
              >
                <option value="">Selecciona empresa</option>
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
                className={s.select}
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
              <span>Referencia (opcional)</span>
              <input
                className={s.input}
                value={paymentForm.reference}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
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
        </section>
      </div>

      <section className={s.panel}>
        <div className={s.listHeader}>
          <h2 className={s.listTitle}>
            Clientes ({filteredClients.length})
          </h2>
          <div className={s.actionRow}>
            <div className={s.filterRow}>
              {(
                [
                  ["all", "Todas"],
                  ["real", "Reales"],
                  ["test", "Prueba"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    accountFilter === value ? s.filterActive : s.filterButton
                  }
                  onClick={() => setAccountFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              className={`${s.input} ${s.search}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar empresa, correo o ID"
            />
            <button
              type="button"
              className={s.ghostButton}
              onClick={() => void loadClients()}
            >
              Actualizar
            </button>
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <p className={s.muted}>No hay clientes que coincidan.</p>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th>Plan</th>
                  <th>Trial hasta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.organizationId}>
                    <td>
                      #{client.organizationId} · {client.empresaNombre}
                      {client.isTestAccount ? (
                        <>
                          {" "}
                          <span className={s.testBadge}>Prueba</span>
                        </>
                      ) : null}
                    </td>
                    <td>{client.correoPrincipal ?? "—"}</td>
                    <td>
                      <ClientStatusBadge status={client.estadoEfectivo} />
                    </td>
                    <td>{client.planLabel}</td>
                    <td>{formatDate(client.trialEndsAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={s.rowButton}
                        onClick={() =>
                          setSelectedOrganizationId(String(client.organizationId))
                        }
                      >
                        Usar
                      </button>
                      {" · "}
                      <Link
                        href={`/admin/clientes/${client.organizationId}`}
                        className={s.linkInline}
                      >
                        Ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
