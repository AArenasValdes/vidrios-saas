"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildSubscriptionActivationWhatsappHref,
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
              Incluye cotizaciones, solicitudes, p&aacute;gina p&uacute;blica, WhatsApp y
              aprobaci&oacute;n de presupuestos.
            </p>
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
            <div className={s.planTopline}>
              <span className={s.priceLabel}>Solo Cotizaci&oacute;n Anual</span>
            </div>
            <strong className={s.priceValue}>
              ${VENTORA_QUOTE_ONLY_YEARLY_PRICE.toLocaleString("es-CL")}
              <span>/ a&ntilde;o</span>
            </strong>
            <p className={s.priceHint}>
              Cotiza r&aacute;pido desde el celular, genera PDF profesional y comparte por
              WhatsApp.
            </p>
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
            <div className={s.planTopline}>
              <span className={s.priceLabel}>Mensual</span>
            </div>
            <strong className={s.priceValue}>
              ${VENTORA_MONTHLY_PRICE.toLocaleString("es-CL")}
              <span>/ mes</span>
            </strong>
            <p className={s.priceHint}>Pago manual por WhatsApp.</p>
            <a className={s.whatsappButton} href={monthlyHref} target="_blank" rel="noreferrer">
              Contactar por WhatsApp
            </a>
          </article>
        </div>

        <aside className={s.enterpriseBox}>
          <div>
            <span className={s.enterpriseEyebrow}>Necesitas algo m&aacute;s avanzado?</span>
            <strong>Plan Empresa Acompa&ntilde;ado desde $250.000</strong>
            <p>
              Configuraci&oacute;n asistida, capacitaci&oacute;n y adaptaci&oacute;n inicial del
              flujo comercial. Motor de precios personalizado disponible previa evaluaci&oacute;n.
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
