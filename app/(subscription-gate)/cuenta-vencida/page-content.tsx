"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, CreditCard, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useMercadoPagoSubscriptionCheckout } from "@/features/subscriptions/hooks/useMercadoPagoSubscriptionCheckout";
import { PricingPlans } from "@/features/billing/components/pricing-plans";
import {
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
          <div className={s.heroTopline}>
            <span className={s.eyebrow}>Cuenta vencida</span>
            <span className={s.readOnlyState}>Modo lectura</span>
          </div>
          <h1 className={s.title}>
            Activa Ventora y vuelve a operar <span>sin cortes.</span>
          </h1>
          <p className={s.text}>
            {mercadoPagoEnabled
              ? "Elige tu plan y completa la suscripción recurrente de forma segura en Mercado Pago. Tu cuenta se habilita cuando recibimos la confirmación."
              : "Mercado Pago no está disponible en este momento. La cuenta seguirá en modo lectura hasta que se complete la configuración de cobro."}
          </p>
          {mercadoPagoEnabled ? (
            <p className={s.text}>
              Puedes cancelar la renovación cuando quieras. Usa una cuenta Mercado Pago distinta a
              la cuenta vendedora de Ventora para evitar bloqueos del proveedor.
            </p>
          ) : null}
          <div className={s.trustBar}>
            <div className={s.trustItem}>
              <ShieldCheck size={18} aria-hidden />
              <span><strong>Pago seguro</strong><small>Procesado por Mercado Pago</small></span>
            </div>
            <div className={s.trustItem}>
              <RefreshCw size={18} aria-hidden />
              <span><strong>Suscripción recurrente</strong><small>Mensual o anual, tú eliges</small></span>
            </div>
            <div className={s.trustItem}>
              <LockKeyhole size={18} aria-hidden />
              <span><strong>Control total</strong><small>Cancela la renovación cuando quieras</small></span>
            </div>
          </div>
        </div>

        <div className={s.statusPanel} role="status">
          <div>
            <span className={s.statusLabel}>ESTADO DE CUENTA</span>
            <strong>{statusText}</strong>
          </div>
          <span className={s.statusHint}>
            {hasActivePaidSubscription ? "No necesitas contratar otro plan." : "Elige una opción para recuperar la operación completa."}
          </span>
        </div>

        {pagoFallido ? (
          <div className={s.errorBanner} role="alert">
            No pudimos confirmar el pago automático. Puedes volver a intentar el checkout o
            contactarnos para revisar el caso.
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
        />

        <div className={s.actions}>
          <Link className={s.secondary} href="/cotizaciones">
            <BadgeCheck size={16} aria-hidden />
            Seguir en modo lectura
          </Link>
        </div>

        <div className={s.securityNote}>
          <CreditCard size={17} aria-hidden />
          <span>Ventora no guarda los datos de tu tarjeta. Mercado Pago procesa el cobro.</span>
        </div>
      </div>
    </section>
  );
}
