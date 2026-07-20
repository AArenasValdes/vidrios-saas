"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  LuArrowUpRight,
  LuCheck,
  LuCopy,
  LuInbox,
  LuQrCode,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";

import { PremiumPageReveal, PremiumPageSection } from "@/components/motion/premium-page-reveal";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { persistNuevaCotizacionSolicitudPrefill } from "@/features/cotizaciones/new-quote/solicitud-prefill";
import { OnboardingGuide } from "@/features/onboarding/components/onboarding-guide";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useSolicitudesContacto } from "@/features/solicitudes/hooks/useSolicitudesContacto";
import { buildPublicRequestShareClipboardText } from "@/features/solicitudes/services/public-request-share.service";
import {
  getLatestSolicitudesSeenAt,
  getSolicitudesSeenStorageKey,
  persistSolicitudesSeenAt,
} from "@/features/solicitudes/services/solicitudes-seen-storage.service";
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
  const { rol, user, organizacionId } = useAuth();
  const onboarding = useOnboardingChecklist();
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
    deleteSolicitudes,
  } = useSolicitudesContacto(canReviewSolicitudes, solicitudesCacheKey, {
    estado: filtroActivo,
    search: busquedaDiferida,
  });
  const [menuSolicitudId, setMenuSolicitudId] = useState<string | null>(null);
  const [updatingSolicitudId, setUpdatingSolicitudId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const publicRequestUrl = useMemo(() => {
    return buildPublicRequestUrl(profile?.solicitudPublicaSlug);
  }, [profile?.solicitudPublicaSlug]);
  const previewPublicRequestUrl = useMemo(() => {
    if (!publicRequestUrl) {
      return null;
    }

    return `${publicRequestUrl}${publicRequestUrl.includes("?") ? "&" : "?"}preview=1`;
  }, [publicRequestUrl]);
  const publicRequestShareText = useMemo(() => {
    if (!publicRequestUrl) {
      return null;
    }

    return buildPublicRequestShareClipboardText({
      url: publicRequestUrl,
      empresaNombre: profile?.empresaNombre,
      channel: "direct",
    });
  }, [profile?.empresaNombre, publicRequestUrl]);

  const resumen = useMemo(() => {
    return {
      total: summary.total || totalCount || solicitudes.length,
      hoy: summary.hoy,
      counts: summary.counts,
    };
  }, [solicitudes.length, summary, totalCount]);
  const isColdBoot = !isReady && solicitudes.length === 0 && resumen.total === 0;
  const solicitudesSeenStorageKey = useMemo(
    () => getSolicitudesSeenStorageKey(organizacionId, user?.email),
    [organizacionId, user?.email]
  );

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
  const visibleSolicitudIds = useMemo(
    () => visibleSolicitudes.map((item) => item.solicitud.id),
    [visibleSolicitudes]
  );
  const selectedVisibleIds = useMemo(
    () => visibleSolicitudIds.filter((id) => selectedIds.has(id)),
    [selectedIds, visibleSolicitudIds]
  );
  const selectedCount = selectedVisibleIds.length;
  const allVisibleSelected =
    visibleSolicitudIds.length > 0 &&
    visibleSolicitudIds.every((id) => selectedIds.has(id));

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

  useEffect(() => {
    if (!canReviewSolicitudes || !isReady || solicitudes.length === 0) {
      return;
    }

    const latestSeenAt = getLatestSolicitudesSeenAt(solicitudes);
    if (latestSeenAt <= 0) {
      return;
    }

    persistSolicitudesSeenAt(solicitudesSeenStorageKey, latestSeenAt);
  }, [canReviewSolicitudes, isReady, solicitudes, solicitudesSeenStorageKey]);

  const handleCopyPublicLink = useCallback(async () => {
    if (!publicRequestUrl || !publicRequestShareText) {
      setFeedback("Primero configura el slug publico en Empresa.");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicRequestShareText);
      setFeedback("Texto y enlace copiados.");
    } catch {
      setFeedback("No pudimos copiar el texto con el enlace.");
    }
  }, [publicRequestShareText, publicRequestUrl]);

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

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((current) => {
      if (current) {
        setSelectedIds(new Set());
      }

      setMenuSolicitudId(null);
      return !current;
    });
  }, []);

  const toggleSelectedId = useCallback((solicitudId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(solicitudId)) {
        next.delete(solicitudId);
      } else {
        next.add(solicitudId);
      }

      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return new Set();
      }

      return new Set([...current, ...visibleSolicitudIds]);
    });
  }, [allVisibleSelected, visibleSolicitudIds]);

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

  const handleConfirmBulkDelete = useCallback(async () => {
    const ids = selectedVisibleIds;

    if (ids.length === 0) {
      return;
    }

    setIsBulkDeleting(true);

    try {
      const deletedCount = await deleteSolicitudes(ids);
      setFeedback(`${deletedCount} solicitud(es) eliminada(s).`);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setIsBulkDeleteModalOpen(false);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "No pudimos eliminar las solicitudes."
      );
    } finally {
      setIsBulkDeleting(false);
    }
  }, [deleteSolicitudes, selectedVisibleIds]);

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
      <PremiumPageSection className={s.desktopHeader}>
        <div>
          <h1 className={s.desktopTitle}>Solicitudes</h1>
          <p className={s.desktopSubtitle}>
            Centraliza los contactos que llegan desde tu página pública.
          </p>
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={s.heroCard}>
        <div className={s.heroTop}>
          <div>
            <span className={s.heroEyebrow}>Solicitudes recibidas</span>
            <strong className={s.heroTotal}>
              {isColdBoot ? (
                <span className={s.heroTotalSkeleton} aria-hidden />
              ) : (
                <>
                  {resumen.total}
                  <span> solicitudes</span>
                </>
              )}
            </strong>
            <p className={s.heroSub}>Recibidas desde tu página pública</p>
          </div>
          <span className={s.todayBadge}>
            {isColdBoot ? <span className={s.todayBadgeSkeleton} aria-hidden /> : `+${resumen.hoy} hoy`}
          </span>
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
          {previewPublicRequestUrl ? (
            <a
              className={s.heroActionSecondary}
              href={previewPublicRequestUrl}
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
          <Link href="/solicitudes/canales" className={`${s.heroActionSecondary} ${s.heroActionWide}`} prefetch={false}>
            <LuQrCode aria-hidden />
            Canales / QR
          </Link>
        </div>
      </PremiumPageSection>

      <OnboardingGuide controller={onboarding} routeKey="solicitudes" />

      <PremiumPageSection className={s.filtersSection}>
        <div className={s.searchBar}>
          <LuSearch aria-hidden className={s.searchIcon} />
          <input
            className={s.searchInput}
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar solicitud"
            disabled={isColdBoot}
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

      {isColdBoot ? (
        <PremiumPageSection className={s.loadingList}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`solicitud-skeleton-${index}`} className={s.loadingCard}>
              <div className={s.loadingCardTop}>
                <span className={s.loadingAvatar} aria-hidden />
                <div className={s.loadingIdentity}>
                  <span className={s.loadingLineStrong} aria-hidden />
                  <span className={s.loadingLine} aria-hidden />
                </div>
                <span className={s.loadingPill} aria-hidden />
              </div>
              <span className={s.loadingLineWide} aria-hidden />
              <span className={s.loadingLine} aria-hidden />
            </div>
          ))}
        </PremiumPageSection>
      ) : solicitudes.length === 0 ? (
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
          <div className={s.listToolbar}>
            <div className={s.listToolbarCopy}>
              <strong>{visibleSolicitudes.length} solicitudes</strong>
              <span>{filtroActivo === "all" ? "Bandeja visible" : FILTRO_LABELS[filtroActivo]}</span>
            </div>
            <button
              className={`${s.inlineSelectButton} ${isSelectionMode ? s.inlineSelectButtonActive : ""}`}
              type="button"
              onClick={toggleSelectionMode}
              disabled={isBulkDeleting}
              aria-pressed={isSelectionMode}
            >
              {isSelectionMode ? "Cancelar" : "Seleccionar"}
            </button>
          </div>

          {isSelectionMode ? (
            <div className={s.selectionBar}>
              <div>
                <strong>{selectedCount} seleccionada(s)</strong>
                <span>{allVisibleSelected ? "Todas las visibles" : "Toca las solicitudes"}</span>
              </div>
              <div className={s.selectionActions}>
                <button className={s.ghostAction} type="button" onClick={toggleSelectAllVisible}>
                  {allVisibleSelected ? "Quitar" : "Todas"}
                </button>
                <button
                  className={s.bulkDeleteBtn}
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  disabled={selectedCount === 0 || isBulkDeleting}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ) : null}

          {visibleSolicitudes.map((item) => (
            <SolicitudCard
              key={item.solicitud.id}
              item={item}
              isUpdating={updatingSolicitudId === item.solicitud.id}
              menuOpen={menuSolicitudId === item.solicitud.id}
              selectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.solicitud.id)}
                stateOptions={SOLICITUD_STATE_OPTIONS}
                filterLabels={FILTRO_LABELS}
                stateBadgeClasses={ESTADO_BADGE_CLASS}
                onCreateQuote={handleCreateQuoteFromSolicitud}
                onToggleMenu={handleToggleMenu}
                onToggleSelected={toggleSelectedId}
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

      {isBulkDeleteModalOpen ? (
        <div className={s.modalOverlay} role="presentation">
          <div
            className={s.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-solicitudes-title"
            aria-describedby="bulk-delete-solicitudes-description"
          >
            <div className={s.modalIconWrap}>
              <LuTrash2 aria-hidden />
            </div>
            <p id="bulk-delete-solicitudes-title" className={s.modalTitle}>
              Eliminar solicitudes
            </p>
            <p id="bulk-delete-solicitudes-description" className={s.modalDescription}>
              Vas a eliminar <strong>{selectedCount}</strong> solicitud(es) seleccionada(s).
            </p>
            <div className={s.modalActions}>
              <button
                className={s.ghostAction}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                type="button"
                disabled={isBulkDeleting}
              >
                Cancelar
              </button>
              <button
                className={s.modalDangerBtn}
                onClick={() => void handleConfirmBulkDelete()}
                type="button"
                disabled={isBulkDeleting || selectedCount === 0}
              >
                {isBulkDeleting ? "Eliminando..." : "Si, eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PremiumPageReveal>
  );
}
