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

        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.url;
        form.style.display = "none";

        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "token_ws";
        input.value = data.token;

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
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
