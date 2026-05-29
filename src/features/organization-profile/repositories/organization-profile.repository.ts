import { createClient } from "@/lib/supabase/client";
import { normalizePreferredProvider } from "@/features/cotizaciones/services/component-suggestions.service";
import { organizationAssetsUploadRepository } from "@/features/organization-assets/repositories/organization-assets-upload.repository";
import type { EntityId } from "@/types/common";
import type {
  OrganizationProfile,
  SolicitudPublicaHorarioDia,
  UpdateOrganizationProfileInput,
} from "@/features/organization-profile/types/organization-profile";
import { normalizePricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type {
  BillingPeriod,
  PaymentMethod,
  PlanCode,
  PlanType,
  SubscriptionStatus,
} from "@/features/subscriptions/types/subscription";

type OrganizationProfileRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
};

type OrganizationProfileRow = {
  organization_id: EntityId;
  empresa_nombre: string | null;
  empresa_logo_url: string | null;
  empresa_direccion: string | null;
  empresa_telefono: string | null;
  empresa_email: string | null;
  brand_color: string | null;
  forma_pago: string | null;
  solicitud_publica_slug?: string | null;
  solicitud_publica_descripcion_corta?: string | null;
  solicitud_publica_valor?: string | null;
  solicitud_publica_mensaje_confianza?: string | null;
  solicitud_publica_privacidad?: string | null;
  solicitud_publica_horario_desde?: string | null;
  solicitud_publica_horario_hasta?: string | null;
  solicitud_publica_dias_atencion?: string | null;
  solicitud_publica_horario_por_dia?: unknown;
  proveedor_preferido: string | null;
  modo_precio_preferido: string | null;
  margen_defecto: number | null;
  creado_en: string | null;
  actualizado_en: string | null;
  public_name: string | null;
  public_subtitle: string | null;
  public_zone: string | null;
  public_business_type: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
  public_services: string[] | null;
  final_cta_title: string | null;
  final_cta_subtitle: string | null;
  final_cta_label: string | null;
  business_hours_note: string | null;
  secondary_color: string | null;
  hero_mode: string | null;
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  show_gallery: boolean | null;
  show_schedule: boolean | null;
  show_rating: boolean | null;
  rating_label: string | null;
  jobs_count_label: string | null;
  form_title: string | null;
  form_subtitle: string | null;
  is_published: boolean | null;
  subscription_status?: SubscriptionStatus | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  plan_type?: PlanType | null;
  plan_code?: PlanCode | null;
  billing_period?: BillingPeriod | null;
  payment_method?: PaymentMethod | null;
  last_payment_at?: string | null;
  founder_price_locked?: boolean | null;
};

const TABLE_NAME = "organization_profile";
function getErrorText(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  return [candidate.code, candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isMissingOrganizationProfileTableError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    haystack.includes("organization_profile") &&
    (haystack.includes("relation") ||
      haystack.includes("schema cache") ||
      haystack.includes("does not exist"))
  );
}

function isOrganizationAssetsBucketError(error: unknown) {
  const haystack = getErrorText(error);

  return (
    haystack.includes("organization-assets") &&
    (haystack.includes("bucket") ||
      haystack.includes("not found") ||
      haystack.includes("does not exist"))
  );
}

function mapOrganizationProfile(
  row: OrganizationProfileRow | null
): OrganizationProfile | null {
  if (!row) {
    return null;
  }

  return {
    organizationId: row.organization_id,
    empresaNombre: row.empresa_nombre ?? "",
    empresaLogoUrl: row.empresa_logo_url,
    empresaDireccion: row.empresa_direccion ?? "",
    empresaTelefono: row.empresa_telefono ?? "",
    empresaEmail: row.empresa_email ?? "",
    brandColor: row.brand_color ?? "",
    formaPago: row.forma_pago ?? "",
    solicitudPublicaSlug: row.solicitud_publica_slug ?? "",
    solicitudPublicaDescripcionCorta:
      row.solicitud_publica_descripcion_corta ?? "",
    solicitudPublicaValor: row.solicitud_publica_valor ?? "",
    solicitudPublicaMensajeConfianza:
      row.solicitud_publica_mensaje_confianza ?? "",
    solicitudPublicaPrivacidad: row.solicitud_publica_privacidad ?? "",
    solicitudPublicaHorarioDesde: row.solicitud_publica_horario_desde ?? "",
    solicitudPublicaHorarioHasta: row.solicitud_publica_horario_hasta ?? "",
    solicitudPublicaDiasAtencion: row.solicitud_publica_dias_atencion
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [],
    solicitudPublicaHorarioPorDia: Array.isArray(row.solicitud_publica_horario_por_dia)
      ? (row.solicitud_publica_horario_por_dia as SolicitudPublicaHorarioDia[])
      : [],
    proveedorPreferido: normalizePreferredProvider(row.proveedor_preferido),
    modoPrecioPreferido: normalizePricingMode(row.modo_precio_preferido),
    margenDefecto: row.margen_defecto ?? 100,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    publicName: row.public_name ?? "",
    publicSubtitle: row.public_subtitle ?? "",
    publicZone: row.public_zone ?? "",
    publicBusinessType: row.public_business_type ?? "",
    instagramUrl: row.instagram_url ?? "",
    facebookUrl: row.facebook_url ?? "",
    tiktokUrl: row.tiktok_url ?? "",
    websiteUrl: row.website_url ?? "",
    publicServices: (row.public_services ?? []) as OrganizationProfile["publicServices"],
    finalCtaTitle: row.final_cta_title ?? "",
    finalCtaSubtitle: row.final_cta_subtitle ?? "",
    finalCtaLabel: row.final_cta_label ?? "",
    businessHoursNote: row.business_hours_note ?? "",
    secondaryColor: row.secondary_color ?? "",
    heroMode: (row.hero_mode === "image" ? "image" : "gradient") as "image" | "gradient",
    heroImageUrl: row.hero_image_url,
    heroTitle: row.hero_title ?? "",
    heroSubtitle: row.hero_subtitle ?? "",
    showGallery: row.show_gallery ?? true,
    showSchedule: row.show_schedule ?? true,
    showRating: row.show_rating ?? false,
    ratingLabel: row.rating_label ?? "",
    jobsCountLabel: row.jobs_count_label ?? "",
    formTitle: row.form_title ?? "",
    formSubtitle: row.form_subtitle ?? "",
    isPublished: row.is_published ?? false,
    subscriptionStatus: row.subscription_status ?? null,
    trialStartedAt: row.trial_started_at ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    subscriptionStartedAt: row.subscription_started_at ?? null,
    subscriptionEndsAt: row.subscription_ends_at ?? null,
    planType: row.plan_type ?? null,
    planCode: (row.plan_code as OrganizationProfile["planCode"]) ?? null,
    billingPeriod: row.billing_period ?? null,
    paymentMethod: row.payment_method ?? null,
    lastPaymentAt: row.last_payment_at ?? null,
    founderPriceLocked: row.founder_price_locked ?? false,
    subscription: undefined as never,
  };
}

export function createOrganizationProfileRepository(
  deps: OrganizationProfileRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();

  return {
    async getByOrganizationId(organizationId: EntityId) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) {
        if (isMissingOrganizationProfileTableError(error)) {
          return null;
        }

        throw error;
      }

      return mapOrganizationProfile(data as OrganizationProfileRow | null);
    },

  async upsertByOrganizationId(
    organizationId: EntityId,
    input: UpdateOrganizationProfileInput
  ) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert(
        {
          organization_id: organizationId,
          empresa_nombre: input.empresaNombre,
          empresa_logo_url: input.empresaLogoUrl,
          empresa_direccion: input.empresaDireccion,
          empresa_telefono: input.empresaTelefono,
          empresa_email: input.empresaEmail,
          brand_color: input.brandColor,
          forma_pago: input.formaPago,
          solicitud_publica_slug: input.solicitudPublicaSlug,
          solicitud_publica_descripcion_corta:
          input.solicitudPublicaDescripcionCorta,
          solicitud_publica_valor: input.solicitudPublicaValor,
          solicitud_publica_mensaje_confianza:
          input.solicitudPublicaMensajeConfianza,
          solicitud_publica_privacidad: input.solicitudPublicaPrivacidad,
          solicitud_publica_horario_desde: input.solicitudPublicaHorarioDesde,
          solicitud_publica_horario_hasta: input.solicitudPublicaHorarioHasta,
          solicitud_publica_dias_atencion:
          input.solicitudPublicaDiasAtencion.join(","),
          solicitud_publica_horario_por_dia: input.solicitudPublicaHorarioPorDia,
          proveedor_preferido: input.proveedorPreferido || null,
          modo_precio_preferido: normalizePricingMode(input.modoPrecioPreferido),
          margen_defecto: input.margenDefecto,
          actualizado_en: new Date().toISOString(),
          public_name: input.publicName || null,
          public_subtitle: input.publicSubtitle || null,
          public_zone: input.publicZone || null,
          public_business_type: input.publicBusinessType || null,
          instagram_url: input.instagramUrl || null,
          facebook_url: input.facebookUrl || null,
          tiktok_url: input.tiktokUrl || null,
          website_url: input.websiteUrl || null,
          public_services: input.publicServices,
          final_cta_title: input.finalCtaTitle || null,
          final_cta_subtitle: input.finalCtaSubtitle || null,
          final_cta_label: input.finalCtaLabel || null,
          business_hours_note: input.businessHoursNote || null,
          secondary_color: input.secondaryColor || null,
          hero_mode: input.heroMode || "gradient",
          hero_image_url: input.heroImageUrl || null,
          hero_title: input.heroTitle || null,
          hero_subtitle: input.heroSubtitle || null,
          show_gallery: input.showGallery,
          show_schedule: input.showSchedule,
          show_rating: input.showRating,
          rating_label: input.ratingLabel || null,
          jobs_count_label: input.jobsCountLabel || null,
          form_title: input.formTitle || null,
          form_subtitle: input.formSubtitle || null,
          is_published: input.isPublished,
        },
        {
          onConflict: "organization_id",
        }
      )
      .select("*")
      .single();

      if (error) {
        if (isMissingOrganizationProfileTableError(error)) {
          throw new Error(
            "Falta ejecutar la migracion de organization_profile en Supabase antes de guardar la configuracion de empresa."
          );
        }

        throw error;
      }

      return mapOrganizationProfile(data as OrganizationProfileRow)!;
    },

  async uploadLogo(_organizationId: EntityId, file: File) {
    try {
      return await organizationAssetsUploadRepository.uploadAsset("logo", file);
    } catch (error) {
      if (isOrganizationAssetsBucketError(error)) {
        throw new Error(
          "Falta crear el bucket organization-assets en Supabase antes de subir logos."
        );
      }

      throw error;
    }
  },

  async uploadHeroImage(_organizationId: EntityId, file: File) {
    if (!file.type.startsWith("image/")) {
      throw new Error("La imagen hero debe ser una imagen");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("La imagen hero no puede pesar mas de 10 MB");
    }

    try {
      return await organizationAssetsUploadRepository.uploadAsset("hero", file);
    } catch (error) {
      if (isOrganizationAssetsBucketError(error)) {
        throw new Error(
          "Falta crear el bucket organization-assets en Supabase antes de subir la imagen hero."
        );
      }

      throw error;
    }
  },
  };
}

export type OrganizationProfileRepository = ReturnType<
  typeof createOrganizationProfileRepository
>;

let defaultOrganizationProfileRepository: OrganizationProfileRepository | null = null;

function getDefaultOrganizationProfileRepository() {
  if (!defaultOrganizationProfileRepository) {
    defaultOrganizationProfileRepository = createOrganizationProfileRepository();
  }

  return defaultOrganizationProfileRepository;
}

export const organizationProfileRepository: OrganizationProfileRepository = {
  getByOrganizationId(...args) {
    return getDefaultOrganizationProfileRepository().getByOrganizationId(...args);
  },
  upsertByOrganizationId(...args) {
    return getDefaultOrganizationProfileRepository().upsertByOrganizationId(...args);
  },
  uploadLogo(...args) {
    return getDefaultOrganizationProfileRepository().uploadLogo(...args);
  },
  uploadHeroImage(...args) {
    return getDefaultOrganizationProfileRepository().uploadHeroImage(...args);
  },
};
