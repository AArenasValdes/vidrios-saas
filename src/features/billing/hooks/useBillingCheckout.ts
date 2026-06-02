"use client";

import { useCallback, useState } from "react";

import type { BillingPlanCode } from "@/features/billing/types/plans";
import type { PaymentProvider } from "@/features/subscriptions/types/pago-suscripcion";

export function useBillingCheckout() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pagar = useCallback(
    async (planCode: BillingPlanCode, provider: PaymentProvider = "flow") => {
      setCargando(true);
      setError(null);

      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planCode,
            provider,
          }),
        });
        const data = (await response.json()) as {
          checkout_url?: string;
          error?: string;
        };

        if (!response.ok || !data.checkout_url) {
          throw new Error(data.error ?? "Error al iniciar pago.");
        }

        window.location.assign(data.checkout_url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setCargando(false);
      }
    },
    []
  );

  return { pagar, cargando, error };
}
