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
  LuEye,
  LuGlobe,
  LuImagePlus,
  LuMail,
  LuMapPin,
  LuPalette,
  LuPhone,
  LuQrCode,
  LuSave,
  LuSettings2,
} from "react-icons/lu";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildOrganizationInitials,
  buildDefaultSolicitudPublicaHorarioPorDia,
  DEFAULT_ORGANIZATION_BRAND_COLOR,
} from "@/features/organization-profile/services/organization-profile.service";
import type { UpdateOrganizationProfileInput } from "@/features/organization-profile/types/organization-profile";
import { resolvePushServiceWorkerRegistration } from "@/utils/pwa-service-worker";
import { resolvePublicAppUrl } from "@/utils/public-app-url";
import { subscribeToPushNotifications } from "@/utils/web-push";

import s from "./page.module.css";

const BRAND_PRESETS = ["#4F7DD4", "#243B6B", "#2EA5E6", "#1DB98B", "#F59E0B", "#EF4444", "#8B5CF6"];

const EMPTY_FORM: UpdateOrganizationProfileInput = {
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
  solicitudPublicaDiasAtencion: ["1", "2", "3", "4", "5", "6"],
  solicitudPublicaHorarioPorDia: buildDefaultSolicitudPublicaHorarioPorDia(),
  proveedorPreferido: "",
  modoPrecioPreferido: "margen",
  margenDefecto: 100,
  publicName: "",
  publicSubtitle: "",
  publicZone: "",
  publicBusinessType: "",
  secondaryColor: "",
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
};

type SectionId = "empresa" | "marca" | "comercial" | "notificaciones";
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
const pricingLabel = (value: UpdateOrganizationProfileInput["modoPrecioPreferido"]) =>
  value === "precio_directo" ? "Precio directo" : "Margen sobre costo";
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
  const { profile, isReady, isSaving, isUploading, saveProfile, uploadLogo } =
    useOrganizationProfile();
  const [form, setForm] = useState<UpdateOrganizationProfileInput>(EMPTY_FORM);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionId | null>("empresa");
  const [savingSection, setSavingSection] = useState<SectionId | null>(null);
  const [sectionFeedback, setSectionFeedback] = useState<SectionFeedback | null>(null);
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);
  const [deviceAlertsState, setDeviceAlertsState] = useState<DeviceAlertsState>({
    kind: "checking",
    message: "Revisando este dispositivo.",
  });
  const [isActivatingAlerts, setIsActivatingAlerts] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      empresaNombre: profile.empresaNombre,
      empresaLogoUrl: profile.empresaLogoUrl,
      empresaDireccion: profile.empresaDireccion,
      empresaTelefono: profile.empresaTelefono,
      empresaEmail: profile.empresaEmail,
      brandColor: profile.brandColor,
      formaPago: profile.formaPago,
      solicitudPublicaSlug: profile.solicitudPublicaSlug,
      solicitudPublicaDescripcionCorta: profile.solicitudPublicaDescripcionCorta,
      solicitudPublicaValor: profile.solicitudPublicaValor,
      solicitudPublicaMensajeConfianza: profile.solicitudPublicaMensajeConfianza,
      solicitudPublicaPrivacidad: profile.solicitudPublicaPrivacidad,
      solicitudPublicaHorarioDesde: profile.solicitudPublicaHorarioDesde,
      solicitudPublicaHorarioHasta: profile.solicitudPublicaHorarioHasta,
      solicitudPublicaDiasAtencion: profile.solicitudPublicaDiasAtencion,
      solicitudPublicaHorarioPorDia: profile.solicitudPublicaHorarioPorDia,
      proveedorPreferido: profile.proveedorPreferido,
      modoPrecioPreferido: profile.modoPrecioPreferido,
      margenDefecto: profile.margenDefecto,
      publicName: profile.publicName,
      publicSubtitle: profile.publicSubtitle,
      publicZone: profile.publicZone,
      publicBusinessType: profile.publicBusinessType,
      secondaryColor: profile.secondaryColor,
      heroMode: profile.heroMode,
      heroImageUrl: profile.heroImageUrl,
      heroTitle: profile.heroTitle,
      heroSubtitle: profile.heroSubtitle,
      showGallery: profile.showGallery,
      showSchedule: profile.showSchedule,
      showRating: profile.showRating,
      ratingLabel: profile.ratingLabel,
      jobsCountLabel: profile.jobsCountLabel,
      formTitle: profile.formTitle,
      formSubtitle: profile.formSubtitle,
      isPublished: profile.isPublished,
    });
  }, [profile]);

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

  const handleFieldChange = useCallback(
    <K extends keyof UpdateOrganizationProfileInput>(
      key: K,
      value: UpdateOrganizationProfileInput[K]
    ) => {
      setForm((current) => ({ ...current, [key]: value }));
      setSectionFeedback(null);
    },
    []
  );

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
        await saveProfile(form);
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

  const handleCopyPublicLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicRequestUrl);
      setPublicLinkCopied(true);
    } catch {
      setSectionFeedback({
        section: "empresa",
        kind: "error",
        message: "No pudimos copiar el link en este dispositivo.",
      });
    }
  }, [publicRequestUrl]);

  const companyComplete = Boolean(
    form.empresaNombre.trim() &&
      form.empresaTelefono.trim() &&
      form.empresaEmail.trim() &&
      form.empresaDireccion.trim()
  );
  const brandComplete = Boolean(form.brandColor.trim() && (form.empresaLogoUrl || previewUrl));
  const commercialComplete = Boolean(form.formaPago.trim() && form.modoPrecioPreferido);
  const notificationsComplete = notificationsEnabled;

  const companySummary = compactJoin([
    form.empresaNombre.trim() || "Empresa sin nombre",
    form.empresaTelefono.trim() || "Sin telefono",
    form.empresaEmail.trim() || "Sin email",
  ]);
  const brandSummary = compactJoin([
    form.brandColor.toUpperCase(),
    form.empresaLogoUrl || previewUrl ? "Logo subido" : "Sin logo",
  ]);
  const commercialSummary = compactJoin([
    shorten(form.formaPago || "Forma de pago pendiente", 34),
    pricingLabel(form.modoPrecioPreferido),
    "IVA incluido",
  ]);
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
    <div className={s.root}>
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
                    width={56}
                    height={56}
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
                  <span className={s.label}>Nombre empresa</span>
                  <input className={s.input} value={form.empresaNombre} onChange={(event) => handleFieldChange("empresaNombre", event.target.value)} placeholder="Ej: Vidrieria San Marco" />
                </label>
                <label className={s.field}>
                  <span className={s.label}>Telefono</span>
                  <input className={s.input} value={form.empresaTelefono} onChange={(event) => handleFieldChange("empresaTelefono", event.target.value)} placeholder="+56 9 1234 5678" />
                </label>
                <label className={s.field}>
                  <span className={s.label}>Direccion</span>
                  <input className={s.input} value={form.empresaDireccion} onChange={(event) => handleFieldChange("empresaDireccion", event.target.value)} placeholder="Ej: Apoquindo 4501, Las Condes" />
                </label>
                <label className={s.field}>
                  <span className={s.label}>Email</span>
                  <input className={s.input} value={form.empresaEmail} onChange={(event) => handleFieldChange("empresaEmail", event.target.value)} placeholder="contacto@empresa.cl" />
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

              <div className={s.field}>
                <span className={s.label}>Modo de precio</span>
                <div className={s.modeGrid}>
                  {[
                    { value: "margen" as const, label: "Margen sobre costo", hint: "Recomendado para cotizar" },
                    { value: "precio_directo" as const, label: "Precio directo", hint: "Precio final manual" },
                  ].map((option) => {
                    const isActive = form.modoPrecioPreferido === option.value;
                    return (
                      <button key={option.value} type="button" className={`${s.modeCard} ${isActive ? s.modeCardActive : ""}`} onClick={() => handleFieldChange("modoPrecioPreferido", option.value)} aria-pressed={isActive}>
                        <strong>{option.label}</strong>
                        <span>{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className={s.inlineInfo}>Todos los valores de tus cotizaciones incluyen IVA.</p>
              {sectionFeedback?.section === "comercial" ? <p className={sectionFeedback.kind === "error" ? s.error : s.success}>{sectionFeedback.message}</p> : null}
              <div className={s.sectionActions}>
                <button type="button" className={s.saveButton} onClick={() => void handleSaveSection("comercial")} disabled={isSaving || savingSection === "comercial"}>
                  <LuSave aria-hidden />
                  {savingSection === "comercial" ? "Guardando..." : "Guardar configuracion"}
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
      </div>

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
            {publicLinkCopied ? "Copiado" : "Copiar link"}
          </button>
        </div>
      </section>
    </div>
  );
}
