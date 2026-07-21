"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildPlanContractWhatsappHref,
  resolveOrganizationSubscriptionState,
  VENTORA_MONTHLY_PRICE,
  VENTORA_YEARLY_PRICE,
  VENTORA_QUOTE_ONLY_YEARLY_PRICE,
} from "@/features/subscriptions/services/subscription-status.service";

import s from "./page.module.css";

const PLAN_LABELS = {
  founderFullAnnual: "Founder Full Anual",
  quoteOnlyAnnual: "Solo Cotizacion Anual",
  monthly: "Mensual",
  enterprise: "Plan Empresa Acompanado",
} as const;

export function CuentaVencidaPageContent() {
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
    !subscriptionState.isTrial &&
    Boolean(subscriptionState.subscriptionEndsAt);
  const whatsappDisabled = hasActivePaidSubscription;

  const founderFullHref = buildPlanContractWhatsappHref({
    planLabel: PLAN_LABELS.founderFullAnnual,
    companyName,
  });
  const quoteOnlyHref = buildPlanContractWhatsappHref({
    planLabel: PLAN_LABELS.quoteOnlyAnnual,
    companyName,
  });
  const monthlyHref = buildPlanContractWhatsappHref({
    planLabel: PLAN_LABELS.monthly,
    companyName,
  });
  const enterpriseHref = buildPlanContractWhatsappHref({
    planLabel: PLAN_LABELS.enterprise,
    companyName,
  });

  const volver = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }, [router]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "d4bf8a",
      },
      body: JSON.stringify({
        sessionId: "d4bf8a",
        runId: "pass3",
        hypothesisId: "H-CUENTA",
        location: "cuenta-vencida/page-content.tsx:mount",
        message: "cuenta_vencida_shell_check",
        data: {
          hasAppShellNav: Boolean(
            document.querySelector("[class*='sidebar'], [class*='bottomNav']")
          ),
          scriptCount: document.scripts.length,
          fcpMs: Math.round(
            performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? -1
          ),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  const statusText = (() => {
    if (pagoPendiente) {
      return "Pago pendiente de confirmacion.";
    }

    if (hasActivePaidSubscription && subscriptionState.subscriptionEndsAt) {
      return `Plan activo hasta ${new Date(
        subscriptionState.subscriptionEndsAt
      ).toLocaleDateString("es-CL")}.`;
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
            Elige un plan y te contactamos por WhatsApp para activarlo. Todos los pagos se
            confirman de forma manual por ahora.
          </p>
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

        {hasActivePaidSubscription ? (
          <div className={s.activeBanner} role="status">
            Tu cuenta ya tiene una suscripción activa.
          </div>
        ) : null}

        <div className={s.priceGrid}>
          <article className={`${s.priceCard} ${s.priceCardHighlight}`}>
            <div className={s.planTopline}>
              <span className={s.priceLabel}>Founder Full Anual</span>
              <span className={s.recommendedBadge}>Recomendado</span>
            </div>
            <strong className={s.priceValue}>
              ${VENTORA_YEARLY_PRICE.toLocaleString("es-CL")}
              <span>/ a&ntilde;o</span>
            </strong>
            <p className={s.priceHint}>
              Cotizaciones, solicitudes, página pública, WhatsApp y aprobación de presupuestos.
            </p>
            {whatsappDisabled ? (
              <span className={`${s.webpayButton} ${s.buttonDisabled}`} aria-disabled="true">
                Contratar por WhatsApp
              </span>
            ) : (
              <a
                className={s.webpayButton}
                href={founderFullHref}
                target="_blank"
                rel="noreferrer"
              >
                Contratar por WhatsApp
              </a>
            )}
          </article>
          <article className={s.priceCard}>
            <div className={s.planTopline}>
              <span className={s.priceLabel}>Solo Cotizaci&oacute;n Anual</span>
            </div>
            <strong className={s.priceValue}>
              ${VENTORA_QUOTE_ONLY_YEARLY_PRICE.toLocaleString("es-CL")}
              <span>/ a&ntilde;o</span>
            </strong>
            <p className={s.priceHint}>
              Cotiza rápido desde el celular, genera PDF profesional y comparte por WhatsApp.
            </p>
            {whatsappDisabled ? (
              <span
                className={`${s.webpayButtonOutline} ${s.buttonDisabled}`}
                aria-disabled="true"
              >
                Contratar por WhatsApp
              </span>
            ) : (
              <a
                className={s.webpayButtonOutline}
                href={quoteOnlyHref}
                target="_blank"
                rel="noreferrer"
              >
                Contratar por WhatsApp
              </a>
            )}
          </article>
          <article className={`${s.priceCard} ${s.priceCardManual}`}>
            <div className={s.planTopline}>
              <span className={s.priceLabel}>Mensual manual</span>
              <span className={s.manualBadge}>WhatsApp</span>
            </div>
            <strong className={s.priceValue}>
              ${VENTORA_MONTHLY_PRICE.toLocaleString("es-CL")}
              <span>/ mes</span>
            </strong>
            <p className={s.priceHint}>
              Pago mensual manual por WhatsApp. Ideal si quieres comenzar sin compromiso anual.
            </p>
            {whatsappDisabled ? (
              <span className={`${s.whatsappButton} ${s.buttonDisabled}`} aria-disabled="true">
                Contratar por WhatsApp
              </span>
            ) : (
              <a
                className={s.whatsappButton}
                href={monthlyHref}
                target="_blank"
                rel="noreferrer"
              >
                Contratar por WhatsApp
              </a>
            )}
          </article>
        </div>

        <aside className={s.enterpriseBox}>
          <div>
            <span className={s.enterpriseEyebrow}>¿Necesitas algo más avanzado?</span>
            <strong>Plan Empresa Acompañado desde $250.000</strong>
            <p>
              Configuración asistida, capacitación y adaptación inicial del flujo comercial. Motor
              de precios personalizado disponible previa evaluación.
            </p>
          </div>
          <a
            className={s.supportButton}
            href={enterpriseHref}
            target="_blank"
            rel="noreferrer"
          >
            Consultar por WhatsApp
          </a>
        </aside>

        <div className={s.actions}>
          <Link className={s.secondary} href="/cotizaciones">
            Seguir en modo lectura
          </Link>
        </div>
      </div>
    </section>
  );
}
