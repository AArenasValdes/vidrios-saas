"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { googleTagService } from "@/features/analytics/services/google-tag.service";

export function GoogleTagProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const gtmContainerId = googleTagService.getGtmContainerId();

    if (gtmContainerId && !document.getElementById("ventora-google-tag-manager")) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        "gtm.start": new Date().getTime(),
        event: "gtm.js",
      });

      const script = document.createElement("script");
      script.id = "ventora-google-tag-manager";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(
        gtmContainerId
      )}`;
      document.head.appendChild(script);
    }

    googleTagService.configurePage();
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const query = searchParams?.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    const title =
      typeof document !== "undefined" ? document.title : undefined;

    googleTagService.trackPageView(pagePath, title);
  }, [pathname, searchParams]);

  return null;
}
