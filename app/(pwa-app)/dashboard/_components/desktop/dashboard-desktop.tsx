"use client";

import { memo } from "react";
import Link from "next/link";

import { PremiumPageSection } from "@/components/motion/premium-page-reveal";
import { OnboardingGuide } from "@/features/onboarding/components/onboarding-guide";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import type { DashboardDesktopProps } from "../../_hooks/use-dashboard-view-model";
import { DashboardAppRefreshButton } from "../shared/dashboard-app-refresh-button";
import styles from "./page.desktop.module.css";

function pillClassName(stateColor: DashboardDesktopProps["quoteCards"][number]["stateColor"]) {
  if (stateColor === "success") return `${styles.pill} ${styles.pillSuccess}`;
  if (stateColor === "destructive") return `${styles.pill} ${styles.pillDanger}`;
  if (stateColor === "info") return `${styles.pill} ${styles.pillInfo}`;
  if (stateColor === "neutral") return `${styles.pill} ${styles.pillNeutral}`;
  return `${styles.pill} ${styles.pillWarning}`;
}

export const DashboardDesktop = memo(function DashboardDesktop({
  greetingLabel,
  greetingName,
  subtitle,
  newQuoteHref,
  quotedTotalLabel,
  totalCount,
  pdfGeneratedCount,
  approvedCount,
  monthCount,
  approvedTodayCount,
  quotesHref,
  quoteCards,
  isLoading,
  isEmpty,
}: DashboardDesktopProps) {
  const onboarding = useOnboardingChecklist();

  return (
    <div className={styles.page}>
      <PremiumPageSection
        className={styles.header}
        data-onboarding-target="dashboard-header"
      >
        <div className={styles.headerMain}>
          <h1 className={styles.title}>{greetingLabel}, {greetingName}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.headerActions}>
          <DashboardAppRefreshButton className={styles.appRefreshButton} label="Actualizar" />
          <Link
            href={newQuoteHref}
            className={styles.newButton}
            data-onboarding-target="dashboard-new-quote"
          >
            <span className={styles.newButtonIcon}>+</span>
            Nueva cotizacion
          </Link>
        </div>
      </PremiumPageSection>

      <OnboardingGuide controller={onboarding} routeKey="dashboard" />

      <PremiumPageSection className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Valor cotizado</span>
          <strong className={`${styles.statValue} ${styles.statMono}`}>{quotedTotalLabel}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Cotizaciones creadas</span>
          <strong className={styles.statValue}>{totalCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>PDF generados</span>
          <strong className={styles.statValue}>{pdfGeneratedCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Aprobadas registradas</span>
          <strong className={styles.statValue}>{approvedCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Cotizaciones del mes</span>
          <strong className={styles.statValue}>{monthCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Aprobadas hoy</span>
          <strong className={styles.statValue}>{approvedTodayCount}</strong>
        </article>
      </PremiumPageSection>

      <PremiumPageSection className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ultimas cotizaciones</h2>
          <Link href={quotesHref} className={styles.sectionLink}>
            Ver todas
          </Link>
        </div>

        {isLoading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Cargando dashboard</p>
            <p className={styles.emptySub}>Estamos sincronizando tus cotizaciones reales.</p>
          </div>
        ) : isEmpty ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Aun no tienes cotizaciones</p>
            <p className={styles.emptySub}>
              Crea tu primer presupuesto para empezar a mover el panel.
            </p>
          </div>
        ) : (
          <ul className={styles.list}>
            {quoteCards.map((quote) => (
              <li key={quote.id} className={styles.listItem}>
                <Link
                  href={quote.href}
                  className={styles.listLink}
                  onPointerEnter={quote.onPrefetchDetail}
                  onFocus={quote.onPrefetchDetail}
                >
                  <div className={styles.listMain}>
                    <p className={styles.listName}>{quote.name}</p>
                    <p className={styles.listCode}>
                      {quote.code} - {quote.date}
                    </p>
                  </div>
                  <div className={styles.listMeta}>
                    <span className={styles.listAmount}>{quote.amount}</span>
                    <span className={pillClassName(quote.stateColor)}>{quote.stateLabel}</span>
                  </div>
                </Link>
              </li>
            ))}
            </ul>
          )}
      </PremiumPageSection>
    </div>
  );
});
