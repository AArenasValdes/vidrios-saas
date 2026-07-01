import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  GrowthWorkspaceMemberRow,
  GrowthWorkspaceRow,
} from "@/features/growth/types/growth-supabase";

export async function getActiveMembership(
  supabase: SupabaseClient,
  authUserId: string
): Promise<GrowthWorkspaceMemberRow | null> {
  const { data, error } = await supabase
    .from("growth_workspace_members")
    .select("workspace_id, auth_user_id, rol, activo")
    .eq("auth_user_id", authUserId)
    .eq("activo", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as GrowthWorkspaceMemberRow | null;
}

export async function getWorkspaceById(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<GrowthWorkspaceRow | null> {
  const { data, error } = await supabase
    .from("growth_workspaces")
    .select("*")
    .eq("id", workspaceId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as GrowthWorkspaceRow | null;
}

export async function updateWorkspaceJson(
  supabase: SupabaseClient,
  workspaceId: string,
  patch: {
    configuracion_json?: Record<string, unknown>;
    metricas_manuales_json?: Record<string, unknown>;
    experimentos_json?: unknown[];
  }
): Promise<GrowthWorkspaceRow> {
  const { data, error } = await supabase
    .from("growth_workspaces")
    .update(patch)
    .eq("id", workspaceId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as GrowthWorkspaceRow;
}
