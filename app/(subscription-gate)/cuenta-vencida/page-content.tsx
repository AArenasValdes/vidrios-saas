"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useMercadoPagoSubscriptionCheckout } from "@/features/subscriptions/hooks/useMercadoPagoSubscriptionCheckout";
import { PricingPlans } from "@/features/billing/components/pricing-plans";
import {
  buildPlanContractWhatsappHref,
  resolveOrganizationSubscriptionState,
} from "@/features/subscriptions/services/subscription-status.service";

import s from "./page.module.css";

export function CuentaVencidaPageContent({
  mercadoPagoEnabled,
}: {
  mercadoPagoEnabled: boolean;
}) {
  const { profile } = useOrganizationProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pagoFallido = searchParams.get("pago_fallido") === "1";
  const pagoPendiente = searchParams.get("pago_pendiente") === "1";
  const companyName = profile?.empresaNombre ?? "Mi empresa";
  const subscriptionState = resolveOrganizationSubscriptionState({
    subscriptionStatus: profile?.subscriptionStatus ?? null,
    trialStartedAt: profile?.trialStartedAt ?? null,
    trialEndsAt: profile?.trialEndsAt ?? null,
    subscriptionStartedAt: profile?.subscriptionStartedAt ?? null,
    subscriptionEndsAt: profile?.subscriptionEndsAt ?? null,
    planType: profile?.planType ?? null,
    planCode: profile?.planCode ?? null,
    billingPeriod: profile?.billingPeriod ?? null,
    paymentMethod: profile?.paymentMethod ?? null,
    lastPaymentAt: profile?.lastPaymentAt ?? null,
    founderPriceLocked: profile?.founderPriceLocked ?? false,
  });
  const hasActivePaidSubscription =
    subscriptionState.effectiveStatus === "active" &&
    !subscriptionState.isTrial;
  const whatsappDisabled = hasActivePaidSubscription;
  const { startCheckout, loadingPlan, error: checkoutError } =
    useMercadoPagoSubscriptionCheckout();

  const getWhatsappHref = (plan: "quote_only" | "founder_full", period: "monthly" | "yearly") =>
    buildPlanContractWhatsappHref({
      planLabel: `${plan === "founder_full" ? "Ventora Comercial" : "Ventora Cotización"} ${period === "yearly" ? "Anual" : "Mensual"}`,
      companyName,
    });

  const volver = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }, [router]);

  const statusText = (() => {
    if (pagoPendiente) {
      return "Pago pendiente de confirmacion.";
    }

    if (hasActivePaidSubscription && subscriptionState.subscriptionEndsAt) {
      return `Plan activo hasta ${new Date(
        subscriptionState.subscriptionEndsAt
      ).toLocaleDateString("es-CL")}.`;
    }

    if (hasActivePaidSubscription) {
      return "Plan activo.";
    }

    if (
      subscriptionState.isTrial &&
      !subscriptionState.isExpired &&
      typeof subscriptionState.daysRemaining === "number"
    ) {
      return `Trial activo: quedan ${subscriptionState.daysRemaining} dias.`;
    }

    return "Plan vencido.";
  })();

  return (
    <section className={s.wrap}>
      <div className={s.card}>
        <button className={s.backButton} type="button" onClick={volver}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Volver</span>
        </button>

        <div className={s.hero}>
          <span className={s.eyebrow}>Cuenta en modo lectura</span>
          <h1 className={s.title}>Activa Ventora y vuelve a operar sin cortes.</h1>
          <p className={s.text}>
            {mercadoPagoEnabled
              ? "Elige tu plan y completa la suscripcion de forma segura en Mercado Pago. La activacion se confirma automaticamente."
              : "Elige un plan y te contactamos por WhatsApp para activarlo. Todos los pagos se confirman de forma manual por ahora."}
          </p>
          {mercadoPagoEnabled ? (
            <p className={s.text}>
              Usa una cuenta Mercado Pago distinta a la que recibe los pagos de Ventora. Si pagas
              con la misma cuenta vendedora, Mercado Pago puede bloquear el boton Confirmar.
            </p>
          ) : null}
        </div>

        <div className={s.activeBanner} role="status">
          {statusText}
        </div>

        {pagoFallido ? (
          <div className={s.errorBanner} role="alert">
            No pudimos confirmar un pago automatico. Escríbenos por WhatsApp y te activamos el
            plan manualmente.
          </div>
        ) : null}

        {checkoutError ? (
          <div className={s.errorBanner} role="alert">
            {checkoutError}
          </div>
        ) : null}

        {hasActivePaidSubscription ? (
          <div className={s.activeBanner} role="status">
            Tu cuenta ya tiene una suscripción activa.
          </div>
        ) : null}

        <PricingPlans
          context="account"
          isCheckoutEnabled={mercadoPagoEnabled}
          isAccountActive={whatsappDisabled}
          loadingSelection={loadingPlan}
          onCheckout={(plan, period) => void startCheckout(plan, period)}
          getWhatsappHref={getWhatsappHref}
        />

        <div className={s.actions}>
          <Link className={s.secondary} href="/cotizaciones">
            Seguir en modo lectura
          </Link>
        </div>
      </div>
    </section>
  );
}
