import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

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
  "id, organization_id, line_template_id, scope, provider_name, line_name, typology, leaves_count, variant, version, status, definition, source_type, source_reference, source_name, source_revision, parent_recipe_id, validated_at, validated_by, created_at, updated_at, eliminado_en";

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
  source_name: string | null;
  source_revision: string | null;
  parent_recipe_id: string | null;
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
  updated_at: string;
  eliminado_en: string | null;
};

function mapRecipeRow(row: FabricationRecipeRow): FabricationRecipeRecord {
  const parsed = fabricacionRecetaSchema.safeParse(row.definition);
  if (!parsed.success) {
    throw new FabricationRecipeRowParseError(row, parsed.error);
  }

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
    definition: parsed.data,
    sourceType: row.source_type,
    sourceReference: row.source_reference,
    sourceName: row.source_name,
    sourceRevision: row.source_revision,
    parentRecipeId: row.parent_recipe_id,
    validatedAt: row.validated_at,
    validatedBy: row.validated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    eliminadoEn: row.eliminado_en,
  };
}

export class FabricationRecipeRowParseError extends Error {
  readonly recipeId: string;
  readonly lineName: string;
  readonly zodError: z.ZodError;

  constructor(row: FabricationRecipeRow, zodError: z.ZodError) {
    const summary = formatFabricacionRecetaZodIssues(zodError);
    super(`Receta "${row.line_name}" (${row.id}): ${summary}`);
    this.name = "FabricationRecipeRowParseError";
    this.recipeId = row.id;
    this.lineName = row.line_name;
    this.zodError = zodError;
  }
}

export function formatFabricacionRecetaZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "definicion";
      return `${path}: ${issue.message}`;
    })
    .join(" · ");
}

export function formatFabricationRecipesLoadError(error: unknown): string {
  if (error instanceof FabricationRecipeRowParseError) {
    return error.message;
  }
  if (error instanceof z.ZodError) {
    return `Recetas con definición inválida: ${formatFabricacionRecetaZodIssues(error)}`;
  }
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.startsWith("[") && message.includes('"code"')) {
      try {
        const parsed = JSON.parse(message) as Array<{ path?: unknown[]; message?: string }>;
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]?.path)) {
          return `Recetas con definición inválida: ${parsed
            .slice(0, 4)
            .map((issue) => {
              const path =
                issue.path && issue.path.length > 0 ? issue.path.join(".") : "definicion";
              return `${path}: ${issue.message ?? "error de validación"}`;
            })
            .join(" · ")}`;
        }
      } catch {
        // Mensaje no JSON; usar texto original abajo.
      }
    }
    if (message) return message;
  }
  return "No se pudieron cargar las recetas de fabricación.";
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
    source_name: input.sourceName ?? null,
    source_revision: input.sourceRevision ?? null,
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
  if (input.sourceName !== undefined) payload.source_name = input.sourceName;
  if (input.sourceRevision !== undefined) payload.source_revision = input.sourceRevision;
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

    const rows = (data as FabricationRecipeRow[] | null) ?? [];
    const records: FabricationRecipeRecord[] = [];
    const skipped: FabricationRecipeRowParseError[] = [];

    for (const row of rows) {
      try {
        records.push(mapRecipeRow(row));
      } catch (parseError) {
        if (parseError instanceof FabricationRecipeRowParseError) {
          skipped.push(parseError);
          continue;
        }
        throw parseError;
      }
    }

    if (records.length === 0 && skipped.length > 0) {
      throw new Error(
        `No se pudieron cargar recetas de fabricación (${skipped.length} inválidas). ${skipped[0]!.message}`
      );
    }

    if (skipped.length > 0 && typeof console !== "undefined") {
      console.warn(
        `[fabricacion] Se omitieron ${skipped.length} receta(s) con definición inválida:`,
        skipped.map((item) => item.message).join(" | ")
      );
    }

    return records;
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
