import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { GrowthContentItem } from "@/features/growth/types/growth-content";

type GrowthContentItemRow = {
  id: string;
  workspace_id: string;
  content_id: string;
  titulo: string;
  pilar: GrowthContentItem["pilar"];
  formato: GrowthContentItem["formato"];
  canal: GrowthContentItem["canal"];
  objetivo: GrowthContentItem["objetivo"];
  hook: string | null;
  cta: string;
  guion: string | null;
  caption: string | null;
  campaign_key: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  estado: GrowthContentItem["estado"];
  claim_review_status: GrowthContentItem["claimReviewStatus"];
  claim_review_notes: string | null;
  metadata_json: unknown;
  programado_para: string | null;
  publicado_en: string | null;
  creado_en: string;
  actualizado_en: string;
};

const CONTENT_COLUMNS =
  "id, workspace_id, content_id, titulo, pilar, formato, canal, objetivo, hook, cta, guion, caption, campaign_key, utm_source, utm_medium, utm_campaign, utm_content, estado, claim_review_status, claim_review_notes, metadata_json, programado_para, publicado_en, creado_en, actualizado_en";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function nullableMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapMetadata(value: unknown): GrowthContentItem["metadata"] {
  const source = asRecord(value);
  const metrics = asRecord(source.metricas);

  return {
    grupoNombre: nullableString(source.grupoNombre),
    grupoSegmento: nullableString(source.grupoSegmento),
    grupoRegion: nullableString(source.grupoRegion),
    publicacionUrl: nullableString(source.publicacionUrl),
    piezaBaseId: nullableString(source.piezaBaseId),
    metricas: {
      alcance: nullableMetric(metrics.alcance),
      interacciones: nullableMetric(metrics.interacciones),
      comentarios: nullableMetric(metrics.comentarios),
      mensajesDemo: nullableMetric(metrics.mensajesDemo),
      demos: nullableMetric(metrics.demos),
      pagos: nullableMetric(metrics.pagos),
    },
  };
}

export function mapGrowthContentItemRow(row: GrowthContentItemRow): GrowthContentItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    contentId: row.content_id,
    titulo: row.titulo,
    pilar: row.pilar,
    formato: row.formato,
    canal: row.canal,
    objetivo: row.objetivo,
    hook: row.hook,
    cta: row.cta,
    guion: row.guion,
    caption: row.caption,
    campaignKey: row.campaign_key,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    estado: row.estado,
    claimReviewStatus: row.claim_review_status,
    claimReviewNotes: row.claim_review_notes,
    metadata: mapMetadata(row.metadata_json),
    programadoPara: row.programado_para,
    publicadoEn: row.publicado_en,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

export async function listGrowthContentItems(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<GrowthContentItem[]> {
  const { data, error } = await supabase
    .from("growth_content_items")
    .select(CONTENT_COLUMNS)
    .eq("workspace_id", workspaceId)
    .is("eliminado_en", null)
    .order("programado_para", { ascending: false, nullsFirst: false })
    .order("actualizado_en", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as GrowthContentItemRow[]).map(mapGrowthContentItemRow);
}

export async function insertGrowthContentItem(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<GrowthContentItem> {
  const { data, error } = await supabase
    .from("growth_content_items")
    .insert(row)
    .select(CONTENT_COLUMNS)
    .single();

  if (error) throw error;
  return mapGrowthContentItemRow(data as GrowthContentItemRow);
}

export async function updateGrowthContentItem(
  supabase: SupabaseClient,
  workspaceId: string,
  id: string,
  patch: Record<string, unknown>
): Promise<GrowthContentItem> {
  const { data, error } = await supabase
    .from("growth_content_items")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .is("eliminado_en", null)
    .select(CONTENT_COLUMNS)
    .single();

  if (error) throw error;
  return mapGrowthContentItemRow(data as GrowthContentItemRow);
}
