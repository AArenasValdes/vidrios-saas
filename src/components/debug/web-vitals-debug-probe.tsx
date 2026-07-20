"use client";

import { useEffect } from "react";

/**
 * Probe temporal de debug (sesión d4bf8a): mide FCP/LCP y recursos del LCP.
 * No loguea PII.
 */
function sendDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  // #region agent log
  fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "d4bf8a",
    },
    body: JSON.stringify({
      sessionId: "d4bf8a",
      runId: "post-fix",
      hypothesisId,
      location,
      message,
      data: {
        ...data,
        path: typeof window !== "undefined" ? window.location.pathname : "",
        href: typeof window !== "undefined" ? window.location.href : "",
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function describeLcpEntry(entry: PerformanceEntry) {
  const lcp = entry as PerformanceEntry & {
    size?: number;
    element?: Element | null;
    url?: string;
    renderTime?: number;
    loadTime?: number;
  };
  const el = lcp.element;
  const tag = el?.tagName?.toLowerCase() ?? null;
  const id = el && "id" in el ? String((el as HTMLElement).id || "") : "";
  const className =
    el && "className" in el ? String((el as HTMLElement).className || "").slice(0, 120) : "";
  const src =
    el instanceof HTMLImageElement
      ? el.currentSrc || el.src
      : el instanceof HTMLElement
        ? getComputedStyle(el).backgroundImage?.slice(0, 180) || ""
        : "";

  return {
    startTimeMs: Math.round(entry.startTime),
    size: lcp.size ?? null,
    url: lcp.url ?? null,
    renderTimeMs: lcp.renderTime != null ? Math.round(lcp.renderTime) : null,
    loadTimeMs: lcp.loadTime != null ? Math.round(lcp.loadTime) : null,
    tag,
    id,
    className,
    srcHint: src.slice(0, 220),
  };
}

export function WebVitalsDebugProbe() {
  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    sendDebugLog("H4", "web-vitals-debug-probe.tsx:mount", "probe_mounted", {
      readyState: document.readyState,
      transferSize: nav?.transferSize ?? null,
      encodedBodySize: nav?.encodedBodySize ?? null,
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      responseEndMs: nav ? Math.round(nav.responseEnd) : null,
      hasGtmNoscript: Boolean(document.querySelector("noscript iframe[src*='googletagmanager']")),
      stylesheetCount: document.styleSheets.length,
      googleFontsStylesheets: Array.from(document.styleSheets).filter((sheet) => {
        try {
          return String(sheet.href || "").includes("fonts.googleapis.com");
        } catch {
          return false;
        }
      }).length,
      cssImportBlockedHint: Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((node) => (node as HTMLLinkElement).href)
        .filter((href) => href.includes("fonts.googleapis") || href.includes("fonts.gstatic"))
        .slice(0, 5),
    });

    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          sendDebugLog("H1", "web-vitals-debug-probe.tsx:fcp", "fcp_observed", {
            fcpMs: Math.round(entry.startTime),
          });
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (!last) return;
      const detail = describeLcpEntry(last);
      const hypothesisId =
        detail.srcHint.includes("landing-cotizar") || detail.srcHint.includes("url(")
          ? "H1"
          : detail.tag === "img" || Boolean(detail.url)
            ? "H3"
            : "H2";
      sendDebugLog(hypothesisId, "web-vitals-debug-probe.tsx:lcp", "lcp_observed", detail);
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const res = entry as PerformanceResourceTiming;
        const name = res.name;
        const isHeavy =
          name.includes("fonts.googleapis") ||
          name.includes("fonts.gstatic") ||
          name.includes("landing-cotizar") ||
          name.includes("landing-problema") ||
          name.includes("landing-solicitud") ||
          name.includes("gtm") ||
          name.includes("googletagmanager") ||
          /\.(png|jpe?g|webp|svg|woff2?)($|\?)/i.test(name);
        if (!isHeavy) continue;
        if (res.transferSize < 40_000 && res.duration < 200 && !name.includes("font")) {
          continue;
        }
        sendDebugLog(
          name.includes("font") || name.includes("googleapis")
            ? "H1"
            : name.includes("gtm") || name.includes("googletagmanager")
              ? "H4"
              : "H3",
          "web-vitals-debug-probe.tsx:resource",
          "heavy_resource",
          {
            name: name.slice(0, 220),
            durationMs: Math.round(res.duration),
            transferSize: res.transferSize,
            encodedBodySize: res.encodedBodySize,
            initiatorType: res.initiatorType,
          }
        );
      }
    });
    resourceObserver.observe({ type: "resource", buffered: true });

    const hydrationTimer = window.setTimeout(() => {
      sendDebugLog("H5", "web-vitals-debug-probe.tsx:hydrate", "post_hydration_snapshot", {
        scripts: document.scripts.length,
        images: document.images.length,
        bodyTextLen: (document.body?.innerText || "").slice(0, 80).length,
        clientRootHint: Boolean(document.querySelector("[data-reactroot], #__next, main")),
      });
    }, 2500);

    return () => {
      paintObserver.disconnect();
      lcpObserver.disconnect();
      resourceObserver.disconnect();
      window.clearTimeout(hydrationTimer);
    };
  }, []);

  return null;
}
