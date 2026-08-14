"use client";

import { memo, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuBell,
  LuCalendarDays,
  LuCircleCheck,
  LuFileText,
  LuFiles,
  LuPlus,
  LuSend,
} from "react-icons/lu";

import { PremiumPageSection } from "@/components/motion/premium-page-reveal";
import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";
import { buildCotizacionApprovalUrl } from "@/utils/cotizacion-approval";
import { buildCotizacionWhatsappUrl } from "@/utils/whatsapp";
import type {
  DashboardDesktopProps,
  DashboardPendingSendRow,
  DashboardQuoteStateColor,
} from "../../_hooks/use-dashboard-view-model";
import { DashboardMonthlyTrendChart } from "./dashboard-monthly-trend-chart";
import styles from "./page.desktop.module.css";

function toWhatsappRecord(row: DashboardPendingSendRow): CotizacionWorkflowRecord {
  return {
    id: row.id,
    codigo: row.codigo,
    clienteNombre: row.clientName,
    clienteTelefono: row.clientPhone,
    obra: row.obra,
    direccion: "",
    validez: "15 dias",
    descuentoPct: 0,
    observaciones: "",
    estado: "creada",
    approvalToken: row.approvalToken,
    approvalTokenExpiresAt: null,
    clienteVioEn: null,
    clienteRespondioEn: null,
    clienteRespuestaCanal: null,
    pdfDescargadoEn: row.action === "whatsapp" ? "1" : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
    subtotal: row.amountValue,
    descuentoValor: 0,
    neto: row.amountValue,
    iva: 0,
    flete: 0,
    total: row.amountValue,
  };
}

function stateClassName(stateColor: DashboardQuoteStateColor) {
  if (stateColor === "success") return `${styles.statePill} ${styles.stateSuccess}`;
  if (stateColor === "destructive") return `${styles.statePill} ${styles.stateDanger}`;
  if (stateColor === "info") return `${styles.statePill} ${styles.stateInfo}`;
  if (stateColor === "neutral") return `${styles.statePill} ${styles.stateNeutral}`;
  return `${styles.statePill} ${styles.stateWarning}`;
}

export const DashboardDesktop = memo(function DashboardDesktop({
  greetingLabel,
  greetingName,
  subtitle,
  companyName,
  companyInitials,
  periodLabel,
  newQuoteHref,
  quotesHref,
  pendingSendHref,
  quotedMonthTotalLabel,
  approvedTotalLabel,
  pdfGeneratedCount,
  approvedCount,
  monthCount,
  pendingSendCount,
  monthlyTrend,
  hasMonthlyTrend,
  pendingSendRows,
  recentQuoteCards,
  responseItems,
  responseAlertCount,
  isLoading,
  isEmpty,
  hasPendingSend,
}: DashboardDesktopProps) {
  const router = useRouter();
  const onboarding = useOnboardingChecklist();
  const { markQuoteAsSent } = useCotizacionesStore({ autoLoadSummary: false });
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleWhatsApp = useCallback(
    async (row: DashboardPendingSendRow) => {
      if (!row.clientPhone.trim()) {
        window.alert(
          "Esta cotización no tiene teléfono. Ábrela y completa el contacto para enviar por WhatsApp."
        );
        return;
      }

      try {
        setSendingId(row.id);
        const approvalUrl = row.approvalToken
          ? buildCotizacionApprovalUrl(row.approvalToken)
          : null;
        const whatsappUrl = buildCotizacionWhatsappUrl(toWhatsappRecord(row), {
          approvalUrl,
        });

        if (!whatsappUrl) {
          throw new Error("No se pudo preparar el enlace de WhatsApp.");
        }

        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        await markQuoteAsSent(row.id).catch(() => null);
        await onboarding.markFirstShare({
          completionSource: "dashboard_desktop_whatsapp_share",
          metadataJson: {
            route: "/dashboard",
            quoteId: row.id,
            quoteCode: row.codigo,
          },
        });
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "No se pudo abrir WhatsApp."
        );
      } finally {
        setSendingId(null);
      }
    },
    [markQuoteAsSent, onboarding]
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>Cargando resumen comercial…</div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={styles.page}>
        <PremiumPageSection className={`${styles.header} ${styles.reveal}`}>
          <div className={styles.headerMain}>
            <h1 className={styles.title}>
              {greetingLabel}, {greetingName}
            </h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </PremiumPageSection>
        <PremiumPageSection className={`${styles.emptyState} ${styles.reveal} ${styles.revealDelay1}`}>
          <p className={styles.emptyTitle}>Tu taller aún no tiene cotizaciones</p>
          <p className={styles.emptySub}>
            Crea la primera, genera el PDF y envíala por WhatsApp. El panel mostrará el valor
            cotizado y lo que falta por enviar.
          </p>
          <div className={styles.emptyActions}>
            <Link href={newQuoteHref} className={styles.primaryButton}>
              <LuPlus aria-hidden />
              Crear primera cotización
            </Link>
          </div>
        </PremiumPageSection>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PremiumPageSection
        className={`${styles.header} ${styles.reveal}`}
        data-onboarding-target="dashboard-header"
      >
        <div className={styles.headerMain}>
          <h1 className={styles.title}>
            {greetingLabel}, {greetingName}
          </h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.headerAside}>
          <span className={styles.periodChip}>
            <LuCalendarDays aria-hidden size={14} />
            {periodLabel}
          </span>
          <button
            type="button"
            className={styles.alertChip}
            aria-label="Alertas"
            data-alerts-trigger="true"
            onClick={() => {
              window.dispatchEvent(new Event("ventora:toggle-shell-alerts"));
            }}
          >
            <LuBell aria-hidden size={15} />
            {responseAlertCount > 0 ? <span className={styles.alertDot} /> : null}
          </button>
          <div className={styles.profileChip}>
            <span className={styles.profileAvatar}>{companyInitials}</span>
            <span className={styles.profileMeta}>
              <span className={styles.profileName}>{companyName}</span>
              <span className={styles.profileRole}>Administrador</span>
            </span>
          </div>
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={`${styles.hero} ${styles.reveal} ${styles.revealDelay1}`}>
        <div className={styles.heroCopy}>
          <p className={styles.heroLabel}>Valor cotizado este mes</p>
          <p className={styles.heroValue}>{quotedMonthTotalLabel}</p>
        </div>

        <div className={styles.chartPanel}>
          <DashboardMonthlyTrendChart points={monthlyTrend} hasData={hasMonthlyTrend} />
        </div>

        <div className={styles.heroActions}>
          <Link
            href={newQuoteHref}
            className={styles.primaryButton}
            data-onboarding-target="dashboard-new-quote"
          >
            <LuPlus aria-hidden />
            Nueva cotización
          </Link>
          <Link href={quotesHref} className={styles.secondaryButton}>
            Ver cotizaciones
          </Link>
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={`${styles.kpiRow} ${styles.reveal} ${styles.revealDelay2}`}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiLabelWrap}>
            <LuFileText aria-hidden className={styles.kpiIcon} size={16} />
            <span className={styles.kpiLabel}>PDF generados</span>
          </div>
          <div className={styles.kpiValueBlock}>
            <p className={styles.kpiValue}>{pdfGeneratedCount}</p>
          </div>
        </article>
        <article className={`${styles.kpiCard} ${styles.kpiCardSuccess}`}>
          <div className={styles.kpiLabelWrap}>
            <LuCircleCheck aria-hidden className={styles.kpiIcon} size={16} />
            <span className={styles.kpiLabel}>Aprobadas</span>
          </div>
          <div className={styles.kpiValueBlock}>
            <p className={styles.kpiValue}>{approvedCount}</p>
            <p className={styles.kpiMeta}>{approvedTotalLabel}</p>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiLabelWrap}>
            <LuFiles aria-hidden className={styles.kpiIcon} size={16} />
            <span className={styles.kpiLabel}>Cotizaciones este mes</span>
          </div>
          <div className={styles.kpiValueBlock}>
            <p className={styles.kpiValue}>{monthCount}</p>
          </div>
        </article>
      </PremiumPageSection>

      <PremiumPageSection className={`${styles.workspace} ${styles.reveal} ${styles.revealDelay3}`}>
        <section
          className={`${styles.panel} ${styles.primaryPanel}`}
          aria-labelledby="dashboard-por-enviar-title"
        >
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleWrap}>
              <h2 id="dashboard-por-enviar-title" className={styles.panelTitle}>
                Por enviar
                {pendingSendCount > 0 ? (
                  <span className={styles.panelCount}>{pendingSendCount}</span>
                ) : null}
              </h2>
              <p className={styles.panelSub}>
                Cotizaciones listas para PDF o WhatsApp.
              </p>
            </div>
          </div>

          {!hasPendingSend ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Todo enviado</p>
              <p className={styles.emptySub}>
                No hay cotizaciones pendientes de envío. Cuando crees una nueva, aparecerá aquí.
              </p>
              <div className={styles.emptyActions}>
                <Link href={newQuoteHref} className={styles.secondaryButton}>
                  Nueva cotización
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.table}>
                <div className={styles.tableHead} aria-hidden>
                  <span>Cliente / Obra</span>
                  <span style={{ textAlign: "right" }}>Monto</span>
                  <span>Fecha</span>
                  <span>Estado</span>
                  <span style={{ textAlign: "right" }}>Acción</span>
                </div>
                <ul className={styles.tableBody}>
                  {pendingSendRows.map((row) => (
                    <li
                      key={row.id}
                      className={styles.tableRow}
                      role="link"
                      tabIndex={0}
                      aria-label={`Abrir cotización de ${row.clientName}`}
                      onClick={() => {
                        router.push(row.href);
                      }}
                      onKeyDown={(event) => {
                        if (event.target === event.currentTarget && event.key === "Enter") {
                          router.push(row.href);
                        }
                      }}
                    >
                      <div className={styles.clientCell}>
                        <p className={styles.clientName}>{row.clientName}</p>
                        <p className={styles.clientObra}>{row.obra}</p>
                      </div>
                      <span className={styles.cellAmount}>{row.amount}</span>
                      <span className={styles.cellDate}>{row.date}</span>
                      <span className={styles.cellState}>
                        <span className={stateClassName(row.stateColor)}>{row.stateLabel}</span>
                      </span>
                      <div className={styles.rowActions}>
                        {row.action === "pdf" ? (
                          <Link
                            href={row.pdfHref}
                            className={styles.rowAction}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <LuFileText aria-hidden size={13} />
                            Generar PDF
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className={styles.rowAction}
                            disabled={sendingId === row.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleWhatsApp(row);
                            }}
                          >
                            <LuSend aria-hidden size={13} />
                            {sendingId === row.id ? "Abriendo…" : "Enviar"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href={pendingSendHref} className={styles.footerLink}>
                Ver todas las cotizaciones por enviar →
              </Link>
            </>
          )}
        </section>

        <aside className={styles.sideStack}>
          {responseItems.length > 0 ? (
            <section
              id="dashboard-respuestas"
              className={styles.panel}
              aria-labelledby="dashboard-respuestas-title"
            >
              <div className={styles.panelTitleWrap}>
                <h2 id="dashboard-respuestas-title" className={styles.panelTitle}>
                  Respuestas públicas
                </h2>
                <p className={styles.panelSub}>Solo cuando el cliente responde.</p>
              </div>
              <ul className={styles.sideList}>
                {responseItems.map((item) => (
                  <li key={item.id} className={styles.sideItem}>
                    <Link href={item.href} className={styles.sideLink}>
                      <p className={styles.sideTitle}>
                        {item.kind === "aprobada" ? "Aprobada" : "Rechazada"}
                      </p>
                      <p className={styles.sideMessage}>{item.message}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section
            className={`${styles.panel} ${styles.recentPanel}`}
            aria-labelledby="dashboard-recientes-title"
          >
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleWrap}>
                <h2 id="dashboard-recientes-title" className={styles.panelTitle}>
                  Cotizaciones recientes
                </h2>
              </div>
              <Link href={quotesHref} className={styles.footerLink}>
                Ver todas
              </Link>
            </div>
            <ul className={styles.sideList}>
              {recentQuoteCards.map((quote) => (
                <li key={quote.id} className={styles.sideItem}>
                  <Link href={quote.href} className={styles.sideLink}>
                    <div className={styles.sideMeta}>
                      <p className={styles.sideTitle}>{quote.name}</p>
                      <span className={styles.sideAmount}>{quote.amount}</span>
                    </div>
                    <div className={styles.sideMeta}>
                      <p className={styles.sideMessage}>{quote.date}</p>
                      <span className={stateClassName(quote.stateColor)}>{quote.stateLabel}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </PremiumPageSection>
    </div>
  );
});
