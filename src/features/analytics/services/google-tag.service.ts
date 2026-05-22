import type { GoogleTagDataStatus, GoogleTagEventParams } from "@/features/analytics/types/google-tag";

const DEFAULT_GA_MEASUREMENT_ID = "G-Y0LCR4NRDN";
const DEFAULT_GTM_CONTAINER_ID = "GTM-N4X44QW6";
const GTM_CONTAINER_ID =
  process.env.NEXT_PUBLIC_GTM_CONTAINER_ID?.trim() || DEFAULT_GTM_CONTAINER_ID;
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || DEFAULT_GA_MEASUREMENT_ID;
const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "";
const GOOGLE_ADS_LEAD_CONVERSION_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_CONVERSION_LABEL?.trim() ?? "";
const GOOGLE_ADS_QUOTE_APPROVED_CONVERSION_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_QUOTE_APPROVED_CONVERSION_LABEL?.trim() ?? "";
const GOOGLE_ADS_QUOTE_REJECTED_CONVERSION_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_QUOTE_REJECTED_CONVERSION_LABEL?.trim() ?? "";

function isBrowser() {
  return typeof window !== "undefined";
}

function ensureDataLayer() {
  if (!isBrowser()) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
}

function hasDataLayer() {
  return isBrowser() && Array.isArray(window.dataLayer);
}

function hasGoogleTag() {
  return hasDataLayer() || (isBrowser() && typeof window.gtag === "function");
}

function ensureTrackedMaps() {
  if (!isBrowser()) {
    return;
  }

  window.__ventoraTrackedPaths ??= {};
  window.__ventoraTrackedConversions ??= {};
  window.__ventoraTrackedInteractions ??= {};
}

function gtag(command: "js" | "config" | "set" | "event" | "consent", target: string | Date, params?: GoogleTagEventParams) {
  if (!isBrowser()) {
    return;
  }

  if (typeof window.gtag !== "function") {
    if (command === "event") {
      ensureDataLayer();
      window.dataLayer.push({ event: String(target), ...params });
    }
    return;
  }

  window.gtag?.(command, target, params);
}

function buildAdsSendTo(label: string) {
  if (!GOOGLE_ADS_ID || !label) {
    return null;
  }

  return `${GOOGLE_ADS_ID}/${label}`;
}

export const googleTagService = {
  getGaMeasurementId() {
    return GA_MEASUREMENT_ID;
  },
  getGtmContainerId() {
    return GTM_CONTAINER_ID;
  },
  getGoogleAdsId() {
    return GOOGLE_ADS_ID;
  },
  getStatus(): GoogleTagDataStatus {
    return GTM_CONTAINER_ID || GA_MEASUREMENT_ID || GOOGLE_ADS_ID ? "ready" : "disabled";
  },
  hasAnyTagConfigured() {
    return this.getStatus() === "ready";
  },
  configurePage() {
    if (!isBrowser()) {
      return;
    }

    ensureDataLayer();
  },
  trackPageView(pathname: string, title?: string | null) {
    if (!GA_MEASUREMENT_ID || !hasGoogleTag()) {
      return;
    }

    ensureTrackedMaps();
    const key = `${pathname}|${title ?? ""}`;

    if (window.__ventoraTrackedPaths?.[key]) {
      return;
    }

    window.__ventoraTrackedPaths![key] = true;

    gtag("event", "page_view", {
      page_path: pathname,
      page_title: title ?? undefined,
      page_location: isBrowser() ? window.location.href : undefined,
    });
  },
  trackEvent(name: string, params: GoogleTagEventParams = {}) {
    if (!hasGoogleTag()) {
      return;
    }

    gtag("event", name, params);
  },
  trackWhatsappClick(params: {
    source: string;
    location: string;
    label?: string;
    empresaSlug?: string;
    quoteCode?: string;
  }) {
    this.trackEvent("whatsapp_click", {
      event_category: "whatsapp",
      event_label: params.label ?? params.location,
      source: params.source,
      location: params.location,
      empresa_slug: params.empresaSlug,
      quote_code: params.quoteCode,
    });
  },
  trackPdfAction(params: {
    action: "view" | "download";
    quoteCode: string;
    source: string;
  }) {
    this.trackEvent("quote_pdf_action", {
      event_category: "cotizaciones",
      event_label: `${params.quoteCode}:${params.action}`,
      action: params.action,
      quote_code: params.quoteCode,
      source: params.source,
    });
  },
  trackFormStart(params: {
    formName: string;
    source: string;
    empresaSlug?: string;
  }) {
    this.trackInteractionOnce(`form-start:${params.source}:${params.formName}:${params.empresaSlug ?? ""}`, "form_start", {
      event_category: "formularios",
      event_label: params.formName,
      form_name: params.formName,
      source: params.source,
      empresa_slug: params.empresaSlug,
    });
  },
  trackFormSubmitIntent(params: {
    formName: string;
    source: string;
    empresaSlug?: string;
  }) {
    this.trackEvent("form_submit_intent", {
      event_category: "formularios",
      event_label: params.formName,
      form_name: params.formName,
      source: params.source,
      empresa_slug: params.empresaSlug,
    });
  },
  trackTestimonialSubmitted(params: {
    slug: string;
    estrellas: number;
  }) {
    this.trackEvent("testimonial_submit", {
      event_category: "valoraciones",
      event_label: params.slug,
      empresa_slug: params.slug,
      rating: params.estrellas,
    });
  },
  trackLeadSubmitted(params: {
    slug: string;
    workType: string;
    source?: string;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
  }) {
    this.trackEvent("generate_lead", {
      event_category: "solicitudes",
      event_label: params.slug,
      empresa_slug: params.slug,
      work_type: params.workType,
      source: params.source,
      utm_source: params.utmSource ?? undefined,
      utm_medium: params.utmMedium ?? undefined,
      utm_campaign: params.utmCampaign ?? undefined,
      value: 1,
      currency: "CLP",
    });

    const sendTo = buildAdsSendTo(GOOGLE_ADS_LEAD_CONVERSION_LABEL);
    if (!sendTo) {
      return;
    }

    this.trackConversionOnce(`lead:${params.slug}:${params.workType}`, {
      send_to: sendTo,
      value: 1,
      currency: "CLP",
    });
  },
  trackQuoteDecision(params: {
    quoteCode: string;
    decision: "aprobada" | "rechazada";
    total: number;
  }) {
    this.trackEvent("quote_decision", {
      event_category: "cotizaciones",
      event_label: params.quoteCode,
      quote_code: params.quoteCode,
      decision: params.decision,
      value: params.total,
      currency: "CLP",
    });

    const sendTo = buildAdsSendTo(
      params.decision === "aprobada"
        ? GOOGLE_ADS_QUOTE_APPROVED_CONVERSION_LABEL
        : GOOGLE_ADS_QUOTE_REJECTED_CONVERSION_LABEL
    );

    if (!sendTo) {
      return;
    }

    this.trackConversionOnce(`quote:${params.quoteCode}:${params.decision}`, {
      send_to: sendTo,
      value: params.total,
      currency: "CLP",
    });
  },
  trackConversionOnce(key: string, params: GoogleTagEventParams) {
    if (!hasGoogleTag()) {
      return;
    }

    ensureTrackedMaps();

    if (window.__ventoraTrackedConversions?.[key]) {
      return;
    }

    window.__ventoraTrackedConversions![key] = true;
    gtag("event", "conversion", params);
  },
  trackInteractionOnce(key: string, eventName: string, params: GoogleTagEventParams) {
    if (!hasGoogleTag()) {
      return;
    }

    ensureTrackedMaps();

    if (window.__ventoraTrackedInteractions?.[key]) {
      return;
    }

    window.__ventoraTrackedInteractions![key] = true;
    gtag("event", eventName, params);
  },
};
