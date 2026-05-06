import { useCallback } from "react";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { resolvePublicAppUrl } from "@/utils/public-app-url";

type ChannelConfig = {
  id: string;
  label: string;
  utmSource: string;
  utmMedium: string;
  origin: string;
  url: string;
};

export function useLeadChannels() {
  const { profile } = useOrganizationProfile();
  const slug = profile?.solicitudPublicaSlug;
  const baseUrl = resolvePublicAppUrl();

  const buildUrl = useCallback(
    (source: string, medium: string, origin: string) => {
      if (!slug) {
        return "";
      }

      const url = new URL(`/solicitud/${slug}`, baseUrl);
      url.searchParams.set("origen", origin);
      url.searchParams.set("utm_source", source);
      url.searchParams.set("utm_medium", medium);
      return url.toString();
    },
    [baseUrl, slug]
  );

  const channels: ChannelConfig[] = !slug
    ? []
    : [
        {
          id: "instagram",
          label: "Instagram",
          utmSource: "instagram",
          utmMedium: "bio",
          origin: "instagram",
          url: buildUrl("instagram", "bio", "instagram"),
        },
        {
          id: "facebook",
          label: "Facebook",
          utmSource: "facebook",
          utmMedium: "perfil",
          origin: "facebook",
          url: buildUrl("facebook", "perfil", "facebook"),
        },
        {
          id: "whatsapp",
          label: "WhatsApp",
          utmSource: "whatsapp",
          utmMedium: "mensaje",
          origin: "whatsapp",
          url: buildUrl("whatsapp", "mensaje", "whatsapp"),
        },
        {
          id: "qr",
          label: "QR físico",
          utmSource: "qr",
          utmMedium: "offline",
          origin: "qr",
          url: buildUrl("qr", "offline", "qr"),
        },
        {
          id: "link_directo",
          label: "Link directo",
          utmSource: "link_directo",
          utmMedium: "web",
          origin: "link_directo",
          url: buildUrl("link_directo", "web", "link_directo"),
        },
      ];

  return {
    slug,
    channels,
    baseUrl,
    isReady: Boolean(slug),
  };
}
