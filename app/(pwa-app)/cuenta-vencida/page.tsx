"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildSubscriptionActivationWhatsappHref,
  VENTORA_MONTHLY_PRICE,
  VENTORA_YEARLY_PRICE,
  VENTORA_QUOTE_ONLY_YEARLY_PRICE,
} from "@/features/subscriptions/services/subscription-status.service";
import { useWebpayPago } from "@/features/subscriptions/hooks/useWebpayPago";

import s from "./page.module.css";

function CuentaVencidaPageContent() {
  const { profile } = useOrganizationProfile();
  const searchParams = useSearchParams();
  const pagoFallido = searchParams.get("pago_fallido") === "1";
  const { pagar, cargando: cargandoWebpay, error: errorWebpay } = useWebpayPago();
  const companyName = profile?.empresaNombre ?? "Mi empresa";
  const monthlyHref = buildSubscriptionActivationWhatsappHref({
    companyName,
    plan: "mensual",
  });
  const yearlyHref = buildSubscriptionActivationWhatsappHref({
    companyName,
    plan: "anual",
  });

  const pagarFounderFull = useCallback(() => {
    pagar("founder_full", "yearly");
  }, [pagar]);

  const pagarQuoteOnly = useCallback(() => {
    pagar("quote_only", "yearly");
  }, [pagar]);

  return (
    <section className={s.wrap}>
      <div className={s.card}>
        <span className={s.eyebrow}>Cuenta vencida</span>
        <h1 className={s.title}>Tu prueba termino y la cuenta quedo en modo lectura.</h1>
        <p className={s.text}>
          Puedes seguir entrando a Ventora y revisar tus datos actuales, pero para volver
          a crear cotizaciones, editar clientes o cambiar configuracion necesitas activar
          tu cuenta.
        </p>

        {(pagoFallido || errorWebpay) ? (
          <div className={s.errorBanner} role="alert">
            {errorWebpay ?? "El pago no pudo procesarse. Intenta de nuevo o contactanos por WhatsApp."}
          </div>
        ) : null}

        <div className={s.priceGrid}>
          <article className={`${s.priceCard} ${s.priceCardHighlight}`}>
            <span className={s.priceLabel}>Plan Anual Founder Full</span>
            <strong className={s.priceValue}>${VENTORA_YEARLY_PRICE.toLocaleString("es-CL")}</strong>
            <span className={s.priceHint}>Pago unico anual con Webpay. Activacion automatica.</span>
            <button
              className={s.webpayButton}
              onClick={pagarFounderFull}
              disabled={cargandoWebpay}
              type="button"
            >
              {cargandoWebpay ? "Redirigiendo a Webpay..." : "Pagar con Webpay"}
            </button>
          </article>
          <article className={s.priceCard}>
            <span className={s.priceLabel}>Plan Anual Quote-Only</span>
            <strong className={s.priceValue}>${VENTORA_QUOTE_ONLY_YEARLY_PRICE.toLocaleString("es-CL")}</strong>
            <span className={s.priceHint}>Solo cotizaciones. Pago unico anual con Webpay.</span>
            <button
              className={s.webpayButtonOutline}
              onClick={pagarQuoteOnly}
              disabled={cargandoWebpay}
              type="button"
            >
              {cargandoWebpay ? "Redirigiendo a Webpay..." : "Pagar con Webpay"}
            </button>
          </article>
          <article className={s.priceCard}>
            <span className={s.priceLabel}>Plan Mensual</span>
            <strong className={s.priceValue}>${VENTORA_MONTHLY_PRICE.toLocaleString("es-CL")}</strong>
            <span className={s.priceHint}>Pago manual por transferencia y activacion manual.</span>
            <a className={s.whatsappButton} href={monthlyHref} target="_blank" rel="noreferrer">
              Contactar por WhatsApp
            </a>
          </article>
        </div>

        <div className={s.actions}>
          <a className={s.secondary} href={yearlyHref} target="_blank" rel="noreferrer">
            Activar plan anual por WhatsApp
          </a>
          <Link className={s.secondary} href="/cotizaciones">
            Seguir en modo lectura
          </Link>
        </div>

        <p className={s.note}>
          Mensaje prellenado: &ldquo;Hola, quiero activar mi cuenta Ventora. Mi empresa es {companyName}.&rdquo;
        </p>
      </div>
    </section>
  );
}

export default function CuentaVencidaPage() {
  return (
    <Suspense fallback={null}>
      <CuentaVencidaPageContent />
    </Suspense>
  );
}
