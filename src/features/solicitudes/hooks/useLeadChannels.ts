import { useState, useCallback } from "react";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useAuth } from "@/features/auth/hooks/useAuth";
import QRCode from "react-qr-code";

type ChannelConfig = {
  id: string;
  label: string;
  utmSource: string;
  utmMedium: string;
  url: string;
};

export function useLeadChannels() {
  const { profile } = useOrganizationProfile();
  const { user } = useAuth();
  const slug = profile?.solicitudPublicaSlug;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://ventorap.cl";

  const getBaseUrl = useCallback(() => baseUrl, [baseUrl]);

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

  const channels: ChannelConfig[] = !slug
    ? []
    : [
        {
          id: "instagram",
          label: "Instagram",
          utmSource: "instagram",
          utmMedium: "bio",
          url: buildUrl("instagram", "bio"),
        },
        {
          id: "facebook",
          label: "Facebook",
          utmSource: "facebook",
          utmMedium: "perfil",
          url: buildUrl("facebook", "perfil"),
        },
        {
          id: "whatsapp",
          label: "WhatsApp",
          utmSource: "whatsapp",
          utmMedium: "mensaje",
          url: buildUrl("whatsapp", "mensaje"),
        },
        {
          id: "qr",
          label: "QR físico",
          utmSource: "qr",
          utmMedium: "offline",
          url: buildUrl("qr", "offline"),
        },
        {
          id: "link_directo",
          label: "Link directo",
          utmSource: "link_directo",
          utmMedium: "web",
          url: buildUrl("link_directo", "web"),
        },
      ];

  return {
    slug,
    channels,
    baseUrl: getBaseUrl(),
    isReady: !!slug,
  };
}
