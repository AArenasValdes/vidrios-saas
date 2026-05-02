"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuArrowUpRight,
  LuCheck,
  LuChevronRight,
  LuCopy,
  LuEllipsisVertical,
  LuFilePlus2,
  LuGlobe,
  LuInbox,
  LuMail,
  LuPhone,
  LuText,
} from "react-icons/lu";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { persistNuevaCotizacionSolicitudPrefill } from "@/features/cotizaciones/new-quote/solicitud-prefill";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useSolicitudesContacto } from "@/features/solicitudes/hooks/useSolicitudesContacto";
import { canAccessSolicitudes } from "@/features/solicitudes/services/solicitudes-contacto-access";
import type {
  EstadoSolicitudContacto,
  SolicitudContacto,
} from "@/features/solicitudes/types/solicitud-contacto";
import { formatChileMobilePhone, normalizeChileMobilePhone } from "@/utils/chile-mobile-phone";

import s from "./page.module.css";

const ESTADO_LABELS: Record<EstadoSolicitudContacto, string> = {
  nueva: "Nueva",
  contactada: "Contactada",
  cerrada: "Cotización creada",
  descartada: "Descartada",
};

const FILTRO_LABELS: Record<EstadoSolicitudContacto, string> = {
  nueva: "Nuevas",
  contactada: "Contactadas",
  cerrada: "Con cotización",
  descartada: "Descartadas",
};

const ESTADO_CARD_CLASS: Record<EstadoSolicitudContacto, string> = {
  nueva: s.filterBlue,
  contactada: s.filterGreen,
  cerrada: s.filterGold,
  descartada: s.filterGray,
};

const ESTADO_BADGE_CLASS: Record<EstadoSolicitudContacto, string> = {
  nueva: s.statusBlue,
  contactada: s.statusGreen,
  cerrada: s.statusGold,
  descartada: s.statusGray,
};

const AYUDA_LABEL: Record<string, string> = {
  demo: "Demo",
  cotizacion: "Cotización",
  ventas: "Ventas",
};

type FiltroSolicitud = EstadoSolicitudContacto | "all";

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

function isYesterday(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function formatListDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  if (isToday(value)) {
    return "Hoy";
  }

  if (isYesterday(value)) {
    return "Ayer";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function resolveOriginLabel(solicitud: SolicitudContacto) {
  const origen = solicitud.origen.trim().toLowerCase();

  if (origen.includes("instagram")) {
    return "Instagram";
  }

  if (origen.includes("facebook")) {
    return "Facebook";
  }

  if (origen.includes("whatsapp")) {
    return "WhatsApp";
  }

  if (origen.includes("manual")) {
    return "Manual";
  }

  if (solicitud.contexto === "empresa-publica") {
    return "Página pública";
  }

  return "Landing";
}

function buildPublicRequestUrl(slug: string | null | undefined) {
  if (!slug?.trim()) {
    return null;
  }

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://ventorap.cl";

  return `${baseUrl}/solicitud/${slug.trim()}`;
}

function formatSolicitudContact(value: string | null) {
  if (!value) {
    return null;
  }

  const normalizedPhone = normalizeChileMobilePhone(value);

  if (!normalizedPhone) {
    return value;
  }

  return `+56 9 ${formatChileMobilePhone(normalizedPhone)}`;
}

function getInitials(value: string) {
  return value
    .split(" ")
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export default function SolicitudesPage() {
  const router = useRouter();
  const { rol, user } = useAuth();
  const { profile } = useOrganizationProfile();
  const canReviewSolicitudes = canAccessSolicitudes({
    email: user?.email,
    rol,
  });
  const {
    solicitudes,
    isReady,
    isRefreshing,
    error,
    refreshSolicitudes,
    updateSolicitudEstado,
  } = useSolicitudesContacto(canReviewSolicitudes);
  const [filtroActivo, setFiltroActivo] = useState<FiltroSolicitud>("all");
  const [menuSolicitudId, setMenuSolicitudId] = useState<string | null>(null);
  const [updatingSolicitudId, setUpdatingSolicitudId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const publicRequestUrl = useMemo(
    () => buildPublicRequestUrl(profile?.solicitudPublicaSlug),
    [profile?.solicitudPublicaSlug]
  );

  const resumen = useMemo(() => {
    const counts: Record<EstadoSolicitudContacto, number> = {
      nueva: 0,
      contactada: 0,
      cerrada: 0,
      descartada: 0,
    };
    let hoy = 0;

    for (const solicitud of solicitudes) {
      counts[solicitud.estado] += 1;

      if (isToday(solicitud.creadoEn)) {
        hoy += 1;
      }
    }

    return {
      total: solicitudes.length,
      hoy,
      counts,
    };
  }, [solicitudes]);

  const solicitudesFiltradas = useMemo(() => {
    if (filtroActivo === "all") {
      return solicitudes;
    }

    return solicitudes.filter((solicitud) => solicitud.estado === filtroActivo);
  }, [filtroActivo, solicitudes]);

  const nuevasCount = resumen.counts.nueva;

  useEffect(() => {
    if (!menuSolicitudId) {
      return;
    }

    const handleClose = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-solicitud-menu='true']")) {
        return;
      }

      if (target.closest("[data-solicitud-menu-trigger='true']")) {
        return;
      }

      setMenuSolicitudId(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuSolicitudId(null);
      }
    };

    document.addEventListener("click", handleClose);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClose);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuSolicitudId]);

  const handleCopyPublicLink = useCallback(async () => {
    if (!publicRequestUrl) {
      setFeedback("Primero configura el slug público en Empresa.");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicRequestUrl);
      setFeedback("Enlace copiado.");
    } catch {
      setFeedback("No pudimos copiar el enlace.");
    }
  }, [publicRequestUrl]);

  const handleCopyText = useCallback(async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(message);
    } catch {
      setFeedback("No pudimos copiar el dato.");
    }
  }, []);

  const handleToggleMenu = useCallback((solicitudId: string) => {
    setMenuSolicitudId((current) => (current === solicitudId ? null : solicitudId));
  }, []);

  const handleUpdateStatus = useCallback(
    async (id: string, estado: EstadoSolicitudContacto) => {
      try {
        setUpdatingSolicitudId(id);
        setMenuSolicitudId(null);
        await updateSolicitudEstado(id, estado);
        setFeedback(`Solicitud movida a ${ESTADO_LABELS[estado].toLowerCase()}.`);
      } finally {
        setUpdatingSolicitudId(null);
      }
    },
    [updateSolicitudEstado]
  );

  const handleCreateQuoteFromSolicitud = useCallback(
    (solicitud: SolicitudContacto) => {
      const telefonoContacto =
        solicitud.telefono ||
        (solicitud.contacto && !solicitud.contacto.includes("@")
          ? solicitud.contacto
          : "");
      const origenLabel = resolveOriginLabel(solicitud);
      const observaciones = [
        solicitud.mensaje?.trim() || "",
        `Origen: ${origenLabel}.`,
      ]
        .filter(Boolean)
        .join("\n\n");

      persistNuevaCotizacionSolicitudPrefill({
        sourceSolicitudId: solicitud.id,
        clienteNombre: solicitud.nombre,
        clienteTelefono: telefonoContacto,
        obra: solicitud.tipoTrabajo?.trim() || "Solicitud comercial",
        observaciones,
        pricingMode: profile?.modoPrecioPreferido ?? "margen",
        defaultMargin: profile?.margenDefecto,
      });

      router.push("/cotizaciones/nueva");
    },
    [profile?.margenDefecto, profile?.modoPrecioPreferido, router]
  );

  if (!isReady) {
    return (
      <div className={s.root}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuInbox aria-hidden />
          </div>
          <p className={s.emptyTitle}>Cargando solicitudes</p>
          <p className={s.emptySub}>Estamos preparando tu bandeja comercial.</p>
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
            Esta bandeja está reservada para la cuenta autorizada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <section className={s.heroCard}>
        <div className={s.heroTop}>
          <div>
            <span className={s.heroEyebrow}>Solicitudes recibidas</span>
            <strong className={s.heroTotal}>{resumen.total}</strong>
            <p className={s.heroSub}>Desde tu enlace público</p>
          </div>
          <span className={s.todayBadge}>+{resumen.hoy} hoy</span>
        </div>

        <div className={s.heroActions}>
          <button
            type="button"
            className={s.heroActionPrimary}
            onClick={() => void handleCopyPublicLink()}
          >
            <LuCopy aria-hidden />
            Copiar enlace
          </button>
          {publicRequestUrl ? (
            <a
              className={s.heroActionSecondary}
              href={publicRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LuArrowUpRight aria-hidden />
              Ver página
            </a>
          ) : (
            <button type="button" className={s.heroActionSecondary} disabled>
              <LuArrowUpRight aria-hidden />
              Ver página
            </button>
          )}
        </div>
      </section>

      <section className={s.filtersSection}>
        <button
          type="button"
          className={`${s.filterCard} ${s.filterCardAll} ${
            filtroActivo === "all" ? s.filterActive : ""
          }`}
          onClick={() => setFiltroActivo("all")}
        >
          <div className={s.filterTop}>
            <div className={s.filterInline}>
              <strong className={s.filterInlineCount}>{resumen.total}</strong>
              <span className={s.filterInlineLabel}>Todas</span>
            </div>
            {filtroActivo === "all" ? (
              <span className={s.filterCheck}>
                <LuCheck aria-hidden />
              </span>
            ) : null}
          </div>
        </button>

        <div className={s.filterGrid}>
          {(["nueva", "contactada", "cerrada", "descartada"] as EstadoSolicitudContacto[]).map(
            (estado) => (
              <button
                key={estado}
                type="button"
                className={`${s.filterCard} ${ESTADO_CARD_CLASS[estado]} ${
                  filtroActivo === estado ? s.filterActive : ""
                }`}
                onClick={() => setFiltroActivo(estado)}
              >
                <div className={s.filterTop}>
                  <div className={s.filterInline}>
                    <strong className={s.filterInlineCount}>
                      {resumen.counts[estado]}
                    </strong>
                    <span className={s.filterInlineLabel}>{FILTRO_LABELS[estado]}</span>
                  </div>
                  {filtroActivo === estado ? (
                    <span className={s.filterCheck}>
                      <LuCheck aria-hidden />
                    </span>
                  ) : null}
                </div>
              </button>
            )
          )}
        </div>
      </section>

      {nuevasCount > 0 ? (
        <button
          type="button"
          className={s.alertCard}
          onClick={() => setFiltroActivo("nueva")}
        >
          <div className={s.alertIcon}>
            <LuInbox aria-hidden />
          </div>
          <div className={s.alertCopy}>
            <strong>
              Tienes {nuevasCount} solicitud{nuevasCount === 1 ? "" : "es"} nueva
              {nuevasCount === 1 ? "" : "s"} esperando respuesta
            </strong>
            <span>Revisar nuevas</span>
          </div>
          <LuChevronRight className={s.alertArrow} aria-hidden />
        </button>
      ) : null}

      {feedback ? <div className={s.feedbackBanner}>{feedback}</div> : null}

      {error ? (
        <div className={s.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={() => void refreshSolicitudes()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {isRefreshing ? <p className={s.refreshText}>Actualizando solicitudes...</p> : null}

      {solicitudes.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuInbox aria-hidden />
          </div>
          <p className={s.emptyTitle}>Aún no llegan solicitudes</p>
          <p className={s.emptySub}>
            Cuando alguien escriba desde tu página pública, aparecerá aquí.
          </p>
        </div>
      ) : solicitudesFiltradas.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuInbox aria-hidden />
          </div>
          <p className={s.emptyTitle}>No hay solicitudes en este estado</p>
          <p className={s.emptySub}>
            Cambia el filtro para revisar el resto de tu bandeja.
          </p>
        </div>
      ) : (
        <div className={s.list}>
          {solicitudesFiltradas.map((solicitud) => {
            const telefonoContacto =
              solicitud.telefono ||
              (solicitud.contacto && !solicitud.contacto.includes("@")
                ? solicitud.contacto
                : null);
            const emailContacto =
              solicitud.correo ||
              (solicitud.contacto?.includes("@") ? solicitud.contacto : null);
            const mensaje =
              solicitud.mensaje?.trim() ||
              `Quiero consultar por ${solicitud.tipoTrabajo || AYUDA_LABEL[solicitud.ayuda] || "este trabajo"}.`;
            const menuOpen = menuSolicitudId === solicitud.id;
            const isUpdating = updatingSolicitudId === solicitud.id;

            return (
              <article key={solicitud.id} className={s.card}>
                <div className={s.cardTop}>
                  <div className={s.cardIdentity}>
                    <div className={s.avatar}>{getInitials(solicitud.nombre)}</div>
                    <div className={s.identityCopy}>
                      <h2 className={s.name}>{solicitud.nombre}</h2>
                      <p className={s.workText}>
                        {solicitud.tipoTrabajo ||
                          AYUDA_LABEL[solicitud.ayuda] ||
                          "Consulta"}
                      </p>
                    </div>
                  </div>

                  <div className={s.cardMeta}>
                    <span
                      className={`${s.statusPill} ${ESTADO_BADGE_CLASS[solicitud.estado]}`}
                    >
                      {ESTADO_LABELS[solicitud.estado]}
                    </span>
                    <span className={s.dateText}>{formatListDate(solicitud.creadoEn)}</span>
                  </div>
                </div>

                <div className={s.infoRows}>
                  {telefonoContacto ? (
                    <a href={`tel:${telefonoContacto}`} className={s.infoRow}>
                      <LuPhone aria-hidden />
                      <span>{formatSolicitudContact(telefonoContacto)}</span>
                    </a>
                  ) : emailContacto ? (
                    <a href={`mailto:${emailContacto}`} className={s.infoRow}>
                      <LuMail aria-hidden />
                      <span>{emailContacto}</span>
                    </a>
                  ) : null}

                  <div className={s.infoRow}>
                    <LuGlobe aria-hidden />
                    <span>{resolveOriginLabel(solicitud)}</span>
                  </div>
                </div>

                <div className={s.messageBubble}>“{mensaje}”</div>

                <div className={s.cardActions}>
                  <button
                    type="button"
                    className={s.primaryAction}
                    onClick={() => handleCreateQuoteFromSolicitud(solicitud)}
                  >
                    <LuFilePlus2 aria-hidden />
                    Crear cotización
                  </button>

                  {telefonoContacto ? (
                    <a href={`tel:${telefonoContacto}`} className={s.iconAction}>
                      <LuPhone aria-hidden />
                    </a>
                  ) : emailContacto ? (
                    <a href={`mailto:${emailContacto}`} className={s.iconAction}>
                      <LuMail aria-hidden />
                    </a>
                  ) : (
                    <button type="button" className={s.iconAction} disabled>
                      <LuPhone aria-hidden />
                    </button>
                  )}

                  <div className={s.menuWrap}>
                    <button
                      type="button"
                      className={`${s.iconAction} ${s.menuTrigger}`}
                      data-solicitud-menu-trigger="true"
                      onClick={() => handleToggleMenu(solicitud.id)}
                      disabled={isUpdating}
                    >
                      <LuEllipsisVertical aria-hidden />
                    </button>

                    {menuOpen ? (
                      <div className={s.menuPanel} data-solicitud-menu="true">
                        <div className={s.menuSectionLabel}>Cambiar estado</div>
                        {(["nueva", "contactada", "cerrada", "descartada"] as EstadoSolicitudContacto[]).map(
                          (estado) => (
                            <button
                              key={estado}
                              type="button"
                              className={`${s.menuAction} ${
                                solicitud.estado === estado ? s.menuActionActive : ""
                              }`}
                              onClick={() => void handleUpdateStatus(solicitud.id, estado)}
                            >
                              <span
                                className={`${s.menuStatusDot} ${ESTADO_BADGE_CLASS[estado]}`}
                                aria-hidden
                              />
                              {estado === "cerrada"
                                ? "Con cotización"
                                : FILTRO_LABELS[estado]}
                            </button>
                          )
                        )}
                        <div className={s.menuDivider} />
                        {solicitud.contacto ? (
                          <button
                            type="button"
                            className={s.menuAction}
                            onClick={() => {
                              setMenuSolicitudId(null);
                              void handleCopyText(
                                solicitud.contacto!,
                                "Contacto copiado."
                              );
                            }}
                          >
                            <LuCopy aria-hidden />
                            Copiar contacto
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={s.menuAction}
                          onClick={() => {
                            setMenuSolicitudId(null);
                            void handleCopyText(mensaje, "Mensaje copiado.");
                          }}
                        >
                          <LuText aria-hidden />
                          Copiar mensaje
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
