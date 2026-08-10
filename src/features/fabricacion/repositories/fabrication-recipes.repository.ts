import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fabricacionRecetaSchema,
} from "@/features/fabricacion/schemas/fabricacion-schemas";
import type {
  CreateFabricationRecipeInput,
  FabricationRecipeRecord,
  FabricationRecipeScope,
  FabricationRecipeSourceType,
  FabricationRecipeStatus,
  ListFabricationRecipesFilters,
  UpdateFabricationRecipeInput,
} from "@/features/fabricacion/types/fabricacion-persistence";

const TABLE_NAME = "fabrication_recipes";
const SELECT_FIELDS =
  "id, organization_id, line_template_id, scope, provider_name, line_name, typology, leaves_count, variant, version, status, definition, source_type, source_reference, parent_recipe_id, validated_at, validated_by, created_at, updated_at, eliminado_en";

type FabricationRecipeRow = {
  id: string;
  organization_id: number | null;
  line_template_id: number | null;
  scope: FabricationRecipeScope;
  provider_name: string;
  line_name: string;
  typology: string;
  leaves_count: number | null;
  variant: string | null;
  version: number;
  status: FabricationRecipeStatus;
  definition: unknown;
  source_type: FabricationRecipeSourceType;
  source_reference: string | null;
  parent_recipe_id: string | null;
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
  updated_at: string;
  eliminado_en: string | null;
};

function mapRecipeRow(row: FabricationRecipeRow): FabricationRecipeRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    lineTemplateId: row.line_template_id,
    scope: row.scope,
    providerName: row.provider_name,
    lineName: row.line_name,
    typology: row.typology,
    leavesCount: row.leaves_count,
    variant: row.variant,
    version: row.version,
    status: row.status,
    definition: fabricacionRecetaSchema.parse(row.definition),
    sourceType: row.source_type,
    sourceReference: row.source_reference,
    parentRecipeId: row.parent_recipe_id,
    validatedAt: row.validated_at,
    validatedBy: row.validated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    eliminadoEn: row.eliminado_en,
  };
}

function buildInsertPayload(input: CreateFabricationRecipeInput) {
  const definition = fabricacionRecetaSchema.parse(input.definition);

  return {
    organization_id: input.organizationId,
    line_template_id: input.lineTemplateId ?? null,
    scope: input.scope,
    provider_name: input.providerName,
    line_name: input.lineName,
    typology: input.typology,
    leaves_count: input.leavesCount ?? null,
    variant: input.variant ?? null,
    version: input.version ?? 1,
    status: input.status ?? "draft",
    definition,
    source_type: input.sourceType ?? "manual",
    source_reference: input.sourceReference ?? null,
    parent_recipe_id: input.parentRecipeId ?? null,
    validated_at: input.validatedAt ?? null,
    validated_by: input.validatedBy ?? null,
  };
}

function buildUpdatePayload(input: UpdateFabricationRecipeInput) {
  const payload: Record<string, unknown> = {};

  if (input.lineTemplateId !== undefined) payload.line_template_id = input.lineTemplateId;
  if (input.providerName !== undefined) payload.provider_name = input.providerName;
  if (input.lineName !== undefined) payload.line_name = input.lineName;
  if (input.typology !== undefined) payload.typology = input.typology;
  if (input.leavesCount !== undefined) payload.leaves_count = input.leavesCount;
  if (input.variant !== undefined) payload.variant = input.variant;
  if (input.status !== undefined) payload.status = input.status;
  if (input.definition !== undefined) {
    payload.definition = fabricacionRecetaSchema.parse(input.definition);
  }
  if (input.sourceType !== undefined) {
    payload.source_type = input.sourceType;
  }
  if (input.sourceReference !== undefined) {
    payload.source_reference = input.sourceReference;
  }
  if (input.validatedAt !== undefined) payload.validated_at = input.validatedAt;
  if (input.validatedBy !== undefined) payload.validated_by = input.validatedBy;

  return payload;
}

export function createFabricationRecipesRepository(supabase: SupabaseClient) {
  async function getCurrentOrganizationId() {
    const { data, error } = await supabase.rpc("get_org_id");

    if (error) throw error;

    const organizationId = Number(data);
    return Number.isInteger(organizationId) && organizationId > 0
      ? organizationId
      : null;
  }

  async function create(input: CreateFabricationRecipeInput) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(buildInsertPayload(input))
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    return mapRecipeRow(data as FabricationRecipeRow);
  }

  async function getById(
    id: string,
    options: { organizationId?: number | null; includeArchived?: boolean } = {}
  ) {
    let query = supabase.from(TABLE_NAME).select(SELECT_FIELDS).eq("id", id);

    if (!options.includeArchived) {
      query = query.is("eliminado_en", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const record = mapRecipeRow(data as FabricationRecipeRow);
    if (
      record.scope === "organization" &&
      options.organizationId !== undefined &&
      record.organizationId !== options.organizationId
    ) {
      return null;
    }

    return record;
  }

  async function list(filters: ListFabricationRecipesFilters = {}) {
    let query = supabase
      .from(TABLE_NAME)
      .select(SELECT_FIELDS)
      .order("line_name", { ascending: true })
      .order("version", { ascending: false });

    if (!filters.includeArchived) {
      query = query.is("eliminado_en", null);
    }

    if (filters.organizationId == null) {
      query = query.eq("scope", "ventora");
    } else {
      query = query.or(`scope.eq.ventora,organization_id.eq.${filters.organizationId}`);
    }

    if (filters.lineTemplateId !== undefined) {
      query = query.eq("line_template_id", filters.lineTemplateId);
    }

    if (filters.status !== undefined) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ((data as FabricationRecipeRow[] | null) ?? []).map(mapRecipeRow);
  }

  async function update(id: string, input: UpdateFabricationRecipeInput) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(buildUpdatePayload(input))
      .eq("id", id)
      .is("eliminado_en", null)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    return mapRecipeRow(data as FabricationRecipeRow);
  }

  async function softDelete(id: string) {
    const now = new Date().toISOString();
    // La fila archivada deja de ser visible para SELECT por la policy RLS.
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ status: "archived", eliminado_en: now })
      .eq("id", id)
      .is("eliminado_en", null);

    if (error) throw error;
  }

  return {
    getCurrentOrganizationId,
    create,
    getById,
    list,
    update,
    softDelete,
  };
}

export type FabricationRecipesRepository = ReturnType<
  typeof createFabricationRecipesRepository
>;
