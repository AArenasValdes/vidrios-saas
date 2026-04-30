"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  LuBellRing,
  LuBuilding2,
  LuCheck,
  LuImagePlus,
  LuMail,
  LuMapPin,
  LuPalette,
  LuPhone,
  LuSave,
  LuSettings2,
} from "react-icons/lu";

import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildOrganizationInitials,
  DEFAULT_ORGANIZATION_BRAND_COLOR,
} from "@/features/organization-profile/services/organization-profile.service";
import { resolvePushServiceWorkerRegistration } from "@/utils/pwa-service-worker";
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

const EMPTY_FORM: UpdateOrganizationProfileInput = {
  empresaNombre: "",
  empresaLogoUrl: null,
  empresaDireccion: "",
  empresaTelefono: "",
  empresaEmail: "",
  brandColor: DEFAULT_ORGANIZATION_BRAND_COLOR,
  formaPago: "",
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

    return {
      initials: buildOrganizationInitials(empresaNombre),
      logoPreview: previewUrl ?? deferredPreviewForm.empresaLogoUrl,
      empresaNombre,
      empresaDireccion: deferredPreviewForm.empresaDireccion || "Dirección comercial",
      empresaTelefono: deferredPreviewForm.empresaTelefono || "Teléfono",
      empresaEmail: deferredPreviewForm.empresaEmail || "Email",
      brandColor: deferredPreviewForm.brandColor,
    };
  }, [deferredPreviewForm, previewUrl]);

  const isCustomBrandColor = useMemo(
    () =>
      !BRAND_PRESETS.some(
        (color) => color.toLowerCase() === form.brandColor.toLowerCase()
      ),
    [form.brandColor]
  );

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
    },
    []
  );

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
