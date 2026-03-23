"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { buildCotizacionAlerts } from "@/services/cotizacion-alerts.service";
import { useCotizacionesStore } from "@/hooks/useCotizacionesStore";
import { useOrganizationProfile } from "@/hooks/useOrganizationProfile";
import { formatCotizacionDate } from "@/services/cotizaciones-workflow.service";

import s from "./page.module.css";

const ESTADO_META: Record<string, { label: string; cls: string }> = {
  aprobada: { label: "Aprobada", cls: "badgeAprobada" },
  enviada: { label: "Enviada", cls: "badgeEnviada" },
  borrador: { label: "Borrador", cls: "badgeBorrador" },
  creada: { label: "Creada", cls: "badgeEnviada" },
  rechazada: { label: "Rechazada", cls: "badgeRechazada" },
};

const ALERTA_META: Record<string, { label: string; cls: string }> = {
  aprobada: { label: "Aprobada", cls: "badgeAprobada" },
  rechazada: { label: "Rechazada", cls: "badgeRechazada" },
  vista: { label: "Vista", cls: "badgeVista" },
};

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const CLP = (value: number) => clpFormatter.format(value);

function isSameMonth(dateString: string, now: Date) {
  const date = new Date(dateString);

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useOrganizationProfile();
  const { cotizaciones, isReady, isRefreshing } = useCotizacionesStore();
  const now = useMemo(() => new Date(), []);
  const hoy = useMemo(
    () =>
      now.toLocaleDateString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [now]
  );
  const companyName = useMemo(() => profile?.empresaNombre || "Mi empresa", [profile?.empresaNombre]);
  const greetingName = useMemo(
    () => user?.email?.split("@")[0]?.replace(/[._-]+/g, " ")?.trim() || companyName,
    [companyName, user?.email]
  );
  const isInitialSync = isRefreshing && cotizaciones.length === 0;
  const { recentQuoteCards, responseActivityCards, stats } = useMemo(() => {
    let monthQuotesCount = 0;
    let approvedQuotesCount = 0;
    let pendingQuotesCount = 0;
    let totalApproved = 0;

    for (const item of cotizaciones) {
      if (
        item.estado === "enviada" ||
        item.estado === "borrador" ||
        item.estado === "creada"
      ) {
        pendingQuotesCount += 1;
      }

      if (!isSameMonth(item.updatedAt, now)) {
        continue;
      }

      monthQuotesCount += 1;

      if (item.estado === "aprobada") {
        approvedQuotesCount += 1;
        totalApproved += item.total;
      }
    }

    const nextResponseActivityCards = buildCotizacionAlerts(cotizaciones, { now, limit: 4 }).map(
      (alert) => {
        const meta = ALERTA_META[alert.kind] ?? ALERTA_META.vista;

        return {
          id: alert.id,
          href: alert.href,
          title: alert.title,
          message: alert.message,
          codigo: alert.codigo,
          badgeClassName: `${s.badge} ${s[meta.cls]}`,
          badgeLabel: meta.label,
        };
      }
    );

    const nextRecentQuoteCards = cotizaciones.slice(0, 5).map((quote) => {
      const meta = ESTADO_META[quote.estado] ?? {
        label: quote.estado,
        cls: "badgeBorrador",
      };

      return {
        id: quote.id,
        codigo: quote.codigo,
        clienteNombre: quote.clienteNombre,
        obraFecha: `${quote.obra} - ${formatCotizacionDate(quote.updatedAt)}`,
        total: CLP(quote.total),
        badgeClassName: `${s.badge} ${s[meta.cls]}`,
        badgeLabel: meta.label,
      };
    });

    return {
      recentQuoteCards: nextRecentQuoteCards,
      responseActivityCards: nextResponseActivityCards,
      stats: [
        {
          label: "Cotizaciones este mes",
          value: String(monthQuotesCount),
          sub: `${approvedQuotesCount} aprobadas`,
          dotColor: "#2FA36B",
        },
        {
          label: "Pendientes",
          value: String(pendingQuotesCount),
          sub: "Esperando accion o respuesta",
          dotColor: "#D89B3C",
        },
        {
          label: "Total aprobado",
          value: CLP(totalApproved),
          sub: "Monto aprobado del mes",
          dotColor: "#4F7DD4",
          mono: true,
        },
      ],
    };
  }, [cotizaciones, now]);

  if (!isReady) {
    return (
      <div className={s.root}>
        <section className={s.section}>
          <div className={s.emptyState}>
            <p className={s.emptyTitle}>Cargando dashboard</p>
            <p className={s.subtitle}>
              Estamos armando tu resumen comercial y las ultimas cotizaciones.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Buen dia, {greetingName}</h1>
          <p className={s.subtitle}>{hoy} - {companyName}</p>
          {isRefreshing ? <p className={s.subtitle}>Sincronizando cotizaciones...</p> : null}
        </div>
      </div>

      {responseActivityCards.length > 0 ? (
        <section className={s.section}>
          <div className={s.sectionHeader}>
            <span className={s.sectionTitle}>Ultimas respuestas de clientes</span>
            <Link className={s.verTodo} href="/cotizaciones">
              Ver cotizaciones {" >"}
            </Link>
          </div>

          <div className={s.activityCard}>
            <div className={s.activityList}>
              {responseActivityCards.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className={`${s.activityRow} ${s.activityLink}`}
                >
                  <div>
                    <strong>{alert.title}</strong>
                    <span>{alert.message}</span>
                  </div>
                  <div className={s.activityRowEnd}>
                    <span className={s.activityMeta}>{alert.codigo}</span>
                    <span className={alert.badgeClassName}>{alert.badgeLabel}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className={s.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={s.statCard}>
            <div className={s.statLabel}>{stat.label}</div>
            <div className={`${s.statValue}${stat.mono ? ` ${s.statMono}` : ""}`}>
              {stat.value}
            </div>
            <div className={s.statSub}>
              <span className={s.statDot} style={{ background: stat.dotColor }} />
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      <section className={s.section}>
        <div className={s.sectionHeader}>
          <span className={s.sectionTitle}>Ultimas cotizaciones</span>
          <Link className={s.verTodo} href="/cotizaciones">
            Ver todas {" >"}
          </Link>
        </div>

        {recentQuoteCards.length === 0 ? (
          <div className={s.emptyState}>
            <p className={s.emptyTitle}>
              {isInitialSync
                ? "Sincronizando cotizaciones"
                : "Todavia no tienes cotizaciones reales"}
            </p>
            <p className={s.emptySub}>
              {isInitialSync
                ? "Estamos trayendo tu actividad comercial. Espera un momento antes de asumir que no hay datos."
                : "Crea tu primer presupuesto y el dashboard empezara a mostrar actividad real."}
            </p>
            {!isInitialSync ? (
              <Link className={s.verTodo} href="/cotizaciones/nueva">
                Crear cotizacion
              </Link>
            ) : null}
          </div>
        ) : (
          <div className={s.cotList}>
            <div className={s.cotHeaderRow}>
              <span className={s.colNum}>Nro.</span>
              <span className={s.colCliente}>Cliente</span>
              <span className={s.colTotal}>Total</span>
              <span className={s.colEstado}>Estado</span>
            </div>

            {recentQuoteCards.map((quote) => (
              <div key={quote.id} className={s.cotRow}>
                <span className={s.cotNum}>{quote.codigo}</span>
                <div className={s.cotCliente}>
                  <span className={s.cotNombre}>{quote.clienteNombre}</span>
                  <span className={s.cotObra}>{quote.obraFecha}</span>
                </div>
                <span className={s.cotTotal}>{quote.total}</span>
                <span className={quote.badgeClassName}>{quote.badgeLabel}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
