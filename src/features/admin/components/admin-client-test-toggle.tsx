"use client";

import { useState } from "react";

import s from "./admin-ops.module.css";

type AdminClientTestToggleProps = {
  organizationId: number;
  initialIsTestAccount: boolean;
};

export function AdminClientTestToggle({
  organizationId,
  initialIsTestAccount,
}: AdminClientTestToggleProps) {
  const [isTestAccount, setIsTestAccount] = useState(initialIsTestAccount);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleToggle(nextValue: boolean) {
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/clientes/set-test-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          isTestAccount: nextValue,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; result?: { isTestAccount: boolean } }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos actualizar la cuenta.");
      }

      setIsTestAccount(Boolean(payload?.result?.isTestAccount));
      setMessage(
        payload?.result?.isTestAccount
          ? "Marcada como cuenta de prueba."
          : "Marcada como cuenta real."
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos actualizar la cuenta."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={s.form}>
      <p className={s.muted}>
        {isTestAccount
          ? "Esta cuenta se muestra como prueba y queda fuera de metricas reales."
          : "Esta cuenta se trata como cliente real."}
      </p>

      {error ? <div className={s.bannerError}>{error}</div> : null}
      {message ? <div className={s.bannerSuccess}>{message}</div> : null}

      <div className={s.actionRow}>
        <button
          type="button"
          className={isTestAccount ? s.secondaryButton : s.primaryButton}
          disabled={isSubmitting || !isTestAccount}
          onClick={() => void handleToggle(false)}
        >
          Cuenta real
        </button>
        <button
          type="button"
          className={isTestAccount ? s.primaryButton : s.secondaryButton}
          disabled={isSubmitting || isTestAccount}
          onClick={() => void handleToggle(true)}
        >
          Cuenta de prueba
        </button>
      </div>
    </div>
  );
}
