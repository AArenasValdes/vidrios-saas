"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import QRCode from "react-qr-code";
import {
  LuCheck,
  LuChevronDown,
  LuCopy,
  LuDownload,
  LuShare2,
} from "react-icons/lu";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useSharePublicPage } from "@/features/solicitudes/hooks/useSharePublicPage";
import { useLeadChannels } from "@/features/solicitudes/hooks/useLeadChannels";
import { buildPublicRequestShareClipboardText } from "@/features/solicitudes/services/public-request-share.service";

import s from "./lead-channels.module.css";

type ChannelId = "direct" | "instagram" | "facebook" | "whatsapp" | "qr";

function getDisplayUrl(baseUrl: string, slug: string) {
  try {
    const host = new URL(baseUrl).host;
    return `${host}/solicitud/${slug}`;
  } catch {
    return `${baseUrl.replace(/\/$/, "")}/solicitud/${slug}`;
  }
}

export function LeadChannels(props?: {
  onChannelDistributed?: (input: {
    completionSource: string;
    metadataJson?: Record<string, unknown>;
  }) => void | Promise<void>;
}) {
  const { profile, isReady } = useOrganizationProfile();
  const { slug, channels, baseUrl } = useLeadChannels();
  const { sharePage, isCopied, copiedFeedback } = useSharePublicPage();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const isPagePublished = Boolean(profile?.isPublished);
  const empresaNombre = profile?.empresaNombre;
  const directUrl = channels.find((channel) => channel.id === "link_directo")?.url ?? "";
  const whatsappUrl = channels.find((channel) => channel.id === "whatsapp")?.url ?? "";
  const qrUrl = channels.find((channel) => channel.id === "qr")?.url ?? "";

  const markDistributed = useCallback(
    (completionSource: string, url: string, channel: ChannelId) => {
      void props?.onChannelDistributed?.({
        completionSource,
        metadataJson: {
          route: "/solicitudes/canales",
          actionId: channel,
          url,
          channel,
        },
      });
    },
    [props]
  );

  const handleShare = useCallback(
    async (id: string, url: string, channel: ChannelId) => {
      if (!url) {
        return;
      }

      const result = await sharePage(
        {
          url,
          empresaNombre,
          channel,
        },
        id
      );

      if (result === "shared" || result === "copied") {
        markDistributed(`solicitudes_canales_share_${id}`, url, channel);
      }
    },
    [empresaNombre, markDistributed, sharePage]
  );

  const handleCopy = useCallback(
    async (id: string, url: string, channel: ChannelId) => {
      if (!url) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          buildPublicRequestShareClipboardText({
            url,
            empresaNombre,
            channel,
          })
        );
        setCopiedId(id);
        markDistributed(`solicitudes_canales_copy_${id}`, url, channel);
        window.setTimeout(() => {
          setCopiedId((current) => (current === id ? null : current));
        }, 2000);
      } catch {
        return;
      }
    },
    [empresaNombre, markDistributed]
  );

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
          markDistributed("solicitudes_canales_download_qr", url, "qr");
        }

        URL.revokeObjectURL(svgUrl);
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
      };

      image.src = svgUrl;
    },
    [markDistributed, slug]
  );

  const handleWhatsappShare = useCallback(
    (url: string) => {
      if (typeof window === "undefined" || !url) {
        return;
      }

      const text = encodeURIComponent(
        buildPublicRequestShareClipboardText({
          url,
          empresaNombre,
          channel: "whatsapp",
        })
      );
      window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
      markDistributed("solicitudes_canales_whatsapp_share", url, "whatsapp");
    },
    [empresaNombre, markDistributed]
  );

  if (!isReady) {
    return <div className={s.loading}>Cargando tu página...</div>;
  }

  const displayUrl = slug ? getDisplayUrl(baseUrl, slug) : null;
  const publicPageUrl = slug ? new URL(`/solicitud/${slug}`, baseUrl).toString() : null;
  const previewPageUrl = publicPageUrl
    ? `${publicPageUrl}${publicPageUrl.includes("?") ? "&" : "?"}preview=1`
    : null;
  const shareCopied = isCopied("page-share");
  const socialCopied = isCopied("social-share");
  const qrShareCopied = isCopied("qr-share");

  return (
    <div className={s.root}>
      <div className={s.workspace}>
        <div className={s.mainColumn}>
          <section className={s.publicCard} data-onboarding-target="canales-public-card">
            <div className={s.publicTop}>
              <div className={s.publicCopy}>
                <div className={s.publicHeader}>
                  <span className={s.publicTitle}>Tu página comercial</span>
                  {isPagePublished ? (
                    <span className={s.statusPill}>
                      <LuCheck aria-hidden />
                      Activa
                    </span>
                  ) : (
                    <span className={s.statusPending}>Configuración pendiente</span>
                  )}
                </div>
                {isPagePublished ? (
                  <>
                    <strong>{profile?.empresaNombre || "Tu empresa"}</strong>
                    {displayUrl ? <span className={s.urlLine}>{displayUrl}</span> : null}
                  </>
                ) : (
                  <p className={s.publicHint}>
                    Configúrala para que tus clientes puedan enviarte solicitudes desde tu
                    propio enlace.
                  </p>
                )}
              </div>

              <div className={s.publicActions} data-onboarding-target="canales-share-actions">
                {isPagePublished && directUrl ? (
                  <button
                    type="button"
                    className={s.primaryAction}
                    onClick={() => void handleShare("page-share", directUrl, "direct")}
                  >
                    <LuShare2 aria-hidden />
                    {shareCopied ? copiedFeedback : "Compartir página"}
                  </button>
                ) : (
                  <Link
                    href="/configuracion/pagina-venta"
                    className={s.primaryAction}
                    prefetch={false}
                  >
                    Configurar mi página
                  </Link>
                )}
              </div>
            </div>

            <div className={s.publicLinks}>
              {isPagePublished && directUrl ? (
                <>
                  <button
                    type="button"
                    className={s.inlineLink}
                    onClick={() => void handleCopy("page-copy", directUrl, "direct")}
                  >
                    {copiedId === "page-copy" ? copiedFeedback : "Copiar enlace"}
                  </button>
                  <a
                    className={s.inlineLink}
                    href={publicPageUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver página
                  </a>
                </>
              ) : slug ? (
                <a
                  className={s.inlineLink}
                  href={previewPageUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver vista previa
                </a>
              ) : (
                <Link
                  href="/configuracion/pagina-venta"
                  className={s.inlineLink}
                  prefetch={false}
                >
                  Ver vista previa
                </Link>
              )}
            </div>
          </section>

          {directUrl ? (
            <section className={s.channelsPanel}>
              <div className={s.sectionIntro}>
                <h2 className={s.sectionTitle}>Formas de compartir</h2>
              </div>

              <div className={s.shareList}>
                <div className={s.shareRow}>
                  <div className={s.shareCopy}>
                    <h3 className={s.shareLabel}>WhatsApp</h3>
                    <p className={s.shareDescription}>
                      Enviar el enlace directamente a un cliente.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={s.rowAction}
                    onClick={() => handleWhatsappShare(whatsappUrl)}
                    aria-label="Enviar por WhatsApp"
                  >
                    Enviar
                  </button>
                </div>

                <div className={s.shareRow}>
                  <div className={s.shareCopy}>
                    <h3 className={s.shareLabel}>Redes sociales</h3>
                    <p className={s.shareDescription}>Instagram, Facebook y otras.</p>
                  </div>
                  <button
                    type="button"
                    className={s.rowAction}
                    onClick={() => void handleShare("social-share", directUrl, "direct")}
                  >
                    {socialCopied ? copiedFeedback : "Compartir"}
                  </button>
                </div>

                <div className={s.shareRow}>
                  <div className={s.shareCopy}>
                    <h3 className={s.shareLabel}>Copiar enlace</h3>
                    <p className={s.shareDescription}>Para pegarlo donde quieras.</p>
                  </div>
                  <button
                    type="button"
                    className={s.rowAction}
                    onClick={() => void handleCopy("direct-copy", directUrl, "direct")}
                  >
                    {copiedId === "direct-copy" ? (
                      <>
                        <LuCheck aria-hidden />
                        {copiedFeedback}
                      </>
                    ) : (
                      <>
                        <LuCopy aria-hidden />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className={s.trackingHint}>
                Ventora puede registrar desde qué canal llegó cada consulta.
              </p>
            </section>
          ) : null}
        </div>

        {qrUrl ? (
          <aside className={s.sideColumn}>
            <section className={`${s.qrCard} ${qrOpen ? s.qrCardOpen : ""}`} id="qr-imprimir">
              <button
                type="button"
                className={s.qrToggle}
                onClick={() => setQrOpen((current) => !current)}
                aria-expanded={qrOpen}
              >
                <span className={s.qrToggleCopy}>
                  <span className={s.qrToggleTitle}>QR para imprimir</span>
                  <span className={s.qrToggleText}>
                    Úsalo en tu local, vehículo o material impreso.
                  </span>
                </span>
                <span className={s.qrToggleAction}>
                  {qrOpen ? "Ocultar" : "Ver QR"}
                  <LuChevronDown aria-hidden className={qrOpen ? s.qrChevronOpen : ""} />
                </span>
              </button>

              <div className={s.qrBody}>
                <div className={s.qrPreviewWrap}>
                  <div className={s.qrPreview}>
                    <QRCode
                      value={qrUrl}
                      size={180}
                      data-qr-url={qrUrl}
                      style={{ maxWidth: "100%", height: "auto" }}
                    />
                  </div>
                </div>

                <div className={s.qrActions}>
                  <button
                    type="button"
                    onClick={() => handleDownloadQR(qrUrl)}
                    className={s.primaryAction}
                  >
                    <LuDownload aria-hidden />
                    Descargar PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShare("qr-share", qrUrl, "qr")}
                    className={s.secondaryAction}
                  >
                    <LuShare2 aria-hidden />
                    {qrShareCopied ? copiedFeedback : "Compartir"}
                  </button>
                </div>
              </div>
            </section>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
