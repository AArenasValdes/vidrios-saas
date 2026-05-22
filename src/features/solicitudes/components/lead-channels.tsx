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
  LuQrCode,
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
  quickLabel: string;
  quickDescription: string;
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
    id: "direct",
    label: "Link directo",
    description: "Para compartir donde quieras.",
    quickLabel: "Link",
    quickDescription: "Copiar o compartir",
    utmSource: "link_directo",
    utmMedium: "web",
    origin: "link_directo",
    icon: LuLink,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Enviar a clientes",
    quickLabel: "WhatsApp",
    quickDescription: "Enviar a clientes",
    utmSource: "whatsapp",
    utmMedium: "mensaje",
    origin: "whatsapp",
    icon: LuMessageCircle,
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Bio o historias",
    quickLabel: "Instagram",
    quickDescription: "Bio o historias",
    utmSource: "instagram",
    utmMedium: "bio",
    origin: "instagram",
    icon: LuInstagram,
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Perfil o posts",
    quickLabel: "Facebook",
    quickDescription: "Perfil o posts",
    utmSource: "facebook",
    utmMedium: "perfil",
    origin: "facebook",
    icon: LuFacebook,
  },
] as const;

const QUICK_ACTIONS = [
  { id: "whatsapp", label: "WhatsApp", description: "Enviar a clientes", icon: LuMessageCircle },
  { id: "instagram", label: "Instagram", description: "Bio o historias", icon: LuInstagram },
  { id: "facebook", label: "Facebook", description: "Perfil o posts", icon: LuFacebook },
  { id: "qr", label: "QR", description: "Imprimir o pegar", icon: LuQrCode },
] as const;

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

  const handleCopy = useCallback(async (
    id: string,
    url: string,
    channel: PublicRequestShareChannel = "generic"
  ) => {
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
  }, [buildShareClipboardText, props]);

  const handleShare = useCallback(
    async (
      id: string,
      url: string,
      channel: PublicRequestShareChannel = "generic"
    ) => {
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

  const handleWhatsappShare = useCallback((url: string) => {
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
  }, [buildShareClipboardText, props]);

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
          </div>
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

        <div className={s.publicLinks}>
          <Link href="/configuracion/empresa" className={s.inlineLink}>
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

      <section className={s.trackingCard}>
        <LuCheck aria-hidden />
        <span>Tracking activo: cada solicitud queda marcada según el canal.</span>
      </section>

      <section className={s.quickSection}>
        <div className={s.sectionIntro}>
          <span className={s.sectionLabel}>Acciones rápidas</span>
          <h2 className={s.sectionTitle}>Elige dónde la vas a mover</h2>
        </div>

        <div className={s.quickGrid}>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                type="button"
                className={s.quickCard}
                onClick={() => {
                  if (action.id === "qr") {
                    document.getElementById("qr-imprimir")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                    return;
                  }

                  const channel = CHANNELS.find((item) => item.id === action.id);

                  if (!channel) {
                    return;
                  }

                  const url = buildUrl(channel);

                  if (channel.id === "whatsapp") {
                    handleWhatsappShare(url);
                    return;
                  }

                  void handleCopy(`quick-${channel.id}`, url, channel.id);
                }}
              >
                <span className={s.quickIconWrap}>
                  <Icon aria-hidden />
                </span>
                <span className={s.quickCardCopy}>
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={s.digitalSection}>
        <div className={s.sectionIntro}>
          <span className={s.sectionLabel}>Canales digitales</span>
          <h2 className={s.sectionTitle}>Copiar, compartir y usar</h2>
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
                        {isCopied ? "Copiado" : "Copiar texto + link"}
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
                        Compartir por WhatsApp
                      </button>
                      <button
                        type="button"
                        className={s.secondaryAction}
                        onClick={() => void handleCopy(channel.id, url, "whatsapp")}
                      >
                        {isCopied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                        {isCopied ? "Copiado" : "Copiar texto + link"}
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
                        {isCopied ? "Copiado" : "Copiar para Instagram"}
                      </button>
                      <button
                        type="button"
                        className={s.secondaryAction}
                        onClick={() => openExternal("https://www.instagram.com/")}
                      >
                        <LuExternalLink aria-hidden />
                        Abrir Instagram
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
                        {isCopied ? "Copiado" : "Copiar para Facebook"}
                      </button>
                      <button
                        type="button"
                        className={s.secondaryAction}
                        onClick={() => openExternal("https://www.facebook.com/")}
                      >
                        <LuExternalLink aria-hidden />
                        Abrir Facebook
                      </button>
                    </>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={s.inlineLink}
                  onClick={() =>
                    setDetails({
                      title: channel.label,
                      url,
                      helper:
                        channel.id === "instagram"
                          ? "Te copia una version corta para bio o historia."
                          : channel.id === "facebook"
                            ? "Te copia una version pensada para post, perfil o boton."
                            : channel.id === "whatsapp"
                              ? "Te deja un mensaje mas directo para enviar por WhatsApp."
                              : "Te copia un texto general listo para compartir.",
                    })
                  }
                >
                  Ver detalles
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className={s.qrCard} id="qr-imprimir">
        <div className={s.qrCopy}>
          <span className={s.sectionLabel}>QR para imprimir</span>
          <h2 className={s.sectionTitle}>Úsalo en tarjeta, vitrina o camioneta</h2>
          <p className={s.sectionText}>Descárgalo y compártelo donde tus clientes te vean.</p>
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
            onClick={() =>
              void handleShare("qr-share", qrUrl, "qr")
            }
            className={s.secondaryAction}
          >
            <LuShare2 aria-hidden />
            Compartir QR
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
