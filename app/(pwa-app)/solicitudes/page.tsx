"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  LuArrowUpRight,
  LuCheck,
  LuChevronRight,
  LuCopy,
  LuInbox,
  LuQrCode,
  LuSearch,
} from "react-icons/lu";

import { PremiumPageReveal, PremiumPageSection } from "@/components/motion/premium-page-reveal";
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
import { resolvePublicAppUrl } from "@/utils/public-app-url";
import { relativeTime } from "@/utils/relative-time";
import { SolicitudCard } from "./_components/solicitud-card";
import s from "./page.module.css";

const ESTADO_LABELS: Record<EstadoSolicitudContacto, string> = {
  nueva: "Nueva",
  contactada: "Contactada",
  cerrada: "Cotizacion creada",
  descartada: "Descartada",
};

const FILTRO_LABELS: Record<EstadoSolicitudContacto, string> = {
  nueva: "Nuevas",
  contactada: "Contactadas",
  cerrada: "Con cotizacion",
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
  cotizacion: "Cotizacion",
  ventas: "Ventas",
};

const SOLICITUD_STATE_OPTIONS: EstadoSolicitudContacto[] = [
  "nueva",
  "contactada",
  "cerrada",
  "descartada",
];

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
  const origen = (solicitud.utmSource || solicitud.origen).trim().toLowerCase();

  if (origen.includes("qr")) {
    return "QR";
  }

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
    return "Pagina publica";
  }

  return "Landing";
}

function buildPublicRequestUrl(slug: string | null | undefined) {
  if (!slug?.trim()) {
    return null;
  }

  return `${resolvePublicAppUrl()}/solicitud/${slug.trim()}`;
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

function buildWhatsappMessageUrl(phone: string, name: string, empresaNombre: string) {
  const cleanedPhone = normalizeChileMobilePhone(phone);

  if (!cleanedPhone) {
    return null;
  }

  const message = `Hola ${name}, recibimos tu solicitud en ${empresaNombre}. Te contacto para revisar los detalles y preparar tu cotizacion.`;
  return `https://wa.me/${cleanedPhone.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`;
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
  const solicitudesCacheKey = String(user?.id ?? profile?.organizationId ?? "default");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDiferida = useDeferredValue(busqueda);
  const [filtroActivo, setFiltroActivo] = useState<FiltroSolicitud>("all");
  const canReviewSolicitudes = canAccessSolicitudes({
    email: user?.email,
    rol,
  });
  const {
    solicitudes,
    isReady,
    isRefreshing,
    isLoadingMore,
    error,
    totalCount,
    hasMore,
    summary,
    refreshSolicitudes,
    loadMoreSolicitudes,
    updateSolicitudEstado,
  } = useSolicitudesContacto(canReviewSolicitudes, solicitudesCacheKey, {
    estado: filtroActivo,
    search: busquedaDiferida,
  });
  const [menuSolicitudId, setMenuSolicitudId] = useState<string | null>(null);
  const [updatingSolicitudId, setUpdatingSolicitudId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const publicRequestUrl = useMemo(() => {
    return buildPublicRequestUrl(profile?.solicitudPublicaSlug);
  }, [profile?.solicitudPublicaSlug]);

  const resumen = useMemo(() => {
    return {
      total: summary.total || totalCount || solicitudes.length,
      hoy: summary.hoy,
      counts: summary.counts,
    };
  }, [solicitudes.length, summary, totalCount]);

  const visibleSolicitudes = useMemo(() => {
    return solicitudes.map((solicitud) => {
      const telefonoContacto =
        solicitud.telefono ||
        (solicitud.contacto && !solicitud.contacto.includes("@")
          ? solicitud.contacto
          : null);
      const emailContacto =
        solicitud.correo ||
        (solicitud.contacto?.includes("@") ? solicitud.contacto : null);
      const originLabel = resolveOriginLabel(solicitud);
      const message =
        solicitud.mensaje?.trim() ||
        `Quiero consultar por ${
          solicitud.tipoTrabajo || AYUDA_LABEL[solicitud.ayuda] || "este trabajo"
        }.`;
      const contactIcon: "phone" | "mail" | null = telefonoContacto
        ? "phone"
        : emailContacto
          ? "mail"
          : null;

      return {
        solicitud,
        initials: getInitials(solicitud.nombre),
        displayType: solicitud.tipoTrabajo || AYUDA_LABEL[solicitud.ayuda] || "Consulta",
        statusLabel: ESTADO_LABELS[solicitud.estado],
        statusClassName: ESTADO_BADGE_CLASS[solicitud.estado],
        relativeLabel: relativeTime(solicitud.creadoEn),
        calendarLabel: formatListDate(solicitud.creadoEn),
        contactLabel: telefonoContacto
          ? formatSolicitudContact(telefonoContacto)
          : emailContacto,
        contactHref: telefonoContacto
          ? `tel:${telefonoContacto}`
          : emailContacto
            ? `mailto:${emailContacto}`
            : null,
        contactIcon,
        originLabel,
        message,
        whatsappUrl: telefonoContacto
          ? buildWhatsappMessageUrl(
              telefonoContacto,
              solicitud.nombre,
              profile?.empresaNombre ?? "nosotros"
            )
          : null,
      };
    });
  }, [profile?.empresaNombre, solicitudes]);

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
      setFeedback("Primero configura el slug publico en Empresa.");
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

  const handleCopyContact = useCallback(
    async (value: string) => {
      setMenuSolicitudId(null);
      await handleCopyText(value, "Contacto copiado.");
    },
    [handleCopyText]
  );

  const handleCopyMessage = useCallback(
    async (value: string) => {
      setMenuSolicitudId(null);
      await handleCopyText(value, "Mensaje copiado.");
    },
    [handleCopyText]
  );

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
      const originLabel = resolveOriginLabel(solicitud);
      const observaciones = [solicitud.mensaje?.trim() || "", `Origen: ${originLabel}.`]
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

      const params = new URLSearchParams({
        nombre: solicitud.nombre,
        telefono: telefonoContacto,
        tipoTrabajo: solicitud.tipoTrabajo?.trim() || "Solicitud comercial",
        solicitudId: solicitud.id,
      });

      router.push(`/cotizaciones/nueva?${params.toString()}`);
    },
    [profile?.margenDefecto, profile?.modoPrecioPreferido, router]
  );

  if (!isReady) {
    return (
      <PremiumPageReveal className={s.root}>
        <PremiumPageSection className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuInbox aria-hidden />
          </div>
          <p className={s.emptyTitle}>Cargando solicitudes</p>
          <p className={s.emptySub}>Estamos preparando tu bandeja comercial.</p>
        </PremiumPageSection>
      </PremiumPageReveal>
    );
  }

  if (!canReviewSolicitudes) {
    return (
      <PremiumPageReveal className={s.root}>
        <PremiumPageSection className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuInbox aria-hidden />
          </div>
          <p className={s.emptyTitle}>Acceso restringido</p>
          <p className={s.emptySub}>
            Esta bandeja esta reservada para la cuenta autorizada.
          </p>
        </PremiumPageSection>
      </PremiumPageReveal>
    );
  }

  return (
    <PremiumPageReveal className={s.root}>
      <PremiumPageSection className={s.heroCard}>
        <div className={s.heroTop}>
          <div>
            <span className={s.heroEyebrow}>Solicitudes recibidas</span>
            <strong className={s.heroTotal}>{resumen.total}</strong>
            <p className={s.heroSub}>Desde tu enlace publico</p>
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
              Ver pagina
            </a>
          ) : (
            <button type="button" className={s.heroActionSecondary} disabled>
              <LuArrowUpRight aria-hidden />
              Ver pagina
            </button>
          )}
          <Link href="/solicitudes/canales" className={`${s.heroActionSecondary} ${s.heroActionWide}`} prefetch={false}>
            <LuQrCode aria-hidden />
            Canales y QR
          </Link>
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={s.filtersSection}>
        <div className={s.searchBar}>
          <LuSearch aria-hidden className={s.searchIcon} />
          <input
            className={s.searchInput}
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre, contacto o trabajo"
          />
        </div>
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
          {SOLICITUD_STATE_OPTIONS.map((estado) => (
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
                  <strong className={s.filterInlineCount}>{resumen.counts[estado]}</strong>
                  <span className={s.filterInlineLabel}>{FILTRO_LABELS[estado]}</span>
                </div>
                {filtroActivo === estado ? (
                  <span className={s.filterCheck}>
                    <LuCheck aria-hidden />
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </PremiumPageSection>

      {nuevasCount > 0 ? (
        <PremiumPageSection>
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
        </PremiumPageSection>
      ) : null}

      {feedback ? (
        <PremiumPageSection className={s.feedbackBanner}>{feedback}</PremiumPageSection>
      ) : null}

      {error ? (
        <PremiumPageSection className={s.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={() => void refreshSolicitudes()}>
            Reintentar
          </button>
        </PremiumPageSection>
      ) : null}

      {solicitudes.length === 0 ? (
        <PremiumPageSection className={s.emptyState}>
          <div className={s.emptyIcon}>
            <LuInbox aria-hidden />
          </div>
          <p className={s.emptyTitle}>
            {busquedaDiferida.trim()
              ? "No encontramos solicitudes"
              : "Aun no llegan solicitudes"}
          </p>
          <p className={s.emptySub}>
            {busquedaDiferida.trim()
              ? "Prueba con otro nombre o cambia el filtro actual."
              : "Cuando alguien escriba desde tu pagina publica, aparecera aqui."}
          </p>
        </PremiumPageSection>
      ) : (
        <PremiumPageSection className={s.list}>
          {visibleSolicitudes.map((item) => (
            <SolicitudCard
              key={item.solicitud.id}
              item={item}
              isUpdating={updatingSolicitudId === item.solicitud.id}
              menuOpen={menuSolicitudId === item.solicitud.id}
                stateOptions={SOLICITUD_STATE_OPTIONS}
                filterLabels={FILTRO_LABELS}
                stateBadgeClasses={ESTADO_BADGE_CLASS}
                onCreateQuote={handleCreateQuoteFromSolicitud}
                onToggleMenu={handleToggleMenu}
                onUpdateStatus={handleUpdateStatus}
              onCopyContact={handleCopyContact}
              onCopyMessage={handleCopyMessage}
            />
          ))}
          {hasMore ? (
            <button
              type="button"
              className={s.loadMoreBtn}
              onClick={() => void loadMoreSolicitudes()}
              disabled={isLoadingMore || isRefreshing}
            >
              {isLoadingMore ? "Cargando..." : "Cargar más"}
            </button>
          ) : null}
        </PremiumPageSection>
      )}
    </PremiumPageReveal>
  );
}
