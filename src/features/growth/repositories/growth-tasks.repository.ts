import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { GrowthTaskRow } from "@/features/growth/types/growth-supabase";

export async function listTasks(
  supabase: SupabaseClient,
  workspaceId: string,
  options: { pendingOnly?: boolean } = {}
): Promise<GrowthTaskRow[]> {
  let query = supabase
    .from("growth_tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("eliminado_en", null)
    .order("vence_en", { ascending: true, nullsFirst: false });

  if (options.pendingOnly) {
    query = query.is("completada_en", null);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as GrowthTaskRow[];
}

export async function insertTask(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<GrowthTaskRow> {
  const { data, error } = await supabase
    .from("growth_tasks")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as GrowthTaskRow;
}

export async function updateTask(
  supabase: SupabaseClient,
  workspaceId: string,
  taskId: string,
  patch: Record<string, unknown>
): Promise<GrowthTaskRow> {
  const { data, error } = await supabase
    .from("growth_tasks")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", taskId)
    .is("eliminado_en", null)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as GrowthTaskRow;
}

export async function completePendingTasksByType(
  supabase: SupabaseClient,
  workspaceId: string,
  prospectId: string,
  tipo: string
): Promise<void> {
  const { error } = await supabase
    .from("growth_tasks")
    .update({ completada_en: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("prospect_id", prospectId)
    .eq("tipo", tipo)
    .is("completada_en", null)
    .is("eliminado_en", null);

  if (error) {
    throw error;
  }
}

export async function findPendingTask(
  supabase: SupabaseClient,
  workspaceId: string,
  prospectId: string,
  tipo: string
): Promise<GrowthTaskRow | null> {
  const { data, error } = await supabase
    .from("growth_tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("prospect_id", prospectId)
    .eq("tipo", tipo)
    .is("completada_en", null)
    .is("eliminado_en", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as GrowthTaskRow | null;
}
