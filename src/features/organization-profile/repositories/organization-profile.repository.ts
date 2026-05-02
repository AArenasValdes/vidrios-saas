import { createClient } from "@/lib/supabase/client";
import { normalizePreferredProvider } from "@/features/cotizaciones/services/component-suggestions.service";
import type { EntityId } from "@/types/common";
import type {
  OrganizationProfile,
  UpdateOrganizationProfileInput,
} from "@/features/organization-profile/types/organization-profile";
import { normalizePricingMode } from "@/features/cotizaciones/types/pricing-mode";

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
  solicitud_publica_valor?: string | null;
  solicitud_publica_privacidad?: string | null;
  proveedor_preferido: string | null;
  modo_precio_preferido: string | null;
  margen_defecto: number | null;
  creado_en: string | null;
  actualizado_en: string | null;
};

const TABLE_NAME = "organization_profile";
const LOGO_BUCKET = "organization-assets";

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
    solicitudPublicaValor: row.solicitud_publica_valor ?? "",
    solicitudPublicaPrivacidad: row.solicitud_publica_privacidad ?? "",
    proveedorPreferido: normalizePreferredProvider(row.proveedor_preferido),
    modoPrecioPreferido: normalizePricingMode(row.modo_precio_preferido),
    margenDefecto: row.margen_defecto ?? 100,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-");
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
            solicitud_publica_valor: input.solicitudPublicaValor,
            solicitud_publica_privacidad: input.solicitudPublicaPrivacidad,
            proveedor_preferido: input.proveedorPreferido || null,
            modo_precio_preferido: normalizePricingMode(input.modoPrecioPreferido),
            margen_defecto: input.margenDefecto,
            actualizado_en: new Date().toISOString(),
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

    async uploadLogo(organizationId: EntityId, file: File) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const sanitizedName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
      const storagePath = `${organizationId}/brand/logo-${Date.now()}-${sanitizedName}.${extension}`;

      const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (error) {
        if (isOrganizationAssetsBucketError(error)) {
          throw new Error(
            "Falta crear el bucket organization-assets en Supabase antes de subir logos."
          );
        }

        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(storagePath);

      return publicUrl;
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
};
