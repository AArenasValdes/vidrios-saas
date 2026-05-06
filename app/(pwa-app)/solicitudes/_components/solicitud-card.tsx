"use client";

import { memo } from "react";
import {
  LuCopy,
  LuEllipsisVertical,
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
};

type SolicitudCardProps = {
  item: SolicitudCardViewModel;
  isUpdating: boolean;
  menuOpen: boolean;
  stateOptions: EstadoSolicitudContacto[];
  filterLabels: Record<EstadoSolicitudContacto, string>;
  stateBadgeClasses: Record<EstadoSolicitudContacto, string>;
  onCreateQuote: (solicitud: SolicitudContacto) => void;
  onToggleMenu: (solicitudId: string) => void;
  onUpdateStatus: (id: string, estado: EstadoSolicitudContacto) => Promise<void>;
  onCopyContact: (value: string) => Promise<void>;
  onCopyMessage: (value: string) => Promise<void>;
};

export const SolicitudCard = memo(function SolicitudCard({
  item,
  isUpdating,
  menuOpen,
  stateOptions,
  filterLabels,
  stateBadgeClasses,
  onCreateQuote,
  onToggleMenu,
  onUpdateStatus,
  onCopyContact,
  onCopyMessage,
}: SolicitudCardProps) {
  return (
    <article className={s.card}>
      <div className={s.cardTop}>
        <div className={s.cardIdentity}>
          <div className={s.avatar}>{item.initials}</div>
          <div className={s.identityCopy}>
            <h2 className={s.name}>{item.solicitud.nombre}</h2>
            <p className={s.workText}>{item.displayType}</p>
          </div>
        </div>

        <div className={s.cardMeta}>
          <span className={`${s.statusPill} ${item.statusClassName}`}>{item.statusLabel}</span>
          <span className={s.dateText}>
            {item.relativeLabel} · {item.calendarLabel}
          </span>
        </div>
      </div>

      <div className={s.infoRows}>
        {item.contactLabel && item.contactHref ? (
          <a href={item.contactHref} className={s.infoRow}>
            {item.contactIcon === "phone" ? <LuPhone aria-hidden /> : <LuMail aria-hidden />}
            <span>{item.contactLabel}</span>
          </a>
        ) : null}

        <div className={s.infoRow}>
          <LuGlobe aria-hidden />
          <span>{item.originLabel}</span>
        </div>
      </div>

      <div className={s.messageBubble}>&ldquo;{item.message}&rdquo;</div>

      <div className={s.cardActions}>
        {item.whatsappUrl ? (
          <a
            href={item.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${s.primaryAction} ${s.primaryWhatsappAction}`}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <LuMessageCircleMore aria-hidden />
            Contactar por WhatsApp
          </a>
        ) : null}

        <button
          type="button"
          className={
            item.whatsappUrl
              ? `${s.secondaryAction} ${s.secondaryBlueAction}`
              : s.primaryAction
          }
          onClick={() => onCreateQuote(item.solicitud)}
        >
          <LuFilePlus2 aria-hidden />
          Crear cotizacion
        </button>

        {!item.whatsappUrl && item.contactLabel && item.contactHref ? (
          <a href={item.contactHref} className={s.iconAction}>
            {item.contactIcon === "phone" ? <LuPhone aria-hidden /> : <LuMail aria-hidden />}
          </a>
        ) : !item.whatsappUrl ? (
          <button type="button" className={s.iconAction} disabled>
            <LuPhone aria-hidden />
          </button>
        ) : null}

        <div className={s.menuWrap}>
          <button
            type="button"
            className={`${s.iconAction} ${s.menuTrigger}`}
            data-solicitud-menu-trigger="true"
            onClick={() => onToggleMenu(item.solicitud.id)}
            disabled={isUpdating}
          >
            <LuEllipsisVertical aria-hidden />
          </button>

          {menuOpen ? (
            <div className={s.menuPanel} data-solicitud-menu="true">
              <div className={s.menuSectionLabel}>Cambiar estado</div>
              {stateOptions.map((estado) => (
                <button
                  key={estado}
                  type="button"
                  className={`${s.menuAction} ${
                    item.solicitud.estado === estado ? s.menuActionActive : ""
                  }`}
                  onClick={() => void onUpdateStatus(item.solicitud.id, estado)}
                >
                  <span
                    className={`${s.menuStatusDot} ${stateBadgeClasses[estado]}`}
                    aria-hidden
                  />
                  {estado === "cerrada" ? "Con cotizacion" : filterLabels[estado]}
                </button>
              ))}
              <div className={s.menuDivider} />
              {item.solicitud.contacto ? (
                <button
                  type="button"
                  className={s.menuAction}
                  onClick={() => void onCopyContact(item.solicitud.contacto!)}
                >
                  <LuCopy aria-hidden />
                  Copiar contacto
                </button>
              ) : null}
              <button
                type="button"
                className={s.menuAction}
                onClick={() => void onCopyMessage(item.message)}
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
});
