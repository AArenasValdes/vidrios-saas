"use client";

import { useCallback, useState } from "react";
import type { BillingPeriod, PlanCode } from "@/features/subscriptions/types/subscription";

type UseWebpayPagoReturn = {
  pagar: (planCode: PlanCode, billingPeriod: BillingPeriod) => Promise<void>;
  cargando: boolean;
  error: string | null;
};

export function useWebpayPago(): UseWebpayPagoReturn {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pagar = useCallback(
    async (planCode: PlanCode, billingPeriod: BillingPeriod) => {
      setCargando(true);
      setError(null);

      try {
        const res = await fetch("/api/subscriptions/webpay/crear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_code: planCode, billing_period: billingPeriod }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Error al iniciar el pago");
        }

        const { url } = await res.json();

        if (!url) {
          throw new Error("No se recibio la URL de pago");
        }

        window.location.href = url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado");
        setCargando(false);
      }
    },
    []
  );

  return { pagar, cargando, error };
}
