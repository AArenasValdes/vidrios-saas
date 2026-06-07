"use client";

import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuBellRing,
  LuBuilding2,
  LuCheck,
  LuChevronDown,
  LuCopy,
  LuCreditCard,
  LuEye,
  LuGlobe,
  LuImagePlus,
  LuMail,
  LuMapPin,
  LuPalette,
  LuPhone,
  LuPlus,
  LuQrCode,
  LuSave,
  LuSettings2,
  LuSmartphone,
  LuRefreshCcw,
} from "react-icons/lu";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import { OnboardingGuide } from "@/features/onboarding/components/onboarding-guide";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { buildPublicRequestShareClipboardText } from "@/features/solicitudes/services/public-request-share.service";
import {
  buildEmpresaProfileInput,
  buildOrganizationInitials,
  DEFAULT_ORGANIZATION_BRAND_COLOR,
  normalizePublicRequestSlug,
} from "@/features/organization-profile/services/organization-profile.service";
import type { UpdateOrganizationProfileInput } from "@/features/organization-profile/types/organization-profile";
import { SubscriptionDetail } from "@/features/subscriptions/components/subscription-detail";
import { fetchSubscriptionSummary } from "@/features/subscriptions/services/subscription-summary-client.service";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";
import type { SubscriptionSummary } from "@/features/subscriptions/types/subscription-summary";
import { CURRENT_APP_VERSION } from "@/utils/app-version";
import { resolvePushServiceWorkerRegistration } from "@/utils/pwa-service-worker";
import { resolvePublicAppUrl } from "@/utils/public-app-url";
import { subscribeToPushNotifications } from "@/utils/web-push";
import { forceAppUpdate } from "@/components/pwa/update-checker";

import s from "./page.module.css";

const BRAND_PRESETS = ["#4F7DD4", "#243B6B", "#2EA5E6", "#1DB98B", "#F59E0B", "#EF4444", "#8B5CF6"];

const EMPTY_FORM: UpdateOrganizationProfileInput = buildEmpresaProfileInput({
  organizationId: null,
  empresaNombre: "",
  empresaLogoUrl: null,
  empresaDireccion: "",
  empresaTelefono: "",
  empresaEmail: "",
  brandColor: DEFAULT_ORGANIZATION_BRAND_COLOR,
  formaPago: "",
  solicitudPublicaSlug: "",
  solicitudPublicaDescripcionCorta: "",
  solicitudPublicaValor: "",
  solicitudPublicaMensajeConfianza: "",
  solicitudPublicaPrivacidad: "",
  solicitudPublicaHorarioDesde: "09:00",
  solicitudPublicaHorarioHasta: "19:00",
  solicitudPublicaDiasAtencion: [],
  solicitudPublicaHorarioPorDia: [],
  proveedorPreferido: "",
  modoPrecioPreferido: "margen",
  margenDefecto: 100,
  creadoEn: null,
  actualizadoEn: null,
  publicName: "",
  publicSubtitle: "",
  publicZone: "",
  publicBusinessType: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  websiteUrl: "",
  publicServices: [],
  finalCtaTitle: "",
  finalCtaSubtitle: "",
  finalCtaLabel: "",
  businessHoursNote: "",
  secondaryColor: DEFAULT_ORGANIZATION_BRAND_COLOR,
  heroMode: "gradient",
  heroImageUrl: null,
  heroTitle: "",
  heroSubtitle: "",
  showGallery: true,
  showSchedule: true,
  showRating: false,
  ratingLabel: "",
  jobsCountLabel: "",
  formTitle: "",
  formSubtitle: "",
  isPublished: false,
});

type SectionId = "empresa" | "marca" | "catalogo" | "comercial" | "notificaciones" | "soporte" | "suscripcion";
type DeviceAlertsState = {
  kind: "checking" | "enabled" | "available" | "unsupported" | "error";
  message: string;
};
type SectionFeedback = {
  section: SectionId;
  kind: "success" | "error";
  message: string;
};

function supportsPushAlerts() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}

async function persistSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/pwa/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "No pudimos guardar las alertas para este dispositivo.");
  }
}

const compactJoin = (values: Array<string | null | undefined>) => values.filter(Boolean).join(" · ");
const shorten = (text: string, max = 32) =>
  text.trim().length > max ? `${text.trim().slice(0, max - 1)}...` : text.trim();
const notificationsSummary = (kind: DeviceAlertsState["kind"]) =>
  kind === "enabled"
    ? "Activadas en este dispositivo"
    : kind === "available"
      ? "Listas para activar"
      : kind === "unsupported"
        ? "No disponibles aqui"
        : kind === "error"
          ? "Revisar configuracion"
          : "Revisando dispositivo";

export default function ConfiguracionEmpresaPage() {
  const { rol } = useAuth();
  const onboarding = useOnboardingChecklist();
  const { profile, isReady, isSaving, isUploading, saveProfile, uploadLogo } =
    useOrganizationProfile();
  const {
    templates: lineTemplates,
    isLoading: isLoadingLineTemplates,
    error: lineTemplatesError,
  } = useCotizacionLineTemplates();
  const [form, setForm] = useState<UpdateOrganizationProfileInput>(EMPTY_FORM);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [savingSection, setSavingSection] = useState<SectionId | null>(null);
  const [sectionFeedback, setSectionFeedback] = useState<SectionFeedback | null>(null);
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);
  const [deviceAlertsState, setDeviceAlertsState] = useState<DeviceAlertsState>({
    kind: "checking",
    message: "Revisando este dispositivo.",
  });
  const [isActivatingAlerts, setIsActivatingAlerts] = useState(false);
  const [subscriptionSummary, setSubscriptionSummary] =
    useState<SubscriptionSummary | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm(buildEmpresaProfileInput(profile));
  }, [profile]);

  useEffect(() => {
    if (!profile?.subscription?.isConfigured) return;
    fetchSubscriptionSummary().then(setSubscriptionSummary);
  }, [profile?.subscription?.isConfigured]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  useEffect(() => {
    if (!sectionFeedback) return;
    const timeoutId = window.setTimeout(() => {
      setSectionFeedback((current) =>
        current?.section === sectionFeedback.section ? null : current
      );
    }, 2600);
    return () => window.clearTimeout(timeoutId);
  }, [sectionFeedback]);

  useEffect(() => {
    if (!publicLinkCopied) return;
    const timeoutId = window.setTimeout(() => setPublicLinkCopied(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [publicLinkCopied]);

  const syncDeviceAlertsState = useCallback(async () => {
    if (!supportsPushAlerts()) {
      setDeviceAlertsState({
        kind: "unsupported",
        message:
          "En iPhone usa Safari instalado como app; en escritorio usa Chrome o Edge.",
      });
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setDeviceAlertsState({
        kind: "error",
        message: "Falta la clave publica de notificaciones.",
      });
      return;
    }

    try {
      if (Notification.permission !== "granted") {
        setDeviceAlertsState({
          kind: "available",
          message: "Activa alertas para enterarte cuando llegue una respuesta.",
        });
        return;
      }

      const registration = await resolvePushServiceWorkerRegistration();
      const existingSubscription = await registration.pushManager.getSubscription();
      if (!existingSubscription) {
        setDeviceAlertsState({
          kind: "available",
          message: "El navegador permite alertas, pero aun no queda suscrito.",
        });
        return;
      }

      await persistSubscription(existingSubscription);
      setDeviceAlertsState({
        kind: "enabled",
        message: "Este dispositivo ya recibe alertas de respuesta y seguimiento.",
      });
    } catch (error) {
      setDeviceAlertsState({
        kind: "error",
        message:
          error instanceof Error ? error.message : "No pudimos revisar el estado de alertas.",
      });
    }
  }, []);

  useEffect(() => {
    void syncDeviceAlertsState();
  }, [syncDeviceAlertsState]);

  const canToggleNotifications =
    deviceAlertsState.kind === "available" || deviceAlertsState.kind === "error";
  const notificationsEnabled = deviceAlertsState.kind === "enabled";
  const notificationsDisabled =
    isActivatingAlerts ||
    deviceAlertsState.kind === "checking" ||
    deviceAlertsState.kind === "unsupported";

  const handleEnableDeviceAlerts = useCallback(async () => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setDeviceAlertsState({
        kind: "error",
        message: "Falta la clave publica de notificaciones.",
      });
      return;
    }

    try {
      setIsActivatingAlerts(true);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDeviceAlertsState({
          kind: "available",
          message: "Debes permitir las notificaciones del navegador.",
        });
        return;
      }

      const subscription = await subscribeToPushNotifications(vapidPublicKey);
      await persistSubscription(subscription);
      setDeviceAlertsState({
        kind: "enabled",
        message: "Alertas activas en este dispositivo.",
      });
      setSectionFeedback({
        section: "notificaciones",
        kind: "success",
        message: "Alertas activadas.",
      });
      setOpenSection(null);
    } catch (error) {
      setSectionFeedback({
        section: "notificaciones",
        kind: "error",
        message:
          error instanceof Error ? error.message : "No pudimos activar las alertas.",
      });
    } finally {
      setIsActivatingAlerts(false);
    }
  }, []);

  const handleNotificationsToggle = useCallback(() => {
    if (notificationsEnabled) {
      void syncDeviceAlertsState();
      return;
    }
    if (canToggleNotifications) {
      void handleEnableDeviceAlerts();
    }
  }, [canToggleNotifications, handleEnableDeviceAlerts, notificationsEnabled, syncDeviceAlertsState]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isReiniciando, setIsReiniciando] = useState(false);

  const handleForceUpdate = useCallback(async () => {
    try {
      setIsUpdating(true);
      await forceAppUpdate();
    } catch {
      return;
    }
  }, []);

  const handleReiniciarApp = useCallback(() => {
    try {
      setIsReiniciando(true);
      if ("caches" in window) {
        window.caches.keys().then((keys) => {
          keys
            .filter((key) => key.startsWith("vidrios-saas-"))
            .forEach((key) => window.caches.delete(key));
        });
      }
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, []);

  const handleFieldChange = useCallback(
    <K extends keyof UpdateOrganizationProfileInput>(
      key: K,
      value: UpdateOrganizationProfileInput[K]
    ) => {
      setForm((current) => {
        if (key === "brandColor" && typeof value === "string") {
          return {
            ...current,
            brandColor: value,
            secondaryColor: value,
          };
        }

        return { ...current, [key]: value };
      });
      setSectionFeedback(null);
    },
    []
  );

  const handleEmpresaNombreChange = useCallback((value: string) => {
    setForm((current) => {
      const currentSlug = current.solicitudPublicaSlug.trim();
      const previousDerivedSlug = normalizePublicRequestSlug(current.empresaNombre);
      const nextDerivedSlug = normalizePublicRequestSlug(value);
      const shouldSyncSlug =
        currentSlug === "" || currentSlug === previousDerivedSlug;

      return {
        ...current,
        empresaNombre: value,
        publicName: value,
        solicitudPublicaSlug: shouldSyncSlug ? nextDerivedSlug : currentSlug,
      };
    });
    setSectionFeedback(null);
  }, []);

  const handleSolicitudSlugChange = useCallback((value: string) => {
    handleFieldChange("solicitudPublicaSlug", normalizePublicRequestSlug(value));
  }, [handleFieldChange]);

  const handleLogoChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const nextPreview = URL.createObjectURL(file);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextPreview;
      });
      setSectionFeedback(null);

      try {
        const logoUrl = await uploadLogo(file);
        handleFieldChange("empresaLogoUrl", logoUrl);
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return null;
        });
        setSectionFeedback({
          section: "marca",
          kind: "success",
          message: "Logo subido. Guarda Marca para dejarlo aplicado.",
        });
      } catch (error) {
        setSectionFeedback({
          section: "marca",
          kind: "error",
          message: error instanceof Error ? error.message : "No se pudo subir el logo.",
        });
      } finally {
        event.target.value = "";
      }
    },
    [handleFieldChange, uploadLogo]
  );

  const handleSaveSection = useCallback(
    async (section: SectionId) => {
      try {
        setSavingSection(section);
        setSectionFeedback(null);
        const nextForm =
          section === "empresa"
            ? {
                ...form,
                publicName: form.empresaNombre,
              }
            : form;

        if (nextForm !== form) {
          setForm(nextForm);
        }

        await saveProfile(nextForm);
        setSectionFeedback({ section, kind: "success", message: "Guardado." });
        setOpenSection((current) => (current === section ? null : current));
      } catch (error) {
        setSectionFeedback({
          section,
          kind: "error",
          message:
            error instanceof Error ? error.message : "No se pudo guardar esta seccion.",
        });
      } finally {
        setSavingSection(null);
      }
    },
    [form, saveProfile]
  );

  const publicRequestUrl = useMemo(() => {
    const slug = form.solicitudPublicaSlug?.trim() || "mi-empresa";
    return `${resolvePublicAppUrl({ preferLocal: true })}/solicitud/${slug}`;
  }, [form.solicitudPublicaSlug]);
  const publicRequestShareText = useMemo(
    () =>
      buildPublicRequestShareClipboardText({
        url: publicRequestUrl,
        empresaNombre: form.empresaNombre || profile?.empresaNombre,
        channel: "direct",
      }),
    [form.empresaNombre, profile?.empresaNombre, publicRequestUrl]
  );

  const handleCopyPublicLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicRequestShareText);
      setPublicLinkCopied(true);
      await onboarding.markChannelReady({
        completionSource: "configuracion_empresa_copy_public_link",
        metadataJson: {
          route: "/configuracion/empresa",
          url: publicRequestUrl,
        },
      });
      } catch {
        setSectionFeedback({
          section: "empresa",
          kind: "error",
          message: "No pudimos copiar el texto con el link en este dispositivo.",
        });
      }
    }, [onboarding, publicRequestShareText, publicRequestUrl]);

  const isQuoteOnlyPlan =
    profile?.planCode === "quote_only" || profile?.subscription?.planCode === "quote_only";
  const companyComplete = Boolean(
    form.empresaNombre.trim() &&
      form.publicBusinessType.trim() &&
      (isQuoteOnlyPlan || form.solicitudPublicaSlug.trim()) &&
      form.empresaTelefono.trim() &&
      form.empresaEmail.trim() &&
      form.empresaDireccion.trim()
  );
  const brandComplete = Boolean(
    form.brandColor.trim() &&
      (form.empresaLogoUrl || previewUrl)
  );
  const commercialComplete = Boolean(form.formaPago.trim());
  const notificationsComplete = notificationsEnabled;

  const companySummary = compactJoin([
    form.empresaNombre.trim() || "Empresa sin nombre",
    form.publicBusinessType.trim() || "Sin rubro",
    !isQuoteOnlyPlan ? `/${form.solicitudPublicaSlug.trim() || "mi-empresa"}` : "",
  ]);
  const brandSummary = compactJoin([
    form.brandColor.toUpperCase(),
    form.empresaLogoUrl || previewUrl ? "Logo subido" : "Sin logo",
  ]);
  const commercialSummary = compactJoin([
    shorten(form.formaPago || "Forma de pago pendiente", 34),
    "Vigencia por cotizacion",
    "IVA incluido",
  ]);
  const activeLineTemplatesCount = lineTemplates.filter((item) => item.isActive).length;
  const previewIdentity = previewUrl ?? form.empresaLogoUrl;
  const previewInitials = buildOrganizationInitials(form.empresaNombre || "Mi empresa");

  if (!isReady && !profile) {
    return (
      <div className={s.root}>
        <div className={s.loadingState}>Cargando tu configuracion comercial...</div>
      </div>
    );
  }

  return (
    <div className={s.root} data-onboarding-target="empresa-config">
      {!isQuoteOnlyPlan ? <OnboardingGuide controller={onboarding} routeKey="empresa" /> : null}

      <section className={s.publicCard}>
        <div className={s.publicCardTop}>
          <span className={s.cardEyebrow}>
            <LuEye aria-hidden />
            Vista de cotizacion
          </span>
          <span className={s.previewModePill}>PDF y presupuesto</span>
        </div>

        <div className={s.quotePreviewBox} style={{ ["--brand" as string]: form.brandColor }}>
          <div className={s.quoteDocBar}>
            <span>Presupuesto comercial</span>
            <span>Tu marca visible</span>
          </div>

          <div className={s.quoteAvailability}>
            <span className={s.quoteDot} aria-hidden />
            Marca aplicada en tu cotizacion
          </div>

          <div className={s.quoteIdentity}>
            <div className={s.quoteLogoFrame}>
              <div className={s.publicLogo} style={{ ["--brand" as string]: form.brandColor }}>
                {previewIdentity ? (
                  <Image
                    src={previewIdentity}
                    alt={form.empresaNombre || "Logo de la empresa"}
                    width={96}
                    height={96}
                    className={s.publicLogoImage}
                    unoptimized
                  />
                ) : (
                  <span>{previewInitials}</span>
                )}
              </div>
            </div>

            <div className={s.quoteIdentityCopy}>
              <strong>{form.empresaNombre || "Tu empresa"}</strong>
              <div className={s.quoteMetaList}>
                <span>
                  <LuMapPin aria-hidden />
                  {form.empresaDireccion || "Direccion comercial"}
                </span>
                <span>
                  <LuPhone aria-hidden />
                  {form.empresaTelefono || "Telefono de contacto"}
                </span>
                <span>
                  <LuMail aria-hidden />
                  {form.empresaEmail || "Email comercial"}
                </span>
              </div>
            </div>
          </div>

          <div className={s.quoteDivider} />

          <p className={s.quoteSupportCopy}>
            Estos datos y tu color de marca se muestran en el presupuesto que recibe tu cliente.
          </p>

          <div className={s.quotePaymentCard}>
            <strong>Forma de pago visible</strong>
            <span>{form.formaPago.trim() || "Define tu forma de pago en Configuracion comercial."}</span>
          </div>
        </div>
      </section>

      <div className={s.accordionList}>
        <section className={`${s.accordion} ${openSection === "empresa" ? s.accordionOpen : ""}`}>
          <button type="button" className={s.accordionTrigger} onClick={() => setOpenSection((current) => (current === "empresa" ? null : "empresa"))} aria-expanded={openSection === "empresa"}>
            <div className={s.triggerMain}>
              <div className={s.triggerIcon}><LuBuilding2 aria-hidden /></div>
              <div className={s.triggerCopy}>
                <span className={s.cardEyebrow}>Datos de empresa</span>
                <strong>Datos de empresa</strong>
                <p>{companySummary}</p>
              </div>
            </div>
            <div className={s.triggerMeta}>
              <span className={s.statePill} data-complete={companyComplete}>{companyComplete ? "Completo" : "Pendiente"}</span>
              {sectionFeedback?.section === "empresa" && sectionFeedback.kind === "success" ? <span className={s.savedPill}>Guardado</span> : null}
              <LuChevronDown className={s.chevron} aria-hidden />
            </div>
          </button>

          <div className={s.accordionPanel}>
            <div className={s.accordionInner}>
              <div className={s.fieldGrid}>
                <label className={s.field}>
                  <span className={s.label}>Nombre de empresa</span>
                  <input className={s.input} value={form.empresaNombre} onChange={(event) => handleEmpresaNombreChange(event.target.value)} placeholder="Ej: Vidrieria San Marco" />
                  <span className={s.inlineInfo}>Base interna de tu empresa.</span>
                </label>
                <label className={s.field}>
                  <span className={s.label}>Rubro o especialidad</span>
                  <input className={s.input} value={form.publicBusinessType} onChange={(event) => handleFieldChange("publicBusinessType", event.target.value)} placeholder="Ej: Vidrios y aluminio" />
                  <span className={s.inlineInfo}>Se usa como presentacion comercial en tus cotizaciones.</span>
                </label>
                {!isQuoteOnlyPlan ? (
                  <label className={s.field}>
                    <span className={s.label}>Nombre del enlace</span>
                    <input className={s.input} value={form.solicitudPublicaSlug} onChange={(event) => handleSolicitudSlugChange(event.target.value)} placeholder="ej: mi-vidrieria" />
                    <span className={s.inlineInfo}>Tu página pública de venta quedará como {publicRequestUrl}.</span>
                  </label>
                ) : null}
                <label className={s.field}>
                  <span className={s.label}>Telefono</span>
                  <input className={s.input} value={form.empresaTelefono} onChange={(event) => handleFieldChange("empresaTelefono", event.target.value)} placeholder="+56 9 1234 5678" />
                  <span className={s.inlineInfo}>Esto se usa en PDF, presupuesto y WhatsApp.</span>
                </label>
                <label className={s.field}>
                  <span className={s.label}>Direccion</span>
                  <input className={s.input} value={form.empresaDireccion} onChange={(event) => handleFieldChange("empresaDireccion", event.target.value)} placeholder="Ej: Apoquindo 4501, Las Condes" />
                  <span className={s.inlineInfo}>Se muestra en presupuestos y documentos para tus clientes.</span>
                </label>
                <label className={s.field}>
                  <span className={s.label}>Email</span>
                  <input className={s.input} value={form.empresaEmail} onChange={(event) => handleFieldChange("empresaEmail", event.target.value)} placeholder="contacto@empresa.cl" />
                  <span className={s.inlineInfo}>Se usa como dato de contacto visible.</span>
                </label>
              </div>
              {sectionFeedback?.section === "empresa" ? <p className={sectionFeedback.kind === "error" ? s.error : s.success}>{sectionFeedback.message}</p> : null}
              <div className={s.sectionActions}>
                <button type="button" className={s.saveButton} onClick={() => void handleSaveSection("empresa")} disabled={isSaving || savingSection === "empresa"}>
                  <LuSave aria-hidden />
                  {savingSection === "empresa" ? "Guardando..." : "Guardar datos"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={`${s.accordion} ${openSection === "marca" ? s.accordionOpen : ""}`}>
          <button type="button" className={s.accordionTrigger} onClick={() => setOpenSection((current) => (current === "marca" ? null : "marca"))} aria-expanded={openSection === "marca"}>
            <div className={s.triggerMain}>
              <div className={s.triggerIcon}><LuPalette aria-hidden /></div>
              <div className={s.triggerCopy}>
                <span className={s.cardEyebrow}>Marca</span>
                <strong>Marca</strong>
                <p>{brandSummary}</p>
              </div>
            </div>
            <div className={s.triggerMeta}>
              <span className={s.statePill} data-complete={brandComplete}>{brandComplete ? "Completo" : "Pendiente"}</span>
              {sectionFeedback?.section === "marca" && sectionFeedback.kind === "success" ? <span className={s.savedPill}>Guardado</span> : null}
              <LuChevronDown className={s.chevron} aria-hidden />
            </div>
          </button>

          <div className={s.accordionPanel}>
            <div className={s.accordionInner}>
              <div className={s.field}>
                <span className={s.label}>Color de marca</span>
                <div className={s.swatchRow}>
                  {BRAND_PRESETS.map((color) => {
                    const isActive = form.brandColor.toLowerCase() === color.toLowerCase();
                    return (
                      <button key={color} type="button" className={`${s.colorSwatch} ${isActive ? s.colorSwatchActive : ""}`} style={{ backgroundColor: color }} onClick={() => handleFieldChange("brandColor", color)} aria-label={`Usar color ${color}`} aria-pressed={isActive}>
                        {isActive ? <LuCheck aria-hidden /> : null}
                      </button>
                    );
                  })}
                  <label className={s.customColor}>
                    <span className={s.customColorPreview} style={{ backgroundColor: form.brandColor }} />
                    <span className={s.customColorLabel}>Otro</span>
                    <input type="color" value={form.brandColor} onChange={(event) => handleFieldChange("brandColor", event.target.value)} aria-label="Elegir color personalizado" />
                  </label>
                </div>
                <span className={s.inlineInfo}>Se refleja en presupuestos, documentos y elementos activos.</span>
              </div>


              <div className={s.field}>
                <span className={s.label}>Logo</span>
                <label className={s.logoUpload}>
                  <div className={s.logoUploadIcon}><LuImagePlus aria-hidden /></div>
                  <div className={s.logoUploadBody}>
                    <strong>{isUploading ? "Subiendo logo..." : "Subir logo"}</strong>
                    <span>PNG o JPG</span>
                  </div>
                  <div className={s.logoUploadAction}>↑</div>
                  <input type="file" accept="image/*" onChange={handleLogoChange} disabled={isUploading} />
                </label>
              </div>

              {sectionFeedback?.section === "marca" ? <p className={sectionFeedback.kind === "error" ? s.error : s.success}>{sectionFeedback.message}</p> : null}
              <div className={s.sectionActions}>
                <button type="button" className={s.saveButton} onClick={() => void handleSaveSection("marca")} disabled={isSaving || savingSection === "marca"}>
                  <LuSave aria-hidden />
                  {savingSection === "marca" ? "Guardando..." : "Guardar marca"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={`${s.accordion} ${openSection === "catalogo" ? s.accordionOpen : ""}`}>
          <button type="button" className={s.accordionTrigger} onClick={() => setOpenSection((current) => (current === "catalogo" ? null : "catalogo"))} aria-expanded={openSection === "catalogo"}>
            <div className={s.triggerMain}>
              <div className={s.triggerIcon}><LuQrCode aria-hidden /></div>
              <div className={s.triggerCopy}>
                <span className={s.cardEyebrow}>Configuracion de catalogo</span>
                <strong>Lineas y precios base</strong>
                <p>{isLoadingLineTemplates ? "Cargando lineas..." : `${lineTemplates.length} guardadas · ${activeLineTemplatesCount} activas`}</p>
              </div>
            </div>
            <div className={s.triggerMeta}>
              <span className={s.statePill} data-complete={activeLineTemplatesCount > 0}>{activeLineTemplatesCount > 0 ? "Activo" : "Pendiente"}</span>
              <LuChevronDown className={s.chevron} aria-hidden />
            </div>
          </button>

          <div className={s.accordionPanel}>
            <div className={s.accordionInner}>
          <article className={s.catalogSummaryCard}>
            <div className={s.catalogSummaryTop}>
              <div className={s.triggerMain}>
                <div className={s.triggerIcon}>
                  <LuQrCode aria-hidden />
                </div>
                <div className={s.triggerCopy}>
                  <span className={s.cardEyebrow}>Lineas y precios base</span>
                  <strong>Lineas y precios base</strong>
                  <p>Guarda tus precios por m² para cotizar mas rapido.</p>
                </div>
              </div>

              <div className={s.catalogSummaryMeta}>
                <span className={s.catalogSummaryPill}>
                  {isLoadingLineTemplates
                    ? "Cargando..."
                    : `${lineTemplates.length} lineas guardadas`}
                </span>
                <span className={s.catalogSummaryPillMuted}>
                  {activeLineTemplatesCount} activas
                </span>
              </div>
            </div>

            <div className={s.catalogSummaryActions}>
              <Link href="/configuracion/empresa/lineas-precios" scroll className={s.secondaryLink}>
                Administrar
              </Link>
              <Link
                href="/configuracion/empresa/lineas-precios?nueva=1"
                scroll
                className={s.primaryLink}
              >
                <LuPlus aria-hidden />
                Nueva linea
              </Link>
            </div>
          </article>
          {lineTemplatesError ? <p className={s.error}>{lineTemplatesError}</p> : null}
            </div>
          </div>
        </section>

        <section className={`${s.accordion} ${openSection === "comercial" ? s.accordionOpen : ""}`}>
          <button type="button" className={s.accordionTrigger} onClick={() => setOpenSection((current) => (current === "comercial" ? null : "comercial"))} aria-expanded={openSection === "comercial"}>
            <div className={s.triggerMain}>
              <div className={s.triggerIcon}><LuSettings2 aria-hidden /></div>
              <div className={s.triggerCopy}>
                <span className={s.cardEyebrow}>Configuracion comercial</span>
                <strong>Configuracion comercial</strong>
                <p>{commercialSummary}</p>
              </div>
            </div>
            <div className={s.triggerMeta}>
              <span className={s.statePill} data-complete={commercialComplete}>{commercialComplete ? "Completo" : "Pendiente"}</span>
              {sectionFeedback?.section === "comercial" && sectionFeedback.kind === "success" ? <span className={s.savedPill}>Guardado</span> : null}
              <LuChevronDown className={s.chevron} aria-hidden />
            </div>
          </button>

          <div className={s.accordionPanel}>
            <div className={s.accordionInner}>
              <label className={s.field}>
                <span className={s.label}>Forma de pago</span>
                <textarea className={s.textarea} rows={3} value={form.formaPago} onChange={(event) => handleFieldChange("formaPago", event.target.value)} placeholder="Ej: 50% al inicio y 50% al finalizar" />
              </label>

              <div className={s.commercialInfoGrid}>
                <article className={s.commercialInfoCard}>
                  <span className={s.label}>Vigencia</span>
                  <strong>Se define por cotizacion</strong>
                  <p>La ajustas al momento de preparar el presupuesto final.</p>
                </article>
                <article className={s.commercialInfoCard}>
                  <span className={s.label}>IVA incluido</span>
                  <strong>Visible en cada cotizacion</strong>
                  <p>El total comercial se sigue mostrando con IVA incluido.</p>
                </article>
                <article className={s.commercialInfoCard}>
                  <span className={s.label}>Notas comerciales</span>
                  <strong>Se agregan al crear presupuesto</strong>
                  <p>No se pierden dentro de Empresa ni te alargan esta configuracion.</p>
                </article>
              </div>

              {sectionFeedback?.section === "comercial" ? <p className={sectionFeedback.kind === "error" ? s.error : s.success}>{sectionFeedback.message}</p> : null}
              <div className={s.sectionActions}>
                <button type="button" className={s.saveButton} onClick={() => void handleSaveSection("comercial")} disabled={isSaving || savingSection === "comercial"}>
                  <LuSave aria-hidden />
                  {savingSection === "comercial" ? "Guardando..." : "Guardar forma de pago"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={`${s.accordion} ${openSection === "notificaciones" ? s.accordionOpen : ""}`}>
          <button type="button" className={s.accordionTrigger} onClick={() => setOpenSection((current) => (current === "notificaciones" ? null : "notificaciones"))} aria-expanded={openSection === "notificaciones"}>
            <div className={s.triggerMain}>
              <div className={s.triggerIcon}><LuBellRing aria-hidden /></div>
              <div className={s.triggerCopy}>
                <span className={s.cardEyebrow}>Notificaciones</span>
                <strong>Notificaciones</strong>
                <p>{notificationsSummary(deviceAlertsState.kind)}</p>
              </div>
            </div>
            <div className={s.triggerMeta}>
              <span className={s.statePill} data-complete={notificationsComplete}>{notificationsComplete ? "Activas" : "Pendiente"}</span>
              {sectionFeedback?.section === "notificaciones" && sectionFeedback.kind === "success" ? <span className={s.savedPill}>Listo</span> : null}
              <LuChevronDown className={s.chevron} aria-hidden />
            </div>
          </button>

          <div className={s.accordionPanel}>
            <div className={s.accordionInner}>
              <div className={s.notificationsRow}>
                <div className={s.notificationsCopy}>
                  <strong>Recibir notificaciones</strong>
                  <p>{deviceAlertsState.message}</p>
                </div>
                <button type="button" className={`${s.switch} ${notificationsEnabled ? s.switchOn : ""}`} onClick={handleNotificationsToggle} disabled={notificationsDisabled} aria-pressed={notificationsEnabled} aria-label="Activar notificaciones">
                  <span className={s.switchThumb} />
                </button>
              </div>
              {sectionFeedback?.section === "notificaciones" ? <p className={sectionFeedback.kind === "error" ? s.error : s.success}>{sectionFeedback.message}</p> : null}
              <div className={s.sectionActions}>
                <button type="button" className={s.secondaryAction} onClick={() => void syncDeviceAlertsState()} disabled={isActivatingAlerts}>
                  {isActivatingAlerts ? "Activando..." : notificationsEnabled ? "Revisar estado" : "Activar alertas"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {(() => {
          const isDev = process.env.NODE_ENV !== "production";
          const isAdminOrFounder = rol === "admin" || rol === "founder";
          const showDiagnostico = isDev || isAdminOrFounder;

          if (!showDiagnostico) return null;

          return (
            <section className={`${s.accordion} ${openSection === "soporte" ? s.accordionOpen : ""}`}>
              <button type="button" className={s.accordionTrigger} onClick={() => setOpenSection((current) => (current === "soporte" ? null : "soporte"))} aria-expanded={openSection === "soporte"}>
                <div className={s.triggerMain}>
                  <div className={s.triggerIcon}><LuSmartphone aria-hidden /></div>
                  <div className={s.triggerCopy}>
                    <span className={s.cardEyebrow}>Diagnostico</span>
                    <strong>Diagnostico de la app</strong>
                    <p>Herramientas de soporte para este dispositivo</p>
                  </div>
                </div>
                <LuChevronDown className={s.chevron} aria-hidden />
              </button>

              <div className={s.accordionPanel}>
                <div className={s.accordionInner}>
                  <div className={s.fieldGrid}>
                    <article className={s.commercialInfoCard}>
                      <span className={s.label}>Version instalada</span>
                      <strong>{CURRENT_APP_VERSION}</strong>
                      <p>Version de Ventora en este dispositivo.</p>
                    </article>
                    <article className={s.commercialInfoCard}>
                      <span className={s.label}>Actualizacion</span>
                      <strong>Busca y aplica cambios</strong>
                      <p>Si hay una version nueva, la app se actualiza sin reinstalar.</p>
                    </article>
                  </div>

                  <div className={s.sectionActions}>
                    <button type="button" className={s.secondaryLink} onClick={() => void handleForceUpdate()} disabled={isUpdating}>
                      <LuRefreshCcw aria-hidden />
                      {isUpdating ? "Buscando..." : "Buscar actualizacion"}
                    </button>
                    <button type="button" className={s.secondaryLink} onClick={handleReiniciarApp} disabled={isReiniciando}>
                      <LuRefreshCcw aria-hidden />
                      {isReiniciando ? "Reparando..." : "Reparar app en este dispositivo"}
                    </button>
                  </div>
                  <p className={s.inlineInfo} style={{ marginTop: 10 }}>Usa estas opciones solo si la app no carga bien o soporte te lo solicita.</p>
                </div>
              </div>
            </section>
          );
        })()}

        <section className={`${s.accordion} ${openSection === "suscripcion" ? s.accordionOpen : ""}`}>
          <button
            type="button"
            className={s.accordionTrigger}
            onClick={() =>
              setOpenSection((current) =>
                current === "suscripcion" ? null : "suscripcion"
              )
            }
            aria-expanded={openSection === "suscripcion"}
          >
            <div className={s.triggerMain}>
              <div className={s.triggerIcon}>
                <LuCreditCard aria-hidden />
              </div>
              <div className={s.triggerCopy}>
                <span className={s.cardEyebrow}>Suscripcion</span>
                <strong>Suscripcion</strong>
                <p>{profile?.planCode ? getPlanLabel(profile.planCode) : "Sin plan"}</p>
              </div>
            </div>
            <div className={s.triggerMeta}>
              <span className={s.statePill} data-complete={profile?.subscription?.isActive === true}>
                {profile?.subscription?.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          </button>

          <div className={s.accordionPanel}>
            <div className={s.accordionInner}>
              <SubscriptionDetail summary={subscriptionSummary} />
            </div>
          </div>
        </section>
      </div>

      {!isQuoteOnlyPlan ? (
        <section className={s.utilityCard}>
          <span className={s.cardEyebrow}>Herramientas publicas</span>
          <div className={s.utilityActions}>
            <Link href="/configuracion/pagina-venta" className={s.secondaryLink}>
              <LuGlobe aria-hidden />
              Pagina publica
            </Link>
            <Link href="/solicitudes/canales" className={s.secondaryLink} prefetch={false}>
              <LuQrCode aria-hidden />
              Canales y QR
            </Link>
              <button type="button" className={s.secondaryLink} onClick={() => void handleCopyPublicLink()}>
                {publicLinkCopied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
                {publicLinkCopied ? "Copiado" : "Copiar texto + link"}
              </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
