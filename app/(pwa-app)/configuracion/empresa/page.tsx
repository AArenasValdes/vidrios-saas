"use client";

import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  LuBellRing,
  LuBuilding2,
  LuCheck,
  LuCopy,
  LuExternalLink,
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
  DEFAULT_ORGANIZATION_BRAND_COLOR,
  DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA,
  DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION,
  DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE,
  DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA,
  DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA,
  DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD,
  DEFAULT_SOLICITUD_PUBLICA_VALOR,
  formatDiasAtencionLabel,
  isOrganizationOpenAtDate,
} from "@/features/organization-profile/services/organization-profile.service";
import { resolvePushServiceWorkerRegistration } from "@/utils/pwa-service-worker";
import { resolvePublicAppUrl } from "@/utils/public-app-url";
import { subscribeToPushNotifications } from "@/utils/web-push";
import type { UpdateOrganizationProfileInput } from "@/features/organization-profile/types/organization-profile";

import s from "./page.module.css";

const BRAND_PRESETS = [
  "#4F7DD4",
  "#243B6B",
  "#2EA5E6",
  "#1DB98B",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];

const WEEK_DAY_OPTIONS = [
  { value: "1", label: "Lun" },
  { value: "2", label: "Mar" },
  { value: "3", label: "Mié" },
  { value: "4", label: "Jue" },
  { value: "5", label: "Vie" },
  { value: "6", label: "Sáb" },
  { value: "0", label: "Dom" },
];

const EMPTY_FORM: UpdateOrganizationProfileInput = {
  empresaNombre: "",
  empresaLogoUrl: null,
  empresaDireccion: "",
  empresaTelefono: "",
  empresaEmail: "",
  brandColor: DEFAULT_ORGANIZATION_BRAND_COLOR,
  formaPago: "",
  solicitudPublicaSlug: "",
  solicitudPublicaDescripcionCorta: DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA,
  solicitudPublicaValor: DEFAULT_SOLICITUD_PUBLICA_VALOR,
  solicitudPublicaMensajeConfianza: DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA,
  solicitudPublicaPrivacidad: DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD,
  solicitudPublicaHorarioDesde: DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE,
  solicitudPublicaHorarioHasta: DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA,
  solicitudPublicaDiasAtencion: [...DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION],
  proveedorPreferido: "",
  modoPrecioPreferido: "margen",
  margenDefecto: 100,
};

type DeviceAlertsState = {
  kind: "checking" | "enabled" | "available" | "unsupported" | "error";
  message: string;
};

function supportsPushAlerts() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(
      payload?.error ?? "No pudimos guardar las alertas para este dispositivo."
    );
  }
}

export default function ConfiguracionEmpresaPage() {
  const { profile, isReady, isSaving, isUploading, saveProfile, uploadLogo } =
    useOrganizationProfile();
  const [form, setForm] = useState<UpdateOrganizationProfileInput>(EMPTY_FORM);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publicLinkMessage, setPublicLinkMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deviceAlertsState, setDeviceAlertsState] = useState<DeviceAlertsState>({
    kind: "checking",
    message: "Revisando si este dispositivo puede recibir notificaciones.",
  });
  const [isActivatingAlerts, setIsActivatingAlerts] = useState(false);
  const deferredPreviewForm = useDeferredValue(form);

  useEffect(() => {
    if (!profile) {
      return;
    }

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
      proveedorPreferido: profile.proveedorPreferido,
      modoPrecioPreferido: profile.modoPrecioPreferido,
      margenDefecto: profile.margenDefecto,
    });
  }, [profile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const previewModel = useMemo(() => {
    const empresaNombre = deferredPreviewForm.empresaNombre || "Mi empresa";
    const solicitudPublicaDiasAtencion =
      deferredPreviewForm.solicitudPublicaDiasAtencion?.length
        ? deferredPreviewForm.solicitudPublicaDiasAtencion
        : [...DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION];
    const solicitudPublicaHorarioDesde =
      deferredPreviewForm.solicitudPublicaHorarioDesde ||
      DEFAULT_SOLICITUD_PUBLICA_HORARIO_DESDE;
    const solicitudPublicaHorarioHasta =
      deferredPreviewForm.solicitudPublicaHorarioHasta ||
      DEFAULT_SOLICITUD_PUBLICA_HORARIO_HASTA;

    return {
      initials: buildOrganizationInitials(empresaNombre),
      logoPreview: previewUrl ?? deferredPreviewForm.empresaLogoUrl,
      empresaNombre,
      empresaDireccion: deferredPreviewForm.empresaDireccion || "Dirección comercial",
      empresaTelefono: deferredPreviewForm.empresaTelefono || "Teléfono",
      empresaEmail: deferredPreviewForm.empresaEmail || "Email",
      brandColor: deferredPreviewForm.brandColor,
      solicitudPublicaDescripcionCorta:
        deferredPreviewForm.solicitudPublicaDescripcionCorta ||
        DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA,
      solicitudPublicaValor:
        deferredPreviewForm.solicitudPublicaValor || DEFAULT_SOLICITUD_PUBLICA_VALOR,
      solicitudPublicaMensajeConfianza:
        deferredPreviewForm.solicitudPublicaMensajeConfianza ||
        DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA,
      solicitudPublicaPrivacidad:
        deferredPreviewForm.solicitudPublicaPrivacidad ||
        DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD,
      horarioLabel: `${formatDiasAtencionLabel(solicitudPublicaDiasAtencion)} · ${solicitudPublicaHorarioDesde} a ${solicitudPublicaHorarioHasta}`,
      isAvailable: isOrganizationOpenAtDate({
        days: solicitudPublicaDiasAtencion,
        from: solicitudPublicaHorarioDesde,
        to: solicitudPublicaHorarioHasta,
      }),
    };
  }, [deferredPreviewForm, previewUrl]);

  const isCustomBrandColor = useMemo(
    () =>
      !BRAND_PRESETS.some(
        (color) => color.toLowerCase() === form.brandColor.toLowerCase()
      ),
    [form.brandColor]
  );

  const publicRequestUrl = useMemo(() => {
    const slug = form.solicitudPublicaSlug?.trim() || "mi-empresa";
    return `${resolvePublicAppUrl()}/solicitud/${slug}`;
  }, [form.solicitudPublicaSlug]);

  const persistedPublicRequestUrl = useMemo(() => {
    const slug =
      profile?.solicitudPublicaSlug?.trim() ||
      form.solicitudPublicaSlug?.trim() ||
      "mi-empresa";
    return `${resolvePublicAppUrl({ preferLocal: true })}/solicitud/${slug}`;
  }, [form.solicitudPublicaSlug, profile?.solicitudPublicaSlug]);

  const syncDeviceAlertsState = useCallback(async () => {
    if (!supportsPushAlerts()) {
      setDeviceAlertsState({
        kind: "unsupported",
        message:
          "Este acceso no admite alertas push. En iPhone usa Safari instalado como app; en desktop usa Chrome o Edge.",
      });
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

    if (!vapidPublicKey) {
      setDeviceAlertsState({
        kind: "error",
        message: "Falta la clave pública de notificaciones en la configuración del proyecto.",
      });
      return;
    }

    try {
      if (Notification.permission !== "granted") {
        setDeviceAlertsState({
          kind: "available",
          message:
            "Activa alertas en este dispositivo para enterarte cuando un cliente apruebe, rechace o requiera seguimiento.",
        });
        return;
      }

      const registration = await resolvePushServiceWorkerRegistration();
      const existingSubscription = await registration.pushManager.getSubscription();

      if (!existingSubscription) {
        setDeviceAlertsState({
          kind: "available",
          message:
            "Las alertas están permitidas, pero este dispositivo todavía no quedó suscrito.",
        });
        return;
      }

      await persistSubscription(existingSubscription);
      setDeviceAlertsState({
        kind: "enabled",
        message: "Este dispositivo ya recibe alertas de respuesta y seguimiento comercial.",
      });
    } catch (error) {
      setDeviceAlertsState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos revisar el estado de alertas de este dispositivo.",
      });
    }
  }, []);

  useEffect(() => {
    void syncDeviceAlertsState();
  }, [syncDeviceAlertsState]);

  const handleFieldChange = useCallback(
    <K extends keyof UpdateOrganizationProfileInput>(
      key: K,
      value: UpdateOrganizationProfileInput[K]
    ) => {
      setForm((current) => ({ ...current, [key]: value }));
      setStatusMessage(null);
      setErrorMessage(null);
      setPublicLinkMessage(null);
    },
    []
  );

  const handleToggleBusinessDay = useCallback((day: string) => {
    setForm((current) => {
      const currentDays = new Set(current.solicitudPublicaDiasAtencion ?? []);

      if (currentDays.has(day)) {
        currentDays.delete(day);
      } else {
        currentDays.add(day);
      }

      return {
        ...current,
        solicitudPublicaDiasAtencion: Array.from(currentDays).sort(
          (left, right) => Number(left) - Number(right)
        ),
      };
    });
    setStatusMessage(null);
    setErrorMessage(null);
    setPublicLinkMessage(null);
  }, []);

  const handleCopyPublicLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicRequestUrl);
      setPublicLinkMessage("Enlace copiado.");
    } catch {
      setPublicLinkMessage("No pudimos copiar el enlace en este dispositivo.");
    }
  }, [publicRequestUrl]);

  const handleLogoChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const nextPreview = URL.createObjectURL(file);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return nextPreview;
      });
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        const logoUrl = await uploadLogo(file);
        handleFieldChange("empresaLogoUrl", logoUrl);
        setPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }

          return null;
        });
        setStatusMessage("Logo subido. Guarda la configuración para dejarlo aplicado.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo subir el logo"
        );
      } finally {
        event.target.value = "";
      }
    },
    [handleFieldChange, uploadLogo]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      try {
        setErrorMessage(null);
        setStatusMessage(null);
        await saveProfile(form);
        setStatusMessage("Configuración guardada correctamente.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo guardar la configuración"
        );
      }
    },
    [form, saveProfile]
  );

  const handleEnableDeviceAlerts = useCallback(async () => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

    if (!vapidPublicKey) {
      setDeviceAlertsState({
        kind: "error",
        message: "Falta la clave pública de notificaciones en la configuración del proyecto.",
      });
      return;
    }

    try {
      setIsActivatingAlerts(true);
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setDeviceAlertsState({
          kind: "available",
          message: "Debes permitir las notificaciones del navegador para activarlas.",
        });
        return;
      }

      const subscription = await subscribeToPushNotifications(vapidPublicKey);

      await persistSubscription(subscription);
      setDeviceAlertsState({
        kind: "enabled",
        message: "Alertas activas. Este dispositivo quedó listo para respuestas y seguimiento.",
      });
    } catch (error) {
      setDeviceAlertsState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos activar las alertas en este dispositivo.",
      });
    } finally {
      setIsActivatingAlerts(false);
    }
  }, []);

  const notificationsEnabled = deviceAlertsState.kind === "enabled";
  const canToggleNotifications =
    deviceAlertsState.kind === "available" || deviceAlertsState.kind === "error";
  const notificationsDisabled =
    isActivatingAlerts ||
    deviceAlertsState.kind === "checking" ||
    deviceAlertsState.kind === "unsupported";

  const handleNotificationsToggle = useCallback(() => {
    if (notificationsEnabled) {
      void syncDeviceAlertsState();
      return;
    }

    if (canToggleNotifications) {
      void handleEnableDeviceAlerts();
    }
  }, [canToggleNotifications, handleEnableDeviceAlerts, notificationsEnabled, syncDeviceAlertsState]);

  if (!isReady && !profile) {
    return (
      <div className={s.root}>
        <div className={s.loadingState}>Cargando tu configuración comercial...</div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <form id="organization-profile-form" className={s.content} onSubmit={handleSubmit}>
        <section className={s.previewCard}>
          <div
            className={s.previewShell}
            style={{ ["--brand" as string]: previewModel.brandColor }}
          >
            <div className={s.previewTop}>
              <p>Así verá tu cliente tu empresa</p>
            </div>
            <div className={s.previewBody}>
              <div className={s.previewAvailability} data-active={previewModel.isAvailable}>
                {previewModel.isAvailable ? "ON" : "OFF"} · {previewModel.horarioLabel}
              </div>
              <div className={s.previewIdentity}>
                {previewModel.logoPreview ? (
                  <Image
                    className={s.previewLogoImage}
                    src={previewModel.logoPreview}
                    alt={previewModel.empresaNombre || "Logo de la empresa"}
                    width={72}
                    height={72}
                    unoptimized
                  />
                ) : (
                  <div className={s.previewLogoFallback}>{previewModel.initials}</div>
                )}

                <div className={s.previewData}>
                  <strong>{previewModel.empresaNombre}</strong>
                  <div className={s.previewLine}>
                    <LuMapPin aria-hidden />
                    <span>{previewModel.empresaDireccion}</span>
                  </div>
                  <div className={s.previewLine}>
                    <LuPhone aria-hidden />
                    <span>{previewModel.empresaTelefono}</span>
                  </div>
                  <div className={s.previewLine}>
                    <LuMail aria-hidden />
                    <span>{previewModel.empresaEmail}</span>
                  </div>
                </div>
              </div>

              <div className={s.previewPublicContent}>
                <p className={s.previewDescription}>
                  {previewModel.solicitudPublicaDescripcionCorta}
                </p>
                <div className={s.previewTrustBox}>
                  <strong>{previewModel.solicitudPublicaValor}</strong>
                  <span>{previewModel.solicitudPublicaMensajeConfianza}</span>
                </div>
                <p className={s.previewPrivacy}>{previewModel.solicitudPublicaPrivacidad}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionTitle}>
            <LuBuilding2 aria-hidden />
            <span>Datos de empresa</span>
          </div>

          <div className={s.card}>
            <label className={s.field}>
              <span className={s.label}>Nombre empresa</span>
              <input
                className={s.input}
                value={form.empresaNombre}
                onChange={(event) => handleFieldChange("empresaNombre", event.target.value)}
                placeholder="Ej: Vidrios Ventora SpA"
              />
            </label>

            <label className={s.field}>
              <span className={s.label}>Teléfono</span>
              <input
                className={s.input}
                value={form.empresaTelefono}
                onChange={(event) => handleFieldChange("empresaTelefono", event.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </label>

            <label className={s.field}>
              <span className={s.label}>Dirección</span>
              <input
                className={s.input}
                value={form.empresaDireccion}
                onChange={(event) => handleFieldChange("empresaDireccion", event.target.value)}
                placeholder="Ej: Av. Apoquindo 4501, Las Condes"
              />
            </label>

            <label className={s.field}>
              <span className={s.label}>Email</span>
              <input
                className={s.input}
                value={form.empresaEmail}
                onChange={(event) => handleFieldChange("empresaEmail", event.target.value)}
                placeholder="contacto@ventora.cl"
              />
            </label>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionTitle}>
            <LuPalette aria-hidden />
            <span>Marca</span>
          </div>

          <div className={s.card}>
            <div className={s.field}>
              <span className={s.label}>Color de marca</span>
              <div className={s.swatchRow}>
                {BRAND_PRESETS.map((color) => {
                  const isActive = form.brandColor.toLowerCase() === color.toLowerCase();

                  return (
                    <button
                      key={color}
                      className={`${s.colorSwatch} ${isActive ? s.colorSwatchActive : ""}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleFieldChange("brandColor", color)}
                      type="button"
                      aria-label={`Usar color ${color}`}
                      aria-pressed={isActive}
                    >
                      {isActive ? <LuCheck aria-hidden /> : null}
                    </button>
                  );
                })}

                <label
                  className={`${s.customColor} ${isCustomBrandColor ? s.customColorActive : ""}`}
                >
                  <span
                    className={s.customColorPreview}
                    style={{ backgroundColor: form.brandColor }}
                    aria-hidden
                  />
                  <span className={s.customColorLabel}>Otro</span>
                  <input
                    type="color"
                    value={form.brandColor}
                    onChange={(event) => handleFieldChange("brandColor", event.target.value)}
                    aria-label="Elegir color personalizado"
                  />
                </label>
              </div>
              <span className={s.helpText}>Este color se aplicará en tu PDF.</span>
            </div>

            <div className={s.divider} />

            <div className={s.field}>
              <span className={s.label}>Logo</span>
              <label className={s.logoUpload}>
                <div className={s.logoUploadIcon}>
                  <LuImagePlus aria-hidden />
                </div>
                <div className={s.logoUploadBody}>
                  <strong>{isUploading ? "Subiendo logo..." : "Subir logo"}</strong>
                  <span>PNG o JPG · mínimo 256×256</span>
                </div>
                <div className={s.logoUploadAction}>↑</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionTitle}>
            <LuSettings2 aria-hidden />
            <span>Configuración comercial</span>
          </div>

          <div className={s.card}>
            <label className={s.field}>
              <span className={s.label}>Forma de pago</span>
              <textarea
                className={s.textarea}
                rows={3}
                value={form.formaPago}
                onChange={(event) => handleFieldChange("formaPago", event.target.value)}
                placeholder="Ej: 50% al iniciar, 50% contra entrega"
              />
            </label>

            <p className={s.helpText}>Aparecerá en cada cotización enviada al cliente.</p>

            <div className={s.divider} />

            <div className={s.staticInfo}>
              <span className={s.label}>Modo de precio</span>
              <strong>Todos los valores incluyen IVA (19%)</strong>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionTitle}>
            <LuBuilding2 aria-hidden />
            <span>Solicitud pública</span>
          </div>

          <div className={s.card}>
            <label className={s.field}>
              <span className={s.label}>Slug público</span>
              <input
                className={s.input}
                value={form.solicitudPublicaSlug}
                onChange={(event) =>
                  handleFieldChange("solicitudPublicaSlug", event.target.value)
                }
                placeholder="ej: vidrios-ventora"
              />
            </label>

              <p className={s.helpText}>
                Tu enlace quedará como <strong>/solicitud/{form.solicitudPublicaSlug || "mi-empresa"}</strong>.
              </p>

              <div className={s.publicLinkPanel}>
                <div className={s.publicLinkBox}>
                  <span className={s.label}>Enlace público</span>
                  <strong>{publicRequestUrl}</strong>
                </div>

                <div className={s.publicLinkActions}>
                  <button
                    type="button"
                    className={s.secondaryAction}
                    onClick={() => void handleCopyPublicLink()}
                  >
                    <LuCopy aria-hidden />
                    Copiar enlace
                  </button>
                  <a
                    className={s.secondaryAction}
                    href={persistedPublicRequestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                      <LuExternalLink aria-hidden />
                      Ver página pública
                    </a>
                    <Link
                      href="/solicitudes/canales"
                      className={s.secondaryAction}
                      prefetch={false}
                    >
                      <LuQrCode aria-hidden />
                      Canales y QR
                    </Link>
                  </div>
                </div>

              <p className={s.helpText}>
                Usa este enlace en Instagram, Facebook, tarjetas, QR o WhatsApp Business.
              </p>
              {publicLinkMessage ? (
                <p className={s.helpText}>{publicLinkMessage}</p>
              ) : null}

              <div className={s.divider} />

            <label className={s.field}>
              <span className={s.label}>Descripción corta</span>
              <textarea
                className={s.textarea}
                rows={3}
                value={form.solicitudPublicaDescripcionCorta}
                onChange={(event) =>
                  handleFieldChange(
                    "solicitudPublicaDescripcionCorta",
                    event.target.value
                  )
                }
                placeholder={DEFAULT_SOLICITUD_PUBLICA_DESCRIPCION_CORTA}
              />
              <span className={s.helpText}>
                Debe explicar rápido qué hace tu empresa y qué tipo de trabajo recibe.
              </span>
            </label>

            <label className={s.field}>
              <span className={s.label}>Mensaje de valor</span>
              <textarea
                className={s.textarea}
                rows={3}
                value={form.solicitudPublicaValor}
                onChange={(event) =>
                  handleFieldChange("solicitudPublicaValor", event.target.value)
                }
                placeholder={DEFAULT_SOLICITUD_PUBLICA_VALOR}
              />
            </label>

            <label className={s.field}>
              <span className={s.label}>Mensaje de confianza</span>
              <textarea
                className={s.textarea}
                rows={3}
                value={form.solicitudPublicaMensajeConfianza}
                onChange={(event) =>
                  handleFieldChange(
                    "solicitudPublicaMensajeConfianza",
                    event.target.value
                  )
                }
                placeholder={DEFAULT_SOLICITUD_PUBLICA_MENSAJE_CONFIANZA}
              />
            </label>

            <div className={s.scheduleGrid}>
              <label className={s.field}>
                <span className={s.label}>Horario desde</span>
                <input
                  className={s.input}
                  type="time"
                  value={form.solicitudPublicaHorarioDesde}
                  onChange={(event) =>
                    handleFieldChange(
                      "solicitudPublicaHorarioDesde",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className={s.field}>
                <span className={s.label}>Horario hasta</span>
                <input
                  className={s.input}
                  type="time"
                  value={form.solicitudPublicaHorarioHasta}
                  onChange={(event) =>
                    handleFieldChange(
                      "solicitudPublicaHorarioHasta",
                      event.target.value
                    )
                  }
                />
              </label>
            </div>

            <div className={s.field}>
              <span className={s.label}>Días de atención</span>
              <div className={s.dayChips}>
                {WEEK_DAY_OPTIONS.map((day) => {
                  const isActive = form.solicitudPublicaDiasAtencion.includes(day.value);

                  return (
                    <button
                      key={day.value}
                      type="button"
                      className={`${s.dayChip} ${isActive ? s.dayChipActive : ""}`}
                      onClick={() => handleToggleBusinessDay(day.value)}
                      aria-pressed={isActive}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <span className={s.helpText}>
                Esto define si la landing muestra tu empresa como ON u OFF.
              </span>
            </div>

            <label className={s.field}>
              <span className={s.label}>Mensaje de privacidad</span>
              <textarea
                className={s.textarea}
                rows={3}
                value={form.solicitudPublicaPrivacidad}
                onChange={(event) =>
                  handleFieldChange(
                    "solicitudPublicaPrivacidad",
                    event.target.value
                  )
                }
                placeholder={DEFAULT_SOLICITUD_PUBLICA_PRIVACIDAD}
              />
            </label>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionTitle}>
            <LuBellRing aria-hidden />
            <span>Notificaciones</span>
          </div>

          <div className={s.card}>
            <div className={s.notificationsRow}>
              <div className={s.notificationsCopy}>
                <strong>Recibir notificaciones</strong>
                <p>Avisos de cotizaciones nuevas, aprobadas y recordatorios.</p>
              </div>

              <button
                className={`${s.switch} ${notificationsEnabled ? s.switchOn : ""}`}
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label="Recibir notificaciones"
                onClick={handleNotificationsToggle}
                disabled={notificationsDisabled}
              >
                <span className={s.switchThumb} />
              </button>
            </div>

            <p className={s.helpText}>{deviceAlertsState.message}</p>
          </div>
        </section>

        {errorMessage ? <div className={s.error}>{errorMessage}</div> : null}
        {statusMessage ? <div className={s.success}>{statusMessage}</div> : null}

      </form>

      <div className={s.footerActions}>
        <button
          className={s.saveButton}
          type="submit"
          form="organization-profile-form"
          disabled={isSaving || isUploading}
        >
          <LuSave aria-hidden />
          {isSaving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}


