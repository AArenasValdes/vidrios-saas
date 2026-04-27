"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, Plus } from "lucide-react";

import type { DashboardMobileProps } from "../../_hooks/use-dashboard-view-model";
import styles from "./page.mobile.module.css";

function pillClassName(stateColor: DashboardMobileProps["quoteCards"][number]["stateColor"]) {
  if (stateColor === "success") return `${styles.pill} ${styles.pillSuccess}`;
  if (stateColor === "destructive") return `${styles.pill} ${styles.pillDanger}`;
  return `${styles.pill} ${styles.pillWarning}`;
}

export function DashboardMobile({
  greetingName,
  mobileDateLabel,
  newQuoteHref,
  attentionHref,
  attentionTitle,
  approvedTodayCount,
  monthCount,
  approvedMonthLabel,
  quotesHref,
  quoteCards,
  isLoading,
  isEmpty,
}: DashboardMobileProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Buen dia, {greetingName}</h1>
        <p className={styles.date}>{mobileDateLabel}</p>
      </header>

      <Link href={newQuoteHref} className={styles.cta}>
        <Plus size={18} strokeWidth={2.75} />
        Crear cotizacion rapida
      </Link>

      <Link href={attentionHref} className={styles.alertCard}>
        <span className={styles.alertIcon}>
          <AlertTriangle size={17} strokeWidth={2.25} />
        </span>
        <span className={styles.alertBody}>
          <span className={styles.alertEyebrow}>ATENCION HOY</span>
          <span className={styles.alertTitle}>{attentionTitle}</span>
          <span className={styles.alertSuccess}>
            {approvedTodayCount} aprobada{approvedTodayCount === 1 ? "" : "s"} hoy
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={2.25} className={styles.alertArrow} />
      </Link>

      <section className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <Clock size={16} className={`${styles.metricIcon} ${styles.metricIconPrimary}`} />
          <span className={styles.metricLabel}>COTIZACIONES</span>
          <strong className={styles.metricValue}>{monthCount}</strong>
        </div>

        <div className={styles.metricCard}>
          <CheckCircle2 size={16} className={`${styles.metricIcon} ${styles.metricIconSuccess}`} />
          <span className={styles.metricLabel}>APROBADO MES</span>
          <strong className={styles.metricMono}>{approvedMonthLabel}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>ULTIMAS COTIZACIONES</h2>
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
                  <Link href={quote.href} className={styles.quoteRow}>
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
      </section>
    </div>
  );
}
