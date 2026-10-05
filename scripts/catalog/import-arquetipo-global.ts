import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ARQUETIPO_CATALOGO_2026_10_05 as rawFixture } from "../../src/features/proveedor-catalogos/fixtures/arquetipo-catalogo-2026-10-05.ts";
import { supplierCatalogImportSchema } from "../../src/features/proveedor-catalogos/schemas/catalogo-import.schema.ts";
import type { SupplierCatalogDatabase } from "../../src/features/proveedor-catalogos/repositories/supplier-catalog-database.types.ts";

type Row = Record<string, unknown>;
type Client = SupabaseClient<SupplierCatalogDatabase>;
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

function classify(table: string, key: string, current: Row | undefined, expected: Row, actions: Array<{ table: string; key: string; action: string; fields?: string[] }>) {
  if (!current) {
    actions.push({ table, key, action: "INSERT" });
    return;
  }
  const mismatches = Object.entries(expected).filter(([field, value]) => stable(current[field]) !== stable(value)).map(([field]) => field);
  const metadataFields = new Set(["evidencia", "evidencia_asociacion"]);
  const metadataOnly = mismatches.length > 0 && mismatches.every((field) => metadataFields.has(field));
  actions.push({ table, key, action: metadataOnly ? "METADATA" : mismatches.length ? "CONFLICTO" : "EXISTENTE", ...(mismatches.length ? { fields: mismatches } : {}) });
}

function technicalEvidence(input: typeof fixture.technicalInputs[number]): Row {
  return {
    ...input.evidence,
    ...(input.recipeComponentCodes?.length ? { recipeComponentCodes: input.recipeComponentCodes } : {}),
    ...(input.recipeAccessoryNames?.length ? { recipeAccessoryNames: input.recipeAccessoryNames } : {}),
    ...(input.excludedRecipeFamilyKeys?.length ? { excludedRecipeFamilyKeys: input.excludedRecipeFamilyKeys } : {}),
  };
}

async function readRows(client: Client, table: "catalogo_insumos_tecnicos" | "catalogo_insumo_familias" | "catalogo_presentaciones_proveedor" | "catalogo_precios_presentacion", build: (query: ReturnType<Client["from"]>) => unknown): Promise<Row[]> {
  const result = await (build(client.from(table) as never) as Promise<{ data: unknown[] | null; error: { message: string } | null }>);
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return (result.data ?? []) as Row[];
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceKey, "Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  const host = new URL(url).hostname;
  assert(host === `${expectedProjectRef}.supabase.co`, `El destino no coincide con el proyecto de producción esperado (${host}).`);

  const client = createClient<SupplierCatalogDatabase>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const actions: Array<{ table: string; key: string; action: string; fields?: string[] }> = [];
  const { data: provider, error: providerError } = await client.from("catalogo_proveedores").select("*").eq("proveedor_key", fixture.supplierKey).maybeSingle();
  if (providerError) throw new Error(`catalogo_proveedores: ${providerError.message}`);
  classify("catalogo_proveedores", fixture.supplierKey, provider as Row | undefined, { proveedor_key: fixture.supplierKey, nombre: fixture.supplierName, fabricante: fixture.manufacturerName }, actions);

  const { data: source, error: sourceError } = await client.from("catalogo_fuentes_tecnicas").select("*").eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.catalogRevision).maybeSingle();
  if (sourceError) throw new Error(`catalogo_fuentes_tecnicas: ${sourceError.message}`);
  classify("catalogo_fuentes_tecnicas", fixture.catalogRevision, source as Row | undefined, { proveedor_key: fixture.supplierKey, emisor: fixture.technicalSourcePublisher, revision: fixture.catalogRevision, referencia_fuente: fixture.catalogSourceReference }, actions);

  const { data: list, error: listError } = await client.from("catalogo_listas_precios").select("*").eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.priceListRevision).maybeSingle();
  if (listError) throw new Error(`catalogo_listas_precios: ${listError.message}`);
  classify("catalogo_listas_precios", fixture.priceListRevision, list as Row | undefined, {
    proveedor_key: fixture.supplierKey, nombre: fixture.priceListName, revision: fixture.priceListRevision,
    publicado_en: fixture.priceListPublishedOn, vigente_hasta: fixture.priceListValidUntil,
    referencia_fuente: fixture.priceListSourceReference, moneda: fixture.priceListCurrency, base_precio: "presentacion_comercial",
  }, actions);

  const sourceId = source?.id as string | undefined;
  const listId = list?.id as string | undefined;
  const technicalRows = sourceId ? await readRows(client, "catalogo_insumos_tecnicos", (query) => query.select("*").eq("fuente_tecnica_id", sourceId)) : [];
  const technicalByKey = new Map(technicalRows.map((row) => [String(row.clave_tecnica), row]));
  for (const input of fixture.technicalInputs) {
    const expected = { fuente_tecnica_id: sourceId, clave_tecnica: input.technicalKey, codigo_fuente: input.sourceCode, nombre: input.name, material: input.material, seccion_mm: input.sectionMm, evidencia: technicalEvidence(input) };
    classify("catalogo_insumos_tecnicos", input.technicalKey, technicalByKey.get(input.technicalKey), expected, actions);
  }
  const technicalIds = new Map(technicalRows.map((row) => [String(row.clave_tecnica), String(row.id)]));
  const families = technicalIds.size ? await readRows(client, "catalogo_insumo_familias", (query) => query.select("*").in("insumo_tecnico_id", [...technicalIds.values()])) : [];
  for (const input of fixture.technicalInputs) for (const familyKey of input.familyKeys) {
    const id = technicalIds.get(input.technicalKey);
    const existing = families.find((row) => row.insumo_tecnico_id === id && row.family_key === familyKey);
    classify("catalogo_insumo_familias", `${input.technicalKey}/${familyKey}`, existing, { insumo_tecnico_id: id, family_key: familyKey }, actions);
  }
  const presentations = sourceId ? await readRows(client, "catalogo_presentaciones_proveedor", (query) => query.select("*").eq("fuente_tecnica_id", sourceId).eq("proveedor_key", fixture.supplierKey)) : [];
  const presentationBySku = new Map(presentations.map((row) => [String(row.sku_proveedor), row]));
  const pricedPresentations = fixture.presentations.filter((row) => row.netPrice !== null && row.priceEvidence !== null);
  const allSupplierPresentations = await readRows(client, "catalogo_presentaciones_proveedor", (query) => query.select("id,fuente_tecnica_id,sku_proveedor").eq("proveedor_key", fixture.supplierKey));
  for (const presentation of fixture.presentations) {
    const sameRevision = presentationBySku.get(presentation.sku);
    const inOtherRevision = allSupplierPresentations.find((row) => row.sku_proveedor === presentation.sku && row.fuente_tecnica_id !== sourceId);
    if (inOtherRevision) {
      actions.push({ table: "catalogo_presentaciones_proveedor", key: presentation.sku, action: "CONFLICTO", fields: ["sku_proveedor ya existe en otra fuente técnica"] });
      continue;
    }
    classify("catalogo_presentaciones_proveedor", presentation.sku, sameRevision, {
      proveedor_key: fixture.supplierKey, fuente_tecnica_id: sourceId, insumo_tecnico_id: technicalIds.get(presentation.technicalKey),
      sku_proveedor: presentation.sku, descripcion: presentation.description,
      modo_acabado: presentation.finishResolution === "finish_independent" ? "independiente" : "especifico",
      acabado_codigo: presentation.finishCode, acabado_nombre: presentation.finishName, unidad_compra: presentation.purchaseUnit,
      largo_comercial_mm: presentation.commercialLengthMm, estado_asociacion: "confirmada", evidencia_asociacion: presentation.associationEvidence,
    }, actions);
  }
  const priceRows = listId ? await readRows(client, "catalogo_precios_presentacion", (query) => query.select("*").eq("lista_precio_id", listId)) : [];
  for (const input of pricedPresentations) {
    const presentation = presentationBySku.get(input.sku);
    const current = priceRows.find((row) => row.presentacion_id === presentation?.id);
    classify("catalogo_precios_presentacion", `${fixture.priceListRevision}/${input.sku}`, current, {
      lista_precio_id: listId, presentacion_id: presentation?.id, proveedor_key: fixture.supplierKey,
      precio_neto: input.netPrice, moneda: input.currency, evidencia_precio: input.priceEvidence,
    }, actions);
  }

  const counts = Object.fromEntries(["INSERT", "EXISTENTE", "METADATA", "CONFLICTO"].map((action) => [action, actions.filter((row) => row.action === action).length]));
  const conflicts = actions.filter((row) => row.action === "CONFLICTO");
  console.log(JSON.stringify({ phase: "preflight-catalogo-global", projectRef: expectedProjectRef, familias: 10, insumosTecnicos: fixture.technicalInputs.length, presentaciones: fixture.presentations.length, precios: pricedPresentations.length, totalCLP: pricedPresentations.reduce((sum, row) => sum + (row.netPrice ?? 0), 0), largoPredeterminadoMm: 6000, largoConfirmadoPorCotizacion: false, counts, conflicts }, null, 2));
  assert(conflicts.length === 0, "Hay conflictos con datos globales existentes; no se escribió nada.");
  if (!applyRequested) {
    console.log("Simulación terminada sin escrituras. Para publicar el lote aprobado por el usuario, ejecutar con --apply.");
    return;
  }

  const { error: providerWriteError } = await client.from("catalogo_proveedores").upsert({ proveedor_key: fixture.supplierKey, nombre: fixture.supplierName, fabricante: fixture.manufacturerName }, { onConflict: "proveedor_key", ignoreDuplicates: true });
  if (providerWriteError) throw new Error(`Proveedor: ${providerWriteError.message}`);
  const { error: sourceWriteError } = await client.from("catalogo_fuentes_tecnicas").upsert({ proveedor_key: fixture.supplierKey, emisor: fixture.technicalSourcePublisher, revision: fixture.catalogRevision, referencia_fuente: fixture.catalogSourceReference }, { onConflict: "proveedor_key,revision", ignoreDuplicates: true });
  if (sourceWriteError) throw new Error(`Fuente: ${sourceWriteError.message}`);
  const { data: finalSource, error: finalSourceError } = await client.from("catalogo_fuentes_tecnicas").select("id").eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.catalogRevision).single();
  if (finalSourceError || !finalSource?.id) throw new Error(`Resolver fuente: ${finalSourceError?.message ?? "sin id"}`);
  const { error: listWriteError } = await client.from("catalogo_listas_precios").upsert({
    proveedor_key: fixture.supplierKey, nombre: fixture.priceListName, revision: fixture.priceListRevision,
    publicado_en: fixture.priceListPublishedOn, vigente_hasta: fixture.priceListValidUntil,
    referencia_fuente: fixture.priceListSourceReference, moneda: fixture.priceListCurrency, base_precio: "presentacion_comercial",
  }, { onConflict: "proveedor_key,revision", ignoreDuplicates: true });
  if (listWriteError) throw new Error(`Lista de precios: ${listWriteError.message}`);
  const { data: finalList, error: finalListError } = await client.from("catalogo_listas_precios").select("id").eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.priceListRevision).single();
  if (finalListError || !finalList?.id) throw new Error(`Resolver lista: ${finalListError?.message ?? "sin id"}`);

  const technicalPayload = fixture.technicalInputs.map((input) => ({
    fuente_tecnica_id: finalSource.id, clave_tecnica: input.technicalKey, codigo_fuente: input.sourceCode,
    nombre: input.name, material: input.material, seccion_mm: input.sectionMm, evidencia: technicalEvidence(input),
  }));
  const { error: technicalWriteError } = await client.from("catalogo_insumos_tecnicos").upsert(technicalPayload, { onConflict: "fuente_tecnica_id,clave_tecnica", ignoreDuplicates: true });
  if (technicalWriteError) throw new Error(`Perfiles: ${technicalWriteError.message}`);
  const finalTechnicalRows = await readRows(client, "catalogo_insumos_tecnicos", (query) => query.select("id,clave_tecnica").eq("fuente_tecnica_id", finalSource.id));
  const finalTechnicalIds = new Map(finalTechnicalRows.map((row) => [String(row.clave_tecnica), String(row.id)]));
  for (const input of fixture.technicalInputs) {
    const existing = technicalByKey.get(input.technicalKey);
    if (existing && stable(existing.evidencia) !== stable(input.evidence)) {
      const id = finalTechnicalIds.get(input.technicalKey);
      const { error } = await client.from("catalogo_insumos_tecnicos").update({ evidencia: input.evidence }).eq("id", id as string).eq("fuente_tecnica_id", finalSource.id);
      if (error) throw new Error(`Evidencia técnica ${input.sourceCode}: ${error.message}`);
    }
  }
  const familyPayload = fixture.technicalInputs.flatMap((input) => input.familyKeys.map((familyKey) => ({ insumo_tecnico_id: finalTechnicalIds.get(input.technicalKey) as string, family_key: familyKey })));
  const { error: familyWriteError } = await client.from("catalogo_insumo_familias").upsert(familyPayload, { onConflict: "insumo_tecnico_id,family_key", ignoreDuplicates: true });
  if (familyWriteError) throw new Error(`Familias: ${familyWriteError.message}`);
  const presentationPayload = fixture.presentations.map((input) => ({
    proveedor_key: fixture.supplierKey, fuente_tecnica_id: finalSource.id, insumo_tecnico_id: finalTechnicalIds.get(input.technicalKey) as string,
    sku_proveedor: input.sku, descripcion: input.description, modo_acabado: input.finishResolution === "finish_independent" ? "independiente" : "especifico",
    acabado_codigo: input.finishCode, acabado_nombre: input.finishName, unidad_compra: input.purchaseUnit,
    largo_comercial_mm: input.commercialLengthMm, estado_asociacion: "confirmada", evidencia_asociacion: input.associationEvidence,
  }));
  const { error: presentationWriteError } = await client.from("catalogo_presentaciones_proveedor").upsert(presentationPayload, { onConflict: "fuente_tecnica_id,proveedor_key,sku_proveedor", ignoreDuplicates: true });
  if (presentationWriteError) throw new Error(`Presentaciones: ${presentationWriteError.message}`);
  const finalPresentations = await readRows(client, "catalogo_presentaciones_proveedor", (query) => query.select("id,sku_proveedor").eq("fuente_tecnica_id", finalSource.id).eq("proveedor_key", fixture.supplierKey));
  const finalPresentationIds = new Map(finalPresentations.map((row) => [String(row.sku_proveedor), String(row.id)]));
  for (const input of fixture.presentations) {
    const existing = presentationBySku.get(input.sku);
    if (existing && stable(existing.evidencia_asociacion) !== stable(input.associationEvidence)) {
      const id = finalPresentationIds.get(input.sku);
      const { error } = await client.from("catalogo_presentaciones_proveedor").update({ evidencia_asociacion: input.associationEvidence }).eq("id", id as string).eq("fuente_tecnica_id", finalSource.id).eq("proveedor_key", fixture.supplierKey);
      if (error) throw new Error(`Evidencia de presentación ${input.sku}: ${error.message}`);
    }
  }
  const pricePayload = pricedPresentations.map((input) => ({
    lista_precio_id: finalList.id, presentacion_id: finalPresentationIds.get(input.sku) as string,
    proveedor_key: fixture.supplierKey, precio_neto: input.netPrice as number,
    moneda: input.currency, evidencia_precio: input.priceEvidence as NonNullable<typeof input.priceEvidence>,
  }));
  const { error: priceWriteError } = await client.from("catalogo_precios_presentacion").upsert(pricePayload, { onConflict: "lista_precio_id,presentacion_id", ignoreDuplicates: true });
  if (priceWriteError) throw new Error(`Precios: ${priceWriteError.message}`);

  const [{ count: technicalCount, error: verifyTechnicalError }, { count: presentationCount, error: verifyPresentationError }, { count: priceCount, error: verifyPriceError }] = await Promise.all([
    client.from("catalogo_insumos_tecnicos").select("id", { count: "exact", head: true }).eq("fuente_tecnica_id", finalSource.id),
    client.from("catalogo_presentaciones_proveedor").select("id", { count: "exact", head: true }).eq("fuente_tecnica_id", finalSource.id).eq("proveedor_key", fixture.supplierKey),
    client.from("catalogo_precios_presentacion").select("id", { count: "exact", head: true }).eq("lista_precio_id", finalList.id),
  ]);
  if (verifyTechnicalError || verifyPresentationError || verifyPriceError) throw new Error("La verificación de conteos en producción falló.");
  const actualPrices = await readRows(client, "catalogo_precios_presentacion", (query) => query.select("precio_neto").eq("lista_precio_id", finalList.id));
  const actualTotal = actualPrices.reduce((sum, row) => sum + Number(row.precio_neto), 0);
  assert(technicalCount === 84 && presentationCount === 84 && priceCount === 29 && actualPrices.length === 29 && actualTotal === 513984, "Los conteos o la suma publicada no coinciden con el lote esperado.");
  console.log(JSON.stringify({ phase: "publicado-global", projectRef: expectedProjectRef, revision: fixture.catalogRevision, lista: fixture.priceListRevision, familias: 10, insumosTecnicos: technicalCount, presentaciones: presentationCount, precios: priceCount, totalCLPVerificado: actualTotal, confirmacion: "registros y suma global verificados en producción" }, null, 2));
}

main().catch((error: unknown) => {
  console.error(`CARGA ARQUETIPO ABORTADA: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
