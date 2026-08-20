import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  GrowthOnboardingAssignment,
  GrowthOnboardingEvent,
  GrowthOnboardingVideo,
} from "@/features/growth/types/growth-onboarding";

const VIDEO_COLUMNS =
  "id, workspace_id, slug, titulo, resumen, paso, dispositivo, duracion_segundos, video_url, estado, es_predeterminado, orden, creado_en, actualizado_en";
const ASSIGNMENT_COLUMNS =
  "id, workspace_id, organization_id, video_id, estado, asignado_en, visto_en, completado_en, notas, actualizado_en";
const EVENT_COLUMNS =
  "id, organization_id, assignment_id, video_id, cotizacion_id, tipo, fuente, ocurrido_en";

function mapVideo(row: Record<string, unknown>): GrowthOnboardingVideo {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), slug: String(row.slug),
    titulo: String(row.titulo), resumen: (row.resumen as string | null) ?? null,
    paso: row.paso as GrowthOnboardingVideo["paso"],
    dispositivo: row.dispositivo as GrowthOnboardingVideo["dispositivo"],
    duracionSegundos: row.duracion_segundos === null ? null : Number(row.duracion_segundos),
    videoUrl: (row.video_url as string | null) ?? null,
    estado: row.estado as GrowthOnboardingVideo["estado"], orden: Number(row.orden ?? 0),
    esPredeterminado: Boolean(row.es_predeterminado),
    creadoEn: String(row.creado_en), actualizadoEn: String(row.actualizado_en),
  };
}

function mapAssignment(row: Record<string, unknown>): GrowthOnboardingAssignment {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), organizationId: Number(row.organization_id),
    videoId: String(row.video_id), estado: row.estado as GrowthOnboardingAssignment["estado"],
    asignadoEn: String(row.asignado_en), vistoEn: (row.visto_en as string | null) ?? null,
    completadoEn: (row.completado_en as string | null) ?? null, notas: (row.notas as string | null) ?? null,
    actualizadoEn: String(row.actualizado_en),
  };
}

function mapEvent(row: Record<string, unknown>): GrowthOnboardingEvent {
  return {
    id: String(row.id), organizationId: Number(row.organization_id),
    assignmentId: (row.assignment_id as string | null) ?? null, videoId: (row.video_id as string | null) ?? null,
    cotizacionId: row.cotizacion_id === null ? null : String(row.cotizacion_id),
    tipo: row.tipo as GrowthOnboardingEvent["tipo"], fuente: row.fuente as GrowthOnboardingEvent["fuente"],
    ocurridoEn: String(row.ocurrido_en),
  };
}

export async function listGrowthOnboardingVideos(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase.from("growth_onboarding_videos").select(VIDEO_COLUMNS)
    .eq("workspace_id", workspaceId).is("eliminado_en", null).order("orden").order("creado_en");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapVideo);
}

export async function listGrowthOnboardingAssignments(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase.from("growth_onboarding_assignments").select(ASSIGNMENT_COLUMNS)
    .eq("workspace_id", workspaceId).is("eliminado_en", null).order("asignado_en", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapAssignment);
}

export async function listGrowthOnboardingEvents(supabase: SupabaseClient, workspaceId: string) {
  const { data, error } = await supabase.from("growth_onboarding_events").select(EVENT_COLUMNS)
    .eq("workspace_id", workspaceId).order("ocurrido_en", { ascending: false }).limit(300);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapEvent);
}

export async function insertGrowthOnboardingVideo(supabase: SupabaseClient, row: Record<string, unknown>) {
  const { data, error } = await supabase.from("growth_onboarding_videos").insert(row).select(VIDEO_COLUMNS).single();
  if (error) throw error;
  return mapVideo(data as Record<string, unknown>);
}

export async function updateGrowthOnboardingVideo(supabase: SupabaseClient, workspaceId: string, id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from("growth_onboarding_videos").update(patch)
    .eq("workspace_id", workspaceId).eq("id", id).is("eliminado_en", null).select(VIDEO_COLUMNS).single();
  if (error) throw error;
  return mapVideo(data as Record<string, unknown>);
}

export async function insertGrowthOnboardingAssignment(supabase: SupabaseClient, row: Record<string, unknown>) {
  const { data, error } = await supabase.from("growth_onboarding_assignments").insert(row).select(ASSIGNMENT_COLUMNS).single();
  if (error) throw error;
  return mapAssignment(data as Record<string, unknown>);
}

export async function updateGrowthOnboardingAssignment(supabase: SupabaseClient, workspaceId: string, id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from("growth_onboarding_assignments").update(patch)
    .eq("workspace_id", workspaceId).eq("id", id).is("eliminado_en", null).select(ASSIGNMENT_COLUMNS).single();
  if (error) throw error;
  return mapAssignment(data as Record<string, unknown>);
}
