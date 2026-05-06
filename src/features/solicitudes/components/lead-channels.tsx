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
  LuScanLine,
} from "react-icons/lu";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { resolvePublicAppUrl } from "@/utils/public-app-url";

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
  const baseUrl = resolvePublicAppUrl();

  const channels = useMemo<ChannelDefinition[]>(
    () => [
      {
        id: "direct",
        label: "Link directo",
        description: "Comparte este enlace donde quieras.",
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
        description: "Pensado para perfil o publicaciones.",
        utmSource: "facebook",
        utmMedium: "perfil",
        origin: "facebook",
        icon: LuFacebook,
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        description: "Util para respuestas rapidas, estado o mensaje.",
        utmSource: "whatsapp",
        utmMedium: "mensaje",
        origin: "whatsapp",
        icon: LuMessageCircle,
      },
      {
        id: "qr",
        label: "QR fisico",
        description: "Ideal para camioneta, tarjeta o letrero.",
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
    return <div className={s.loading}>Cargando configuracion de captacion...</div>;
  }

  const qrChannel = channels.find((channel) => channel.id === "qr");
  const qrUrl = qrChannel ? buildUrl(qrChannel) : "";

  return (
    <div className={s.root}>
      <section className={s.overviewCard}>
        <div className={s.overviewTop}>
          <div className={s.overviewCopy}>
            <span className={s.sectionLabel}>Base comercial activa</span>
            <strong>{profile?.empresaNombre || "Tu empresa"}</strong>
            <p>
              Todos los links usan tu pagina publica y dejan origen marcado para
              que la solicitud llegue ordenada al inbox comercial.
            </p>
          </div>
          <div className={s.slugBadge}>/{slug}</div>
        </div>

        <div className={s.overviewGrid}>
          <div className={s.infoCard}>
            <span className={s.infoLabel}>Link base</span>
            <code className={s.infoValue}>{`${baseUrl}/solicitud/${slug}`}</code>
          </div>
          <div className={s.infoCard}>
            <span className={s.infoLabel}>Tracking</span>
            <code className={s.infoValue}>origen + utm_source + utm_medium</code>
          </div>
        </div>
      </section>

      <section className={s.channelsSection}>
        <div className={s.channelsHeader}>
          <div>
            <span className={s.sectionLabel}>Links por canal</span>
            <h2 className={s.sectionTitle}>Comparte segun contexto real</h2>
          </div>
          <p className={s.sectionText}>
            Cada boton copia URL completa lista para pegar y medir.
          </p>
        </div>

        <div className={s.channelsGrid}>
          {channels.map((channel) => {
            const url = buildUrl(channel);
            const Icon = channel.icon;
            const isCopied = copiedId === channel.id;

            return (
              <article key={channel.id} className={s.channelCard}>
                <div className={s.channelHeader}>
                  <div className={s.channelIconWrap}>
                    <Icon className={s.channelIcon} aria-hidden />
                  </div>
                  <div className={s.channelCopy}>
                    <div className={s.channelTopRow}>
                      <h3 className={s.channelLabel}>{channel.label}</h3>
                      <span className={s.originBadge}>origen={channel.origin}</span>
                    </div>
                    <p className={s.channelDescription}>{channel.description}</p>
                  </div>
                </div>

                <div className={s.linkBox}>
                  <span className={s.linkLabel}>Link listo</span>
                  <code className={s.linkValue}>{url}</code>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopy(channel.id, url)}
                  className={s.copyButton}
                  aria-label={`Copiar link de ${channel.label}`}
                >
                  {isCopied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                  {isCopied ? "Copiado" : "Copiar link"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {qrChannel ? (
        <section className={s.qrCard}>
          <div className={s.qrBody}>
            <div className={s.qrCopy}>
              <span className={s.sectionLabel}>QR listo para imprimir</span>
              <h2 className={s.sectionTitle}>Captacion offline con tracking real</h2>
              <p className={s.sectionText}>
                Este QR abre tu landing con <code>origen=qr</code> y{" "}
                <code>utm_source=qr</code> para medir tarjeta, camioneta, vitrina
                o letrero.
              </p>

              <div className={s.qrHints}>
                <div className={s.qrHint}>
                  <LuScanLine aria-hidden />
                  <span>Usa PNG nuevo cada vez que cambies slug o dominio.</span>
                </div>
                <div className={s.qrHint}>
                  <LuLink aria-hidden />
                  <span>Si compartes QR, no pierdes origen en solicitudes.</span>
                </div>
              </div>

              <div className={s.qrActions}>
                <button
                  type="button"
                  onClick={() => void handleCopy("qr", qrUrl)}
                  className={s.secondaryAction}
                >
                  {copiedId === "qr" ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                  {copiedId === "qr" ? "Copiado" : "Copiar link QR"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadQR(qrUrl)}
                  className={s.primaryAction}
                >
                  <LuDownload aria-hidden />
                  Descargar QR PNG
                </button>
              </div>
            </div>

            <div className={s.qrPreviewWrap}>
              <div className={s.qrPreview}>
                <QRCode
                  value={qrUrl}
                  size={208}
                  data-qr-url={qrUrl}
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
