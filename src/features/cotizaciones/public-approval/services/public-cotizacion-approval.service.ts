import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import {
  publicCotizacionApprovalRepository,
  type PublicCotizacionApprovalRepository,
} from "@/features/cotizaciones/public-approval/repositories/public-cotizacion-approval.repository";
import { resolveOrganizationProfile } from "@/features/organization-profile/services/organization-profile.service";
import {
  normalizeQuotePricingMode,
  type QuotePricingMode,
} from "@/features/cotizaciones/types/quote-pricing-mode";

type PublicCotizacionApprovalServiceDeps = {
  repository?: PublicCotizacionApprovalRepository;
};

const PUBLIC_APPROVAL_QUOTES_TAG = "public-approval-quotes";
const PUBLIC_APPROVAL_QUOTES_REVALIDATE_SECONDS = 60;

export type PublicApprovalQuoteView = {
  id: string;
  organizationId: string;
  codigo: string;
  estado: string;
  clienteNombre: string;
  clienteTelefono: string;
  obra: string;
  direccion: string;
  validez: string;
  observaciones: string;
  subtotal: number;
  descuentoPct: number;
  iva: number;
  flete: number;
  total: number;
  pricingMode: QuotePricingMode;
  approvalToken: string;
  approvalTokenExpiresAt: string | null;
  clienteVioEn: string | null;
  clienteRespondioEn: string | null;
  clienteRespuestaCanal: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  items: Array<{
    id: string;
    codigo: string;
    tipoItem: string | null;
    tipo: string;
    nombre: string;
    descripcion: string;
    observaciones: string;
    cantidad: number;
    unidad: string;
    vidrio: string;
    ancho: number | null;
    alto: number | null;
    precioUnitario: number;
    precioTotal: number;
  }>;
  organizationProfile: ReturnType<typeof resolveOrganizationProfile>;
  isExpired: boolean;
  canRespond: boolean;
};

function safelyRevalidatePublicApprovalQuotesCache() {
  try {
    revalidateTag(PUBLIC_APPROVAL_QUOTES_TAG, "max");
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (
      message.includes("static generation store missing") ||
      message.includes("incrementalcache missing") ||
      message.includes("invariant")
    ) {
      return;
    }

    throw error;
  }
}

function normalizeToken(token: string) {
  return token.trim().toLowerCase();
}

function isValidToken(token: string) {
  return /^[a-f0-9]{24,64}$/i.test(token.trim());
}

function formatValidez(value: string | null) {
  if (!value) {
    return "15 dias";
  }

  const validUntil = new Date(value);
  if (Number.isNaN(validUntil.getTime())) {
    return value;
  }

  const now = new Date();
  const diffMs = validUntil.getTime() - now.getTime();
  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  if (days <= 7) {
    return "7 dias";
  }

  if (days <= 15) {
    return "15 dias";
  }

  return "30 dias";
}

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

function isClosedPublicApprovalStatus(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase();

  return normalized === "aprobada" || normalized === "rechazada" || normalized === "terminada";
}

async function buildPublicApprovalQuoteView(
  repository: PublicCotizacionApprovalRepository,
  token: string
): Promise<PublicApprovalQuoteView | null> {
  const normalized = normalizeToken(token);

  if (!isValidToken(normalized)) {
    return null;
  }

  const payload = await repository.getByApprovalToken(normalized);

  if (!payload) {
    return null;
  }

  const items = payload.items.map((item, index) => ({
    id: String(item.id),
    codigo: item.codigo?.trim() || `I${index + 1}`,
    tipoItem: item.tipo_item ?? null,
    tipo: item.tipo_componente?.trim() || "Componente",
    nombre: item.nombre?.trim() || `Componente ${index + 1}`,
    descripcion: item.descripcion?.trim() || item.nombre?.trim() || `Componente ${index + 1}`,
    observaciones: item.observaciones?.trim() || "",
    cantidad: item.cantidad,
    unidad: item.unidad?.trim() || "unidad",
    vidrio: item.vidrio?.trim() || "-",
    ancho: item.ancho === null ? null : Number(item.ancho),
    alto: item.alto === null ? null : Number(item.alto),
    precioUnitario: Number(item.precio_unitario),
    precioTotal: Number(item.subtotal),
  }));
  const pricingMode = normalizeQuotePricingMode(payload.cotizacion.pricing_mode);
  const subtotal =
    pricingMode === "total_global"
      ? Number(payload.cotizacion.subtotal_neto ?? payload.cotizacion.total ?? 0)
      : items.length > 0
      ? round(items.reduce((accumulator, item) => accumulator + item.precioTotal, 0), 2)
      : Number(payload.cotizacion.subtotal_neto ?? payload.cotizacion.total ?? 0);

  const expiresAt = payload.cotizacion.approval_token_expires_at;
  const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
  const alreadyResponded =
    Boolean(payload.cotizacion.cliente_respondio_en) ||
    isClosedPublicApprovalStatus(payload.cotizacion.estado);

  return {
    id: String(payload.cotizacion.id),
    organizationId: String(payload.cotizacion.organization_id),
    codigo: payload.cotizacion.numero ?? `COT-${payload.cotizacion.id}`,
    estado: payload.cotizacion.estado,
    clienteNombre: payload.client?.nombre?.trim() || "Por confirmar",
    clienteTelefono: payload.client?.telefono ?? "",
    obra: payload.project?.titulo ?? "Proyecto sin nombre",
    direccion: payload.client?.direccion ?? "",
    validez: formatValidez(payload.cotizacion.valido_hasta),
    observaciones: payload.cotizacion.notas ?? "",
    subtotal,
    descuentoPct: Number(payload.cotizacion.descuento_pct ?? 0),
    iva: Number(payload.cotizacion.iva ?? 0),
    flete: Number(payload.cotizacion.flete ?? 0),
    total: Number(payload.cotizacion.total ?? 0),
    pricingMode,
    approvalToken: payload.cotizacion.approval_token ?? normalized,
    approvalTokenExpiresAt: expiresAt,
    clienteVioEn: payload.cotizacion.cliente_vio_en,
    clienteRespondioEn: payload.cotizacion.cliente_respondio_en,
    clienteRespuestaCanal: payload.cotizacion.cliente_respuesta_canal,
    createdAt: payload.cotizacion.creado_en,
    updatedAt: payload.cotizacion.actualizado_en,
    items,
    organizationProfile: resolveOrganizationProfile(
      payload.organizationProfile?.organization_id ?? payload.cotizacion.organization_id,
      payload.organizationProfile
        ? {
            organizationId: payload.organizationProfile.organization_id,
            empresaNombre: payload.organizationProfile.empresa_nombre ?? "",
            empresaLogoUrl: payload.organizationProfile.empresa_logo_url,
            responsableComercial: payload.organizationProfile.responsable_comercial ?? "",
            empresaDireccion: payload.organizationProfile.empresa_direccion ?? "",
            empresaTelefono: payload.organizationProfile.empresa_telefono ?? "",
            empresaEmail: payload.organizationProfile.empresa_email ?? "",
            brandColor: payload.organizationProfile.brand_color ?? "",
            formaPago: payload.organizationProfile.forma_pago ?? "",
            solicitudPublicaSlug: "",
            solicitudPublicaDescripcionCorta: "",
            solicitudPublicaValor: "",
            solicitudPublicaMensajeConfianza: "",
            solicitudPublicaPrivacidad: "",
            solicitudPublicaHorarioDesde: "",
            solicitudPublicaHorarioHasta: "",
            solicitudPublicaDiasAtencion: [],
            solicitudPublicaHorarioPorDia: [],
            proveedorPreferido: "",
            modoPrecioPreferido: "margen",
            margenDefecto: payload.organizationProfile.margen_defecto ?? 100,
            creadoEn: null,
            actualizadoEn: null,
            publicName: payload.organizationProfile.empresa_nombre ?? "",
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
          }
        : null
    ),
    isExpired,
    canRespond: !isExpired && !alreadyResponded,
  };
}

const resolveByTokenCached = unstable_cache(
  async (token: string) => {
    return buildPublicApprovalQuoteView(publicCotizacionApprovalRepository, token);
  },
  ["public-approval-resolve-by-token"],
  {
    revalidate: PUBLIC_APPROVAL_QUOTES_REVALIDATE_SECONDS,
    tags: [PUBLIC_APPROVAL_QUOTES_TAG],
  }
);

export function revalidatePublicApprovalQuotesCache() {
  safelyRevalidatePublicApprovalQuotesCache();
}

export function createPublicCotizacionApprovalService(
  deps: PublicCotizacionApprovalServiceDeps = {}
) {
  const repository = deps.repository ?? publicCotizacionApprovalRepository;

  async function resolveByToken(token: string): Promise<PublicApprovalQuoteView | null> {
    if (repository === publicCotizacionApprovalRepository) {
      return resolveByTokenCached(token);
    }

    return buildPublicApprovalQuoteView(repository, token);
  }

  return {
    resolveByToken,

    async markViewed(token: string) {
      const normalized = normalizeToken(token);

      if (!isValidToken(normalized)) {
        return null;
      }

      return repository.markViewed(normalized);
    },

    async registerView(token: string) {
      const normalized = normalizeToken(token);

      if (!isValidToken(normalized)) {
        return null;
      }

      await repository.markViewed(normalized);
      // Rebuild fresh after mutating the record to avoid stale cache reads
      safelyRevalidatePublicApprovalQuotesCache();
      return buildPublicApprovalQuoteView(repository, normalized);
    },

    async accept(token: string) {
      const normalized = normalizeToken(token);

      if (!isValidToken(normalized)) {
        throw new Error("El link de aprobacion no es valido.");
      }

      const current = await buildPublicApprovalQuoteView(repository, normalized);

      if (!current) {
        throw new Error("No existe un presupuesto asociado a ese link.");
      }

      if (current.isExpired) {
        throw new Error("Este link ya expiro.");
      }

      if (!current.canRespond) {
        return current;
      }

      await repository.respond(normalized, "aprobada");
      safelyRevalidatePublicApprovalQuotesCache();
      return buildPublicApprovalQuoteView(repository, normalized);
    },

    async reject(token: string) {
      const normalized = normalizeToken(token);

      if (!isValidToken(normalized)) {
        throw new Error("El link de aprobacion no es valido.");
      }

      const current = await buildPublicApprovalQuoteView(repository, normalized);

      if (!current) {
        throw new Error("No existe un presupuesto asociado a ese link.");
      }

      if (current.isExpired) {
        throw new Error("Este link ya expiro.");
      }

      if (!current.canRespond) {
        return current;
      }

      await repository.respond(normalized, "rechazada");
      safelyRevalidatePublicApprovalQuotesCache();
      return buildPublicApprovalQuoteView(repository, normalized);
    },
  };
}

export const publicCotizacionApprovalService =
  createPublicCotizacionApprovalService();
