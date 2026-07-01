import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceById } from "@/features/growth/repositories/growth-workspace.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GrowthWorkspaceMemberRow } from "@/features/growth/types/growth-supabase";

type GrowthMemberUpsertClient = {
  upsert: (
    values: GrowthWorkspaceMemberRow,
    options: { onConflict: string }
  ) => Promise<{ error: Error | null }>;
};

export async function getFounderWorkspaceId(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("growth_workspaces")
    .select("id")
    .eq("slug", "ventora-founder")
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id as string | undefined;
}

export async function ensureFounderMembership(
  userSupabase: SupabaseClient,
  authUserId: string
) {
  const admin = createAdminClient();
  const workspaceId = await getFounderWorkspaceId(admin);

  if (!workspaceId) {
    return null;
  }

  const growthMembers = admin.from(
    "growth_workspace_members"
  ) as unknown as GrowthMemberUpsertClient;

  const { error } = await growthMembers.upsert(
    {
      workspace_id: workspaceId,
      auth_user_id: authUserId,
      rol: "admin",
      activo: true,
    },
    { onConflict: "workspace_id,auth_user_id" }
  );

  if (error) {
    throw error;
  }

  const { data } = await userSupabase
    .from("growth_workspace_members")
    .select("workspace_id, auth_user_id, rol, activo")
    .eq("auth_user_id", authUserId)
    .eq("activo", true)
    .limit(1)
    .maybeSingle();

  return data as GrowthWorkspaceMemberRow | null;
}

export async function loadWorkspaceByMembership(
  supabase: SupabaseClient,
  workspaceId: string
) {
  return getWorkspaceById(supabase, workspaceId);
}
