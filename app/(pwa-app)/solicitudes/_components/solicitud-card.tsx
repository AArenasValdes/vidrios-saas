"use client";

import { memo } from "react";
import {
  LuCopy,
  LuEllipsisVertical,
  LuEye,
  LuFilePlus2,
  LuGlobe,
  LuMail,
  LuMessageCircleMore,
  LuPhone,
  LuText,
} from "react-icons/lu";

import type {
  EstadoSolicitudContacto,
  SolicitudContacto,
} from "@/features/solicitudes/types/solicitud-contacto";

import s from "../page.module.css";

type SolicitudCardViewModel = {
  solicitud: SolicitudContacto;
  initials: string;
  displayType: string;
  statusLabel: string;
  statusClassName: string;
  relativeLabel: string;
  calendarLabel: string;
  contactLabel: string | null;
  contactHref: string | null;
  contactIcon: "phone" | "mail" | null;
  originLabel: string;
  message: string;
  whatsappUrl: string | null;
  hasQuote: boolean;
};

type SolicitudCardProps = {
  item: SolicitudCardViewModel;
  isUpdating: boolean;
  isOpeningQuote?: boolean;
  menuOpen: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  stateOptions: EstadoSolicitudContacto[];
  filterLabels: Record<EstadoSolicitudContacto, string>;
  stateBadgeClasses: Record<EstadoSolicitudContacto, string>;
  onCreateQuote: (solicitud: SolicitudContacto) => void;
  onViewQuote: (solicitud: SolicitudContacto) => void;
  onToggleMenu: (solicitudId: string) => void;
  onToggleSelected?: (solicitudId: string) => void;
  onUpdateStatus: (id: string, estado: EstadoSolicitudContacto) => Promise<void>;
  onCopyContact: (value: string) => Promise<void>;
  onCopyMessage: (value: string) => Promise<void>;
};

const GENERIC_ORIGINS = new Set(["Landing", "Pagina publica", "Página pública"]);

export const SolicitudCard = memo(function SolicitudCard({
  item,
  isUpdating,
  isOpeningQuote = false,
  menuOpen,
  selectionMode = false,
  isSelected = false,
  stateOptions,
  filterLabels,
  stateBadgeClasses,
  onCreateQuote,
  onViewQuote,
  onToggleMenu,
  onToggleSelected,
  onUpdateStatus,
  onCopyContact,
  onCopyMessage,
}: SolicitudCardProps) {
  const handleSelect = () => {
    onToggleSelected?.(item.solicitud.id);
  };

  const showNamedOrigin = !GENERIC_ORIGINS.has(item.originLabel);
  const showContactRow = Boolean(item.contactLabel && item.contactHref) && !item.whatsappUrl;
  const showMetaRow = showContactRow || showNamedOrigin;
  const quoteActionLabel = item.hasQuote ? "Ver cotización" : "Crear cotización";

  return (
    <article className={`${s.card}${selectionMode ? ` ${s.cardSelectable}` : ""}${isSelected ? ` ${s.cardSelected}` : ""}`}>
      {selectionMode ? (
        <button
          className={s.cardSelectButton}
          type="button"
          onClick={handleSelect}
          aria-pressed={isSelected}
          aria-label={`Seleccionar consulta de ${item.solicitud.nombre}`}
        >
          <span className={`${s.selectionCircle} ${isSelected ? s.selectionCircleActive : ""}`} aria-hidden />
        </button>
      ) : null}
      <div className={s.cardTop}>
        <div className={s.cardIdentity}>
          <div className={s.avatar} aria-hidden>
            {item.initials}
          </div>
          <div className={s.identityCopy}>
            <h2 className={s.name}>{item.solicitud.nombre}</h2>
            <p className={s.workText}>{item.displayType}</p>
          </div>
        </div>

        <div className={s.cardMeta}>
          <span className={`${s.statusPill} ${item.statusClassName}`}>{item.statusLabel}</span>
          <span className={s.dateText}>
            {item.relativeLabel}
            <span className={s.dateCalendar}> · {item.calendarLabel}</span>
          </span>
        </div>
      </div>

      {showMetaRow ? (
        <div className={s.infoRows}>
          {showContactRow && item.contactLabel && item.contactHref ? (
            <a href={item.contactHref} className={s.infoRow}>
              {item.contactIcon === "phone" ? <LuPhone aria-hidden /> : <LuMail aria-hidden />}
              <span>{item.contactLabel}</span>
            </a>
          ) : null}

          {showNamedOrigin ? (
            <div className={s.infoRow}>
              <LuGlobe aria-hidden />
              <span>{item.originLabel}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className={s.messageBubble}>&ldquo;{item.message}&rdquo;</p>

      <div className={s.cardActions}>
        {selectionMode ? (
          <button
            type="button"
            className={s.primaryAction}
            onClick={handleSelect}
            aria-pressed={isSelected}
          >
            {isSelected ? "Seleccionada" : "Seleccionar"}
          </button>
        ) : (
          <button
            type="button"
            className={s.primaryAction}
            onClick={() =>
              item.hasQuote ? onViewQuote(item.solicitud) : onCreateQuote(item.solicitud)
            }
            disabled={isOpeningQuote}
          >
            {item.hasQuote ? <LuEye aria-hidden /> : <LuFilePlus2 aria-hidden />}
            {isOpeningQuote ? "Abriendo..." : quoteActionLabel}
          </button>
        )}

        {!selectionMode && item.whatsappUrl ? (
          <a
            href={item.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={s.whatsappAction}
            aria-label={`WhatsApp a ${item.solicitud.nombre}`}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <LuMessageCircleMore aria-hidden />
            WhatsApp
          </a>
        ) : null}

        {!selectionMode && !item.whatsappUrl && item.contactLabel && item.contactHref ? (
          <a
            href={item.contactHref}
            className={s.iconAction}
            aria-label={item.contactIcon === "mail" ? `Escribir a ${item.solicitud.nombre}` : `Llamar a ${item.solicitud.nombre}`}
          >
            {item.contactIcon === "phone" ? <LuPhone aria-hidden /> : <LuMail aria-hidden />}
          </a>
        ) : null}

        {!selectionMode ? (
          <div className={s.menuWrap}>
            <button
              type="button"
              className={`${s.iconAction} ${s.menuTrigger}`}
              data-solicitud-menu-trigger="true"
              onClick={() => onToggleMenu(item.solicitud.id)}
              disabled={isUpdating}
              aria-label={`Más acciones para ${item.solicitud.nombre}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <LuEllipsisVertical aria-hidden />
            </button>

            {menuOpen ? (
              <div className={s.menuPanel} data-solicitud-menu="true" role="menu">
                <div className={s.menuSectionLabel}>Cambiar estado</div>
                {stateOptions.map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    role="menuitem"
                    className={`${s.menuAction} ${
                      item.solicitud.estado === estado ? s.menuActionActive : ""
                    }`}
                    onClick={() => void onUpdateStatus(item.solicitud.id, estado)}
                  >
                    <span
                      className={`${s.menuStatusDot} ${stateBadgeClasses[estado]}`}
                      aria-hidden
                    />
                    {filterLabels[estado]}
                  </button>
                ))}
                <div className={s.menuDivider} />
                {item.solicitud.contacto ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={s.menuAction}
                    onClick={() => void onCopyContact(item.solicitud.contacto!)}
                  >
                    <LuCopy aria-hidden />
                    Copiar contacto
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className={s.menuAction}
                  onClick={() => void onCopyMessage(item.message)}
                >
                  <LuText aria-hidden />
                  Copiar mensaje
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
});
