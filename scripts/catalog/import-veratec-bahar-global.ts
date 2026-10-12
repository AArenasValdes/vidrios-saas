import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { VERATEC_BAHAR_5200_PRICE_LIST_IMPORT as rawFixture } from "../../src/features/proveedor-catalogos/fixtures/veratec-bahar-5200-price-list.ts";
import { supplierCatalogImportSchema } from "../../src/features/proveedor-catalogos/schemas/catalogo-import.schema.ts";
import type { SupplierCatalogDatabase } from "../../src/features/proveedor-catalogos/repositories/supplier-catalog-database.types.ts";

type Row = Record<string, unknown>;
const fixture = supplierCatalogImportSchema.parse(rawFixture);
const expectedProjectRef = "yrtrwgkaopfumpidjthk";
const applyRequested = process.argv.includes("--apply");

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  const raw = match[2];
  process.env[match[1]] = raw.startsWith('"') && raw.endsWith('"')
    ? raw.slice(1, -1)
    : raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1) : raw.replace(/\s+#.*$/, "");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Row).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function verify(table: string, key: string, current: Row | undefined, expected: Row) {
  if (!current) return "INSERT";
  const fields = Object.keys(expected).filter((field) => stable(current[field]) !== stable(expected[field]));
  assert(fields.length === 0, `Conflicto en ${table}/${key}: ${fields.join(", ")}. No se escribió nada.`);
  return "EXISTENTE";
}

function technicalEvidence(input: typeof fixture.technicalInputs[number]): Row {
  return {
    ...input.evidence,
    ...(input.recipeComponentCodes?.length ? { recipeComponentCodes: input.recipeComponentCodes } : {}),
    ...(input.recipeAccessoryNames?.length ? { recipeAccessoryNames: input.recipeAccessoryNames } : {}),
    ...(input.excludedRecipeFamilyKeys?.length ? { excludedRecipeFamilyKeys: input.excludedRecipeFamilyKeys } : {}),
  };
}

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceKey, "Faltan variables locales de Supabase requeridas.");
  const host = new URL(url).hostname;
  assert(host === `${expectedProjectRef}.supabase.co`, `Destino inesperado (${host}); no se escribió nada.`);

  const client = createClient<SupplierCatalogDatabase>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const counts = { INSERT: 0, EXISTENTE: 0 };
  const providerResult = await client.from("catalogo_proveedores").select("*").eq("proveedor_key", fixture.supplierKey).maybeSingle();
  throwIfError(providerResult.error, "Proveedor");
  counts[verify("catalogo_proveedores", fixture.supplierKey, providerResult.data as Row | undefined, {
    proveedor_key: fixture.supplierKey, nombre: fixture.supplierName, fabricante: fixture.manufacturerName,
  }) as keyof typeof counts]++;
  assert(providerResult.data, "Falta el proveedor Xelena existente; no se creará ni duplicará desde este lote.");

  const listResult = await client.from("catalogo_listas_precios").select("*").eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.priceListRevision).maybeSingle();
  throwIfError(listResult.error, "Lista de precios");
  counts[verify("catalogo_listas_precios", fixture.priceListRevision, listResult.data as Row | undefined, {
    proveedor_key: fixture.supplierKey, nombre: fixture.priceListName, revision: fixture.priceListRevision,
    publicado_en: fixture.priceListPublishedOn, vigente_hasta: fixture.priceListValidUntil,
    referencia_fuente: fixture.priceListSourceReference, moneda: fixture.priceListCurrency, base_precio: "presentacion_comercial",
  }) as keyof typeof counts]++;
  assert(listResult.data, "No existe la lista Xelena/Veratec junio 2026; se detiene para no crear una revisión inadecuada.");

  const sourceResult = await client.from("catalogo_fuentes_tecnicas").select("*").eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.catalogRevision).maybeSingle();
  throwIfError(sourceResult.error, "Fuente técnica");
  const sourceExpected = { proveedor_key: fixture.supplierKey, emisor: fixture.technicalSourcePublisher, revision: fixture.catalogRevision, referencia_fuente: fixture.catalogSourceReference };
  counts[verify("catalogo_fuentes_tecnicas", fixture.catalogRevision, sourceResult.data as Row | undefined, sourceExpected) as keyof typeof counts]++;
  const sourceId = sourceResult.data?.id;

  const technicalRowsResult = sourceId
    ? await client.from("catalogo_insumos_tecnicos").select("*").eq("fuente_tecnica_id", sourceId)
    : { data: [], error: null };
  throwIfError(technicalRowsResult.error, "Insumos técnicos");
  const technicalRows = (technicalRowsResult.data ?? []) as Row[];
  const technicalByKey = new Map(technicalRows.map((row) => [String(row.clave_tecnica), row]));
  for (const input of fixture.technicalInputs) {
    counts[verify("catalogo_insumos_tecnicos", input.technicalKey, technicalByKey.get(input.technicalKey), {
      fuente_tecnica_id: sourceId, clave_tecnica: input.technicalKey, codigo_fuente: input.sourceCode,
      nombre: input.name, material: input.material, seccion_mm: input.sectionMm, evidencia: technicalEvidence(input),
    }) as keyof typeof counts]++;
  }
  const technicalIds = new Map(technicalRows.map((row) => [String(row.clave_tecnica), String(row.id)]));
  const technicalIdsForSkus = fixture.technicalInputs.map((input) => technicalIds.get(input.technicalKey)).filter((id): id is string => Boolean(id));
  const familiesResult = technicalIdsForSkus.length
    ? await client.from("catalogo_insumo_familias").select("*").in("insumo_tecnico_id", technicalIdsForSkus)
    : { data: [], error: null };
  throwIfError(familiesResult.error, "Familias técnicas");
  const familyRows = (familiesResult.data ?? []) as Row[];
  for (const input of fixture.technicalInputs) for (const familyKey of input.familyKeys) {
    const id = technicalIds.get(input.technicalKey);
    const existing = familyRows.find((row) => row.insumo_tecnico_id === id && row.family_key === familyKey);
    counts[verify("catalogo_insumo_familias", `${input.technicalKey}/${familyKey}`, existing, { insumo_tecnico_id: id, family_key: familyKey }) as keyof typeof counts]++;
  }

  const skuList = fixture.presentations.map((row) => row.sku);
  const allPresentationsResult = await client.from("catalogo_presentaciones_proveedor").select("*").eq("proveedor_key", fixture.supplierKey).in("sku_proveedor", skuList);
  throwIfError(allPresentationsResult.error, "Presentaciones");
  const allPresentations = (allPresentationsResult.data ?? []) as Row[];
  const sameSource = allPresentations.filter((row) => row.fuente_tecnica_id === sourceId);
  const conflicts: Array<{ sku: string; existingSourceId: string; existingDescription: string }> = [];
  for (const input of fixture.presentations) {
    const otherSource = allPresentations.find((row) => row.sku_proveedor === input.sku && row.fuente_tecnica_id !== sourceId);
    if (otherSource) conflicts.push({
      sku: input.sku,
      existingSourceId: String(otherSource.fuente_tecnica_id),
      existingDescription: String(otherSource.descripcion),
    });
    const existing = sameSource.find((row) => row.sku_proveedor === input.sku);
    counts[verify("catalogo_presentaciones_proveedor", input.sku, existing, {
      proveedor_key: fixture.supplierKey, fuente_tecnica_id: sourceId, insumo_tecnico_id: technicalIds.get(input.technicalKey),
      sku_proveedor: input.sku, descripcion: input.description,
      modo_acabado: input.finishResolution === "finish_independent" ? "independiente" : "especifico",
      acabado_codigo: input.finishCode, acabado_nombre: input.finishName, unidad_compra: input.purchaseUnit,
      largo_comercial_mm: input.commercialLengthMm, estado_asociacion: "confirmada", evidencia_asociacion: input.associationEvidence,
    }) as keyof typeof counts]++;
  }
  const priceRowsResult = await client.from("catalogo_precios_presentacion").select("*").eq("lista_precio_id", listResult.data.id);
  throwIfError(priceRowsResult.error, "Precios de lista");
  const priceRows = (priceRowsResult.data ?? []) as Row[];
  for (const input of fixture.presentations) {
    const presentation = sameSource.find((row) => row.sku_proveedor === input.sku);
    const existing = priceRows.find((row) => row.presentacion_id === presentation?.id);
    counts[verify("catalogo_precios_presentacion", `${fixture.priceListRevision}/${input.sku}`, existing, {
      lista_precio_id: listResult.data.id, presentacion_id: presentation?.id, proveedor_key: fixture.supplierKey,
      precio_neto: input.netPrice, moneda: input.currency, evidencia_precio: input.priceEvidence,
    }) as keyof typeof counts]++;
  }
  const conflictingSourceIds = [...new Set(conflicts.map((row) => row.existingSourceId))];
  const conflictingSourcesResult = conflictingSourceIds.length
    ? await client.from("catalogo_fuentes_tecnicas").select("id,emisor,revision,referencia_fuente").in("id", conflictingSourceIds)
    : { data: [], error: null };
  throwIfError(conflictingSourcesResult.error, "Fuentes de SKU existentes");
  const sourceById = new Map((conflictingSourcesResult.data ?? []).map((row) => [String(row.id), row]));
  const conflictsWithSource = conflicts.map((row) => ({ ...row, existingSource: sourceById.get(row.existingSourceId) ?? null }));

  console.log(JSON.stringify({
    phase: applyRequested ? "aplicar-catalogo-bahar" : "preflight-catalogo-bahar",
    projectRef: expectedProjectRef,
    listaExistente: fixture.priceListRevision,
    familia: "Bahar 5200",
    insumos: fixture.technicalInputs.length,
    presentacionesEnFuente: fixture.presentations.length,
    presentacionesImportables: fixture.presentations.length - conflicts.length,
    preciosNetosCLP: fixture.presentations.reduce((sum, row) => sum + (row.netPrice ?? 0), 0),
    preciosNetosImportablesCLP: fixture.presentations.filter((row) => !conflicts.some((conflict) => conflict.sku === row.sku)).reduce((sum, row) => sum + (row.netPrice ?? 0), 0),
    largosMm: [...new Set(fixture.presentations.map((row) => row.commercialLengthMm))],
    counts,
    conflictingSkus: conflictsWithSource,
    writesEnabled: applyRequested,
  }, null, 2));
  if (!applyRequested) {
    console.log("Preflight de solo lectura completado; los SKU duplicados quedan excluidos del lote para no alterar otras familias.");
    return;
  }

  const blockedSkus = new Set(conflicts.map((row) => row.sku));
  const safePresentations = fixture.presentations.filter((row) => !blockedSkus.has(row.sku));
  const safeTechnicalKeys = new Set(safePresentations.map((row) => row.technicalKey));
  const safeTechnicalInputs = fixture.technicalInputs.filter((row) => safeTechnicalKeys.has(row.technicalKey));

  if (!sourceId) {
    const { error } = await client.from("catalogo_fuentes_tecnicas").insert(sourceExpected);
    throwIfError(error, "Insertar fuente técnica");
  }
  const { data: finalSource, error: finalSourceError } = await client.from("catalogo_fuentes_tecnicas")
    .select("id").eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.catalogRevision).single();
  throwIfError(finalSourceError, "Resolver fuente técnica");
  assert(finalSource?.id, "No se pudo resolver la fuente técnica.");

  const technicalPayload = safeTechnicalInputs.map((input) => ({
    fuente_tecnica_id: finalSource.id, clave_tecnica: input.technicalKey, codigo_fuente: input.sourceCode,
    nombre: input.name, material: input.material, seccion_mm: input.sectionMm, evidencia: technicalEvidence(input),
  }));
  const { error: technicalError } = await client.from("catalogo_insumos_tecnicos")
    .upsert(technicalPayload, { onConflict: "fuente_tecnica_id,clave_tecnica", ignoreDuplicates: true });
  throwIfError(technicalError, "Guardar insumos técnicos");
  const finalTechnicalResult = await client.from("catalogo_insumos_tecnicos").select("id,clave_tecnica").eq("fuente_tecnica_id", finalSource.id);
  throwIfError(finalTechnicalResult.error, "Resolver insumos técnicos");
  const finalTechnicalIds = new Map((finalTechnicalResult.data ?? []).map((row) => [row.clave_tecnica, row.id]));
  const familyPayload = safeTechnicalInputs.flatMap((input) => input.familyKeys.map((familyKey) => ({
    insumo_tecnico_id: finalTechnicalIds.get(input.technicalKey) as string, family_key: familyKey,
  })));
  const { error: familyError } = await client.from("catalogo_insumo_familias")
    .upsert(familyPayload, { onConflict: "insumo_tecnico_id,family_key", ignoreDuplicates: true });
  throwIfError(familyError, "Guardar familias técnicas");
  const presentationPayload = safePresentations.map((input) => ({
    proveedor_key: fixture.supplierKey, fuente_tecnica_id: finalSource.id,
    insumo_tecnico_id: finalTechnicalIds.get(input.technicalKey) as string, sku_proveedor: input.sku,
    descripcion: input.description, modo_acabado: input.finishResolution === "finish_independent" ? "independiente" : "especifico",
    acabado_codigo: input.finishCode, acabado_nombre: input.finishName, unidad_compra: input.purchaseUnit,
    largo_comercial_mm: input.commercialLengthMm, estado_asociacion: "confirmada", evidencia_asociacion: input.associationEvidence,
  }));
  const { error: presentationError } = await client.from("catalogo_presentaciones_proveedor")
    .upsert(presentationPayload, { onConflict: "fuente_tecnica_id,proveedor_key,sku_proveedor", ignoreDuplicates: true });
  throwIfError(presentationError, "Guardar presentaciones");
  const finalPresentationsResult = await client.from("catalogo_presentaciones_proveedor")
    .select("id,sku_proveedor").eq("fuente_tecnica_id", finalSource.id).eq("proveedor_key", fixture.supplierKey);
  throwIfError(finalPresentationsResult.error, "Resolver presentaciones");
  const finalPresentationIds = new Map((finalPresentationsResult.data ?? []).map((row) => [row.sku_proveedor, row.id]));
  const pricePayload = safePresentations.map((input) => ({
    lista_precio_id: listResult.data.id, presentacion_id: finalPresentationIds.get(input.sku) as string,
    proveedor_key: fixture.supplierKey, precio_neto: input.netPrice as number,
    moneda: input.currency, evidencia_precio: input.priceEvidence,
  }));
  const { error: priceError } = await client.from("catalogo_precios_presentacion")
    .upsert(pricePayload, { onConflict: "lista_precio_id,presentacion_id", ignoreDuplicates: true });
  throwIfError(priceError, "Guardar precios netos");
  console.log(`Importación terminada: ${safePresentations.length} presentaciones y precios agregados a la lista referencial compartida. ${blockedSkus.size} SKU quedaron pendientes por conflictos con otras familias.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Error al importar Bahar 5200.");
  process.exitCode = 1;
});
