"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LuArrowLeft,
  LuBadgeCheck,
  LuCalendar,
  LuChevronDown,
  LuCircleDollarSign,
  LuCreditCard,
  LuHistory,
  LuLayers,
  LuMail,
  LuReceipt,
  LuRocket,
  LuShieldCheck,
} from "react-icons/lu";

import { SubscriptionBadge } from "@/features/subscriptions/components/subscription-badge";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { fetchSubscriptionSummary } from "@/features/subscriptions/services/subscription-summary-client.service";
import type { PagoHistoryEntry } from "@/features/subscriptions/services/pagos-list.service";
import type { SubscriptionSummary } from "@/features/subscriptions/types/subscription-summary";

import s from "./page.module.css";

const EMPTY_VALUE = "\u2014";
const APPROVED_STATUS = "aprobado";
const MAIN_HISTORY_LIMIT = 3;

const PLAN_LABELS: Record<string, string> = {
  founder_full: "Founder Full Anual",
  quote_only: "Solo Cotizaci\u00f3n Anual",
  trial: "Prueba gratis",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  fallido: "Fallido",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

const PAYMENT_STATUS_CLASSES: Record<string, string> = {
  pendiente: s.statusPending,
  aprobado: s.statusApproved,
  fallido: s.statusFailed,
  cancelado: s.statusFailed,
  reembolsado: s.statusNeutral,
};

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  trial_active: "Prueba activa",
  trial_expiring: "Prueba por vencer",
  trial_expired: "Prueba vencida",
  past_due: "Vencida",
  cancelled: "Cancelada",
};

const SUBSCRIPTION_STATUS_CLASSES: Record<string, string> = {
  active: s.statusApproved,
  trial_active: s.statusApproved,
  trial_expiring: s.statusPending,
  trial_expired: s.statusFailed,
  past_due: s.statusFailed,
  cancelled: s.statusFailed,
};

const PAYMENT_LABELS: Record<string, string> = {
  flow: "Flow",
  mercadopago: "Mercado Pago",
  webpay_plus: "Webpay Plus",
  manual_transfer: "Transferencia manual",
  manual_other: "Otro",
  none: EMPTY_VALUE,
};

function formatClp(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return EMPTY_VALUE;

  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDaysRemainingLabel(
  daysRemaining: number | null | undefined,
  endsAt: string | null
): string {
  if (typeof daysRemaining === "number") {
    return `${Math.max(daysRemaining, 0)} d\u00edas`;
  }

  if (!endsAt) {
    return "pocos d\u00edas";
  }

  const endTime = new Date(endsAt).getTime();

  if (Number.isNaN(endTime)) {
    return "pocos d\u00edas";
  }

  const diffDays = Math.ceil((endTime - Date.now()) / (1000 * 60 * 60 * 24));
  return `${Math.max(diffDays, 0)} d\u00edas`;
}

function getLocalPlanLabel(planCode: string | null | undefined): string {
  if (!planCode) return "Sin plan";
  return PLAN_LABELS[planCode] ?? planCode;
}

function getSubscriptionStatusLabel(status: string | null | undefined): string {
  if (!status) return EMPTY_VALUE;
  return SUBSCRIPTION_STATUS_LABELS[status] ?? status;
}

function getPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

function PaymentHistoryItem({ pago }: { pago: PagoHistoryEntry }) {
  return (
    <article className={s.historyItem}>
      <div className={s.historyMain}>
        <span className={s.historyDate}>{formatDate(pago.paidAt ?? pago.createdAt)}</span>
        <strong className={s.historyPlan}>{getLocalPlanLabel(pago.planCode)}</strong>
        {pago.buyOrder ? (
          <span className={s.historyBuyOrder}>Orden {pago.buyOrder}</span>
        ) : null}
      </div>
      <div className={s.historyMeta}>
        <span className={s.historyAmount}>{formatClp(pago.amountClp)}</span>
        <span
          className={`${s.statusBadge} ${
            PAYMENT_STATUS_CLASSES[pago.status] ?? s.statusNeutral
          }`}
        >
          {getPaymentStatusLabel(pago.status)}
        </span>
      </div>
    </article>
  );
}

export default function SuscripcionPage() {
  const { profile } = useOrganizationProfile();
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [pagos, setPagos] = useState<PagoHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentAttempts, setShowPaymentAttempts] = useState(false);
  const [isCancellingRenewal, setIsCancellingRenewal] = useState(false);
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionSummary()
      .then(setSummary)
      .catch(() => setError("No pudimos cargar los datos de tu suscripci\u00f3n."));
  }, []);

  useEffect(() => {
    fetch("/api/subscriptions/pagos")
      .then((r) => r.json())
      .then((data: { pagos?: PagoHistoryEntry[] }) => {
        if (data.pagos) setPagos(data.pagos);
      })
      .catch(() => {});
  }, []);

  const approvedPayments = pagos.filter((pago) => pago.status === APPROVED_STATUS);
  const recentApprovedPayments = approvedPayments.slice(0, MAIN_HISTORY_LIMIT);
  const paymentAttempts = pagos.filter((pago) => pago.status !== APPROVED_STATUS);
  const lastApprovedPayment = approvedPayments.find((pago) => pago.paidAt)?.paidAt ?? null;
  const hasPaymentAttempts = paymentAttempts.length > 0;

  const planCode = profile?.planCode ?? summary?.planCode ?? null;
  const subscription = profile?.subscription ?? null;
  const subscriptionStatus =
    summary?.subscriptionStatus ?? subscription?.effectiveStatus ?? null;
  const subscriptionEndsAt =
    summary?.subscriptionEndsAt ??
    subscription?.subscriptionEndsAt ??
    subscription?.trialEndsAt ??
    null;
  const statusLabel = getSubscriptionStatusLabel(subscriptionStatus);
  const statusClass = subscriptionStatus
    ? SUBSCRIPTION_STATUS_CLASSES[subscriptionStatus] ?? s.statusNeutral
    : s.statusNeutral;
  const paymentLabel = summary?.paymentMethod
    ? PAYMENT_LABELS[summary.paymentMethod] ?? summary.paymentMethod
    : EMPTY_VALUE;
  const normalizedSubscriptionStatus = subscriptionStatus?.toLowerCase() ?? "";
  const isExpiredSubscription =
    normalizedSubscriptionStatus === "trial_expired" ||
    normalizedSubscriptionStatus === "expired" ||
    normalizedSubscriptionStatus === "past_due";
  const isInPaymentGracePeriod = Boolean(
    subscription?.isInPaymentGracePeriod && normalizedSubscriptionStatus === "past_due"
  );
  const isTrialSubscription =
    !isExpiredSubscription &&
    (planCode === "trial" || normalizedSubscriptionStatus.includes("trial"));
  const trialDaysLabel = getDaysRemainingLabel(
    subscription?.daysRemaining,
    subscriptionEndsAt
  );
  const shouldShowActivationCard =
    isTrialSubscription || (isExpiredSubscription && !isInPaymentGracePeriod);

  async function cancelRenewal() {
    if (
      !window.confirm(
        "Cancelarás la renovación automática. Podrás usar Ventora hasta terminar tu período ya pagado."
      )
    ) {
      return;
    }

    setError(null);
    setLifecycleMessage(null);
    setIsCancellingRenewal(true);

    try {
      const response = await fetch("/api/subscriptions/mercadopago/cancel", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        currentPeriodEndsAt?: string | null;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos cancelar la renovación.");
      }

      setSummary((current) =>
        current
          ? {
              ...current,
              recurringStatus: "cancelled",
              cancelAtPeriodEnd: true,
              canCancelRecurringSubscription: false,
              nextPaymentAt: null,
              currentPeriodEndsAt:
                payload?.currentPeriodEndsAt ?? current.currentPeriodEndsAt,
            }
          : current
      );
      setLifecycleMessage(
        "Renovación automática cancelada. Mantienes acceso hasta el final de tu período pagado."
      );
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "No pudimos cancelar la renovación."
      );
    } finally {
      setIsCancellingRenewal(false);
    }
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <Link href="/dashboard" className={s.backLink} aria-label="Volver al dashboard">
          <LuArrowLeft aria-hidden />
        </Link>
        <h1 className={s.title}>Plan y suscripci&oacute;n</h1>
      </header>

      <div className={s.badgeShell}>
        <SubscriptionBadge subscription={subscription} planCode={planCode} />
      </div>

      {error ? (
        <div className={s.errorBanner} role="alert">
          {error}
        </div>
      ) : null}

      {isInPaymentGracePeriod ? (
        <section className={`${s.activationCard} ${s.graceCard}`} aria-labelledby="payment-grace-title">
          <span className={s.activationIcon}>
            <LuCircleDollarSign aria-hidden />
          </span>
          <div className={s.activationBody}>
            <span className={s.activationEyebrow}>Pago pendiente</span>
            <h2 id="payment-grace-title" className={s.activationTitle}>
              Tu cuenta sigue operativa por ahora
            </h2>
            <p className={s.activationText}>
              Mercado Pago no confirmó el último cobro. Conservas acceso hasta {formatDate(subscription?.paymentGraceEndsAt ?? null)} mientras se regulariza el pago.
            </p>
          </div>
          <Link className={s.activationButton} href="/cuenta-vencida" prefetch={false}>
            Revisar pago
          </Link>
        </section>
      ) : null}

      {shouldShowActivationCard ? (
        <section
          className={`${s.activationCard} ${
            isExpiredSubscription ? s.activationCardExpired : ""
          }`}
          aria-labelledby="subscription-action-title"
        >
          <span className={s.activationIcon}>
            <LuRocket aria-hidden />
          </span>
          <div className={s.activationBody}>
            <span className={s.activationEyebrow}>
              {isExpiredSubscription ? "Cuenta vencida" : "Prueba gratis"}
            </span>
            <h2 id="subscription-action-title" className={s.activationTitle}>
              {isExpiredSubscription
                ? "Activa tu cuenta para seguir operando"
                : "Tu prueba gratis est\u00e1 activa"}
            </h2>
            <p className={s.activationText}>
              {isExpiredSubscription
                ? "Activa Ventora para volver a crear cotizaciones sin interrupciones."
                : `Te quedan ${trialDaysLabel} para seguir usando Ventora sin interrupciones.`}
            </p>
          </div>
          <Link className={s.activationButton} href="/cuenta-vencida" prefetch={false}>
            {isExpiredSubscription ? "Activar cuenta" : "Ver planes"}
          </Link>
        </section>
      ) : null}

      {summary || profile ? (
        <section className={s.card} aria-labelledby="subscription-detail-title">
          <div className={s.cardHeader}>
            <span className={s.cardIcon}>
              <LuCreditCard aria-hidden />
            </span>
            <h2 id="subscription-detail-title" className={s.cardTitle}>
              Detalle del plan
            </h2>
          </div>

          <div className={s.detailList}>
            <div className={s.detailRow}>
              <span className={s.detailIcon}>
                <LuLayers aria-hidden />
              </span>
              <span className={s.detailLabel}>Plan</span>
              <span className={s.detailValue}>{getLocalPlanLabel(planCode)}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailIcon}>
                <LuShieldCheck aria-hidden />
              </span>
              <span className={s.detailLabel}>Estado</span>
              <span className={`${s.statusBadge} ${statusClass}`}>{statusLabel}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailIcon}>
                <LuCircleDollarSign aria-hidden />
              </span>
              <span className={s.detailLabel}>Monto</span>
              <span className={s.detailValue}>
                {summary?.amountClp ? formatClp(summary.amountClp) : EMPTY_VALUE}
              </span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailIcon}>
                <LuCreditCard aria-hidden />
              </span>
              <span className={s.detailLabel}>M&eacute;todo de pago</span>
              <span className={s.detailValue}>{paymentLabel}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailIcon}>
                <LuCalendar aria-hidden />
              </span>
              <span className={s.detailLabel}>Periodicidad</span>
              <span className={s.detailValue}>
                {summary?.billingPeriod === "monthly"
                  ? "Mensual"
                  : summary?.billingPeriod === "yearly"
                    ? "Anual"
                    : EMPTY_VALUE}
              </span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailIcon}>
                <LuCalendar aria-hidden />
              </span>
              <span className={s.detailLabel}>&Uacute;ltimo pago aprobado</span>
              <span className={s.detailValue}>{formatDate(lastApprovedPayment)}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailIcon}>
                <LuCalendar aria-hidden />
              </span>
              <span className={s.detailLabel}>
                {summary?.cancelAtPeriodEnd ? "Acceso hasta" : "Próximo cobro"}
              </span>
              <span className={s.detailValue}>
                {formatDate(
                  summary?.cancelAtPeriodEnd
                    ? summary.currentPeriodEndsAt ?? subscriptionEndsAt
                    : summary?.nextPaymentAt ?? subscriptionEndsAt
                )}
              </span>
            </div>
            {summary?.founderPriceLocked ? (
              <div className={s.detailRow}>
                <span className={s.detailIcon}>
                  <LuBadgeCheck aria-hidden />
                </span>
                <span className={s.detailLabel}>Precio fundador</span>
                <span className={s.founderBadge}>Bloqueado</span>
              </div>
            ) : null}
          </div>

          {lifecycleMessage ? <p className={s.lifecycleMessage}>{lifecycleMessage}</p> : null}
          {summary?.cancelAtPeriodEnd ? (
            <p className={s.lifecycleMessage}>
              La renovación automática está cancelada. No habrá un nuevo cobro.
            </p>
          ) : null}
          {summary?.canCancelRecurringSubscription ? (
            <button
              className={s.cancelRenewalButton}
              type="button"
              onClick={cancelRenewal}
              disabled={isCancellingRenewal}
            >
              {isCancellingRenewal ? "Cancelando renovación…" : "Cancelar renovación automática"}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className={s.card} aria-labelledby="approved-payment-history-title">
        <div className={s.cardHeader}>
          <span className={s.cardIcon}>
            <LuHistory aria-hidden />
          </span>
          <div>
            <h2 id="approved-payment-history-title" className={s.cardTitle}>
              Pagos aprobados
            </h2>
            <p className={s.cardDescription}>
              Mostramos solo los &uacute;ltimos pagos confirmados para mantener
              esta vista limpia.
            </p>
          </div>
        </div>

        {recentApprovedPayments.length === 0 ? (
          <div className={s.emptyState}>
            <span className={s.emptyIcon}>
              <LuReceipt aria-hidden />
            </span>
            <p>A&uacute;n no tienes pagos aprobados.</p>
          </div>
        ) : (
          <div className={s.historyList}>
            {recentApprovedPayments.map((pago) => (
              <PaymentHistoryItem key={pago.id} pago={pago} />
            ))}
          </div>
        )}
      </section>

      {hasPaymentAttempts ? (
        <section className={`${s.card} ${s.secondaryCard}`} aria-labelledby="payment-attempts-title">
          <button
            className={s.historyToggle}
            type="button"
            aria-expanded={showPaymentAttempts}
            aria-controls="payment-attempts-list"
            onClick={() => setShowPaymentAttempts((current) => !current)}
          >
            <span>
              <strong id="payment-attempts-title">Ver intentos de pago</strong>
              <small>
                {paymentAttempts.length} intento{paymentAttempts.length === 1 ? "" : "s"} no aprobado
                {paymentAttempts.length === 1 ? "" : "s"}
              </small>
            </span>
            <LuChevronDown
              className={showPaymentAttempts ? s.toggleIconOpen : s.toggleIcon}
              aria-hidden
            />
          </button>

          {showPaymentAttempts ? (
            <div id="payment-attempts-list" className={s.historyList}>
              {paymentAttempts.map((pago) => (
                <PaymentHistoryItem key={pago.id} pago={pago} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className={s.actions}>
        <a
          className={s.supportButton}
          href="mailto:ventora.cl@gmail.com?subject=Soporte%20suscripcion"
          target="_blank"
          rel="noreferrer"
        >
          <LuMail aria-hidden />
          Contactar soporte
        </a>
      </div>
    </div>
  );
}
