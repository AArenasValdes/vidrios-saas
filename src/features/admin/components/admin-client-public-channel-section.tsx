"use client";

import Link from "next/link";
import { useState } from "react";

import type { AdminClientDetail } from "@/features/admin/types/admin-client";
import s from "./admin-client-public-channel-section.module.css";

type AdminClientPublicChannelSectionProps = {
  client: AdminClientDetail;
  highlightSolicitudId?: string | null;
};

function formatBool(value: boolean) {
  return value ? "Sí" : "No";
}

export function AdminClientPublicChannelSection({
  client,
  highlightSolicitudId = null,
}: AdminClientPublicChannelSectionProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const channel = client.publicChannel;

  async function copyPublicLink() {
    if (!channel.publicPageUrl) return;
    const absolutePublicUrl = `${window.location.origin}${channel.publicPageUrl}`;
    try {
      await navigator.clipboard.writeText(absolutePublicUrl);
      setCopyFeedback("Enlace copiado.");
    } catch {
      setCopyFeedback("No pudimos copiar el enlace.");
    }
  }

  return (
    <section className={s.panel} id="canal-publico">
      <div className={s.header}>
        <h2>Canal público</h2>
        <span className={s.statusBadge}>{channel.recommendedStatus}</span>
      </div>

      <dl className={s.grid}>
        <div>
          <dt>Página pública</dt>
          <dd>{channel.pageStatusLabel}</dd>
        </div>
        <div>
          <dt>URL pública</dt>
          <dd>{channel.slug ? `/solicitud/${channel.slug}` : "Sin slug configurado"}</dd>
        </div>
        <div>
          <dt>WhatsApp</dt>
          <dd>{formatBool(channel.whatsappConfigured)}</dd>
        </div>
        <div>
          <dt>Formulario activo</dt>
          <dd>{formatBool(channel.formActive)}</dd>
        </div>
        <div>
          <dt>Datos de empresa</dt>
          <dd>{formatBool(channel.companyDataComplete)}</dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>{formatBool(channel.scheduleConfigured)}</dd>
        </div>
        <div>
          <dt>Solicitudes totales</dt>
          <dd>{channel.solicitudesTotal}</dd>
        </div>
        <div>
          <dt>Últimos 30 días</dt>
          <dd>{channel.solicitudesLast30Days}</dd>
        </div>
        <div>
          <dt>Última solicitud</dt>
          <dd>
            {channel.lastSolicitanteNombre
              ? `${channel.lastSolicitanteNombre}${channel.lastSolicitudAt ? ` · ${channel.recentSolicitudes[0]?.relativeAt ?? ""}` : ""}`
              : "Sin solicitudes"}
          </dd>
        </div>
        {channel.solicitudesPending > 0 ? (
          <div>
            <dt>Pendientes</dt>
            <dd>{channel.solicitudesPending}</dd>
          </div>
        ) : null}
        <div>
          <dt>Conversión</dt>
          <dd>
            {channel.quotesFromRequestsAvailable
              ? "Disponible"
              : "Datos de conversión aún no disponibles"}
          </dd>
        </div>
      </dl>

      {channel.recentSolicitudes.length > 0 ? (
        <ul className={s.list}>
          {channel.recentSolicitudes.slice(0, 4).map((item) => (
            <li
              key={item.id}
              className={
                highlightSolicitudId === item.id ? `${s.listItem} ${s.listItemHighlight}` : s.listItem
              }
            >
              <strong>{item.solicitanteNombre}</strong>
              <span>
                {item.estadoLabel} · {item.relativeAt}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={s.actions}>
        {channel.publicPageUrl ? (
          <Link href={channel.publicPageUrl} className={s.secondaryBtn} target="_blank">
            Abrir página
          </Link>
        ) : null}
        {channel.publicPageUrl ? (
          <button type="button" className={s.secondaryBtn} onClick={() => void copyPublicLink()}>
            Copiar enlace
          </button>
        ) : null}
        <Link href={`/admin/clientes/${client.organizationId}#canal-publico`} className={s.secondaryBtn}>
          Ver solicitudes
        </Link>
        {client.quickLinks.whatsappUrl ? (
          <a
            href={client.quickLinks.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className={s.secondaryBtn}
          >
            Abrir WhatsApp
          </a>
        ) : null}
      </div>
      {copyFeedback ? <p className={s.feedback}>{copyFeedback}</p> : null}
    </section>
  );
}
