"use client";

import { useCallback, useState } from "react";

import type { MercadoPagoChilePlanCode } from "@/features/subscriptions/config/mercadopago-cl.config";

export function useMercadoPagoSubscriptionCheckout() {
  const [loadingPlan, setLoadingPlan] = useState<MercadoPagoChilePlanCode | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async (planCode: MercadoPagoChilePlanCode) => {
    if (loadingPlan) {
      return;
    }

    setLoadingPlan(planCode);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/mercadopago/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode }),
      });
      const result = (await response.json()) as {
        checkout_url?: string;
        error?: string;
      };

      if (!response.ok || !result.checkout_url) {
        throw new Error(result.error ?? "No pudimos iniciar Mercado Pago.");
      }

      window.location.assign(result.checkout_url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "No pudimos iniciar Mercado Pago."
      );
      setLoadingPlan(null);
    }
  }, [loadingPlan]);

  return { startCheckout, loadingPlan, error };
}
