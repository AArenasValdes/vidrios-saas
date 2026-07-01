import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { GrowthActivityRow } from "@/features/growth/types/growth-supabase";

export async function listActivitiesByProspect(
  supabase: SupabaseClient,
  workspaceId: string,
  prospectId: string
): Promise<GrowthActivityRow[]> {
  const { data, error } = await supabase
    .from("growth_activities")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("prospect_id", prospectId)
    .is("eliminado_en", null)
    .order("creado_en", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as GrowthActivityRow[];
}

export async function insertActivity(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<GrowthActivityRow> {
  const { data, error } = await supabase
    .from("growth_activities")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as GrowthActivityRow;
}
