import "server-only";

import {
  insertGrowthContentItem,
  listGrowthContentItems,
  updateGrowthContentItem,
} from "@/features/growth/repositories/growth-content.repository";
import type { GrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import {
  GROWTH_CLAIM_REVIEW_STATUSES,
  GROWTH_CONTENT_CHANNELS,
  GROWTH_CONTENT_FORMATS,
  GROWTH_CONTENT_OBJECTIVES,
  GROWTH_CONTENT_PILLARS,
  GROWTH_CONTENT_STATUSES,
  type CreateGrowthContentItemInput,
  type GrowthClaimReviewStatus,
  type GrowthContentItem,
  type GrowthContentMetadata,
  type GrowthContentManualMetrics,
  type GrowthContentStatus,
  type UpdateGrowthContentItemInput,
} from "@/features/growth/types/growth-content";

const TEXT_LIMITS = {
  title: 160,
  contentId: 80,
  short: 120,
  long: 8000,
} as const;

const EMPTY_MANUAL_METRICS: GrowthContentManualMetrics = {
  alcance: null,
  interacciones: null,
  comentarios: null,
  mensajesDemo: null,
  demos: null,
  pagos: null,
};

const EMPTY_METADATA: GrowthContentMetadata = {
  grupoNombre: null,
  grupoSegmento: null,
  grupoRegion: null,
  publicacionUrl: null,
  piezaBaseId: null,
  metricas: EMPTY_MANUAL_METRICS,
};

function normalizeText(value: string | null | undefined, limit: number) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized.slice(0, limit) : null;
}

function requireText(value: string | null | undefined, limit: number, label: string) {
  const normalized = normalizeText(value, limit);
  if (!normalized) throw new Error(`${label} es obligatorio.`);
  return normalized;
}

function assertOneOf<T extends string>(value: string, values: readonly T[], label: string): T {
  if (!values.includes(value as T)) throw new Error(`${label} no es válido.`);
  return value as T;
}

function normalizeMetric(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.max(0, Math.round(value));
}

function normalizeMetadata(
  value: CreateGrowthContentItemInput["metadata"],
  current?: GrowthContentMetadata
): GrowthContentMetadata {
  const source = value ?? current ?? EMPTY_METADATA;
  const metrics = source.metricas ?? current?.metricas ?? EMPTY_MANUAL_METRICS;

  return {
    grupoNombre: normalizeText(source.grupoNombre, TEXT_LIMITS.short),
    grupoSegmento: normalizeText(source.grupoSegmento, TEXT_LIMITS.short),
    grupoRegion: normalizeText(source.grupoRegion, TEXT_LIMITS.short),
    publicacionUrl: normalizeText(source.publicacionUrl, 500),
    piezaBaseId: normalizeText(source.piezaBaseId, TEXT_LIMITS.contentId),
    metricas: {
      alcance: normalizeMetric(metrics.alcance),
      interacciones: normalizeMetric(metrics.interacciones),
      comentarios: normalizeMetric(metrics.comentarios),
      mensajesDemo: normalizeMetric(metrics.mensajesDemo),
      demos: normalizeMetric(metrics.demos),
      pagos: normalizeMetric(metrics.pagos),
    },
  };
}

function normalizeContentId(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TEXT_LIMITS.contentId);

  if (!/^[a-z0-9][a-z0-9_-]{2,79}$/.test(normalized)) {
    throw new Error("content_id debe usar minúsculas, números, guiones o guiones bajos.");
  }

  return normalized;
}

function resolveEnum<T extends string>(
  value: string | undefined,
  fallback: T,
  values: readonly T[],
  label: string
) {
  return value ? assertOneOf(value, values, label) : fallback;
}

type ContentPatch = Record<string, unknown>;

function validatePublication(input: {
  estado: GrowthContentStatus;
  claimReviewStatus: GrowthClaimReviewStatus;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  canal: string;
  metadata: GrowthContentMetadata;
}) {
  if (input.estado !== "programado" && input.estado !== "publicado") return;
  if (input.claimReviewStatus !== "aprobado") {
    throw new Error("Aprueba claims antes de programar o publicar una pieza.");
  }
  if (!input.utmSource || !input.utmMedium || !input.utmCampaign || !input.utmContent) {
    throw new Error("Completa source, medium, campaña y contenido UTM antes de programar o publicar.");
  }
  if (input.canal === "grupos" && !input.metadata.grupoNombre) {
    throw new Error("Indica el nombre del grupo antes de programar o publicar.");
  }
}

export function buildGrowthContentPatch(
  input: Partial<CreateGrowthContentItemInput>,
  current?: GrowthContentItem
): ContentPatch {
  const contentId = input.contentId === undefined
    ? current?.contentId
    : normalizeContentId(input.contentId);
  const titulo = input.titulo === undefined
    ? current?.titulo
    : requireText(input.titulo, TEXT_LIMITS.title, "Título");
  const pilar = input.pilar === undefined
    ? current?.pilar
    : assertOneOf(input.pilar, GROWTH_CONTENT_PILLARS, "Pilar");
  const formato = input.formato === undefined
    ? current?.formato
    : assertOneOf(input.formato, GROWTH_CONTENT_FORMATS, "Formato");
  const canal = input.canal === undefined
    ? current?.canal
    : assertOneOf(input.canal, GROWTH_CONTENT_CHANNELS, "Canal");
  const objetivo = resolveEnum(
    input.objetivo,
    current?.objetivo ?? "generar_demos",
    GROWTH_CONTENT_OBJECTIVES,
    "Objetivo"
  );
  const estado = resolveEnum(
    input.estado,
    current?.estado ?? "borrador",
    GROWTH_CONTENT_STATUSES,
    "Estado"
  );
  const claimReviewStatus = resolveEnum(
    input.claimReviewStatus,
    current?.claimReviewStatus ?? "pendiente",
    GROWTH_CLAIM_REVIEW_STATUSES,
    "Revisión de claims"
  );
  const cta = input.cta === undefined
    ? current?.cta ?? "Escríbeme DEMO"
    : requireText(input.cta, TEXT_LIMITS.short, "CTA");
  const utmSource = input.utmSource === undefined
    ? current?.utmSource ?? null
    : normalizeText(input.utmSource, TEXT_LIMITS.short);
  const utmMedium = input.utmMedium === undefined
    ? current?.utmMedium ?? null
    : normalizeText(input.utmMedium, TEXT_LIMITS.short);
  const utmCampaign = input.utmCampaign === undefined
    ? current?.utmCampaign ?? null
    : normalizeText(input.utmCampaign, TEXT_LIMITS.short);
  const utmContent = input.utmContent === undefined
    ? current?.utmContent ?? null
    : normalizeText(input.utmContent, TEXT_LIMITS.short);
  const metadata = normalizeMetadata(input.metadata, current?.metadata);

  if (!contentId || !titulo || !pilar || !formato || !canal) {
    throw new Error("La pieza de contenido está incompleta.");
  }

  validatePublication({ estado, claimReviewStatus, utmSource, utmMedium, utmCampaign, utmContent, canal, metadata });

  return {
    content_id: contentId,
    titulo,
    pilar,
    formato,
    canal,
    objetivo,
    hook: input.hook === undefined ? current?.hook ?? null : normalizeText(input.hook, TEXT_LIMITS.short),
    cta,
    guion: input.guion === undefined ? current?.guion ?? null : normalizeText(input.guion, TEXT_LIMITS.long),
    caption: input.caption === undefined ? current?.caption ?? null : normalizeText(input.caption, TEXT_LIMITS.long),
    campaign_key: input.campaignKey === undefined ? current?.campaignKey ?? null : normalizeText(input.campaignKey, TEXT_LIMITS.short),
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    estado,
    claim_review_status: claimReviewStatus,
    claim_review_notes: input.claimReviewNotes === undefined ? current?.claimReviewNotes ?? null : normalizeText(input.claimReviewNotes, TEXT_LIMITS.long),
    metadata_json: metadata,
    programado_para: input.programadoPara === undefined ? current?.programadoPara ?? null : input.programadoPara,
  };
}

export async function listGrowthContent(context: GrowthRouteContext) {
  return listGrowthContentItems(context.supabase, context.workspaceId);
}

export async function createGrowthContent(
  context: GrowthRouteContext,
  input: CreateGrowthContentItemInput
) {
  return insertGrowthContentItem(context.supabase, {
    workspace_id: context.workspaceId,
    creado_por_auth_user_id: context.user.id,
    ...buildGrowthContentPatch(input),
  });
}

export async function updateGrowthContent(
  context: GrowthRouteContext,
  current: GrowthContentItem,
  input: UpdateGrowthContentItemInput
) {
  if (input.eliminado) {
    return updateGrowthContentItem(context.supabase, context.workspaceId, current.id, {
      eliminado_en: new Date().toISOString(),
    });
  }

  const patchInput = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "id" && key !== "eliminado")
  ) as Partial<CreateGrowthContentItemInput>;
  return updateGrowthContentItem(
    context.supabase,
    context.workspaceId,
    current.id,
    buildGrowthContentPatch(patchInput, current)
  );
}

export function findGrowthContentItem(items: GrowthContentItem[], id: string) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error("La pieza de contenido no existe.");
  return item;
}
