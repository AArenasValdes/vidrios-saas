import type { SupplierCatalogImport } from "../schemas/catalogo-import.schema";

export type ImportAction = { table: string; key: string; action: "INSERT" | "EXISTENTE" | "CONFLICTO"; fields?: string[] };

export function hasSkuInDifferentTechnicalRevision(input: {
  sku: string;
  sourceId: string | null | undefined;
  existing: ReadonlyArray<{ sku_proveedor: string; fuente_tecnica_id: string }>;
}): boolean {
  return input.existing.some((row) => row.sku_proveedor === input.sku && row.fuente_tecnica_id !== input.sourceId);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function classifyImportRow(table: string, key: string, existing: Record<string, unknown> | null | undefined, expected: Record<string, unknown>): ImportAction {
  if (!existing) return { table, key, action: "INSERT" };
  const fields = Object.entries(expected).filter(([field, value]) => stable(existing[field]) !== stable(value)).map(([field]) => field);
  return fields.length ? { table, key, action: "CONFLICTO", fields } : { table, key, action: "EXISTENTE" };
}

export function technicalEvidence(input: SupplierCatalogImport["technicalInputs"][number]) {
  return input.recipeComponentCodes?.length || input.recipeAccessoryNames?.length || input.excludedRecipeFamilyKeys?.length
    ? { ...input.evidence,
        ...(input.recipeComponentCodes?.length ? { recipeComponentCodes: input.recipeComponentCodes } : {}),
        ...(input.recipeAccessoryNames?.length ? { recipeAccessoryNames: input.recipeAccessoryNames } : {}),
        ...(input.excludedRecipeFamilyKeys?.length ? { excludedRecipeFamilyKeys: input.excludedRecipeFamilyKeys } : {}),
      }
    : input.evidence;
}
