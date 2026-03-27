"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { LuBellRing, LuImagePlus, LuSave } from "react-icons/lu";

import { useOrganizationProfile } from "@/hooks/useOrganizationProfile";
import {
  buildOrganizationInitials,
  DEFAULT_ORGANIZATION_BRAND_COLOR,
} from "@/services/organization-profile.service";
import { resolvePushServiceWorkerRegistration } from "@/utils/pwa-service-worker";
import { subscribeToPushNotifications } from "@/utils/web-push";
import type { UpdateOrganizationProfileInput } from "@/types/organization-profile";
import type { PricingMode } from "@/types/pricing-mode";

import s from "./page.module.css";

const BRAND_PRESETS = [
  "#1a3a5c",
  "#243b6b",
  "#335ea9",
  "#2f6f87",
  "#2d7a5f",
  "#8c5a2b",
  "#8b2f3f",
  "#5a3d8b",
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
      empresaDireccion: deferredPreviewForm.empresaDireccion || "Direccion comercial",
      empresaTelefono: deferredPreviewForm.empresaTelefono || "Telefono",
      empresaEmail: deferredPreviewForm.empresaEmail || "Email",
      brandColor: deferredPreviewForm.brandColor,
      formaPago: deferredPreviewForm.formaPago || "A convenir",
    };
  }, [deferredPreviewForm, previewUrl]);

  const syncDeviceAlertsState = useCallback(async () => {
    if (!supportsPushAlerts()) {
      setDeviceAlertsState({
        kind: "unsupported",
        message:
          "Este navegador no expone alertas push web en este acceso. Si necesitas avisos reales, usa un navegador compatible o instala la app.",
      });
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

    if (!vapidPublicKey) {
      setDeviceAlertsState({
        kind: "error",
        message: "Falta la clave publica de notificaciones en la configuracion del proyecto.",
      });
      return;
    }

    try {
      if (Notification.permission !== "granted") {
        setDeviceAlertsState({
          kind: "available",
          message:
            "Puedes activar alertas en este equipo para enterarte cuando envies una cotizacion y cuando el cliente la apruebe o rechace.",
        });
        return;
      }

      const registration = await resolvePushServiceWorkerRegistration();
      const existingSubscription = await registration.pushManager.getSubscription();

      if (!existingSubscription) {
        setDeviceAlertsState({
          kind: "available",
          message:
            "Las alertas estan permitidas, pero todavia no hay una suscripcion activa en este dispositivo.",
        });
        return;
      }

      await persistSubscription(existingSubscription);
      setDeviceAlertsState({
        kind: "enabled",
        message:
          "Este dispositivo ya recibe alertas cuando envias una cotizacion y cuando el cliente responde.",
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

  const handleFieldChange = useCallback(<K extends keyof UpdateOrganizationProfileInput>(
    key: K,
    value: UpdateOrganizationProfileInput[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setStatusMessage(null);
    setErrorMessage(null);
  }, []);

  const handleLogoChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
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
      setStatusMessage("Logo subido. Guarda el perfil para dejarlo aplicado.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo subir el logo"
      );
    } finally {
      event.target.value = "";
    }
  }, [handleFieldChange, uploadLogo]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setErrorMessage(null);
      setStatusMessage(null);
      await saveProfile(form);
      setStatusMessage("Perfil de empresa guardado correctamente.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el perfil"
      );
    }
  }, [form, saveProfile]);

  const handleEnableDeviceAlerts = useCallback(async () => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

    if (!vapidPublicKey) {
      setDeviceAlertsState({
        kind: "error",
        message: "Falta la clave publica de notificaciones en la configuracion del proyecto.",
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
        message:
          "Alertas activas. Este dispositivo quedo listo para recibir envios, aprobaciones y rechazos.",
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

  const deviceAlertsBadge = useMemo(() => {
    if (deviceAlertsState.kind === "enabled") {
      return { label: "Activas", className: s.deviceAlertsBadgeSuccess };
    }

    if (deviceAlertsState.kind === "available") {
      return { label: "Pendientes", className: s.deviceAlertsBadgePending };
    }

    if (deviceAlertsState.kind === "unsupported") {
      return { label: "No disponible", className: s.deviceAlertsBadgeNeutral };
    }

    if (deviceAlertsState.kind === "error") {
      return { label: "Revisar", className: s.deviceAlertsBadgeError };
    }

    return { label: "Revisando", className: s.deviceAlertsBadgeNeutral };
  }, [deviceAlertsState.kind]);

  const deviceAlertsSummary = useMemo(() => {
    if (deviceAlertsState.kind === "enabled") {
      return {
        title: "Este equipo ya esta cubierto",
        helper:
          "Cuando envies una cotizacion o el cliente responda, este dispositivo podra recibir el aviso.",
        actionLabel: "Revisar este dispositivo",
      };
    }

    if (deviceAlertsState.kind === "available") {
      return {
        title: "Puedes activarlas ahora",
        helper:
          "Hazlo una sola vez en este equipo para recibir avisos de envio, aprobacion y rechazo.",
        actionLabel: "Activar alertas en este equipo",
      };
    }

    if (deviceAlertsState.kind === "error") {
      return {
        title: "Hace falta revisar este equipo",
        helper:
          "La activacion no termino bien. Vuelve a intentarlo y, si falla, revisa permisos del navegador.",
        actionLabel: "Reintentar activacion",
      };
    }

    if (deviceAlertsState.kind === "unsupported") {
      return {
        title: "Este acceso no admite push web",
        helper:
          "Para tener avisos reales, usa un navegador compatible o instala la app en el celular.",
        actionLabel: null,
      };
    }

    return {
      title: "Revisando compatibilidad del equipo",
      helper: "Estamos validando si este dispositivo puede recibir alertas push.",
      actionLabel: null,
    };
  }, [deviceAlertsState.kind]);

  if (!isReady && !profile) {
    return (
      <div className={s.root}>
        <section className={s.card}>
          <p className={s.eyebrow}>Configuracion</p>
          <h1 className={s.title}>Empresa</h1>
          <p className={s.subtitle}>Cargando tu perfil comercial...</p>
        </section>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <section className={s.hero}>
        <div>
          <p className={s.eyebrow}>Configuracion</p>
          <h1 className={s.title}>Perfil de empresa</h1>
          <p className={s.subtitle}>
            Define tu marca para que el PDF salga con tu logo, tus datos y tu color
            comercial.
          </p>
        </div>
        <button
          className={s.primaryButton}
          type="submit"
          form="organization-profile-form"
          disabled={isSaving || isUploading}
        >
          <LuSave aria-hidden />
          {isSaving ? "Guardando..." : "Guardar perfil"}
        </button>
      </section>

      <div className={s.layout}>
        <form id="organization-profile-form" className={s.card} onSubmit={handleSubmit}>
          <div className={s.sectionHeader}>
            <div>
              <p className={s.sectionEyebrow}>Identidad</p>
              <h2>Datos comerciales</h2>
            </div>
          </div>

          <div className={s.formGrid2}>
            <label className={s.field}>
              <span className={s.label}>Nombre empresa *</span>
              <input
                className={s.input}
                value={form.empresaNombre}
                onChange={(event) =>
                  handleFieldChange("empresaNombre", event.target.value)
                }
                placeholder="Ej: San Marco Vidrios"
              />
            </label>

            <label className={s.field}>
              <span className={s.label}>Telefono</span>
              <input
                className={s.input}
                value={form.empresaTelefono}
                onChange={(event) =>
                  handleFieldChange("empresaTelefono", event.target.value)
                }
                placeholder="+56 9 1234 5678"
              />
            </label>
          </div>

          <div className={s.formGrid2}>
            <label className={s.field}>
              <span className={s.label}>Direccion</span>
              <input
                className={s.input}
                value={form.empresaDireccion}
                onChange={(event) =>
                  handleFieldChange("empresaDireccion", event.target.value)
                }
                placeholder="Ej: Avenida del Mar 221, La Serena"
              />
            </label>

            <label className={s.field}>
              <span className={s.label}>Email</span>
              <input
                className={s.input}
                value={form.empresaEmail}
                onChange={(event) =>
                  handleFieldChange("empresaEmail", event.target.value)
                }
                placeholder="ventas@tuempresa.cl"
              />
            </label>
          </div>

          <label className={s.field}>
            <span className={s.label}>Forma de pago</span>
            <textarea
              className={s.textarea}
              rows={3}
              value={form.formaPago}
              onChange={(event) => handleFieldChange("formaPago", event.target.value)}
              placeholder="Ej: 50% anticipo al confirmar, saldo contra entrega."
            />
          </label>

          <label className={s.field}>
            <span className={s.label}>Modo de precio por defecto</span>
            <div className={s.selectWrap}>
              <select
                className={s.input}
                value={form.modoPrecioPreferido}
                onChange={(event) =>
                  handleFieldChange(
                    "modoPrecioPreferido",
                    event.target.value as PricingMode
                  )
                }
              >
                <option value="margen">Usar margen de ganancia</option>
                <option value="precio_directo">Ingresar valor unitario directo</option>
              </select>
            </div>
            <span className={s.helpText}>
              Si eliges valor directo, el Paso 2 oculta el margen y te deja ingresar el precio final por componente.
            </span>
          </label>

          <section className={s.deviceAlertsCard} aria-live="polite">
            <div className={s.deviceAlertsIcon}>
              <LuBellRing aria-hidden />
            </div>
            <div className={s.deviceAlertsBody}>
              <div className={s.deviceAlertsHeader}>
                <div>
                  <p className={s.sectionEyebrow}>Alertas del dispositivo</p>
                  <h2>Notificaciones del maestro</h2>
                </div>
                <span className={`${s.deviceAlertsBadge} ${deviceAlertsBadge.className}`}>
                  {deviceAlertsBadge.label}
                </span>
              </div>

              <div className={s.deviceAlertsSummary}>
                <strong>{deviceAlertsSummary.title}</strong>
                <p>{deviceAlertsSummary.helper}</p>
              </div>

              <div className={s.deviceAlertsCapabilities}>
                <span className={s.deviceAlertsCapability}>Envio</span>
                <span className={s.deviceAlertsCapability}>Aprobacion</span>
                <span className={s.deviceAlertsCapability}>Rechazo</span>
              </div>

              <p className={s.deviceAlertsText}>{deviceAlertsState.message}</p>

              <div className={s.deviceAlertsActions}>
                {deviceAlertsState.kind === "enabled" ? (
                  <button
                    className={s.secondaryButton}
                    type="button"
                    onClick={() => void syncDeviceAlertsState()}
                  >
                    {deviceAlertsSummary.actionLabel}
                  </button>
                ) : null}

                {deviceAlertsState.kind === "available" || deviceAlertsState.kind === "error" ? (
                  <button
                    className={s.primaryButton}
                    type="button"
                    onClick={handleEnableDeviceAlerts}
                    disabled={isActivatingAlerts}
                  >
                    {isActivatingAlerts
                      ? "Activando..."
                      : deviceAlertsSummary.actionLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <div className={s.sectionHeader}>
            <div>
              <p className={s.sectionEyebrow}>Marca</p>
              <h2>Color y logo</h2>
            </div>
          </div>

          <div className={s.brandSection}>
            <div className={s.field}>
              <span className={s.label}>Color de marca</span>
              <div className={s.swatchRow}>
                {BRAND_PRESETS.map((color) => (
                  <button
                    key={color}
                    className={`${s.colorSwatch} ${
                      form.brandColor.toLowerCase() === color ? s.colorSwatchActive : ""
                    }`}
                    style={{ background: color }}
                    onClick={() => handleFieldChange("brandColor", color)}
                    type="button"
                    aria-label={`Usar color ${color}`}
                  />
                ))}
                <label className={s.customColor}>
                  <span>Custom</span>
                  <input
                    type="color"
                    value={form.brandColor}
                    onChange={(event) =>
                      handleFieldChange("brandColor", event.target.value)
                    }
                  />
                </label>
              </div>
            </div>

            <div className={s.field}>
              <span className={s.label}>Logo</span>
              <label className={s.logoUpload}>
                <LuImagePlus aria-hidden />
                <span>{isUploading ? "Subiendo logo..." : "Subir logo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={isUploading}
                />
              </label>
              <span className={s.helpText}>
                Se sube a Supabase Storage y queda listo para usar en el PDF.
              </span>
            </div>
          </div>

          {errorMessage ? <div className={s.error}>{errorMessage}</div> : null}
          {statusMessage ? <div className={s.success}>{statusMessage}</div> : null}
        </form>

        <aside className={s.previewCard}>
          <div
            className={s.previewCardInner}
            style={{ ["--brand" as string]: previewModel.brandColor }}
          >
            <div className={s.previewHeader}>
              {previewModel.logoPreview ? (
                <Image
                  className={s.previewLogoImage}
                  src={previewModel.logoPreview}
                  alt={previewModel.empresaNombre || "Logo de la empresa"}
                  width={82}
                  height={82}
                  unoptimized
                />
              ) : (
                <div className={s.previewLogoFallback}>{previewModel.initials}</div>
              )}
              <div className={s.previewMeta}>
                <strong>{previewModel.empresaNombre}</strong>
                <span>{previewModel.empresaDireccion}</span>
                <span>{previewModel.empresaTelefono}</span>
                <span>{previewModel.empresaEmail}</span>
              </div>
            </div>

            <div className={s.previewSheet}>
              <div className={s.previewBadgeRow}>
                <span className={s.previewBadge}>Oferta cliente</span>
                <span className={s.previewBadge}>Brand {previewModel.brandColor}</span>
              </div>
              <div className={s.previewComponent}>
                <div className={s.previewAccent} />
                <div>
                  <strong>Ventana living</strong>
                  <p>Tu color de marca se aplica en badges, acentos y resumen del PDF.</p>
                </div>
              </div>
              <div className={s.previewSummary}>
                <span>Forma de pago</span>
                <strong>{previewModel.formaPago}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

