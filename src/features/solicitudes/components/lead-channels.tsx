"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import {
  LuCheck,
  LuCopy,
  LuDownload,
  LuExternalLink,
  LuFacebook,
  LuInstagram,
  LuLink,
  LuMessageCircle,
  LuShare2,
} from "react-icons/lu";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildPublicRequestShareClipboardText,
  buildPublicRequestSharePayload,
  type PublicRequestShareChannel,
} from "@/features/solicitudes/services/public-request-share.service";
import { resolvePublicAppUrl } from "@/utils/public-app-url";

import s from "./lead-channels.module.css";

type ChannelDefinition = {
  id: "direct" | "instagram" | "facebook" | "whatsapp";
  label: string;
  description: string;
  utmSource: string;
  utmMedium: string;
  origin: string;
  icon: typeof LuLink;
};

type DetailsState =
  | null
  | {
      title: string;
      url: string;
      helper: string;
    };

const CHANNELS: ChannelDefinition[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Mensaje listo para enviar a clientes",
    utmSource: "whatsapp",
    utmMedium: "mensaje",
    origin: "whatsapp",
    icon: LuMessageCircle,
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Versión corta para bio o historias",
    utmSource: "instagram",
    utmMedium: "bio",
    origin: "instagram",
    icon: LuInstagram,
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Para perfil, post o botón",
    utmSource: "facebook",
    utmMedium: "perfil",
    origin: "facebook",
    icon: LuFacebook,
  },
  {
    id: "direct",
    label: "Link directo",
    description: "Texto general para cualquier canal",
    utmSource: "link_directo",
    utmMedium: "web",
    origin: "link_directo",
    icon: LuLink,
  },
];

function getDisplayUrl(baseUrl: string, slug: string) {
  try {
    const host = new URL(baseUrl).host;
    return `${host}/solicitud/${slug}`;
  } catch {
    return `${baseUrl.replace(/\/$/, "")}/solicitud/${slug}`;
  }
}

function channelDetailHelper(channelId: ChannelDefinition["id"]) {
  if (channelId === "instagram") {
    return "Te copia una versión corta para bio o historia.";
  }

  if (channelId === "facebook") {
    return "Te copia una versión pensada para post, perfil o botón.";
  }

  if (channelId === "whatsapp") {
    return "Te deja un mensaje más directo para enviar por WhatsApp.";
  }

  return "Te copia un texto general listo para compartir.";
}

export function LeadChannels(props?: {
  onChannelDistributed?: (input: {
    completionSource: string;
    metadataJson?: Record<string, unknown>;
  }) => void | Promise<void>;
}) {
  const { profile, isReady } = useOrganizationProfile();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [details, setDetails] = useState<DetailsState>(null);

  const slug = profile?.solicitudPublicaSlug;
  const baseUrl = resolvePublicAppUrl();

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

  const directUrl = useMemo(
    () =>
      buildUrl({
        origin: "link_directo",
        utmSource: "link_directo",
        utmMedium: "web",
      }),
    [buildUrl]
  );

  const qrUrl = useMemo(
    () =>
      buildUrl({
        origin: "qr",
        utmSource: "qr",
        utmMedium: "offline",
      }),
    [buildUrl]
  );

  const buildShareClipboardText = useCallback(
    (url: string, channel: PublicRequestShareChannel) =>
      buildPublicRequestShareClipboardText({
        url,
        empresaNombre: profile?.empresaNombre,
        channel,
      }),
    [profile?.empresaNombre]
  );

  const buildSharePayload = useCallback(
    (url: string, channel: PublicRequestShareChannel) =>
      buildPublicRequestSharePayload({
        url,
        empresaNombre: profile?.empresaNombre,
        channel,
      }),
    [profile?.empresaNombre]
  );

  const handleCopy = useCallback(
    async (id: string, url: string, channel: PublicRequestShareChannel = "generic") => {
      try {
        await navigator.clipboard.writeText(buildShareClipboardText(url, channel));
        setCopiedId(id);
        await props?.onChannelDistributed?.({
          completionSource: `solicitudes_canales_copy_${id}`,
          metadataJson: {
            route: "/solicitudes/canales",
            actionId: id,
            url,
            channel,
          },
        });
        window.setTimeout(() => {
          setCopiedId((current) => (current === id ? null : current));
        }, 2000);
      } catch {
        return;
      }
    },
    [buildShareClipboardText, props]
  );

  const handleShare = useCallback(
    async (id: string, url: string, channel: PublicRequestShareChannel = "generic") => {
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share(buildSharePayload(url, channel));
          await props?.onChannelDistributed?.({
            completionSource: `solicitudes_canales_share_${id}`,
            metadataJson: {
              route: "/solicitudes/canales",
              actionId: id,
              url,
              channel,
            },
          });
          return;
        }
      } catch {
        return;
      }

      await handleCopy(id, url, channel);
    },
    [buildSharePayload, handleCopy, props]
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
          void props?.onChannelDistributed?.({
            completionSource: "solicitudes_canales_download_qr",
            metadataJson: {
              route: "/solicitudes/canales",
              url,
            },
          });
        }

        URL.revokeObjectURL(svgUrl);
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
      };

      image.src = svgUrl;
    },
    [props, slug]
  );

  const handleWhatsappShare = useCallback(
    (url: string) => {
      if (typeof window === "undefined") {
        return;
      }

      const text = encodeURIComponent(buildShareClipboardText(url, "whatsapp"));
      window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
      void props?.onChannelDistributed?.({
        completionSource: "solicitudes_canales_whatsapp_share",
        metadataJson: {
          route: "/solicitudes/canales",
          url,
        },
      });
    },
    [buildShareClipboardText, props]
  );

  const openExternal = useCallback((href: string) => {
    if (typeof window === "undefined") {
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
  }, []);

  if (!isReady || !slug) {
    return <div className={s.loading}>Cargando tu página pública...</div>;
  }

  const displayUrl = getDisplayUrl(baseUrl, slug);

  return (
    <div className={s.root}>
      <div className={s.workspace}>
        <div className={s.mainColumn}>
          <section className={s.publicCard} data-onboarding-target="canales-public-card">
            <div className={s.publicTop}>
              <div className={s.publicCopy}>
                <span className={s.sectionLabel}>Tu página pública</span>
                <strong>{profile?.empresaNombre || "Tu empresa"}</strong>
                <div className={s.publicMetaRow}>
                  <span className={s.statusPill}>
                    <LuCheck aria-hidden />
                    Publicada
                  </span>
                  <span className={s.urlPill}>{displayUrl}</span>
                </div>
                <p className={s.trackingHint}>
                  Tracking activo: cada solicitud queda marcada según el canal.
                </p>
              </div>

              <div className={s.publicActions} data-onboarding-target="canales-share-actions">
                <button
                  type="button"
                  className={s.primaryAction}
                  onClick={() => void handleShare("page-share", directUrl, "direct")}
                >
                  <LuShare2 aria-hidden />
                  Compartir
                </button>
                <button
                  type="button"
                  className={s.secondaryAction}
                  onClick={() => void handleCopy("page-copy", directUrl, "direct")}
                >
                  {copiedId === "page-copy" ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                  {copiedId === "page-copy" ? "Copiado" : "Copiar texto + link"}
                </button>
              </div>
            </div>

            <div className={s.publicLinks}>
              <Link href="/configuracion/pagina-venta" className={s.inlineLink}>
                Editar página
              </Link>
              <button
                type="button"
                className={s.inlineLink}
                onClick={() =>
                  setDetails({
                    title: "Tu página pública",
                    url: directUrl,
                    helper: "Te copia un texto general con el link, listo para pegar donde quieras.",
                  })
                }
              >
                Ver enlace completo
              </button>
            </div>
          </section>

          <section className={s.channelsPanel}>
            <div className={s.sectionIntro}>
              <span className={s.sectionLabel}>Canales</span>
              <h2 className={s.sectionTitle}>Elige dónde la vas a publicar</h2>
            </div>

            <div className={s.channelList}>
              {CHANNELS.map((channel) => {
                const url = buildUrl(channel);
                const Icon = channel.icon;
                const isCopied = copiedId === channel.id;
                const isInstagram = channel.id === "instagram";
                const isFacebook = channel.id === "facebook";
                const isWhatsapp = channel.id === "whatsapp";
                const isDirect = channel.id === "direct";

                return (
                  <article key={channel.id} className={s.channelCard}>
                    <div className={s.channelMain}>
                      <div className={s.channelIconWrap}>
                        <Icon className={s.channelIcon} aria-hidden />
                      </div>
                      <div className={s.channelCopy}>
                        <h3 className={s.channelLabel}>{channel.label}</h3>
                        <p className={s.channelDescription}>{channel.description}</p>
                      </div>
                    </div>

                    <div className={s.channelActions}>
                      {isDirect ? (
                        <>
                          <button
                            type="button"
                            className={s.primaryAction}
                            onClick={() => void handleShare("direct-share", url, "direct")}
                          >
                            <LuShare2 aria-hidden />
                            Compartir
                          </button>
                          <button
                            type="button"
                            className={s.secondaryAction}
                            onClick={() => void handleCopy(channel.id, url, "direct")}
                          >
                            {isCopied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                            {isCopied ? "Copiado" : "Copiar"}
                          </button>
                        </>
                      ) : null}

                      {isWhatsapp ? (
                        <>
                          <button
                            type="button"
                            className={s.primaryAction}
                            onClick={() => handleWhatsappShare(url)}
                          >
                            <LuMessageCircle aria-hidden />
                            Enviar
                          </button>
                          <button
                            type="button"
                            className={s.secondaryAction}
                            onClick={() => void handleCopy(channel.id, url, "whatsapp")}
                          >
                            {isCopied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                            {isCopied ? "Copiado" : "Copiar"}
                          </button>
                        </>
                      ) : null}

                      {isInstagram ? (
                        <>
                          <button
                            type="button"
                            className={s.primaryAction}
                            onClick={() => void handleCopy(channel.id, url, "instagram")}
                          >
                            {isCopied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                            {isCopied ? "Copiado" : "Copiar"}
                          </button>
                          <button
                            type="button"
                            className={s.secondaryAction}
                            onClick={() => openExternal("https://www.instagram.com/")}
                          >
                            <LuExternalLink aria-hidden />
                            Abrir
                          </button>
                        </>
                      ) : null}

                      {isFacebook ? (
                        <>
                          <button
                            type="button"
                            className={s.primaryAction}
                            onClick={() => void handleCopy(channel.id, url, "facebook")}
                          >
                            {isCopied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                            {isCopied ? "Copiado" : "Copiar"}
                          </button>
                          <button
                            type="button"
                            className={s.secondaryAction}
                            onClick={() => openExternal("https://www.facebook.com/")}
                          >
                            <LuExternalLink aria-hidden />
                            Abrir
                          </button>
                        </>
                      ) : null}

                      <button
                        type="button"
                        className={s.ghostAction}
                        onClick={() =>
                          setDetails({
                            title: channel.label,
                            url,
                            helper: channelDetailHelper(channel.id),
                          })
                        }
                      >
                        Detalle
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className={s.sideColumn}>
          <section className={s.qrCard} id="qr-imprimir">
            <div className={s.qrCopy}>
              <span className={s.sectionLabel}>QR para imprimir</span>
              <h2 className={s.sectionTitle}>Tarjeta, vitrina o camioneta</h2>
              <p className={s.sectionText}>Descárgalo y úsalo donde tus clientes te vean.</p>
            </div>

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
                Compartir
              </button>
            </div>

            <button
              type="button"
              className={s.inlineLink}
              onClick={() => void handleCopy("qr-link", qrUrl, "qr")}
            >
              {copiedId === "qr-link" ? "Copiado" : "Copiar texto + link QR"}
            </button>
          </section>
        </aside>
      </div>

      {details ? (
        <div className={s.sheetBackdrop} role="presentation" onClick={() => setDetails(null)}>
          <div
            className={s.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-enlace"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={s.sheetHandle} aria-hidden />
            <div className={s.sheetCopy}>
              <span className={s.sectionLabel}>Detalle del enlace</span>
              <h3 id="detalle-enlace" className={s.sheetTitle}>
                {details.title}
              </h3>
              <p className={s.sheetHelper}>{details.helper}</p>
              <code className={s.sheetUrl}>{details.url}</code>
            </div>

            <div className={s.sheetActions}>
              <button
                type="button"
                className={s.primaryAction}
                onClick={() => void handleCopy("details", details.url, "direct")}
              >
                {copiedId === "details" ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                {copiedId === "details" ? "Copiado" : "Copiar texto + link"}
              </button>
              <button
                type="button"
                className={s.secondaryAction}
                onClick={() => setDetails(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
