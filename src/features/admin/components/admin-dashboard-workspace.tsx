"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuArrowRight,
  LuCalendarClock,
  LuCircleAlert,
  LuCircleCheck,
  LuClock3,
  LuFileText,
  LuShieldCheck,
  LuTrendingUp,
  LuUserPlus,
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

export function AdminDashboardWorkspace() {
  const { setHeaderState, resetHeaderState } = useAdminHeaderActions();
  const [periodDays, setPeriodDays] = useState(30);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(async (days: number, refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await fetch(`/api/admin/dashboard?days=${days}`, {
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
    void loadDashboard(periodDays);
  }, [loadDashboard, periodDays]);

  useEffect(() => {
    setHeaderState({
      syncedAt: dashboard?.syncedAt ?? null,
      periodDays,
      onPeriodChange: setPeriodDays,
      onRefresh: () => {
        void loadDashboard(periodDays, true);
      },
      isRefreshing,
    });
  }, [dashboard?.syncedAt, isRefreshing, loadDashboard, periodDays, setHeaderState]);

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
      ...dashboard.weeklyRevenue.map((week) =>
        Math.max(week.amountClp, week.goalClp)
      )
    );
  }, [dashboard]);

  const maxFunnelCount = useMemo(() => {
    if (!dashboard) {
      return 1;
    }

    return Math.max(1, ...dashboard.funnel.map((stage) => stage.count));
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
          <span className={s.cardEyebrow}>Ingresos cobrados en el período</span>
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
                {dashboard.revenue.changePct}% vs. período anterior
              </span>
            ) : null}
          </div>

          <div className={s.progressMeta}>
            <span>Meta del período: {formatMoney(dashboard.revenue.goalClp)}</span>
            <span>{Math.round(dashboard.revenue.progressPct)}%</span>
          </div>
          <div className={s.progressTrack}>
            <div
              className={s.progressFill}
              style={{ width: `${dashboard.revenue.progressPct}%` }}
            />
          </div>
          <p className={s.progressHint}>
            {dashboard.revenue.remainingClp > 0
              ? `Faltan ${formatMoney(dashboard.revenue.remainingClp)} para alcanzar la meta`
              : "Meta del período alcanzada"}
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
        </Link>
        <Link href="/admin/clientes" className={s.kpiCard}>
          <LuShieldCheck aria-hidden />
          <span>Trials activos</span>
          <strong>{dashboard.kpis.trialsActivos}</strong>
        </Link>
        <Link href="/admin/clientes" className={s.kpiCard}>
          <LuTrendingUp aria-hidden />
          <span>Conv. trial a pago</span>
          <strong>
            {dashboard.kpis.conversionTrialToPaidPct !== null
              ? `${dashboard.kpis.conversionTrialToPaidPct}%`
              : "—"}
          </strong>
        </Link>
        <Link href="/admin/prospectos" className={s.kpiCard}>
          <LuUserPlus aria-hidden />
          <span>Prospectos nuevos</span>
          <strong>{dashboard.kpis.prospectosNuevos}</strong>
        </Link>
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
            <h2>Ingresos semanales</h2>
            <span className={s.panelHint}>Meta semanal visible en barras</span>
          </div>
          <div className={s.barChart}>
            {dashboard.weeklyRevenue.map((week) => {
              const amountHeight = (week.amountClp / maxWeeklyAmount) * 100;
              const goalHeight = (week.goalClp / maxWeeklyAmount) * 100;

              return (
                <div key={week.label} className={s.barColumn}>
                  <div className={s.barStack}>
                    <div
                      className={s.barGoalLine}
                      style={{ bottom: `${goalHeight}%` }}
                      title={`Meta ${formatMoney(week.goalClp)}`}
                    />
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
            <h2>Embudo de ventas ({dashboard.periodDays}d)</h2>
          </div>
          <div className={s.funnelList}>
            {dashboard.funnel.map((stage, index) => (
              <div key={stage.stage} className={s.funnelRow}>
                <div className={s.funnelLabel}>
                  <span>{stage.stage}</span>
                  <strong>{stage.count}</strong>
                </div>
                <div className={s.funnelTrack}>
                  <div
                    className={s.funnelFill}
                    style={{
                      width: `${(stage.count / maxFunnelCount) * 100}%`,
                    }}
                  />
                </div>
                {index > 0 && stage.conversionPct !== null ? (
                  <span className={s.funnelPct}>{stage.conversionPct}%</span>
                ) : null}
              </div>
            ))}
          </div>
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
