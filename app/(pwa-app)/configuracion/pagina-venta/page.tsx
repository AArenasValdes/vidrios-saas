"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  LuChevronDown,
  LuChevronUp,
  LuCheck,
  LuCopy,
  LuExternalLink,
  LuGlobe,
  LuImage,
  LuImagePlus,
  LuMessageSquare,
  LuPalette,
  LuSave,
  LuToggleLeft,
  LuTrash2,
  LuX,
} from "react-icons/lu";

import { useLandingGallery } from "@/features/landing-gallery/hooks/useLandingGallery";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildDefaultSolicitudPublicaHorarioPorDia,
  DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION,
  DEFAULT_FORM_SUBTITLE,
  DEFAULT_FORM_TITLE,
  DEFAULT_HERO_TITLE,
  DEFAULT_SECONDARY_COLOR,
  extractLegacyHorarioFields,
  formatHorarioPorDiaLabel,
} from "@/features/organization-profile/services/organization-profile.service";
import { resolvePublicAppUrl } from "@/utils/public-app-url";
import type {
  PublicScheduleDay,
  UpdateOrganizationProfileInput,
} from "@/features/organization-profile/types/organization-profile";

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

const SECONDARY_PRESETS = [
  "#25d366",
  "#2EA5E6",
  "#1DB98B",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
];

const EMPTY_FORM: UpdateOrganizationProfileInput = {
  empresaNombre: "",
  empresaLogoUrl: null,
  empresaDireccion: "",
  empresaTelefono: "",
  empresaEmail: "",
  brandColor: "#1a3a5c",
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
  secondaryColor: DEFAULT_SECONDARY_COLOR,
  heroMode: "gradient",
  heroImageUrl: null,
  heroTitle: DEFAULT_HERO_TITLE,
  heroSubtitle: "",
  showGallery: true,
  showSchedule: true,
  showRating: false,
  ratingLabel: "",
  jobsCountLabel: "",
  formTitle: DEFAULT_FORM_TITLE,
  formSubtitle: DEFAULT_FORM_SUBTITLE,
  isPublished: false,
};

type ActiveSection = "identidad" | "estilo" | "hero" | "galeria" | "formulario" | "publicacion";

const SCHEDULE_GROUPS: Array<{
  key: string;
  label: string;
  days: PublicScheduleDay[];
}> = [
  { key: "weekdays", label: "Lun a Vie", days: ["1", "2", "3", "4", "5"] },
  { key: "saturday", label: "Sabado", days: ["6"] },
  { key: "sunday", label: "Domingo", days: ["0"] },
];

export default function PaginaVentaPage() {
  const { profile, isReady, isSaving, isUploadingHero, saveProfile, uploadHeroImage } =
    useOrganizationProfile();
  const {
    gallery,
    isUploading: isGalleryUploading,
    uploadAndAddImage,
    updateImage,
    deleteImage,
  } = useLandingGallery();

  const [form, setForm] = useState<UpdateOrganizationProfileInput>(EMPTY_FORM);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("identidad");
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    return () => {
      if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    };
  }, [heroPreviewUrl]);

  function handleFieldChange(
    key: keyof UpdateOrganizationProfileInput,
    value: UpdateOrganizationProfileInput[typeof key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function handleScheduleGroupToggle(days: readonly string[]) {
    setForm((current) => {
      const hasEnabledDay = current.solicitudPublicaHorarioPorDia.some(
        (entry) => days.includes(entry.day) && entry.enabled
      );
      const nextSchedule = current.solicitudPublicaHorarioPorDia.map((entry) =>
        days.includes(entry.day) ? { ...entry, enabled: !hasEnabledDay } : entry
      );
      const legacy = extractLegacyHorarioFields(nextSchedule);

      return {
        ...current,
        solicitudPublicaHorarioPorDia: nextSchedule,
        solicitudPublicaDiasAtencion:
          legacy.solicitudPublicaDiasAtencion.length > 0
            ? legacy.solicitudPublicaDiasAtencion
            : [...DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION],
        solicitudPublicaHorarioDesde: legacy.solicitudPublicaHorarioDesde,
        solicitudPublicaHorarioHasta: legacy.solicitudPublicaHorarioHasta,
      };
    });
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function handleScheduleGroupTimeChange(
    days: readonly string[],
    field: "from" | "to",
    value: string
  ) {
    setForm((current) => {
      const nextSchedule = current.solicitudPublicaHorarioPorDia.map((entry) =>
        days.includes(entry.day) ? { ...entry, [field]: value } : entry
      );
      const legacy = extractLegacyHorarioFields(nextSchedule);

      return {
        ...current,
        solicitudPublicaHorarioPorDia: nextSchedule,
        solicitudPublicaDiasAtencion:
          legacy.solicitudPublicaDiasAtencion.length > 0
            ? legacy.solicitudPublicaDiasAtencion
            : [...DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION],
        solicitudPublicaHorarioDesde: legacy.solicitudPublicaHorarioDesde,
        solicitudPublicaHorarioHasta: legacy.solicitudPublicaHorarioHasta,
      };
    });
    setStatusMessage(null);
    setErrorMessage(null);
  }

  const publicRequestUrl = `${resolvePublicAppUrl()}/solicitud/${form.solicitudPublicaSlug?.trim() || "mi-empresa"}`;

  const persistedPublicRequestUrl = `${resolvePublicAppUrl({ preferLocal: true })}/solicitud/${profile?.solicitudPublicaSlug?.trim() || form.solicitudPublicaSlug?.trim() || "mi-empresa"}`;

  async function handleCopyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicRequestUrl);
      setStatusMessage("Enlace copiado.");
    } catch {
      setErrorMessage("No pudimos copiar el enlace.");
    }
  }

  async function handleHeroImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextPreview = URL.createObjectURL(file);
    setHeroPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextPreview;
    });
    setErrorMessage(null);

    try {
      const imageUrl = await uploadHeroImage(file);
      handleFieldChange("heroImageUrl", imageUrl);
      setHeroPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setStatusMessage("Imagen hero subida. Guarda para aplicar.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo subir la imagen hero"
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    try {
      await uploadAndAddImage(file, "");
      setStatusMessage("Foto agregada a la galeria.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo subir la foto"
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handleDeleteGalleryImage(id: string | number) {
    setErrorMessage(null);

    try {
      await deleteImage(id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo eliminar la foto"
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setErrorMessage(null);
      setStatusMessage(null);
      await saveProfile(form);
      setStatusMessage("Configuracion guardada correctamente.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar la configuracion"
      );
    }
  }

  const isCustomBrandColor = !BRAND_PRESETS.some((c) => c.toLowerCase() === form.brandColor.toLowerCase());

  const isCustomSecondaryColor = !SECONDARY_PRESETS.some((c) => c.toLowerCase() === form.secondaryColor.toLowerCase());

  const heroPreview = heroPreviewUrl ?? form.heroImageUrl;
  const scheduleSummary = formatHorarioPorDiaLabel(form.solicitudPublicaHorarioPorDia);
  const groupedSchedule = SCHEDULE_GROUPS.map((group) => {
    const entries = form.solicitudPublicaHorarioPorDia.filter((entry) =>
      group.days.includes(entry.day)
    );
    const enabled = entries.some((entry) => entry.enabled);
    const reference = entries.find((entry) => entry.enabled) ?? entries[0];

    return {
      ...group,
      enabled,
      from: reference?.from ?? "09:00",
      to: reference?.to ?? "19:00",
    };
  });

  const sections: { key: ActiveSection; label: string; icon: typeof LuGlobe }[] = [
    { key: "identidad", label: "Tu pagina", icon: LuGlobe },
    { key: "estilo", label: "Colores", icon: LuPalette },
    { key: "hero", label: "Portada", icon: LuImage },
    { key: "galeria", label: "Trabajos", icon: LuImagePlus },
    { key: "formulario", label: "Formulario", icon: LuMessageSquare },
    { key: "publicacion", label: "Publicar", icon: LuToggleLeft },
  ];

  if (!isReady && !profile) {
    return (
      <div className={s.root}>
        <div className={s.loadingState}>Cargando configuracion de pagina...</div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div>
          <p className={s.headerEyebrow}>Ajuste comercial</p>
          <h1 className={s.headerTitle}>Tu pagina publica</h1>
          <p className={s.headerText}>
            Ajusta textos, colores y horario para que tu empresa se vea clara y profesional.
          </p>
        </div>

        <div className={s.headerStatus}>
          <span
            className={s.statusBadge}
            data-published={form.isPublished}
          >
            {form.isPublished ? "Publicada" : "Borrador"}
          </span>
        </div>
      </div>

      <nav className={s.tabNav}>
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.key;

          return (
            <button
              key={section.key}
              className={`${s.tabButton} ${isActive ? s.tabButtonActive : ""}`}
              type="button"
              onClick={() => setActiveSection(section.key)}
            >
              <Icon aria-hidden />
              <span>{section.label}</span>
            </button>
          );
        })}
      </nav>

      <form id="pagina-venta-form" className={s.content} onSubmit={handleSubmit}>
        {activeSection === "identidad" ? (
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <LuGlobe aria-hidden />
              <span>Como te veran</span>
            </div>

            <div className={s.card}>
              <label className={s.field}>
                <span className={s.label}>Nombre que vera tu cliente</span>
                <input
                  className={s.input}
                  value={form.publicName}
                  onChange={(e) => handleFieldChange("publicName", e.target.value)}
                  placeholder={form.empresaNombre || "Mi empresa"}
                />
                <span className={s.helpText}>
                  Si lo dejas vacio, usamos el nombre de tu empresa.
                </span>
              </label>

              <label className={s.field}>
                <span className={s.label}>Nombre del enlace</span>
                <input
                  className={s.input}
                  value={form.solicitudPublicaSlug}
                  onChange={(e) => handleFieldChange("solicitudPublicaSlug", e.target.value)}
                  placeholder="ej: empresa-vidriera"
                />
                <span className={s.helpText}>
                  Tu link quedara como {publicRequestUrl}
                </span>
              </label>

              <label className={s.field}>
                <span className={s.label}>Rubro o especialidad</span>
                <input
                  className={s.input}
                  value={form.publicSubtitle}
                  onChange={(e) => handleFieldChange("publicSubtitle", e.target.value)}
                  placeholder="Ej: Vidrios y aluminio"
                />
              </label>

              <label className={s.field}>
                <span className={s.label}>Zona o cobertura</span>
                <input
                  className={s.input}
                  value={form.publicZone}
                  onChange={(e) => handleFieldChange("publicZone", e.target.value)}
                  placeholder="Ej: Santiago, Region Metropolitana"
                />
              </label>

              {errorMessage ? <div className={s.error}>{errorMessage}</div> : null}
              {statusMessage ? <div className={s.success}>{statusMessage}</div> : null}

              <div className={s.sectionActions}>
                <button
                  className={s.saveButton}
                  type="submit"
                  disabled={isSaving || isUploadingHero}
                >
                  <LuSave aria-hidden />
                  {isSaving ? "Guardando..." : "Aplicar publicacion"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "estilo" ? (
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <LuPalette aria-hidden />
              <span>Colores que venden</span>
            </div>

            <div className={s.card}>
              <div className={s.field}>
                <span className={s.label}>Color principal</span>
                <div className={s.swatchRow}>
                  {BRAND_PRESETS.map((color) => {
                    const isActive =
                      form.brandColor.toLowerCase() === color.toLowerCase();

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
                      onChange={(e) => handleFieldChange("brandColor", e.target.value)}
                      aria-label="Elegir color personalizado"
                    />
                  </label>
                </div>
                <span className={s.helpText}>
                  Es el color principal de tu pagina y de los detalles visuales.
                </span>
              </div>

              <div className={s.divider} />

              <div className={s.field}>
                <span className={s.label}>Color secundario</span>
                <div className={s.swatchRow}>
                  {SECONDARY_PRESETS.map((color) => {
                    const isActive =
                      form.secondaryColor.toLowerCase() === color.toLowerCase();

                    return (
                      <button
                        key={color}
                        className={`${s.colorSwatch} ${isActive ? s.colorSwatchActive : ""}`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleFieldChange("secondaryColor", color)}
                        type="button"
                        aria-label={`Usar color ${color}`}
                        aria-pressed={isActive}
                      >
                        {isActive ? <LuCheck aria-hidden /> : null}
                      </button>
                    );
                  })}

                  <label
                    className={`${s.customColor} ${isCustomSecondaryColor ? s.customColorActive : ""}`}
                  >
                    <span
                      className={s.customColorPreview}
                      style={{ backgroundColor: form.secondaryColor }}
                      aria-hidden
                    />
                    <span className={s.customColorLabel}>Otro</span>
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={(e) =>
                        handleFieldChange("secondaryColor", e.target.value)
                      }
                      aria-label="Elegir color secundario personalizado"
                    />
                  </label>
                </div>
                <span className={s.helpText}>
                  Se usa en botones y llamados de accion.
                </span>
              </div>

              {errorMessage ? <div className={s.error}>{errorMessage}</div> : null}
              {statusMessage ? <div className={s.success}>{statusMessage}</div> : null}

              <div className={s.sectionActions}>
                <button
                  className={s.saveButton}
                  type="submit"
                  disabled={isSaving || isUploadingHero}
                >
                  <LuSave aria-hidden />
                  {isSaving ? "Guardando..." : "Guardar esta parte"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "hero" ? (
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <LuImage aria-hidden />
              <span>Portada principal</span>
            </div>

            <div className={s.card}>
              <div className={s.field}>
                <span className={s.label}>Fondo de la portada</span>
                <div className={s.modeRow}>
                  <button
                    className={`${s.modeButton} ${form.heroMode === "gradient" ? s.modeButtonActive : ""}`}
                    type="button"
                    onClick={() => handleFieldChange("heroMode", "gradient")}
                  >
                    Color simple
                  </button>
                  <button
                    className={`${s.modeButton} ${form.heroMode === "image" ? s.modeButtonActive : ""}`}
                    type="button"
                    onClick={() => handleFieldChange("heroMode", "image")}
                  >
                    Foto
                  </button>
                </div>
              </div>

              {form.heroMode === "image" ? (
                <div className={s.field}>
                  <span className={s.label}>Foto principal</span>

                  {heroPreview ? (
                    <div className={s.heroPreviewWrap}>
                      <Image
                        src={heroPreview}
                        alt="Vista previa de la portada"
                        width={400}
                        height={200}
                        className={s.heroPreviewImage}
                        sizes="(max-width: 560px) 100vw, 720px"
                        unoptimized
                      />
                      <button
                        className={s.heroPreviewRemove}
                        type="button"
                        onClick={() => {
                          handleFieldChange("heroImageUrl", null);
                          setHeroPreviewUrl(null);
                        }}
                        aria-label="Quitar imagen hero"
                      >
                        <LuX aria-hidden />
                      </button>
                    </div>
                  ) : null}

                  <label className={s.uploadArea}>
                    <div className={s.uploadIcon}>
                      <LuImagePlus aria-hidden />
                    </div>
                    <div className={s.uploadBody}>
                      <strong>
                        {isUploadingHero ? "Subiendo..." : "Subir foto principal"}
                      </strong>
                      <span>JPG o PNG · 1200x400 recomendado</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageChange}
                      disabled={isUploadingHero}
                    />
                  </label>
                </div>
              ) : null}

              <label className={s.field}>
                <span className={s.label}>Titulo principal</span>
                <input
                  className={s.input}
                  value={form.heroTitle}
                  onChange={(e) => handleFieldChange("heroTitle", e.target.value)}
                  placeholder={DEFAULT_HERO_TITLE}
                />
              </label>

              <label className={s.field}>
                <span className={s.label}>Bajada corta</span>
                <input
                  className={s.input}
                  value={form.heroSubtitle}
                  onChange={(e) => handleFieldChange("heroSubtitle", e.target.value)}
                  placeholder="Ej: Respuesta por WhatsApp y solicitud registrada"
                />
              </label>

              {errorMessage ? <div className={s.error}>{errorMessage}</div> : null}
              {statusMessage ? <div className={s.success}>{statusMessage}</div> : null}

              <div className={s.sectionActions}>
                <button
                  className={s.saveButton}
                  type="submit"
                  disabled={isSaving || isUploadingHero}
                >
                  <LuSave aria-hidden />
                  {isSaving ? "Guardando..." : "Guardar esta parte"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "galeria" ? (
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <LuImagePlus aria-hidden />
              <span>Trabajos recientes</span>
            </div>

            <div className={s.card}>
              <div className={s.toggleRow}>
                <div className={s.toggleCopy}>
                  <strong>Mostrar trabajos</strong>
                  <p>Ayuda a que el cliente confie mas rapido.</p>
                </div>

                <button
                  className={`${s.switch} ${form.showGallery ? s.switchOn : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={form.showGallery}
                  aria-label="Mostrar galeria"
                  onClick={() => handleFieldChange("showGallery", !form.showGallery)}
                >
                  <span className={s.switchThumb} />
                </button>
              </div>

              {form.showGallery ? (
                <>
                  <div className={s.divider} />

                  <div className={s.galleryGrid}>
                    {gallery.map((item) => (
                      <div key={String(item.id)} className={s.galleryItem}>
                        <div className={s.galleryImageWrap}>
                          <Image
                            src={item.imageUrl}
                            alt={item.label || "Trabajo"}
                            fill
                            className={s.galleryImage}
                            sizes="(max-width: 560px) 42vw, 160px"
                            unoptimized
                          />
                        </div>
                        <div className={s.galleryItemFooter}>
                          <input
                            className={s.galleryItemLabel}
                            value={item.label}
                            placeholder="Etiqueta"
                      onChange={(e) =>
                          void updateImage(
                            item.id,
                            e.target.value,
                            item.isVisible
                          )
                        }
                          />
                          <button
                            className={s.galleryItemDelete}
                            type="button"
                            onClick={() => void handleDeleteGalleryImage(item.id)}
                            aria-label="Eliminar foto"
                          >
                            <LuTrash2 aria-hidden />
                          </button>
                        </div>
                      </div>
                    ))}

                    {gallery.length < 8 ? (
                      <label className={s.galleryAddCard}>
                        <div className={s.galleryAddIcon}>
                          <LuImagePlus aria-hidden />
                        </div>
                        <span>Agregar foto</span>
                        <input
                          ref={galleryInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleGalleryUpload}
                          disabled={isGalleryUploading}
                        />
                      </label>
                    ) : null}
                  </div>

                  <span className={s.helpText}>
                    {gallery.length}/8 fotos · {isGalleryUploading ? "Subiendo..." : "Sube solo tus mejores trabajos"}
                  </span>
                </>
              ) : null}

              {errorMessage ? <div className={s.error}>{errorMessage}</div> : null}
              {statusMessage ? <div className={s.success}>{statusMessage}</div> : null}

              <div className={s.sectionActions}>
                <button
                  className={s.saveButton}
                  type="submit"
                  disabled={isSaving || isUploadingHero || isGalleryUploading}
                >
                  <LuSave aria-hidden />
                  {isSaving ? "Guardando..." : "Guardar esta parte"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "formulario" ? (
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <LuMessageSquare aria-hidden />
              <span>Solicitud rapida</span>
            </div>

            <div className={s.card}>
              <label className={s.field}>
                <span className={s.label}>Titulo del formulario</span>
                <input
                  className={s.input}
                  value={form.formTitle}
                  onChange={(e) => handleFieldChange("formTitle", e.target.value)}
                  placeholder={DEFAULT_FORM_TITLE}
                />
              </label>

              <div className={s.divider} />

              <div className={s.toggleRow}>
                <div className={s.toggleCopy}>
                  <strong>Mostrar calificacion</strong>
                  <p>Muestra una calificacion o cantidad de trabajos.</p>
                </div>

                <button
                  className={`${s.switch} ${form.showRating ? s.switchOn : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={form.showRating}
                  aria-label="Mostrar calificacion"
                  onClick={() => handleFieldChange("showRating", !form.showRating)}
                >
                  <span className={s.switchThumb} />
                </button>
              </div>

              {form.showRating ? (
                <div className={s.row2}>
                  <label className={s.field}>
                    <span className={s.label}>Texto de calificacion</span>
                    <input
                      className={s.input}
                      value={form.ratingLabel}
                      onChange={(e) =>
                        handleFieldChange("ratingLabel", e.target.value)
                      }
                      placeholder="Ej: 4.9 / 5.0"
                    />
                  </label>

                  <label className={s.field}>
                    <span className={s.label}>Texto de trabajos</span>
                    <input
                      className={s.input}
                      value={form.jobsCountLabel}
                      onChange={(e) =>
                        handleFieldChange("jobsCountLabel", e.target.value)
                      }
                      placeholder="Ej: +200 trabajos"
                    />
                  </label>
                </div>
              ) : null}

              {errorMessage ? <div className={s.error}>{errorMessage}</div> : null}
              {statusMessage ? <div className={s.success}>{statusMessage}</div> : null}

              <div className={s.sectionActions}>
                <button
                  className={s.saveButton}
                  type="submit"
                  disabled={isSaving || isUploadingHero}
                >
                  <LuSave aria-hidden />
                  {isSaving ? "Guardando..." : "Guardar esta parte"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "publicacion" ? (
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <LuToggleLeft aria-hidden />
              <span>Salida al aire</span>
            </div>

            <div className={s.card}>
              <div className={`${s.toggleRow} ${s.toggleRowCompact}`}>
                <div className={s.toggleCopyCompact}>
                  <strong>Publicar pagina</strong>
                  <span>{form.isPublished ? "Visible para clientes" : "Modo borrador"}</span>
                </div>

                <button
                  className={`${s.switch} ${form.isPublished ? s.switchOn : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={form.isPublished}
                  aria-label="Publicar pagina"
                  onClick={() => handleFieldChange("isPublished", !form.isPublished)}
                >
                  <span className={s.switchThumb} />
                </button>
              </div>

              <div className={s.divider} />

              <div className={s.field}>
                <span className={s.label}>Horario visible</span>
                <span className={s.helpText}>{scheduleSummary}</span>
              </div>

              <button
                type="button"
                className={s.scheduleToggle}
                onClick={() => setIsScheduleExpanded((current) => !current)}
                aria-expanded={isScheduleExpanded}
              >
                <span>{isScheduleExpanded ? "Ocultar horarios" : "Editar horarios"}</span>
                {isScheduleExpanded ? <LuChevronUp aria-hidden /> : <LuChevronDown aria-hidden />}
              </button>

              {isScheduleExpanded ? (
                <div className={s.scheduleGroupList}>
                  {groupedSchedule.map((group) => (
                  <div
                    key={group.key}
                    className={`${s.scheduleGroupCard} ${
                      !group.enabled ? s.scheduleGroupCardClosed : ""
                    } ${group.key === "sunday" && !group.enabled ? s.scheduleGroupCardSunday : ""}`}
                  >
                    <div className={s.scheduleGroupHeader}>
                      <div className={s.scheduleGroupCopy}>
                        <strong>{group.label}</strong>
                        <span>
                          {group.enabled ? `${group.from}-${group.to}` : "Cerrado"}
                        </span>
                      </div>

                      <button
                        className={`${s.switch} ${group.enabled ? s.switchOn : ""}`}
                        type="button"
                        role="switch"
                        aria-checked={group.enabled}
                        aria-label={`Activar horario ${group.label}`}
                        onClick={() => handleScheduleGroupToggle(group.days)}
                      >
                        <span className={s.switchThumb} />
                      </button>
                    </div>

                    {group.enabled ? (
                      <div className={s.scheduleGroupTimes}>
                        <label className={s.field}>
                          <span className={s.label}>Desde</span>
                          <input
                            className={s.input}
                            type="time"
                            value={group.from}
                            onChange={(e) =>
                              handleScheduleGroupTimeChange(
                                group.days,
                                "from",
                                e.target.value
                              )
                            }
                          />
                        </label>

                        <label className={s.field}>
                          <span className={s.label}>Hasta</span>
                          <input
                            className={s.input}
                            type="time"
                            value={group.to}
                            onChange={(e) =>
                              handleScheduleGroupTimeChange(
                                group.days,
                                "to",
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              ) : null}

              <div className={`${s.toggleRow} ${s.toggleRowCompact}`}>
                <div className={s.toggleCopyCompact}>
                  <strong>Mostrar horario</strong>
                  <span>{form.showSchedule ? "Horario visible en pagina" : "Horario oculto"}</span>
                </div>

                <button
                  className={`${s.switch} ${form.showSchedule ? s.switchOn : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={form.showSchedule}
                  aria-label="Mostrar horario"
                  onClick={() => handleFieldChange("showSchedule", !form.showSchedule)}
                >
                  <span className={s.switchThumb} />
                </button>
              </div>

              <div className={s.publicLinkPanel}>
                <div className={s.publicLinkBox}>
                  <span className={s.label}>Link de tu pagina</span>
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
                    Ver pagina publica
                  </a>
                </div>
              </div>

              {form.isPublished && !form.heroTitle.trim() ? (
                <p className={s.warningText}>
                  Recomendamos agregar un titulo principal antes de publicar.
                </p>
              ) : null}

              <div className={s.divider} />

              <div className={s.staticInfo}>
                <span className={s.label}>Estado</span>
                <div className={s.publishStatus}>
                  <span
                    className={s.statusDot}
                    data-published={form.isPublished}
                    aria-hidden
                  />
                  <strong>
                    {form.isPublished ? "Publicada" : "Borrador"}
                  </strong>
                </div>
              </div>

              {errorMessage ? <div className={s.error}>{errorMessage}</div> : null}
              {statusMessage ? <div className={s.success}>{statusMessage}</div> : null}

              <div className={s.sectionActions}>
                <button
                  className={s.saveButton}
                  type="submit"
                  disabled={isSaving || isUploadingHero}
                >
                  <LuSave aria-hidden />
                  {isSaving ? "Guardando..." : "Aplicar publicacion"}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </form>
    </div>
  );
}
