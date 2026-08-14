"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  MERCADOPAGO_RETURN_QUERY_PARAM,
  MERCADOPAGO_RETURN_QUERY_VALUE,
} from "@/features/subscriptions/constants/mercadopago-return";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  isPaidSubscriptionActivated,
  resolveSubscriptionPlanLabel,
} from "@/features/subscriptions/services/mercadopago-return-confirmation.service";
import type { EffectiveSubscriptionState } from "@/features/subscriptions/types/subscription";

const CONFIRMATION_TOAST_ID = "mercadopago-return-confirmation";
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 15;

export function useMercadoPagoReturnConfirmation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshProfile } = useOrganizationProfile();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    if (searchParams.get(MERCADOPAGO_RETURN_QUERY_PARAM) !== MERCADOPAGO_RETURN_QUERY_VALUE) {
      return;
    }

    handledRef.current = true;

    toast.loading("Confirmando tu pago con Mercado Pago...", {
      id: CONFIRMATION_TOAST_ID,
    });

    router.replace("/dashboard", { scroll: false });

    let attempts = 0;
    let cancelled = false;

    const finishPending = () => {
      toast("Seguimos confirmando tu pago. Revisa Mi plan en unos segundos.", {
        id: CONFIRMATION_TOAST_ID,
        action: {
          label: "Mi plan",
          onClick: () => {
            router.push("/cuenta/suscripcion");
          },
        },
      });
    };

    const finishSuccess = (subscription: EffectiveSubscriptionState) => {
      const planLabel = resolveSubscriptionPlanLabel({
        planCode: subscription.planCode,
        billingPeriod: subscription.billingPeriod,
        planType: subscription.planType,
      });

      toast.success(`Pago recibido. Tu plan ${planLabel} ya está activo.`, {
        id: CONFIRMATION_TOAST_ID,
      });
    };

    const poll = async () => {
      if (cancelled) {
        return;
      }

      attempts += 1;

      const nextProfile = await refreshProfile();

      if (isPaidSubscriptionActivated(nextProfile?.subscription)) {
        finishSuccess(nextProfile!.subscription);
        return;
      }

      if (attempts >= MAX_POLL_ATTEMPTS) {
        finishPending();
        return;
      }

      window.setTimeout(() => {
        void poll();
      }, POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [refreshProfile, router, searchParams]);
}
