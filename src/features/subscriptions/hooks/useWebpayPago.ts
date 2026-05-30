"use client";

import { useCallback, useState } from "react";

export function useWebpayPago() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pagar = useCallback(
    async (planCode: string, billingPeriod: string) => {
      setCargando(true);
      setError(null);

      try {
        const res = await fetch("/api/subscriptions/webpay/crear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_code: planCode,
            billing_period: billingPeriod,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.url) {
          throw new Error(
            data.error ?? "Error al iniciar pago en Webpay."
          );
        }

        window.location.href = data.url;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error inesperado."
        );
      } finally {
        setCargando(false);
      }
    },
    []
  );

  return { pagar, cargando, error };
}
