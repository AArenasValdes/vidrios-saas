"use client";

import { useState, useCallback } from "react";
import QRCode from "react-qr-code";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { LuCopy, LuCheck, LuDownload, LuQrCode, LuLink, LuInstagram, LuFacebook, LuMessageCircle } from "react-icons/lu";
import s from "./lead-channels.module.css";

export function LeadChannels() {
  const { profile, isReady } = useOrganizationProfile();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const slug = profile?.solicitudPublicaSlug;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://ventorap.cl";

  const channels = [
    {
      id: "direct",
      label: "Link directo",
      description: "Comparte este link en cualquier lugar",
      utmSource: "link_directo",
      utmMedium: "web",
      icon: LuLink,
    },
    {
      id: "instagram",
      label: "Instagram",
      description: "Link para tu bio de Instagram",
      utmSource: "instagram",
      utmMedium: "bio",
      icon: LuInstagram,
    },
    {
      id: "facebook",
      label: "Facebook",
      description: "Link para tu perfil de Facebook",
      utmSource: "facebook",
      utmMedium: "perfil",
      icon: LuFacebook,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      description: "Link para compartir por WhatsApp",
      utmSource: "whatsapp",
      utmMedium: "mensaje",
      icon: LuMessageCircle,
    },
    {
      id: "qr",
      label: "QR físico",
      description: "QR para tarjetas, camionetas y letreros",
      utmSource: "qr",
      utmMedium: "offline",
      icon: LuQrCode,
    },
  ];

  const buildUrl = useCallback(
    (source: string, medium: string) => {
      if (!slug) return "";
      const url = new URL(`/solicitud/${slug}`, baseUrl);
      url.searchParams.set("utm_source", source);
      url.searchParams.set("utm_medium", medium);
      return url.toString();
    },
    [slug, baseUrl]
  );

  const handleCopy = useCallback(
    async (id: string, url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(id);
        window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
      } catch {
        // ignore
      }
    },
    []
  );

  const handleDownloadQR = useCallback(
    (url: string) => {
      const svg = document.querySelector(`[data-qr-url="${url}"]`);
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg as unknown as Node);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = 512;
        canvas.height = 512;
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 512, 512);
          ctx.drawImage(img, 0, 0, 512, 512);
          const pngUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.download = `ventora-qr-${slug}.png`;
          link.href = pngUrl;
          link.click();
        }
      };

      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;
    },
    [slug]
  );

  if (!isReady || !slug) {
    return (
      <div className={s.loading}>
        Cargando configuración de captación...
      </div>
    );
  }

  return (
    <div className={s.root}>
      <h2 className={s.title}>Captación de clientes</h2>
      <p className={s.subtitle}>
        Comparte tu link o QR para recibir solicitudes desde diferentes canales.
      </p>

      <div className={s.channelsList}>
        {channels.map((channel) => {
          const url = buildUrl(channel.utmSource, channel.utmMedium);
          const Icon = channel.icon;

          return (
            <div key={channel.id} className={ s.channelCard }>
              <div className={ s.channelHeader }>
                <Icon className={ s.channelIcon } aria-hidden />
                <div>
                  <h3 className={ s.channelLabel }>{channel.label}</h3>
                  <p className={ s.channelDescription }>{channel.description}</p>
                </div>
              </div>

              <div className={ s.linkRow }>
                <input
                  type="text"
                  readOnly
                  value={url}
                  className={ s.linkInput }
                  aria-label={`Link para ${channel.label}`}
                />
                <button
                  type="button"
                  onClick={() => handleCopy(channel.id, url)}
                  className={ s.copyButton }
                  aria-label="Copiar link"
                >
                  {copiedId === channel.id ? (
                    <LuCheck className={ s.copyIcon } aria-hidden />
                  ) : (
                    <LuCopy className={ s.copyIcon } aria-hidden />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {channels
        .filter((c) => c.id === "qr")
        .map((qrChannel) => {
          const url = buildUrl(qrChannel.utmSource, qrChannel.utmMedium);
          return (
            <div key={qrChannel.id} className={ s.qrCard }>
              <div className={ s.qrHeader }>
                <LuQrCode className={ s.qrIcon } aria-hidden />
                <h3 className={ s.qrTitle }>QR para imprimir</h3>
              </div>
              <p className={ s.qrDescription }>
                Usa este QR en tarjetas, camionetas, volantes o letreros para
                recibir solicitudes automáticamente.
              </p>
              <div className={ s.qrPreview }>
                <QRCode
                  value={url}
                  size={200}
                  data-qr-url={url}
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </div>
              <button
                type="button"
                onClick={() => handleDownloadQR(url)}
                className={ s.downloadButton }
              >
                <LuDownload aria-hidden />
                Descargar QR (PNG)
              </button>
            </div>
          );
        })}
    </div>
  );
}
