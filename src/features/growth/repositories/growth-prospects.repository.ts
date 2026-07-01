import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  GrowthProspectFilters,
  GrowthProspectRow,
} from "@/features/growth/types/growth-supabase";

const PROSPECT_SELECT = "*";

export async function listProspects(
  supabase: SupabaseClient,
  workspaceId: string,
  filters: GrowthProspectFilters = {}
): Promise<GrowthProspectRow[]> {
  let query = supabase
    .from("growth_prospects")
    .select(PROSPECT_SELECT)
    .eq("workspace_id", workspaceId)
    .is("eliminado_en", null)
    .order("proxima_accion_en", { ascending: true, nullsFirst: false });

  if (filters.estado) {
    query = query.eq("estado", filters.estado);
  }
  if (filters.fuente) {
    query = query.eq("fuente", filters.fuente);
  }
  if (filters.segmento) {
    query = query.eq("segmento", filters.segmento);
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    query = query.or(
      `empresa.ilike.%${q}%,contacto_nombre.ilike.%${q}%,telefono.ilike.%${q}%,ciudad.ilike.%${q}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as GrowthProspectRow[];
}

export async function getProspectById(
  supabase: SupabaseClient,
  workspaceId: string,
  prospectId: string
): Promise<GrowthProspectRow | null> {
  const { data, error } = await supabase
    .from("growth_prospects")
    .select(PROSPECT_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("id", prospectId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as GrowthProspectRow | null;
}

export async function insertProspect(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<GrowthProspectRow> {
  const { data, error } = await supabase
    .from("growth_prospects")
    .insert(row)
    .select(PROSPECT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as GrowthProspectRow;
}

export async function updateProspect(
  supabase: SupabaseClient,
  workspaceId: string,
  prospectId: string,
  patch: Record<string, unknown>
): Promise<GrowthProspectRow> {
  const { data, error } = await supabase
    .from("growth_prospects")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", prospectId)
    .is("eliminado_en", null)
    .select(PROSPECT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as GrowthProspectRow;
}

export async function softDeleteProspect(
  supabase: SupabaseClient,
  workspaceId: string,
  prospectId: string
): Promise<void> {
  const { error } = await supabase
    .from("growth_prospects")
    .update({ eliminado_en: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", prospectId)
    .is("eliminado_en", null);

  if (error) {
    throw error;
  }
}

export async function upsertProspectByLegacyId(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<{ row: GrowthProspectRow; inserted: boolean }> {
  const legacySourceId = row.legacy_source_id as string | null | undefined;
  const workspaceId = row.workspace_id as string;

  if (legacySourceId) {
    const { data: existing } = await supabase
      .from("growth_prospects")
      .select(PROSPECT_SELECT)
      .eq("workspace_id", workspaceId)
      .eq("legacy_source_id", legacySourceId)
      .is("eliminado_en", null)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("growth_prospects")
        .update(row)
        .eq("id", existing.id)
        .select(PROSPECT_SELECT)
        .single();

      if (error) throw error;
      return { row: data as GrowthProspectRow, inserted: false };
    }
  }

  const { data, error } = await supabase
    .from("growth_prospects")
    .insert(row)
    .select(PROSPECT_SELECT)
    .single();

  if (error) throw error;
  return { row: data as GrowthProspectRow, inserted: true };
}
