"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { googleTagService } from "@/features/analytics/services/google-tag.service";

export function GoogleTagProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const gtmContainerId = googleTagService.getGtmContainerId();
    if (!gtmContainerId) {
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadGtm = () => {
      if (cancelled || document.getElementById("ventora-google-tag-manager")) {
        return;
      }

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
      googleTagService.configurePage();
    };

    // bundle-defer-third-party: no competir con FCP/LCP del primer paint.
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(loadGtm, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(loadGtm, 1800);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
    };
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
