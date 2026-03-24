"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  LuArrowUpRight,
  LuBuilding2,
  LuInbox,
  LuMail,
  LuPhone,
  LuRefreshCw,
} from "react-icons/lu";

import { useAuth } from "@/hooks/useAuth";
import { canAccessSolicitudes } from "@/services/solicitudes-contacto-access";
import { useSolicitudesContacto } from "@/hooks/useSolicitudesContacto";

import s from "./page.module.css";

const AYUDA_LABEL: Record<string, string> = {
  demo: "Demo",
  cotizacion: "Cotizacion",
  ventas: "Ventas",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isToday(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export default function SolicitudesPage() {
  const { rol, user } = useAuth();
  const canReviewSolicitudes = canAccessSolicitudes({
    email: user?.email,
    rol,
  });
  const { solicitudes, isReady, isRefreshing, error, refreshSolicitudes } =
    useSolicitudesContacto(canReviewSolicitudes);

  const resumen = useMemo(() => {
    let demos = 0;
    let cotizaciones = 0;
    let hoy = 0;

    for (const solicitud of solicitudes) {
      if (solicitud.ayuda === "demo") {
        demos += 1;
      }

      if (solicitud.ayuda === "cotizacion") {
        cotizaciones += 1;
      }

      if (isToday(solicitud.creadoEn)) {
        hoy += 1;
      }
    }

    return {
      total: solicitudes.length,
      demos,
      cotizaciones,
      hoy,
    };
  }, [solicitudes]);

  if (!isReady) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuInbox aria-hidden />
          </div>
          <p className={s.emptyTitle}>Cargando solicitudes</p>
          <p className={s.emptySub}>
            Estamos preparando la bandeja de contactos que llegan desde la
            landing.
          </p>
        </div>
      </div>
    );
  }

  if (!canReviewSolicitudes) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuInbox aria-hidden />
          </div>
          <p className={s.emptyTitle}>Acceso restringido</p>
          <p className={s.emptySub}>
            Esta bandeja esta reservada para la cuenta creadora autorizada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Solicitudes</h1>
          <p className={s.subtitle}>
            Aqui recibes los contactos del formulario comercial de la landing.
          </p>
          {isRefreshing ? (
            <p className={s.subtitle}>Actualizando bandeja...</p>
          ) : null}
        </div>

        <button
          type="button"
          className={s.refreshButton}
          onClick={() => void refreshSolicitudes()}
        >
          <LuRefreshCw aria-hidden />
          Actualizar
        </button>
      </div>

      <div className={s.kpiRow}>
        <article className={s.kpiCard}>
          <span className={s.kpiLabel}>Solicitudes</span>
          <strong className={s.kpiValue}>{resumen.total}</strong>
          <span className={s.kpiHint}>bandeja total</span>
        </article>
        <article className={s.kpiCard}>
          <span className={s.kpiLabel}>Demos</span>
          <strong className={`${s.kpiValue} ${s.kpiBlue}`}>{resumen.demos}</strong>
          <span className={s.kpiHint}>interes comercial</span>
        </article>
        <article className={s.kpiCard}>
          <span className={s.kpiLabel}>Cotizaciones</span>
          <strong className={`${s.kpiValue} ${s.kpiGold}`}>{resumen.cotizaciones}</strong>
          <span className={s.kpiHint}>peticiones directas</span>
        </article>
        <article className={s.kpiCard}>
          <span className={s.kpiLabel}>Hoy</span>
          <strong className={`${s.kpiValue} ${s.kpiGreen}`}>{resumen.hoy}</strong>
          <span className={s.kpiHint}>ingresos del dia</span>
        </article>
      </div>

      {error ? (
        <div className={s.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={() => void refreshSolicitudes()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {solicitudes.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuInbox aria-hidden />
          </div>
          <p className={s.emptyTitle}>Aun no llegan solicitudes</p>
          <p className={s.emptySub}>
            Cuando alguien complete el formulario final de la landing, aparecera
            aqui para seguimiento.
          </p>
        </div>
      ) : (
        <div className={s.list}>
          {solicitudes.map((solicitud) => (
            <article key={solicitud.id} className={s.card}>
              <div className={s.cardTop}>
                <div className={s.identity}>
                  <div className={s.avatar}>
                    {solicitud.nombre
                      .split(" ")
                      .slice(0, 2)
                      .map((chunk) => chunk[0]?.toUpperCase() ?? "")
                      .join("")}
                  </div>
                  <div>
                    <h2 className={s.name}>{solicitud.nombre}</h2>
                    <p className={s.company}>
                      <LuBuilding2 aria-hidden />
                      {solicitud.empresa}
                    </p>
                  </div>
                </div>

                <div className={s.topMeta}>
                  <span className={s.statusPill}>Nueva</span>
                  <span className={s.dateText}>
                    {formatDate(solicitud.creadoEn)}
                  </span>
                </div>
              </div>

              <div className={s.cardBody}>
                <div className={s.metaBlock}>
                  <span className={s.metaLabel}>Necesita</span>
                  <strong className={s.metaValue}>
                    {AYUDA_LABEL[solicitud.ayuda] ?? "Consulta"}
                  </strong>
                </div>
                <div className={s.metaBlock}>
                  <span className={s.metaLabel}>Correo</span>
                  <a href={`mailto:${solicitud.correo}`} className={s.metaLink}>
                    {solicitud.correo}
                  </a>
                </div>
                <div className={s.metaBlock}>
                  <span className={s.metaLabel}>Telefono</span>
                  <a href={`tel:${solicitud.telefono}`} className={s.metaLink}>
                    {solicitud.telefono}
                  </a>
                </div>
              </div>

              <div className={s.cardActions}>
                <a href={`mailto:${solicitud.correo}`} className={s.actionButton}>
                  <LuMail aria-hidden />
                  Escribir correo
                </a>
                <a href={`tel:${solicitud.telefono}`} className={s.actionButton}>
                  <LuPhone aria-hidden />
                  Llamar
                </a>
                <Link href="/planes" className={s.actionButtonGhost}>
                  <LuArrowUpRight aria-hidden />
                  Ver landing
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
