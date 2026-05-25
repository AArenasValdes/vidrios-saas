"use client";

import Link from "next/link";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildSubscriptionActivationWhatsappHref,
  VENTORA_MONTHLY_PRICE,
  VENTORA_YEARLY_PRICE,
} from "@/features/subscriptions/services/subscription-status.service";

import s from "./page.module.css";

export default function CuentaVencidaPage() {
  const { profile } = useOrganizationProfile();
  const companyName = profile?.empresaNombre ?? "Mi empresa";
  const monthlyHref = buildSubscriptionActivationWhatsappHref({
    companyName,
    plan: "mensual",
  });
  const yearlyHref = buildSubscriptionActivationWhatsappHref({
    companyName,
    plan: "anual",
  });

  return (
    <section className={s.wrap}>
      <div className={s.card}>
        <span className={s.eyebrow}>Cuenta vencida</span>
        <h1 className={s.title}>Tu prueba termino y la cuenta quedo en modo lectura.</h1>
        <p className={s.text}>
          Puedes seguir entrando a Ventora y revisar tus datos actuales, pero para volver
          a crear cotizaciones, editar clientes o cambiar configuracion necesitas activar
          tu cuenta manualmente.
        </p>

        <div className={s.priceGrid}>
          <article className={s.priceCard}>
            <span className={s.priceLabel}>Plan mensual</span>
            <strong className={s.priceValue}>${VENTORA_MONTHLY_PRICE.toLocaleString("es-CL")}</strong>
            <span className={s.priceHint}>Pago manual por transferencia y activacion manual.</span>
          </article>
          <article className={s.priceCard}>
            <span className={s.priceLabel}>Plan anual</span>
            <strong className={s.priceValue}>${VENTORA_YEARLY_PRICE.toLocaleString("es-CL")}</strong>
            <span className={s.priceHint}>Misma activacion manual con mejor precio anual.</span>
          </article>
        </div>

        <div className={s.actions}>
          <a className={s.primary} href={monthlyHref} target="_blank" rel="noreferrer">
            Contactar por WhatsApp para plan mensual
          </a>
          <a className={s.secondary} href={yearlyHref} target="_blank" rel="noreferrer">
            Contactar por WhatsApp para plan anual
          </a>
          <Link className={s.secondary} href="/cotizaciones">
            Seguir en modo lectura
          </Link>
        </div>

        <p className={s.note}>
          Mensaje prellenado: “Hola, quiero activar mi cuenta Ventora. Mi empresa es {companyName}.”
        </p>
      </div>
    </section>
  );
}
