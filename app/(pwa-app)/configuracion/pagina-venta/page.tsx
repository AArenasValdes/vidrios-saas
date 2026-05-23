"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  LuBlocks,
  LuChevronDown,
  LuChevronUp,
  LuCopy,
  LuExternalLink,
  LuGlobe,
  LuImage,
  LuImagePlus,
  LuMessageSquare,
  LuPhone,
  LuSave,
  LuStar,
  LuToggleLeft,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import type { LandingGalleryItem } from "@/features/landing-gallery/types/landing-gallery";

import { useLandingGallery } from "@/features/landing-gallery/hooks/useLandingGallery";
import { OnboardingGuide } from "@/features/onboarding/components/onboarding-guide";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import { usePublicLandingTestimonials } from "@/features/public-landing-testimonials/hooks/usePublicLandingTestimonials";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { buildPublicRequestShareClipboardText } from "@/features/solicitudes/services/public-request-share.service";
import {
  buildPaginaVentaProfileInput,
  buildDefaultSolicitudPublicaHorarioPorDia,
  DEFAULT_SOLICITUD_PUBLICA_DIAS_ATENCION,
  DEFAULT_FORM_SUBTITLE,
  DEFAULT_FORM_TITLE,
  DEFAULT_HERO_TITLE,
  extractLegacyHorarioFields,
  formatHorarioPorDiaLabel,
  PUBLIC_LANDING_SERVICE_OPTIONS,
} from "@/features/organization-profile/services/organization-profile.service";
import { resolvePublicAppUrl } from "@/utils/public-app-url";
import type {
  PublicLandingService,
  PublicScheduleDay,
  UpdateOrganizationProfileInput,
} from "@/features/organization-profile/types/organization-profile";

import s from "./page.module.css";

const EMPTY_FORM: UpdateOrganizationProfileInput = buildPaginaVentaProfileInput({
  organizationId: null,
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
  secondaryColor: "",
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
});

type ActiveSection =
  | "hero"
  | "servicios"
  | "galeria"
  | "redes"
  | "formulario"
  | "valoraciones"
  | "publicacion";

const SOCIAL_FIELDS: Array<{
  key: "instagramUrl" | "facebookUrl" | "tiktokUrl" | "websiteUrl";
  label: string;
  placeholder: string;
}> = [
  {
    key: "instagramUrl",
    label: "Instagram",
    placeholder: "https://instagram.com/tuempresa",
  },
  {
    key: "facebookUrl",
    label: "Facebook",
    placeholder: "https://facebook.com/tuempresa",
  },
  {
    key: "tiktokUrl",
    label: "TikTok",
    placeholder: "https://tiktok.com/@tuempresa",
  },
  {
    key: "websiteUrl",
    label: "Sitio web",
    placeholder: "https://tuempresa.cl",
  },
];

const SCHEDULE_GROUPS: Array<{
  key: string;
  label: string;
  days: PublicScheduleDay[];
}> = [
  { key: "weekdays", label: "Lun a Vie", days: ["1", "2", "3", "4", "5"] },
  { key: "saturday", label: "Sabado", days: ["6"] },
  { key: "sunday", label: "Domingo", days: ["0"] },
];

type PendingGalleryUpload = {
  id: string;
  previewUrl: string;
  workTitle: string;
};

export default function PaginaVentaPage() {
  const onboarding = useOnboardingChecklist();
  const { profile, isReady, isSaving, isUploadingHero, saveProfile, uploadHeroImage } =
    useOrganizationProfile();
  const {
    gallery,
    isUploading: isGalleryUploading,
    uploadAndAddImage,
    updateImage,
    deleteImage,
  } = useLandingGallery();
  const {
    testimonials,
    isLoading: isLoadingTestimonials,
    updateStatus: updateTestimonialStatus,
  } = usePublicLandingTestimonials();

  const [form, setForm] = useState<UpdateOrganizationProfileInput>(EMPTY_FORM);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("hero");
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [galleryDrafts, setGalleryDrafts] = useState<Record<string, string>>({});
  const [pendingGalleryUploads, setPendingGalleryUploads] = useState<
    PendingGalleryUpload[]
  >([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const lastSavedSnapshotRef = useRef<string>(JSON.stringify(EMPTY_FORM));
  const hasHydratedRef = useRef(false);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const galleryMetadataTimeoutsRef = useRef<Record<string, number>>({});
  const pendingGalleryUploadsRef = useRef<PendingGalleryUpload[]>([]);

  function serializeFormState(value: UpdateOrganizationProfileInput) {
    return JSON.stringify(value);
  }

  function clearAutosaveTimeout() {
    if (autosaveTimeoutRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
  }

  async function persistCurrentForm(
    nextForm: UpdateOrganizationProfileInput,
    options?: {
      successMessage?: string;
      errorMessage?: string;
    }
  ) {
    try {
      setErrorMessage(null);
      const savedProfile = await saveProfile(nextForm);
      const normalized = buildPaginaVentaProfileInput(savedProfile);
      lastSavedSnapshotRef.current = serializeFormState(normalized);
      setForm(normalized);
      setStatusMessage(
        options?.successMessage ?? "Configuracion guardada correctamente."
      );
      return normalized;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : options?.errorMessage ?? "No se pudo guardar la configuracion"
      );
      throw error;
    }
  }

  useEffect(() => {
    if (!profile) return;
    const nextForm = buildPaginaVentaProfileInput(profile);
    setForm(nextForm);
    lastSavedSnapshotRef.current = serializeFormState(nextForm);
    hasHydratedRef.current = true;
  }, [profile]);

  useEffect(() => {
    pendingGalleryUploadsRef.current = pendingGalleryUploads;
  }, [pendingGalleryUploads]);

  useEffect(() => {
    return () => {
      if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
      pendingGalleryUploadsRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl)
      );
      Object.values(galleryMetadataTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      clearAutosaveTimeout();
    };
  }, [heroPreviewUrl]);

  useEffect(() => {
    setGalleryDrafts((current) => {
      const nextDrafts: Record<string, string> = {};

      gallery.forEach((item) => {
        const key = String(item.id);
        nextDrafts[key] = current[key] ?? item.workTitle;
      });

      return nextDrafts;
    });
  }, [gallery]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatusMessage(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setErrorMessage(null);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [errorMessage]);

  useEffect(() => {
    if (!hasHydratedRef.current || !isReady || !profile) {
      return;
    }

    const nextSnapshot = serializeFormState(form);

    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    clearAutosaveTimeout();
    autosaveTimeoutRef.current = window.setTimeout(() => {
      void persistCurrentForm(form, {
        successMessage: "Cambios guardados.",
      });
    }, 700);

    return () => clearAutosaveTimeout();
  }, [form, isReady, profile]);

  function handleFieldChange(
    key: keyof UpdateOrganizationProfileInput,
    value: UpdateOrganizationProfileInput[typeof key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function handleServiceToggle(service: PublicLandingService) {
    setForm((current) => {
      const nextServices = current.publicServices.includes(service)
        ? current.publicServices.filter((item) => item !== service)
        : [...current.publicServices, service];

      return {
        ...current,
        publicServices: nextServices,
      };
    });
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function scheduleGalleryMetadataSave(
    item: LandingGalleryItem,
    patch: {
      label?: string;
      workTitle?: string;
      workType?: string;
      workZone?: string;
      workBadge?: string;
    }
  ) {
    const itemKey = String(item.id);
    const existingTimeout = galleryMetadataTimeoutsRef.current[itemKey];

    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    galleryMetadataTimeoutsRef.current[itemKey] = window.setTimeout(() => {
      void updateImage(item.id, {
        label: patch.label ?? item.label,
        workTitle: patch.workTitle ?? item.workTitle,
        workType: patch.workType ?? item.workType,
        workZone: patch.workZone ?? item.workZone,
        workBadge: patch.workBadge ?? item.workBadge,
        isVisible: item.isVisible,
      }).catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la foto."
        );
      });

      delete galleryMetadataTimeoutsRef.current[itemKey];
    }, 550);
  }

  function handleGalleryTitleDraftChange(item: LandingGalleryItem, value: string) {
    const itemKey = String(item.id);
    setGalleryDrafts((current) => ({
      ...current,
      [itemKey]: value,
    }));
    setStatusMessage(null);
    setErrorMessage(null);
    scheduleGalleryMetadataSave(item, {
      workTitle: value,
    });
  }

  function flushGalleryTitleSave(item: LandingGalleryItem) {
    const itemKey = String(item.id);
    const pendingTimeout = galleryMetadataTimeoutsRef.current[itemKey];
    const nextValue = galleryDrafts[itemKey] ?? item.workTitle;

    if (pendingTimeout) {
      window.clearTimeout(pendingTimeout);
      delete galleryMetadataTimeoutsRef.current[itemKey];
    }

    void updateImage(item.id, {
      label: item.label,
      workTitle: nextValue,
      workType: item.workType,
      workZone: item.workZone,
      workBadge: item.workBadge,
      isVisible: item.isVisible,
    }).catch((error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la foto."
      );
    });
  }

  async function handleTestimonialStatusChange(
    id: string | number,
    estado: "pendiente" | "aprobada" | "oculta"
  ) {
    try {
      await updateTestimonialStatus(id, estado);
      setStatusMessage("Valoracion actualizada.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la valoracion."
      );
    }
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
  const publicRequestShareText = buildPublicRequestShareClipboardText({
    url: publicRequestUrl,
    empresaNombre: form.empresaNombre || profile?.empresaNombre,
    channel: "direct",
  });

  const persistedPublicRequestUrl = `${resolvePublicAppUrl({ preferLocal: true })}/solicitud/${profile?.solicitudPublicaSlug?.trim() || form.solicitudPublicaSlug?.trim() || "mi-empresa"}`;
  const previewPublicRequestUrl = `${persistedPublicRequestUrl}?preview=1`;

  async function handleCopyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicRequestShareText);
      setStatusMessage("Texto y enlace copiados.");
      await onboarding.markChannelReady({
        completionSource: "configuracion_pagina_venta_copy_public_link",
        metadataJson: {
          route: "/configuracion/pagina-venta",
          url: publicRequestUrl,
        },
        });
    } catch {
      setErrorMessage("No pudimos copiar el texto con el enlace.");
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
      setStatusMessage("Imagen de portada subida.");
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
    const previewUrl = URL.createObjectURL(file);
    const pendingId = `pending-${Date.now()}`;
    setPendingGalleryUploads((current) => [
      ...current,
      {
        id: pendingId,
        previewUrl,
        workTitle: "",
      },
    ]);

    try {
      const createdItem = await uploadAndAddImage(file, "", {
        workTitle: "",
        workType: "",
        workZone: "",
        workBadge: "",
      });
      setGalleryDrafts((current) => ({
        ...current,
        [String(createdItem.id)]: createdItem.workTitle,
      }));
      setStatusMessage("Foto agregada a la galeria.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo subir la foto"
      );
    } finally {
      setPendingGalleryUploads((current) => {
        const removed = current.find((item) => item.id === pendingId);
        if (removed) {
          URL.revokeObjectURL(removed.previewUrl);
        }
        return current.filter((item) => item.id !== pendingId);
      });
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
    clearAutosaveTimeout();

    try {
      setStatusMessage(null);
      await persistCurrentForm(form);
    } catch {}
  }

  const heroPreview = heroPreviewUrl ?? form.heroImageUrl;
  const scheduleSummary = formatHorarioPorDiaLabel(form.solicitudPublicaHorarioPorDia);
  const approvedTestimonials = testimonials.filter(
    (item) => item.estado === "aprobada"
  );
  const pendingTestimonials = testimonials.filter(
    (item) => item.estado === "pendiente"
  );
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
    { key: "hero", label: "Portada", icon: LuImage },
    { key: "servicios", label: "Servicios", icon: LuBlocks },
    { key: "galeria", label: "Trabajos", icon: LuImagePlus },
    { key: "redes", label: "Redes", icon: LuPhone },
    { key: "formulario", label: "Formulario", icon: LuMessageSquare },
    { key: "valoraciones", label: "Valoraciones", icon: LuStar },
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
      <OnboardingGuide controller={onboarding} routeKey="pagina_venta" />

      <div className={s.header}>
        <div>
          <p className={s.headerEyebrow}>Ajuste comercial</p>
          <h1 className={s.headerTitle}>Tu pagina publica</h1>
          <p className={s.headerText}>
            Edita solo el contenido propio de tu pagina. La identidad comercial base se gestiona desde Empresa.
          </p>
        </div>

        <div className={s.headerStatus}>
          <span
            className={s.statusBadge}
            data-published={form.isPublished}
            data-onboarding-target="pagina-venta-publicacion"
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
                    <span>JPG, PNG o foto del celular · la optimizamos automaticamente</span>
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

        {activeSection === "servicios" ? (
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <LuBlocks aria-hidden />
              <span>Servicios y cobertura</span>
            </div>

            <div className={s.card}>
              <div className={s.field}>
                <span className={s.label}>Servicios que realizas</span>
                <span className={s.helpText}>
                  El cliente vera solo lo que realmente ofreces.
                </span>
                <div className={s.serviceGrid}>
                  {PUBLIC_LANDING_SERVICE_OPTIONS.map((service) => {
                    const isActive = form.publicServices.includes(service);

                    return (
                      <button
                        key={service}
                        type="button"
                        className={`${s.serviceChip} ${isActive ? s.serviceChipActive : ""}`}
                        onClick={() => handleServiceToggle(service)}
                        aria-pressed={isActive}
                      >
                        {service}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={s.divider} />

              <label className={s.field}>
                <span className={s.label}>Zona de cobertura</span>
                <input
                  className={s.input}
                  value={form.publicZone}
                  onChange={(e) => handleFieldChange("publicZone", e.target.value)}
                  placeholder="Ej: La Serena, Coquimbo, Ovalle y alrededores"
                />
                <span className={s.helpText}>
                  Esto si es propio de la pagina. La direccion comercial se sigue tomando desde Empresa.
                </span>
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
                    {pendingGalleryUploads.map((item) => (
                      <div key={item.id} className={s.galleryItem}>
                        <div className={s.galleryImageWrap}>
                          <Image
                            src={item.previewUrl}
                            alt="Trabajo subiendose"
                            fill
                            className={s.galleryImage}
                            sizes="(max-width: 560px) 42vw, 160px"
                            unoptimized
                          />
                        </div>
                        <div className={s.galleryItemMeta}>
                          <input
                            className={s.galleryItemField}
                            value="Subiendo foto..."
                            disabled
                            readOnly
                          />
                          <div className={s.galleryMetaRow} />
                        </div>
                      </div>
                    ))}

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
                        <div className={s.galleryItemMeta}>
                          <input
                            className={s.galleryItemField}
                            value={galleryDrafts[String(item.id)] ?? item.workTitle}
                            placeholder="Titulo corto"
                            onChange={(e) =>
                              handleGalleryTitleDraftChange(item, e.target.value)
                            }
                            onBlur={() => flushGalleryTitleSave(item)}
                          />
                          <div className={s.galleryMetaRow}>
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
                      </div>
                    ))}

                    {gallery.length + pendingGalleryUploads.length < 8 ? (
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
                    {gallery.length + pendingGalleryUploads.length}/8 fotos ·{" "}
                    {isGalleryUploading
                      ? "Subiendo..."
                      : "Sube tus mejores trabajos. Los optimizamos automaticamente."}
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

              <label className={s.field}>
                <span className={s.label}>Bajada del formulario</span>
                <textarea
                  className={s.textarea}
                  rows={3}
                  value={form.formSubtitle}
                  onChange={(e) => handleFieldChange("formSubtitle", e.target.value)}
                  placeholder={DEFAULT_FORM_SUBTITLE}
                />
                <span className={s.helpText}>
                  Recomendacion: Mientras mas detalles agregue el cliente, mas rapido podras cotizar.
                </span>
              </label>

              <div className={s.divider} />

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

        {activeSection === "redes" ? (
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <LuPhone aria-hidden />
              <span>Redes y footer</span>
            </div>

            <div className={s.card}>
              {SOCIAL_FIELDS.map((field) => (
                <label key={field.key} className={s.field}>
                  <span className={s.label}>{field.label}</span>
                  <input
                    className={s.input}
                    value={form[field.key]}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                </label>
              ))}

              <div className={s.divider} />

              <div className={s.staticInfo}>
                <span className={s.label}>Se mostrara en el footer</span>
                <strong>{form.publicName || form.empresaNombre || "Mi empresa"}</strong>
                <span className={s.helpText}>
                  Mostramos solo las redes que completes. El WhatsApp y la zona salen desde tu perfil comercial.
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

        {activeSection === "valoraciones" ? (
          <section className={s.section}>
            <div className={s.sectionTitle}>
              <LuStar aria-hidden />
              <span>Valoraciones publicas</span>
            </div>

            <div className={s.card}>
              <div className={s.toggleRow}>
                <div className={s.toggleCopy}>
                  <strong>Mostrar valoraciones</strong>
                  <p>Solo se publican las valoraciones aprobadas por ti.</p>
                </div>

                <button
                  className={`${s.switch} ${form.showRating ? s.switchOn : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={form.showRating}
                  aria-label="Mostrar valoraciones"
                  onClick={() => handleFieldChange("showRating", !form.showRating)}
                >
                  <span className={s.switchThumb} />
                </button>
              </div>

              <div className={s.divider} />

              <div className={s.testimonialSummary}>
                <span>{pendingTestimonials.length} pendientes</span>
                <span>{approvedTestimonials.length} aprobadas</span>
              </div>

              {isLoadingTestimonials ? (
                <div className={s.loadingState}>Cargando valoraciones...</div>
              ) : testimonials.length === 0 ? (
                <div className={s.staticInfo}>
                  <strong>Aun no recibes valoraciones.</strong>
                  <span className={s.helpText}>
                    Cuando un cliente deje una reseña desde tu pagina, aparecera aqui para aprobarla u ocultarla.
                  </span>
                </div>
              ) : (
                <div className={s.testimonialList}>
                  {testimonials.map((item) => (
                    <article key={String(item.id)} className={s.testimonialCard}>
                      <div className={s.testimonialCardTop}>
                        <strong>{item.nombreCorto || "Cliente"}</strong>
                        <span className={s.testimonialStars}>
                          {"★".repeat(item.estrellas)}
                        </span>
                      </div>
                      <p>{item.comentario}</p>
                      <div className={s.testimonialActions}>
                        <button
                          type="button"
                          className={`${s.miniAction} ${
                            item.estado === "aprobada" ? s.miniActionActive : ""
                          }`}
                          onClick={() =>
                            void handleTestimonialStatusChange(item.id, "aprobada")
                          }
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          className={`${s.miniAction} ${
                            item.estado === "pendiente" ? s.miniActionActive : ""
                          }`}
                          onClick={() =>
                            void handleTestimonialStatusChange(item.id, "pendiente")
                          }
                        >
                          Pendiente
                        </button>
                        <button
                          type="button"
                          className={`${s.miniAction} ${
                            item.estado === "oculta" ? s.miniActionDanger : ""
                          }`}
                          onClick={() =>
                            void handleTestimonialStatusChange(item.id, "oculta")
                          }
                        >
                          Ocultar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {errorMessage ? <div className={s.error}>{errorMessage}</div> : null}
              {statusMessage ? <div className={s.success}>{statusMessage}</div> : null}

              <div className={s.sectionActions}>
                <button
                  className={s.saveButton}
                  type="submit"
                  disabled={isSaving || isUploadingHero}
                >
                  <LuSave aria-hidden />
                  {isSaving ? "Guardando..." : "Guardar visibilidad"}
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
                      Copiar texto + link
                    </button>
                  <a
                    className={s.secondaryAction}
                    href={previewPublicRequestUrl}
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
