import { createClient } from "@/lib/supabase/client";
import type { EntityId } from "@/types/common";
import type {
  OnboardingStepKey,
  OnboardingStepRecord,
  OnboardingStepState,
  OnboardingSyncStepInput,
} from "@/features/onboarding/types/onboarding-checklist";

type OnboardingChecklistRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
};

type OnboardingChecklistRow = {
  id: string;
  organization_id: EntityId;
  step_key: OnboardingStepKey;
  estado: OnboardingStepState;
  completed_at: string | null;
  completed_by_user_id: EntityId | null;
  completion_source: string | null;
  metadata_json: Record<string, unknown> | null;
  creado_en: string | null;
  actualizado_en: string | null;
  eliminado_en: string | null;
};

type QuoteStateRow = {
  id: EntityId;
  estado: string | null;
  actualizado_en: string | null;
  creado_en: string | null;
};

const TABLE_NAME = "onboarding_checklists";
const SELECT_FIELDS =
  "id, organization_id, step_key, estado, completed_at, completed_by_user_id, completion_source, metadata_json, creado_en, actualizado_en, eliminado_en";

function mapRow(row: OnboardingChecklistRow): OnboardingStepRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    stepKey: row.step_key,
    estado: row.estado,
    completedAt: row.completed_at,
    completedByUserId: row.completed_by_user_id,
    completionSource: row.completion_source,
    metadataJson: row.metadata_json ?? {},
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    eliminadoEn: row.eliminado_en,
  };
}

export function createOnboardingChecklistRepository(
  deps: OnboardingChecklistRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();

  return {
    async listByOrganizationId(organizationId: EntityId) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(SELECT_FIELDS)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .order("creado_en", { ascending: true });

      if (error) {
        throw error;
      }

      return (data as OnboardingChecklistRow[]).map(mapRow);
    },

    async getByStepKey(organizationId: EntityId, stepKey: OnboardingStepKey) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(SELECT_FIELDS)
        .eq("organization_id", organizationId)
        .eq("step_key", stepKey)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapRow(data as OnboardingChecklistRow) : null;
    },

    async resolveCurrentUserId(
      authUserId: string | null | undefined,
      organizationId: EntityId
    ) {
      if (!authUserId) {
        return null;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("auth_user_id", authUserId)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return (data as { id: EntityId } | null)?.id ?? null;
    },

    async countActiveLeads(organizationId: EntityId) {
      const { count, error } = await supabase
        .from("solicitudes_contacto")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("eliminado_en", null);

      if (error) {
        throw error;
      }

      return count ?? 0;
    },

    async listQuoteStates(organizationId: EntityId) {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("id, estado, actualizado_en, creado_en")
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .order("actualizado_en", { ascending: false, nullsFirst: false })
        .order("creado_en", { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return (data as QuoteStateRow[]).map((row) => ({
        id: String(row.id),
        estado: row.estado ?? "",
        actualizadoEn: row.actualizado_en,
        creadoEn: row.creado_en,
      }));
    },

    async syncStep(input: OnboardingSyncStepInput) {
      const existing = await this.getByStepKey(input.organizationId, input.stepKey);
      const nowIso = new Date().toISOString();
      const completedAt =
        input.estado === "completado" ? existing?.completedAt ?? nowIso : null;

      if (!existing) {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .insert({
            organization_id: input.organizationId,
            step_key: input.stepKey,
            estado: input.estado,
            completed_at: completedAt,
            completed_by_user_id: input.completedByUserId ?? null,
            completion_source: input.completionSource ?? null,
            metadata_json: input.metadataJson ?? {},
          })
          .select(SELECT_FIELDS)
          .single();

        if (error) {
          throw error;
        }

        return {
          previousState: null,
          record: mapRow(data as OnboardingChecklistRow),
        };
      }

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
          estado: input.estado,
          completed_at: completedAt,
          completed_by_user_id:
            input.estado === "completado"
              ? input.completedByUserId ?? existing.completedByUserId ?? null
              : null,
          completion_source:
            input.estado === "completado"
              ? input.completionSource ?? existing.completionSource ?? null
              : null,
          metadata_json:
            input.estado === "completado"
              ? input.metadataJson ?? existing.metadataJson ?? {}
              : input.metadataJson ?? {},
          actualizado_en: nowIso,
        })
        .eq("id", existing.id)
        .eq("organization_id", input.organizationId)
        .is("eliminado_en", null)
        .select(SELECT_FIELDS)
        .single();

      if (error) {
        throw error;
      }

      return {
        previousState: existing.estado,
        record: mapRow(data as OnboardingChecklistRow),
      };
    },
  };
}

export type OnboardingChecklistRepository = ReturnType<
  typeof createOnboardingChecklistRepository
>;
