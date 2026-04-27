"use client";

import Link from "next/link";

import type { DashboardDesktopProps } from "../../_hooks/use-dashboard-view-model";
import styles from "./page.desktop.module.css";

function pillClassName(stateColor: DashboardDesktopProps["quoteCards"][number]["stateColor"]) {
  if (stateColor === "success") return `${styles.pill} ${styles.pillSuccess}`;
  if (stateColor === "destructive") return `${styles.pill} ${styles.pillDanger}`;
  return `${styles.pill} ${styles.pillWarning}`;
}

export function DashboardDesktop({
  greetingName,
  subtitle,
  newQuoteHref,
  pendingCount,
  monthCount,
  approvedTodayCount,
  approvedMonthLabel,
  quotesHref,
  quoteCards,
  isLoading,
  isEmpty,
}: DashboardDesktopProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <h1 className={styles.title}>Buen dia, {greetingName}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <Link href={newQuoteHref} className={styles.newButton}>
          <span className={styles.newButtonIcon}>+</span>
          Nueva cotizacion
        </Link>
      </header>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Pendientes</span>
          <strong className={styles.statValue}>{pendingCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Cotizaciones del mes</span>
          <strong className={styles.statValue}>{monthCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Aprobadas hoy</span>
          <strong className={styles.statValue}>{approvedTodayCount}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Aprobado mes</span>
          <strong className={`${styles.statValue} ${styles.statMono}`}>{approvedMonthLabel}</strong>
        </article>
      </section>

      <section className={styles.section}>
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
                <Link href={quote.href} className={styles.listLink}>
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
      </section>
    </div>
  );
}
