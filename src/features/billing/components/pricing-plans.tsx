"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Calculator,
  Check,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { googleTagService } from "@/features/analytics/services/google-tag.service";
import {
  getBillingPlanForSelection,
  type BillingPeriodCode,
  type BillingProductCode,
} from "@/features/billing/types/plans";
import styles from "./pricing-plans.module.css";

const STORAGE_KEY = "ventora_pricing_selection_v2";

type PricingSelection = {
  plan: BillingProductCode;
  billingPeriod: BillingPeriodCode;
};

type PricingPlansProps = {
  context?: "public" | "account";
  isCheckoutEnabled?: boolean;
  isAccountActive?: boolean;
  loadingSelection?: string | null;
  onCheckout?: (plan: BillingProductCode, period: BillingPeriodCode) => void;
};

function isProduct(value: string | null): value is BillingProductCode {
  return value === "quote_only" || value === "founder_full";
}

function isPeriod(value: string | null): value is BillingPeriodCode {
  return value === "monthly" || value === "yearly";
}

function readSelection(): PricingSelection | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { plan?: unknown; billingPeriod?: unknown };
    return typeof value.plan === "string" && isProduct(value.plan) &&
      typeof value.billingPeriod === "string" && isPeriod(value.billingPeriod)
      ? { plan: value.plan, billingPeriod: value.billingPeriod }
      : null;
  } catch {
    return null;
  }
}

function saveSelection(selection: PricingSelection) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Storage bloqueado no debe impedir la navegación ni el checkout.
  }
}

function formatAmount(amount: number) {
  return `$${amount.toLocaleString("es-CL")}`;
}

export function PricingPlans({
  context = "public",
  isCheckoutEnabled = false,
  isAccountActive = false,
  loadingSelection = null,
  onCheckout,
}: PricingPlansProps) {
  const [period, setPeriod] = useState<BillingPeriodCode>("yearly");
  const isPublic = context === "public";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryPeriod = params.get("billing_period");
    const queryPlan = params.get("plan");
    const stored = readSelection();
    const nextPeriod = isPeriod(queryPeriod)
      ? queryPeriod
      : stored?.billingPeriod ?? "yearly";

    startTransition(() => setPeriod(nextPeriod));
    if (isProduct(queryPlan) && isPeriod(queryPeriod)) {
      saveSelection({ plan: queryPlan, billingPeriod: queryPeriod });
    }
  }, []);

  function changePeriod(nextPeriod: BillingPeriodCode) {
    setPeriod(nextPeriod);
    saveSelection({ plan: "founder_full", billingPeriod: nextPeriod });
    googleTagService.trackEvent("pricing_period_changed", {
      event_category: "pricing",
      billing_period: nextPeriod,
    });
  }

  function handlePlanClick(plan: BillingProductCode) {
    const selected = getBillingPlanForSelection(plan, period);
    saveSelection({ plan, billingPeriod: period });
    googleTagService.trackEvent("pricing_plan_selected", {
      event_category: "pricing",
      plan_code: plan,
      billing_period: period,
      currency: "CLP",
      amount: selected.amountClp,
    });

    if (!isPublic && isCheckoutEnabled && !isAccountActive) {
      onCheckout?.(plan, period);
    }
  }

  const plans: Array<{ code: BillingProductCode; recommended: boolean }> = [
    { code: "quote_only", recommended: false },
    { code: "founder_full", recommended: true },
  ];

  return (
    <section className={`${styles.section} ${isPublic ? styles.public : styles.account}`} id={isPublic ? "precios" : undefined}>
      <div className={styles.heading}>
        <div className={styles.headingCopy}>
          <span className={styles.eyebrow}>{isPublic ? "Planes para tu taller" : "Precios simples"}</span>
          <h2>{isPublic ? "Elige el plan que mejor se adapta a tu taller." : "Elige el plan para volver a operar."}</h2>
          <p>
            {isPublic
              ? "Prueba 15 días gratis sin tarjeta. Si decides continuar, activas el plan elegido y pagas la tarifa que ves: mensual o anual."
              : "La periodicidad cambia el cobro, no las funciones. Selecciona mensual o anual."}
          </p>
        </div>
        <div className={styles.periodControl}>
          <fieldset className={styles.periodSelector}>
            <legend>Periodicidad</legend>
            {(["monthly", "yearly"] as const).map((option) => (
              <label key={option} className={period === option ? styles.periodActive : undefined}>
                <input
                  type="radio"
                  name={`${context}-billing-period`}
                  value={option}
                  checked={period === option}
                  onChange={() => changePeriod(option)}
                />
                <span>{option === "yearly" ? "Anual" : "Mensual"}</span>
                {option === "yearly" ? <small>Ahorra hasta 28%</small> : null}
              </label>
            ))}
          </fieldset>
          {isPublic ? (
            <span className={styles.periodHint}>
              {period === "yearly" ? "Ahorra frente a pagar mes a mes." : "Pago mensual, sin pagar el año completo."}
            </span>
          ) : null}
        </div>
      </div>

      {isPublic ? (
        <div className={styles.valueRail}>
          <ShieldCheck size={20} aria-hidden />
          <div>
            <strong>El mejor software para carpinteros en relación precio-calidad.</strong>
            <span>Cotiza, envía presupuestos profesionales y ordena tu taller desde cualquier dispositivo.</span>
          </div>
          <span className={styles.trialBadge}>15 días gratis</span>
        </div>
      ) : null}

      <div className={styles.grid}>
        {plans.map(({ code, recommended }) => {
          const selected = getBillingPlanForSelection(code, period);
          const monthly = getBillingPlanForSelection(code, "monthly");
          const savings = monthly.amountClp * 12 - selected.amountClp;
          const savingsPercent = Math.round((savings / (monthly.amountClp * 12)) * 100);
          const checkoutActive = !isPublic && isCheckoutEnabled && !isAccountActive;
          const PlanIcon = code === "founder_full" ? BriefcaseBusiness : Calculator;

          return (
            <article key={code} className={`${styles.card} ${recommended ? styles.featured : ""}`}>
              <div className={styles.cardHeader}>
                <span className={styles.planIcon} aria-hidden>
                  <PlanIcon size={21} strokeWidth={1.8} />
                </span>
                <div>
                  <span className={styles.cardKicker}>{selected.productLabel}</span>
                  <h3>{selected.productLabel}</h3>
                </div>
                {recommended ? <span className={styles.badge}>Recomendado</span> : null}
              </div>
              <p className={styles.description}>{selected.description}</p>
              <div className={styles.priceLine}>
                <strong>{formatAmount(selected.amountClp)}</strong>
                <span>/{period === "yearly" ? "año" : "mes"}</span>
              </div>
              {period === "yearly" ? (
                <p className={styles.savings}>
                  Equivale a {formatAmount(Math.round(selected.amountClp / 12))}/mes · Ahorras {formatAmount(savings)} ({savingsPercent}%)
                </p>
              ) : (
                <p className={styles.savings}>{isPublic ? "15 días gratis · Sin tarjeta durante la prueba" : "Cobro mensual · Cancela la renovación cuando quieras"}</p>
              )}

              {isAccountActive ? (
                <span className={styles.disabledCta}>Cuenta activa</span>
              ) : isPublic ? (
                <Link
                  className={`${styles.cta} ${recommended ? styles.ctaPrimary : styles.ctaSecondary}`}
                  href={`/registro?plan=${code}&billing_period=${period}`}
                  onClick={() => handlePlanClick(code)}
                  prefetch={false}
                >
                  Probar 15 días gratis <ArrowRight size={16} aria-hidden />
                </Link>
              ) : checkoutActive ? (
                <button
                  className={`${styles.cta} ${recommended ? styles.ctaPrimary : styles.ctaSecondary}`}
                  type="button"
                  disabled={loadingSelection !== null}
                  onClick={() => handlePlanClick(code)}
                  aria-label={`Suscribirme a ${selected.productLabel} ${period}`}
                >
                  {loadingSelection === `${code}:${period}` ? "Abriendo Mercado Pago..." : "Suscribirme con Mercado Pago"} <ExternalLink size={15} aria-hidden />
                </button>
              ) : !isPublic ? (
                <span className={styles.disabledCta}>Mercado Pago no disponible</span>
              ) : null}

              {isPublic ? <div className={styles.includesLabel}>Incluye</div> : null}
              <ul className={styles.benefits}>
                {selected.benefits.map((benefit) => (
                  <li key={benefit}><Check size={15} aria-hidden /><span>{benefit}</span></li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <aside className={styles.assisted}>
        <div>
          <span className={styles.eyebrow}>Servicio complementario</span>
          <h3>Configuración asistida desde $250.000</h3>
          <p>Para talleres que necesitan ayuda inicial con líneas, recetas, capacitación o adaptación del flujo comercial.</p>
        </div>
        <a href="https://wa.me/56977338906?text=Hola%20Ventora%2C%20quiero%20solicitar%20configuraci%C3%B3n%20asistida." target="_blank" rel="noreferrer" className={styles.assistedCta}>
          Hablar con Ventora <ExternalLink size={15} aria-hidden />
        </a>
      </aside>
    </section>
  );
}
