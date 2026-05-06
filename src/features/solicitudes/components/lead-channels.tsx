"use client";

import { useCallback, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import {
  LuCheck,
  LuCopy,
  LuDownload,
  LuFacebook,
  LuInstagram,
  LuLink,
  LuMessageCircle,
  LuQrCode,
} from "react-icons/lu";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";

import s from "./lead-channels.module.css";

type ChannelDefinition = {
  id: string;
  label: string;
  description: string;
  utmSource: string;
  utmMedium: string;
  origin: string;
  icon: typeof LuLink;
};

export function LeadChannels() {
  const { profile, isReady } = useOrganizationProfile();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const slug = profile?.solicitudPublicaSlug;
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://ventorap.cl";

  const channels = useMemo<ChannelDefinition[]>(
    () => [
      {
        id: "direct",
        label: "Link directo",
        description: "Comparte este enlace en cualquier lugar.",
        utmSource: "link_directo",
        utmMedium: "web",
        origin: "link_directo",
        icon: LuLink,
      },
      {
        id: "instagram",
        label: "Instagram",
        description: "Listo para bio o historias destacadas.",
        utmSource: "instagram",
        utmMedium: "bio",
        origin: "instagram",
        icon: LuInstagram,
      },
      {
        id: "facebook",
        label: "Facebook",
        description: "Úsalo en tu perfil o publicaciones.",
        utmSource: "facebook",
        utmMedium: "perfil",
        origin: "facebook",
        icon: LuFacebook,
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        description: "Para mensajes, estados o respuestas rápidas.",
        utmSource: "whatsapp",
        utmMedium: "mensaje",
        origin: "whatsapp",
        icon: LuMessageCircle,
      },
      {
        id: "qr",
        label: "QR físico",
        description: "Tarjetas, camionetas, letreros o vitrina.",
        utmSource: "qr",
        utmMedium: "offline",
        origin: "qr",
        icon: LuQrCode,
      },
    ],
    []
  );

  const buildUrl = useCallback(
    (channel: Pick<ChannelDefinition, "origin" | "utmMedium" | "utmSource">) => {
      if (!slug) {
        return "";
      }

      const url = new URL(`/solicitud/${slug}`, baseUrl);
      url.searchParams.set("origen", channel.origin);
      url.searchParams.set("utm_source", channel.utmSource);
      url.searchParams.set("utm_medium", channel.utmMedium);
      return url.toString();
    },
    [baseUrl, slug]
  );

  const handleCopy = useCallback(async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    } catch {
      return;
    }
  }, []);

  const handleDownloadQR = useCallback(
    (url: string) => {
      const svg = document.querySelector(`[data-qr-url="${url}"]`);

      if (!svg) {
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg as unknown as Node);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const image = new Image();

      image.onload = () => {
        canvas.width = 512;
        canvas.height = 512;

        if (context) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, 512, 512);
          context.drawImage(image, 0, 0, 512, 512);

          const link = document.createElement("a");
          link.download = `ventora-qr-${slug}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }

        URL.revokeObjectURL(svgUrl);
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
      };

      image.src = svgUrl;
    },
    [slug]
  );

  if (!isReady || !slug) {
    return <div className={s.loading}>Cargando configuración de captación...</div>;
  }

  const qrChannel = channels.find((channel) => channel.id === "qr");
  const qrUrl = qrChannel ? buildUrl(qrChannel) : "";

  return (
    <div className={s.root}>
      <h2 className={s.title}>Captación de clientes</h2>
      <p className={s.subtitle}>
        Copia enlaces listos por canal y descarga un QR que ya llega marcado como
        origen QR.
      </p>

      <div className={s.channelsList}>
        {channels.map((channel) => {
          const url = buildUrl(channel);
          const Icon = channel.icon;

          return (
            <article key={channel.id} className={s.channelCard}>
              <div className={s.channelHeader}>
                <Icon className={s.channelIcon} aria-hidden />
                <div>
                  <h3 className={s.channelLabel}>{channel.label}</h3>
                  <p className={s.channelDescription}>{channel.description}</p>
                </div>
              </div>

              <div className={s.linkRow}>
                <input
                  type="text"
                  readOnly
                  value={url}
                  className={s.linkInput}
                  aria-label={`Link para ${channel.label}`}
                />
                <button
                  type="button"
                  onClick={() => void handleCopy(channel.id, url)}
                  className={s.copyButton}
                  aria-label={`Copiar link de ${channel.label}`}
                >
                  {copiedId === channel.id ? (
                    <LuCheck className={s.copyIcon} aria-hidden />
                  ) : (
                    <LuCopy className={s.copyIcon} aria-hidden />
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {qrChannel ? (
        <section className={s.qrCard}>
          <div className={s.qrHeader}>
            <LuQrCode className={s.qrIcon} aria-hidden />
            <h3 className={s.qrTitle}>QR para imprimir</h3>
          </div>

          <p className={s.qrDescription}>
            Este QR abre tu landing con <code>origen=qr</code> y{" "}
            <code>utm_source=qr</code> para rastrear bien cada lead.
          </p>

          <div className={s.qrPreview}>
            <QRCode
              value={qrUrl}
              size={200}
              data-qr-url={qrUrl}
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>

          <button
            type="button"
            onClick={() => handleDownloadQR(qrUrl)}
            className={s.downloadButton}
          >
            <LuDownload aria-hidden />
            Descargar QR (PNG)
          </button>
        </section>
      ) : null}
    </div>
  );
}
