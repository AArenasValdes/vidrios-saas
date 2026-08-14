"use client";

import { useCallback, useState } from "react";

import type { MercadoPagoChilePlanCode } from "@/features/subscriptions/config/mercadopago-cl.config";

export function useBillingCheckout() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pagar = useCallback(
    async (planCode: MercadoPagoChilePlanCode) => {
      setCargando(true);
      setError(null);

      try {
        const response = await fetch("/api/subscriptions/mercadopago/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planCode }),
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
