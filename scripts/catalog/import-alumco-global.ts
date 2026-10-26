import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ALUMCO_ALUMINIO_NOTAS_VENTA_2026_10_14 as rawFixture } from "../../src/features/proveedor-catalogos/fixtures/alumco-aluminio-notas-venta-2026-10-14.ts";
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
    return `{${Object.entries(value as Row).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertSame(table: string, key: string, current: Row | undefined, expected: Row) {
  if (!current) return "INSERT";
  const mismatches = Object.entries(expected).filter(([field, value]) => stable(current[field]) !== stable(value)).map(([field]) => field);
  assert(mismatches.length === 0, `Conflicto en ${table}/${key}: ${mismatches.join(", ")}. No se escribió nada.`);
  return "EXISTENTE";
}

function technicalEvidence(input: typeof fixture.technicalInputs[number]): Row {
  return {
    ...input.evidence,
    ...(input.recipeComponentCodes?.length ? { recipeComponentCodes: [...input.recipeComponentCodes] } : {}),
    ...(input.recipeAccessoryNames?.length ? { recipeAccessoryNames: [...input.recipeAccessoryNames] } : {}),
    ...(input.excludedRecipeFamilyKeys?.length ? { excludedRecipeFamilyKeys: [...input.excludedRecipeFamilyKeys] } : {}),
  };
}

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceKey, "Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  const host = new URL(url).hostname;
  assert(host === `${expectedProjectRef}.supabase.co`, `Destino inesperado (${host}); no se consultó ni escribió nada.`);

  const client = createClient<SupplierCatalogDatabase>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const providerResult = await client.from("catalogo_proveedores").select("*").eq("proveedor_key", fixture.supplierKey).maybeSingle();
  throwIfError(providerResult.error, "Proveedor");
  const providerExpected = { proveedor_key: fixture.supplierKey, nombre: fixture.supplierName, fabricante: fixture.manufacturerName };
  const actions: Record<string, number> = {};
  function count(action: string) { actions[action] = (actions[action] ?? 0) + 1; }
  count(assertSame("catalogo_proveedores", fixture.supplierKey, providerResult.data as Row | undefined, providerExpected));

  const sourceExpected = {
    proveedor_key: fixture.supplierKey,
    emisor: fixture.technicalSourcePublisher,
    revision: fixture.catalogRevision,
    referencia_fuente: fixture.catalogSourceReference,
  };
  const sourceResult = await client.from("catalogo_fuentes_tecnicas").select("*")
    .eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.catalogRevision).maybeSingle();
  throwIfError(sourceResult.error, "Fuente técnica");
  count(assertSame("catalogo_fuentes_tecnicas", fixture.catalogRevision, sourceResult.data as Row | undefined, sourceExpected));

  const listExpected = {
    proveedor_key: fixture.supplierKey,
    nombre: fixture.priceListName,
    revision: fixture.priceListRevision,
    publicado_en: fixture.priceListPublishedOn,
    vigente_hasta: fixture.priceListValidUntil,
    referencia_fuente: fixture.priceListSourceReference,
    moneda: fixture.priceListCurrency,
    base_precio: "presentacion_comercial",
  };
  const listResult = await client.from("catalogo_listas_precios").select("*")
    .eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.priceListRevision).maybeSingle();
  throwIfError(listResult.error, "Lista de precios");
  count(assertSame("catalogo_listas_precios", fixture.priceListRevision, listResult.data as Row | undefined, listExpected));

  const sourceId = sourceResult.data?.id;
  const listId = listResult.data?.id;
  const technicalResult = sourceId
    ? await client.from("catalogo_insumos_tecnicos").select("*").eq("fuente_tecnica_id", sourceId)
    : { data: [], error: null };
  throwIfError(technicalResult.error, "Insumos técnicos");
  const existingTechnical = (technicalResult.data ?? []) as Row[];
  const technicalByKey = new Map(existingTechnical.map((row) => [String(row.clave_tecnica), row]));
  const technicalIds = new Map(existingTechnical.map((row) => [String(row.clave_tecnica), String(row.id)]));
  for (const input of fixture.technicalInputs) {
    const expected = {
      fuente_tecnica_id: sourceId,
      clave_tecnica: input.technicalKey,
      codigo_fuente: input.sourceCode,
      nombre: input.name,
      material: input.material,
      seccion_mm: input.sectionMm,
      evidencia: technicalEvidence(input),
    };
    count(assertSame("catalogo_insumos_tecnicos", input.technicalKey, technicalByKey.get(input.technicalKey), expected));
  }

  const familyResult = technicalIds.size
    ? await client.from("catalogo_insumo_familias").select("*").in("insumo_tecnico_id", [...technicalIds.values()])
    : { data: [], error: null };
  throwIfError(familyResult.error, "Familias técnicas");
  const existingFamilies = (familyResult.data ?? []) as Row[];
  for (const input of fixture.technicalInputs) for (const familyKey of input.familyKeys) {
    const id = technicalIds.get(input.technicalKey);
    const existing = existingFamilies.find((row) => row.insumo_tecnico_id === id && row.family_key === familyKey);
    count(assertSame("catalogo_insumo_familias", `${input.technicalKey}/${familyKey}`, existing, { insumo_tecnico_id: id, family_key: familyKey }));
  }

  const skus = fixture.presentations.map((row) => row.sku);
  const allPresentationsResult = skus.length
    ? await client.from("catalogo_presentaciones_proveedor").select("*").eq("proveedor_key", fixture.supplierKey).in("sku_proveedor", skus)
    : { data: [], error: null };
  throwIfError(allPresentationsResult.error, "Presentaciones proveedor");
  const existingPresentations = (allPresentationsResult.data ?? []) as Row[];
  const sameSourcePresentations = existingPresentations.filter((row) => row.fuente_tecnica_id === sourceId);
  const priceResult = listId
    ? await client.from("catalogo_precios_presentacion").select("*").eq("lista_precio_id", listId)
    : { data: [], error: null };
  throwIfError(priceResult.error, "Precios");
  const existingPrices = (priceResult.data ?? []) as Row[];

  for (const input of fixture.presentations) {
    const finishIndependent = input.finishResolution === "finish_independent";
    const otherSource = existingPresentations.find((row) => row.sku_proveedor === input.sku && row.fuente_tecnica_id !== sourceId);
    assert(!otherSource, `Conflicto: SKU ${input.sku} ya existe en otra revisión técnica.`);
    const presentation = sameSourcePresentations.find((row) => row.sku_proveedor === input.sku);
    const technicalId = technicalIds.get(input.technicalKey);
    count(assertSame("catalogo_presentaciones_proveedor", input.sku, presentation, {
      proveedor_key: fixture.supplierKey,
      fuente_tecnica_id: sourceId,
      insumo_tecnico_id: technicalId,
      sku_proveedor: input.sku,
      descripcion: input.description,
      modo_acabado: finishIndependent ? "independiente" : "especifico",
      acabado_codigo: input.finishCode,
      acabado_nombre: input.finishName,
      unidad_compra: input.purchaseUnit,
      largo_comercial_mm: input.commercialLengthMm,
      estado_asociacion: "confirmada",
      evidencia_asociacion: input.associationEvidence,
    }));
    if (input.netPrice !== null && input.priceEvidence) {
      const price = existingPrices.find((row) => row.presentacion_id === presentation?.id);
      count(assertSame("catalogo_precios_presentacion", `${fixture.priceListRevision}/${input.sku}`, price, {
        lista_precio_id: listId,
        presentacion_id: presentation?.id,
        proveedor_key: fixture.supplierKey,
        precio_neto: input.netPrice,
        moneda: input.currency,
        evidencia_precio: input.priceEvidence,
      }));
    }
  }

  console.log(JSON.stringify({
    projectRef: expectedProjectRef,
    supplier: fixture.supplierKey,
    priceListRevision: fixture.priceListRevision,
    pricedPresentations: fixture.presentations.length,
    familyKeys: [...new Set(fixture.technicalInputs.flatMap((row) => row.familyKeys))],
    finish: "Titanio (TI); Tapa y Portafelpa independientes del color",
    commercialLengthMm: 6000,
    invoiceNetTotalsClp: { "000000984": 336551, "000000986": 347792 },
    preflightActions: actions,
    writesEnabled: applyRequested,
  }, null, 2));

  if (!applyRequested) {
    console.log("Preflight de solo lectura completado; no se escribió en la base.");
    return;
  }

  if (!providerResult.data) {
    const { error } = await client.from("catalogo_proveedores").insert(providerExpected);
    throwIfError(error, "Crear proveedor");
  }
  if (!listId) {
    const { error } = await client.from("catalogo_listas_precios").insert(listExpected);
    throwIfError(error, "Crear lista de precios");
  }
  if (!sourceId) {
    const { error } = await client.from("catalogo_fuentes_tecnicas").insert(sourceExpected);
    throwIfError(error, "Crear fuente técnica");
  }
  const finalSource = await client.from("catalogo_fuentes_tecnicas").select("id")
    .eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.catalogRevision).single();
  throwIfError(finalSource.error, "Resolver fuente técnica");
  assert(finalSource.data?.id, "No se pudo resolver la fuente técnica final.");

  const technicalPayload = fixture.technicalInputs.map((input) => ({
    fuente_tecnica_id: finalSource.data.id,
    clave_tecnica: input.technicalKey,
    codigo_fuente: input.sourceCode,
    nombre: input.name,
    material: input.material,
    seccion_mm: input.sectionMm,
    evidencia: technicalEvidence(input),
  }));
  const technicalUpsert = await client.from("catalogo_insumos_tecnicos").upsert(technicalPayload, { onConflict: "fuente_tecnica_id,clave_tecnica", ignoreDuplicates: true });
  throwIfError(technicalUpsert.error, "Guardar insumos técnicos");
  const finalTechnical = await client.from("catalogo_insumos_tecnicos").select("id,clave_tecnica").eq("fuente_tecnica_id", finalSource.data.id);
  throwIfError(finalTechnical.error, "Resolver insumos técnicos");
  const finalTechnicalIds = new Map((finalTechnical.data ?? []).map((row) => [row.clave_tecnica, row.id]));
  const familyPayload = fixture.technicalInputs.flatMap((input) => input.familyKeys.map((familyKey) => ({
    insumo_tecnico_id: finalTechnicalIds.get(input.technicalKey) as string,
    family_key: familyKey,
  })));
  const familyUpsert = await client.from("catalogo_insumo_familias").upsert(familyPayload, { onConflict: "insumo_tecnico_id,family_key", ignoreDuplicates: true });
  throwIfError(familyUpsert.error, "Guardar familias");
  const presentationPayload = fixture.presentations.map((input) => ({
    proveedor_key: fixture.supplierKey,
    fuente_tecnica_id: finalSource.data.id,
    insumo_tecnico_id: finalTechnicalIds.get(input.technicalKey) as string,
    sku_proveedor: input.sku,
    descripcion: input.description,
    modo_acabado: input.finishResolution === "finish_independent" ? "independiente" : "especifico",
    acabado_codigo: input.finishCode,
    acabado_nombre: input.finishName,
    unidad_compra: input.purchaseUnit,
    largo_comercial_mm: input.commercialLengthMm,
    estado_asociacion: "confirmada",
    evidencia_asociacion: input.associationEvidence,
  }));
  const presentationUpsert = await client.from("catalogo_presentaciones_proveedor").upsert(presentationPayload, { onConflict: "fuente_tecnica_id,proveedor_key,sku_proveedor", ignoreDuplicates: true });
  throwIfError(presentationUpsert.error, "Guardar presentaciones");
  const finalPresentations = await client.from("catalogo_presentaciones_proveedor").select("id,sku_proveedor")
    .eq("fuente_tecnica_id", finalSource.data.id).eq("proveedor_key", fixture.supplierKey);
  throwIfError(finalPresentations.error, "Resolver presentaciones");
  const presentationIds = new Map((finalPresentations.data ?? []).map((row) => [row.sku_proveedor, row.id]));
  const finalList = listId ? { data: { id: listId }, error: null } : await client.from("catalogo_listas_precios").select("id")
    .eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.priceListRevision).single();
  throwIfError(finalList.error, "Resolver lista de precios");
  assert(finalList.data?.id, "No se pudo resolver la lista de precios final.");
  const pricePayload = fixture.presentations.map((input) => ({
    lista_precio_id: finalList.data.id,
    presentacion_id: presentationIds.get(input.sku) as string,
    proveedor_key: fixture.supplierKey,
    precio_neto: input.netPrice as number,
    moneda: input.currency,
    evidencia_precio: input.priceEvidence,
  }));
  const priceUpsert = await client.from("catalogo_precios_presentacion").upsert(pricePayload, { onConflict: "lista_precio_id,presentacion_id", ignoreDuplicates: true });
  throwIfError(priceUpsert.error, "Guardar precios");
  const verification = await client.from("catalogo_presentaciones_proveedor")
    .select("id,sku_proveedor,modo_acabado,acabado_codigo,acabado_nombre")
    .eq("fuente_tecnica_id", finalSource.data.id).eq("proveedor_key", fixture.supplierKey)
    .in("sku_proveedor", fixture.presentations.map((input) => input.sku));
  throwIfError(verification.error, "Verificación de presentaciones publicadas");
  assert(verification.data?.length === 42, `Se esperaban 42 presentaciones publicadas y se encontraron ${verification.data?.length ?? 0}.`);
  for (const sku of ["RO3506P", "RO3507P"]) {
    const row = verification.data.find((entry) => entry.sku_proveedor === sku);
    assert(row?.modo_acabado === "independiente" && row.acabado_codigo === null && row.acabado_nombre === null,
      `${sku} debe quedar sin dependencia de color.`);
  }
  const publishedPrices = await client.from("catalogo_precios_presentacion").select("id,presentacion_id,precio_neto")
    .eq("lista_precio_id", finalList.data.id).in("presentacion_id", [...presentationIds.values()]);
  throwIfError(publishedPrices.error, "Verificación de precios publicados");
  assert(publishedPrices.data?.length === 42, `Se esperaban 42 precios publicados y se encontraron ${publishedPrices.data?.length ?? 0}.`);
  console.log(JSON.stringify({
    result: "Importación verificada",
    supplier: fixture.supplierKey,
    presentations: verification.data.length,
    prices: publishedPrices.data.length,
    finishIndependentSkus: ["RO3506P", "RO3507P"],
    invoiceNetTotalsClp: { "000000984": 336551, "000000986": 347792 },
    existingRowsModified: 0,
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(`IMPORTACIÓN ALUMCO ABORTADA: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
