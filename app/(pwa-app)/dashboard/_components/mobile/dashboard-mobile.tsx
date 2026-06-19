"use client";

import { memo } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, FileText, Plus, TrendingUp } from "lucide-react";

import { PremiumPageSection } from "@/components/motion/premium-page-reveal";
import { OnboardingActivationCard } from "@/features/onboarding/components/onboarding-activation-card";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import type { DashboardMobileProps } from "../../_hooks/use-dashboard-view-model";
import { DashboardAppRefreshButton } from "../shared/dashboard-app-refresh-button";
import styles from "./page.mobile.module.css";

function pillClassName(stateColor: DashboardMobileProps["quoteCards"][number]["stateColor"]) {
  if (stateColor === "success") return `${styles.pill} ${styles.pillSuccess}`;
  if (stateColor === "destructive") return `${styles.pill} ${styles.pillDanger}`;
  if (stateColor === "info") return `${styles.pill} ${styles.pillInfo}`;
  if (stateColor === "neutral") return `${styles.pill} ${styles.pillNeutral}`;
  return `${styles.pill} ${styles.pillWarning}`;
}

export const DashboardMobile = memo(function DashboardMobile({
  greetingLabel,
  greetingName,
  mobileDateLabel,
  newQuoteHref,
  summaryHref,
  summaryTitle,
  summarySubtitle,
  quotedTotalLabel,
  totalCount,
  pdfGeneratedCount,
  approvedCount,
  quotesHref,
  quoteCards,
  responseAlerts,
  isLoading,
  isEmpty,
}: DashboardMobileProps) {
  const onboarding = useOnboardingChecklist();

  return (
    <div className={styles.page}>
      <PremiumPageSection
        className={styles.header}
        data-onboarding-target="dashboard-header"
      >
        <div className={styles.headerCopy}>
          <h1 className={styles.title}>{greetingLabel}, {greetingName}</h1>
          <p className={styles.date}>{mobileDateLabel}</p>
        </div>
        <DashboardAppRefreshButton className={styles.appRefreshButton} label="Actualizar" />
      </PremiumPageSection>

      <PremiumPageSection>
        <Link
          href={newQuoteHref}
          className={styles.cta}
          data-onboarding-target="dashboard-new-quote"
        >
          <Plus size={18} strokeWidth={2.75} />
          Crear cotización rápida
        </Link>
      </PremiumPageSection>

      <PremiumPageSection>
        <OnboardingActivationCard controller={onboarding} />
      </PremiumPageSection>

      <PremiumPageSection>
        <Link href={summaryHref} className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <TrendingUp size={17} strokeWidth={2.25} />
          </span>
          <span className={styles.summaryBody}>
            <span className={styles.summaryEyebrow}>Resumen comercial</span>
            <span className={styles.summaryTitle}>{summaryTitle}</span>
            <strong className={styles.summaryAmount}>{quotedTotalLabel}</strong>
            <span className={styles.summaryMeta}>{summarySubtitle}</span>
          </span>
          <ChevronRight size={18} strokeWidth={2.25} className={styles.summaryArrow} />
        </Link>
      </PremiumPageSection>

      {responseAlerts.length > 0 ? (
        <PremiumPageSection className={styles.responseAlerts}>
          {responseAlerts.map((alert) => (
            <Link key={alert.href} href={alert.href} className={styles.responseAlertLink}>
              <CheckCircle2 size={16} strokeWidth={2.25} aria-hidden />
              {alert.title}
            </Link>
          ))}
        </PremiumPageSection>
      ) : null}

      <PremiumPageSection className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <FileText size={14} strokeWidth={2} className={`${styles.metricIcon} ${styles.metricIconPrimary}`} />
          <span className={styles.metricLabel}>Cotizaciones</span>
          <strong className={styles.metricValue}>{totalCount}</strong>
        </div>

        <div className={styles.metricCard}>
          <FileText size={14} strokeWidth={2} className={`${styles.metricIcon} ${styles.metricIconInfo}`} />
          <span className={styles.metricLabel}>PDFs</span>
          <strong className={styles.metricValue}>{pdfGeneratedCount}</strong>
        </div>

        <div className={styles.metricCard}>
          <CheckCircle2 size={14} strokeWidth={2} className={`${styles.metricIcon} ${styles.metricIconSuccess}`} />
          <span className={styles.metricLabel}>Aprobadas</span>
          <strong className={styles.metricValue}>{approvedCount}</strong>
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Últimas cotizaciones</h2>
          <Link href={quotesHref} className={styles.sectionLink}>
            Ver todas
          </Link>
        </div>

        <div className={styles.quotesPanel}>
          {isLoading ? (
            <div className={styles.emptyCard}>
              <p className={styles.emptyTitle}>Cargando dashboard</p>
              <p className={styles.emptySub}>Estamos sincronizando tus cotizaciones reales.</p>
            </div>
          ) : isEmpty ? (
            <div className={styles.emptyCard}>
              <p className={styles.emptyTitle}>Aun no tienes cotizaciones</p>
              <p className={styles.emptySub}>
                Crea tu primer presupuesto para empezar a mover el panel.
              </p>
            </div>
          ) : (
            <ul className={styles.quoteList}>
              {quoteCards.map((quote) => (
                <li key={quote.id} className={styles.quoteItem}>
                  <Link
                    href={quote.href}
                    className={styles.quoteRow}
                    onPointerEnter={quote.onPrefetchDetail}
                    onFocus={quote.onPrefetchDetail}
                    onTouchStart={quote.onPrefetchDetail}
                  >
                    <div className={styles.quoteMain}>
                      <p className={styles.quoteName}>{quote.name}</p>
                      <p className={styles.quoteCode}>{quote.code}</p>
                    </div>
                    <div className={styles.quoteSide}>
                      <p className={styles.quoteAmount}>{quote.amount}</p>
                      <span className={pillClassName(quote.stateColor)}>{quote.stateLabel}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PremiumPageSection>
    </div>
  );
});
