"use client";

import { useCallback, useState } from "react";

import type {
  BillingPeriodCode,
  BillingProductCode,
} from "@/features/billing/types/plans";
import { googleTagService } from "@/features/analytics/services/google-tag.service";

export function useMercadoPagoSubscriptionCheckout() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async (
    planCode: BillingProductCode,
    billingPeriod: BillingPeriodCode
  ) => {
    if (loadingPlan) {
      return;
    }

    setLoadingPlan(`${planCode}:${billingPeriod}`);
    setError(null);

    googleTagService.trackEvent("checkout_started", {
      event_category: "billing",
      plan_code: planCode,
      billing_period: billingPeriod,
      currency: "CLP",
    });

    try {
      const response = await fetch("/api/subscriptions/mercadopago/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode, billingPeriod }),
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
