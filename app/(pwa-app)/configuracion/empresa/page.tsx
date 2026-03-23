"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { LuImagePlus, LuSave } from "react-icons/lu";

import { useOrganizationProfile } from "@/hooks/useOrganizationProfile";
import {
  buildOrganizationInitials,
  DEFAULT_ORGANIZATION_BRAND_COLOR,
} from "@/services/organization-profile.service";
import type { UpdateOrganizationProfileInput } from "@/types/organization-profile";

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
};

export default function ConfiguracionEmpresaPage() {
  const { profile, isReady, isSaving, isUploading, saveProfile, uploadLogo } =
    useOrganizationProfile();
  const [form, setForm] = useState<UpdateOrganizationProfileInput>(EMPTY_FORM);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
                <img
                  className={s.previewLogoImage}
                  src={previewModel.logoPreview}
                  alt={previewModel.empresaNombre || "Logo de la empresa"}
                  crossOrigin="anonymous"
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
