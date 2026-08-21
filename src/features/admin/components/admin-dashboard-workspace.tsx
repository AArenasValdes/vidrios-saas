"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuArrowRight,
  LuCalendarClock,
  LuCircleAlert,
  LuCircleCheck,
  LuClock3,
  LuFileText,
  LuShieldCheck,
  LuTrendingUp,
  LuUsers,
} from "react-icons/lu";

import { useAdminHeaderActions } from "@/features/admin/components/admin-header-context";
import type { AdminDashboard } from "@/features/admin/types/admin-dashboard";
import s from "./admin-dashboard.module.css";

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-CL")}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function priorityClass(priority: "alta" | "media" | "baja") {
  if (priority === "alta") {
    return s.priorityHigh;
  }

  if (priority === "media") {
    return s.priorityMedium;
  }

  return s.priorityLow;
}

function toneClass(tone: "danger" | "info" | "success") {
  if (tone === "danger") {
    return s.toneDanger;
  }

  if (tone === "success") {
    return s.toneSuccess;
  }

  return s.toneInfo;
}

function healthToneClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") {
    return s.healthSuccess;
  }

  if (tone === "warning") {
    return s.healthWarning;
  }

  if (tone === "danger") {
    return s.healthDanger;
  }

  return s.healthNeutral;
}

const HEALTH_BUCKET_PRESENTATION: Record<
  string,
  { hint: string; Icon: typeof LuCircleCheck }
> = {
  healthy: {
    hint: "Activas con uso reciente",
    Icon: LuCircleCheck,
  },
  "no-quote": {
    hint: "Requieren activación",
    Icon: LuFileText,
  },
  inactive: {
    hint: "Requieren seguimiento",
    Icon: LuClock3,
  },
  expiring: {
    hint: "Requieren renovación",
    Icon: LuCalendarClock,
  },
  expired: {
    hint: "Requieren recuperación",
    Icon: LuCircleAlert,
  },
};

type AdminDashboardWorkspaceProps = {
  initialDashboard?: AdminDashboard | null;
};

export function AdminDashboardWorkspace({
  initialDashboard = null,
}: AdminDashboardWorkspaceProps = {}) {
  const { setHeaderState, resetHeaderState } = useAdminHeaderActions();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(initialDashboard);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialDashboard);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedInitialRef = useRef(Boolean(initialDashboard));

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/admin/dashboard", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        dashboard?: AdminDashboard;
        error?: string;
      };

      if (!response.ok || !payload.dashboard) {
        throw new Error(payload.error ?? "No pudimos cargar el resumen.");
      }

      setDashboard(payload.dashboard);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar el resumen."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // async-defer-await / client waterfall: si ya vino del server, no re-fetch al montar.
    if (hasLoadedInitialRef.current) {
      hasLoadedInitialRef.current = false;
      return;
    }

    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
      setHeaderState({
        syncedAt: dashboard?.syncedAt ?? null,
        onRefresh: () => {
          void loadDashboard(true);
        },
        isRefreshing,
      });
  }, [dashboard?.syncedAt, isRefreshing, loadDashboard, setHeaderState]);

  useEffect(() => {
    return () => {
      resetHeaderState();
    };
  }, [resetHeaderState]);

  const maxWeeklyAmount = useMemo(() => {
    if (!dashboard) {
      return 1;
    }

    return Math.max(
      1,
      ...dashboard.weeklyRevenue.map((week) => week.amountClp)
    );
  }, [dashboard]);

  if (isLoading && !dashboard) {
    return <div className={s.stateCard}>Cargando resumen operativo…</div>;
  }

  if (error && !dashboard) {
    return <div className={`${s.stateCard} ${s.stateError}`}>{error}</div>;
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className={s.page}>
      <section className={s.heroCard}>
        <div className={s.heroMain}>
          <span className={s.cardEyebrow}>Caja cobrada · {dashboard.revenue.label}</span>
          <div className={s.heroValueRow}>
            <strong className={s.heroValue}>
              {formatMoney(dashboard.revenue.collectedClp)}
            </strong>
            {dashboard.revenue.changePct !== null ? (
              <span
                className={`${s.changeBadge} ${
                  dashboard.revenue.changePct >= 0 ? s.changeUp : s.changeDown
                }`}
              >
                {dashboard.revenue.changePct >= 0 ? "+" : ""}
                {dashboard.revenue.changePct}% vs. {dashboard.revenue.previousLabel}
              </span>
            ) : null}
          </div>

          <div className={s.cashBreakdown}>
            <div>
              <span>Ventas nuevas</span>
              <strong>{formatMoney(dashboard.revenue.newSalesClp)}</strong>
              <small>{dashboard.revenue.newCustomers} cliente{dashboard.revenue.newCustomers === 1 ? "" : "s"} nuevo{dashboard.revenue.newCustomers === 1 ? "" : "s"}</small>
            </div>
            <div>
              <span>Renovaciones</span>
              <strong>{formatMoney(dashboard.revenue.renewalsClp)}</strong>
              <small>{dashboard.revenue.renewalPayments} cobro{dashboard.revenue.renewalPayments === 1 ? "" : "s"} recurrente{dashboard.revenue.renewalPayments === 1 ? "" : "s"}</small>
            </div>
          </div>
          <p className={s.cashNote}>
            Solo pagos aprobados. No es MRR ni una meta configurada.
            <Link href="/admin/pagos-y-planes">Ver cobros</Link>
          </p>
        </div>

        <div className={s.focusBlock}>
          <span className={s.focusTitle}>Enfoque de hoy</span>
          <div className={s.focusList}>
            {dashboard.focusToday.map((item) => (
              <div key={item.id} className={`${s.focusItem} ${toneClass(item.tone)}`}>
                <div>
                  <strong>{item.count}</strong>
                  <span>{item.label}</span>
                </div>
                <Link href={item.href}>{item.actionLabel}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.kpiRow}>
        <Link href="/admin/clientes" className={s.kpiCard}>
          <LuUsers aria-hidden />
          <span>Clientes activos</span>
          <strong>{dashboard.kpis.clientesActivos}</strong>
          <small>Con plan activo hoy</small>
        </Link>
        <Link href="/admin/clientes" className={s.kpiCard}>
          <LuShieldCheck aria-hidden />
          <span>Trials en curso</span>
          <strong>{dashboard.kpis.trialsActivos}</strong>
          <small>Aún sin pago registrado</small>
        </Link>
        <Link href="/admin/clientes" className={s.kpiCard}>
          <LuCircleAlert aria-hidden />
          <span>Cuentas por resolver</span>
          <strong>{dashboard.kpis.cuentasPorResolver}</strong>
          <small>Vencidas o próximas a vencer</small>
        </Link>
        <Link href="/admin/clientes" className={s.kpiCard}>
          <LuFileText aria-hidden />
          <span>Trials sin cotización</span>
          <strong>{dashboard.kpis.trialsSinCotizacion}</strong>
          <small>Prioridad de activación</small>
        </Link>
      </section>

      <section className={s.usageSection}>
        <div className={s.sectionTitle}>
          <h2>Uso del producto · {dashboard.revenue.label}</h2>
          <p>Cuentas de prueba excluidas.</p>
        </div>
        <div className={s.usageMetrics}>
          <div>
            <LuTrendingUp aria-hidden />
            <strong>{dashboard.productUsage.quotesCreated}</strong>
            <span>Cotizaciones creadas</span>
          </div>
          <div>
            <LuFileText aria-hidden />
            <strong>{dashboard.productUsage.pdfsGenerated}</strong>
            <span>PDF descargados</span>
          </div>
          <div>
            <LuUsers aria-hidden />
            <strong>{dashboard.productUsage.organizationsWithQuotes}</strong>
            <span>Empresas que cotizaron</span>
          </div>
        </div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHeader}>
          <h2>Acciones que requieren atención</h2>
          <Link href="/admin/clientes">
            Ver todas
            <LuArrowRight aria-hidden />
          </Link>
        </div>

        {dashboard.actionItems.length === 0 ? (
          <div className={s.emptyState}>
            No hay acciones urgentes ahora. Revisa prospectos o crea un nuevo
            trial si quieres avanzar comercialmente.
          </div>
        ) : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Prioridad</th>
                    <th>Empresa</th>
                    <th>Situación</th>
                    <th>Última actividad</th>
                    <th>Próxima acción</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.actionItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className={`${s.priorityBadge} ${priorityClass(item.priority)}`}>
                          {item.priority === "alta"
                            ? "Alta"
                            : item.priority === "media"
                              ? "Media"
                              : "Baja"}
                        </span>
                      </td>
                      <td>{item.empresa}</td>
                      <td>{item.situacion}</td>
                      <td>{item.ultimaActividad}</td>
                      <td>{item.proximaAccion}</td>
                      <td>
                        <Link href={item.href} className={s.tableAction}>
                          {item.actionLabel}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={s.mobileCards}>
              {dashboard.actionItems.map((item) => (
                <article key={`mobile-${item.id}`} className={s.mobileCard}>
                  <div className={s.mobileCardTop}>
                    <span className={`${s.priorityBadge} ${priorityClass(item.priority)}`}>
                      {item.priority}
                    </span>
                    <strong>{item.empresa}</strong>
                  </div>
                  <p>{item.situacion}</p>
                  <div className={s.mobileMeta}>
                    <span>{item.ultimaActividad}</span>
                    <span>{item.proximaAccion}</span>
                  </div>
                  <Link href={item.href} className={s.tableAction}>
                    {item.actionLabel}
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className={s.chartsRow}>
        <article className={s.panel}>
          <div className={s.panelHeader}>
            <h2>Cobros aprobados</h2>
            <span className={s.panelHint}>Últimos 28 días · sin meta</span>
          </div>
          <div className={s.barChart}>
            {dashboard.weeklyRevenue.map((week) => {
              const amountHeight = (week.amountClp / maxWeeklyAmount) * 100;
              return (
                <div key={week.label} className={s.barColumn}>
                  <div className={s.barStack}>
                    <div
                      className={s.barFill}
                      style={{ height: `${amountHeight}%` }}
                      title={`${week.label}: ${formatMoney(week.amountClp)}`}
                    />
                  </div>
                  <span>{week.label}</span>
                  <strong>{formatMoney(week.amountClp)}</strong>
                </div>
              );
            })}
          </div>
        </article>

        <article className={s.panel}>
          <div className={s.panelHeader}>
            <h2>Prospección saliente</h2>
            <Link href="/admin/prospectos">
              Abrir prospectos
              <LuArrowRight aria-hidden />
            </Link>
          </div>
          <div className={s.outboundMetrics}>
            <div>
              <strong>{dashboard.outboundProspecting.activeProspects}</strong>
              <span>contactos activos en la lista</span>
            </div>
            <div>
              <strong>{dashboard.outboundProspecting.contactedProspects}</strong>
              <span>ya contactados o con demo</span>
            </div>
          </div>
          <p className={s.outboundNote}>
            Es una cartera manual para hacer outreach; no representa leads captados ni conversión de marketing.
          </p>
        </article>
      </section>

      <section className={s.bottomRow}>
        <article className={`${s.panel} ${s.panelHealth}`}>
          <div className={s.panelHeader}>
            <h2>Salud de cuentas</h2>
            <Link href="/admin/clientes?riesgo=1">
              Ver cuentas que requieren atención
              <LuArrowRight aria-hidden />
            </Link>
          </div>
          <div className={s.healthGrid}>
            {dashboard.accountHealth.map((bucket) => {
              const presentation = HEALTH_BUCKET_PRESENTATION[bucket.id] ?? {
                hint: "Revisar cuenta",
                Icon: LuCircleCheck,
              };
              const Icon = presentation.Icon;

              return (
                <Link
                  key={bucket.id}
                  href={bucket.href}
                  className={`${s.healthCard} ${healthToneClass(bucket.tone)}`}
                >
                  <span className={s.healthCardIcon} aria-hidden>
                    <Icon />
                  </span>
                  <span className={s.healthCardLabel}>{bucket.label}</span>
                  <strong className={s.healthCardValue}>{bucket.count}</strong>
                  <span className={s.healthCardHint}>{presentation.hint}</span>
                </Link>
              );
            })}
          </div>
        </article>

        <article className={`${s.panel} ${s.panelActivity}`}>
          <div className={s.panelHeader}>
            <h2>Actividad reciente</h2>
          </div>
          {dashboard.recentActivity.length === 0 ? (
            <div className={s.emptyState}>
              Aún no hay eventos recientes registrados en Supabase.
            </div>
          ) : (
            <ul className={s.timeline}>
              {dashboard.recentActivity.map((event) => (
                <li key={event.id} className={s.timelineItem}>
                  <div className={s.timelineDot} />
                  <div className={s.timelineBody}>
                    <strong>{event.label}</strong>
                    {event.subtitle ? <span>{event.subtitle}</span> : null}
                    <span>{formatDateTime(event.at)}</span>
                    <div className={s.timelineLinks}>
                      {event.href ? (
                        <Link href={event.href}>
                          {event.type === "solicitud_publica" ? "Ver solicitud" : "Ver detalle"}
                        </Link>
                      ) : null}
                      {event.secondaryHref ? (
                        <Link href={event.secondaryHref}>{event.secondaryLabel ?? "Ver cuenta"}</Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
