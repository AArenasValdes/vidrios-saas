import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fabricacionEntradaCalculoSchema,
  fabricacionResultadoCubicacionSchema,
} from "@/features/fabricacion/schemas/fabricacion-schemas";
import type {
  CreateFabricationRecipeTestInput,
  FabricationRecipeTestRecord,
  UpdateFabricationRecipeTestInput,
} from "@/features/fabricacion/types/fabricacion-persistence";

const TABLE_NAME = "fabrication_recipe_tests";
const SELECT_FIELDS =
  "id, recipe_id, organization_id, name, input, expected_output, actual_output, passed, is_required, validated_by, created_at, updated_at, eliminado_en";

type FabricationRecipeTestRow = {
  id: string;
  recipe_id: string;
  organization_id: number | null;
  name: string;
  input: unknown;
  expected_output: unknown;
  actual_output: unknown | null;
  passed: boolean;
  is_required: boolean;
  validated_by: string | null;
  created_at: string;
  updated_at: string;
  eliminado_en: string | null;
};

function mapTestRow(row: FabricationRecipeTestRow): FabricationRecipeTestRecord {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    organizationId: row.organization_id,
    name: row.name,
    input: fabricacionEntradaCalculoSchema.parse(row.input),
    expectedOutput: fabricacionResultadoCubicacionSchema.parse(row.expected_output),
    actualOutput:
      row.actual_output == null
        ? null
        : fabricacionResultadoCubicacionSchema.parse(row.actual_output),
    passed: row.passed,
    isRequired: row.is_required,
    validatedBy: row.validated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    eliminadoEn: row.eliminado_en,
  };
}

function buildInsertPayload(input: CreateFabricationRecipeTestInput) {
  return {
    recipe_id: input.recipeId,
    organization_id: input.organizationId ?? null,
    name: input.name,
    input: fabricacionEntradaCalculoSchema.parse(input.input),
    expected_output: fabricacionResultadoCubicacionSchema.parse(input.expectedOutput),
    actual_output:
      input.actualOutput == null
        ? null
        : fabricacionResultadoCubicacionSchema.parse(input.actualOutput),
    passed: input.passed ?? false,
    is_required: input.isRequired ?? true,
    validated_by: input.validatedBy ?? null,
  };
}

function buildUpdatePayload(input: UpdateFabricationRecipeTestInput) {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.input !== undefined) {
    payload.input = fabricacionEntradaCalculoSchema.parse(input.input);
  }
  if (input.expectedOutput !== undefined) {
    payload.expected_output = fabricacionResultadoCubicacionSchema.parse(
      input.expectedOutput
    );
  }
  if (input.actualOutput !== undefined) {
    payload.actual_output =
      input.actualOutput == null
        ? null
        : fabricacionResultadoCubicacionSchema.parse(input.actualOutput);
  }
  if (input.passed !== undefined) payload.passed = input.passed;
  if (input.isRequired !== undefined) payload.is_required = input.isRequired;
  if (input.validatedBy !== undefined) payload.validated_by = input.validatedBy;

  return payload;
}

export function createFabricationRecipeTestsRepository(supabase: SupabaseClient) {
  async function create(input: CreateFabricationRecipeTestInput) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(buildInsertPayload(input))
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    return mapTestRow(data as FabricationRecipeTestRow);
  }

  async function getById(id: string) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(SELECT_FIELDS)
      .eq("id", id)
      .is("eliminado_en", null)
      .maybeSingle();

    if (error) throw error;
    return data ? mapTestRow(data as FabricationRecipeTestRow) : null;
  }

  async function listByRecipeId(recipeId: string) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(SELECT_FIELDS)
      .eq("recipe_id", recipeId)
      .is("eliminado_en", null)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return ((data as FabricationRecipeTestRow[] | null) ?? []).map(mapTestRow);
  }

  async function update(id: string, input: UpdateFabricationRecipeTestInput) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(buildUpdatePayload(input))
      .eq("id", id)
      .is("eliminado_en", null)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    return mapTestRow(data as FabricationRecipeTestRow);
  }

  async function softDelete(id: string) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ eliminado_en: now })
      .eq("id", id)
      .is("eliminado_en", null)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw error;
    return mapTestRow(data as FabricationRecipeTestRow);
  }

  return {
    create,
    getById,
    listByRecipeId,
    update,
    softDelete,
  };
}

export type FabricationRecipeTestsRepository = ReturnType<
  typeof createFabricationRecipeTestsRepository
>;
