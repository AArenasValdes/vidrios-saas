"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildSubscriptionActivationWhatsappHref,
  resolveOrganizationSubscriptionState,
  VENTORA_MONTHLY_PRICE,
  VENTORA_YEARLY_PRICE,
  VENTORA_QUOTE_ONLY_YEARLY_PRICE,
} from "@/features/subscriptions/services/subscription-status.service";
import { useWebpayPago } from "@/features/subscriptions/hooks/useWebpayPago";

import s from "./page.module.css";

export function CuentaVencidaPageContent() {
  const { profile } = useOrganizationProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pagoFallido = searchParams.get("pago_fallido") === "1";
  const { pagar, cargando: cargandoWebpay, error: errorWebpay } = useWebpayPago();
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
  const webpayDisabled = cargandoWebpay || hasActivePaidSubscription;
  const monthlyHref = buildSubscriptionActivationWhatsappHref({
    companyName,
    plan: "mensual",
  });
  const pagarFounderFull = useCallback(() => {
    pagar("founder_full", "yearly");
  }, [pagar]);

  const pagarQuoteOnly = useCallback(() => {
    pagar("quote_only", "yearly");
  }, [pagar]);

  const volver = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }, [router]);

  return (
    <section className={s.wrap}>
      <div className={s.card}>
        <button className={s.backButton} type="button" onClick={volver}>
          <LuArrowLeft aria-hidden />
          <span>Volver</span>
        </button>

        <div className={s.hero}>
          <span className={s.eyebrow}>Cuenta en modo lectura</span>
          <h1 className={s.title}>Activa Ventora y vuelve a operar sin cortes.</h1>
          <p className={s.text}>
            Elige un plan para seguir creando cotizaciones, capturando solicitudes y cerrando
            trabajos desde el celular.
          </p>
        </div>

        {(pagoFallido || errorWebpay) ? (
          <div className={s.errorBanner} role="alert">
            {errorWebpay ?? "El pago no pudo procesarse. Intenta de nuevo o contactanos por WhatsApp."}
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
            <button
              className={s.webpayButton}
              onClick={pagarFounderFull}
              disabled={webpayDisabled}
              type="button"
            >
              {cargandoWebpay ? "Redirigiendo a Webpay..." : "Pagar con Webpay"}
            </button>
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
            <button
              className={s.webpayButtonOutline}
              onClick={pagarQuoteOnly}
              disabled={webpayDisabled}
              type="button"
            >
              {cargandoWebpay ? "Redirigiendo a Webpay..." : "Pagar con Webpay"}
            </button>
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
            <a className={s.whatsappButton} href={monthlyHref} target="_blank" rel="noreferrer">
              Contactar por WhatsApp
            </a>
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
            href="mailto:ventora.cl@gmail.com?subject=Plan%20Empresa%20Acompanado"
            target="_blank"
            rel="noreferrer"
          >
            Contactar soporte
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
