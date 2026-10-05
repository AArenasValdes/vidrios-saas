import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { VERATEC_7400_JUNIO_2026_IMPORT as fixture } from "../../src/features/proveedor-catalogos/fixtures/veratec-7400-junio-2026.ts";

type Row = Record<string, unknown>;

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  const raw = match[2];
  const value = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1) : raw.replace(/\s+#.*$/, "");
  process.env[match[1]] = value;
}

const expectedProjectRef = "yrtrwgkaopfumpidjthk";
const applyRequested = process.argv.includes("--apply");
const previousPriceEvidenceNote = "SKU, descripción, acabado, unidad, largo y precio neto transcritos de la fila de la lista. La interpretación del importe como precio por presentación está pendiente de confirmación comercial.";
const expected = {
  supplierKey: "xelena",
  technicalRevision: "alumetrica-veratec-7400-2026-09-21-v1",
  priceRevision: "2026-06",
  accountEmail: "admin@test.com",
  organizationId: 3,
};

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

function exact(actual: Row | undefined, expectedRow: Row, label: string): "INSERT" | "EXISTENTE" {
  if (!actual) return "INSERT";
  const mismatches = Object.entries(expectedRow).filter(([key, value]) => stable(actual[key]) !== stable(value));
  if (mismatches.length) {
    throw new Error(`CONFLICTO ${label}: ${mismatches.map(([key]) => key).join(", ")}`);
  }
  return "EXISTENTE";
}

async function rows(client: ReturnType<typeof createClient>, table: string, query: (builder: any) => any): Promise<Row[]> {
  const result = await query(client.from(table).select("*"));
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return (result.data ?? []) as Row[];
}

async function insertMissing(client: ReturnType<typeof createClient>, table: string, records: Row[], existing: Row[]): Promise<Row[]> {
  if (!records.length) return existing;
  const { data, error } = await client.from(table).insert(records).select("*");
  if (error) throw new Error(`${table}: inserción detenida: ${error.message}`);
  return [...existing, ...((data ?? []) as Row[])];
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceKey, "Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  const host = new URL(url).hostname;
  assert(host === `${expectedProjectRef}.supabase.co`, `Proyecto destino inesperado: ${host}`);
  assert(fixture.supplierKey === expected.supplierKey, "Proveedor no coincide con la autorización.");
  assert(fixture.catalogRevision === expected.technicalRevision, "Revisión técnica no coincide con la autorización.");
  assert(fixture.priceListRevision === expected.priceRevision, "Lista de precios no coincide con la autorización.");
  assert(fixture.technicalInputs.length === 8 && fixture.presentations.length === 25, "Fixture cambió: requiere nueva revisión antes de importar.");

  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: users, error: userError } = await client.from("users").select("id,correo,organization_id,rol").eq("correo", expected.accountEmail);
  if (userError) throw new Error(`Verificación cuenta: ${userError.message}`);
  assert(users?.length === 1 && users[0].organization_id === expected.organizationId && users[0].rol === "admin", "La cuenta QA no resuelve exactamente a admin de organización 3.");

  const providerExpected = { proveedor_key: fixture.supplierKey, nombre: fixture.supplierName, fabricante: fixture.manufacturerName };
  const providers = await rows(client, "catalogo_proveedores", (q) => q.eq("proveedor_key", fixture.supplierKey));
  assert(providers.length <= 1, "Hay más de un proveedor con la clave exacta.");
  const providerAction = exact(providers[0], providerExpected, "proveedor/xelena");

  const sources = await rows(client, "catalogo_fuentes_tecnicas", (q) => q.eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.catalogRevision));
  assert(sources.length <= 1, "Hay más de una fuente con la revisión técnica exacta.");
  const sourceExpected = { proveedor_key: fixture.supplierKey, emisor: fixture.technicalSourcePublisher, revision: fixture.catalogRevision, referencia_fuente: fixture.catalogSourceReference };
  const sourceAction = exact(sources[0], sourceExpected, "fuente técnica");

  const lists = await rows(client, "catalogo_listas_precios", (q) => q.eq("proveedor_key", fixture.supplierKey).eq("revision", fixture.priceListRevision));
  assert(lists.length <= 1, "Hay más de una lista con la revisión exacta.");
  const listExpected = { proveedor_key: fixture.supplierKey, nombre: fixture.priceListName, revision: fixture.priceListRevision, publicado_en: fixture.priceListPublishedOn, vigente_hasta: fixture.priceListValidUntil, referencia_fuente: fixture.priceListSourceReference, moneda: "CLP", base_precio: "presentacion_comercial" };
  const listAction = exact(lists[0], listExpected, "lista de precios");

  const sourceId = sources[0]?.id as string | undefined;
  const listId = lists[0]?.id as string | undefined;
  const technicalRows = sourceId
    ? await rows(client, "catalogo_insumos_tecnicos", (q) => q.eq("fuente_tecnica_id", sourceId))
    : [];
  const expectedTechnical = fixture.technicalInputs.map((item) => ({
    fuente_tecnica_id: sourceId,
    clave_tecnica: item.technicalKey,
    codigo_fuente: item.sourceCode,
    nombre: item.name,
    material: item.material,
    seccion_mm: item.sectionMm,
    evidencia: item.recipeComponentCodes?.length || item.recipeAccessoryNames?.length ? {
      ...item.evidence,
      ...(item.recipeComponentCodes?.length ? { recipeComponentCodes: item.recipeComponentCodes } : {}),
      ...(item.recipeAccessoryNames?.length ? { recipeAccessoryNames: item.recipeAccessoryNames } : {}),
    } : item.evidence,
  }));
  assert(technicalRows.every((row) => fixture.technicalInputs.some((item) => item.technicalKey === row.clave_tecnica)), "Fuente técnica contiene insumos ajenos al fixture.");
  const technicalByKey = new Map(technicalRows.map((row) => [String(row.clave_tecnica), row]));
  const technicalActions = expectedTechnical.map((record, index) => exact(technicalByKey.get(fixture.technicalInputs[index].technicalKey), record, `insumo/${fixture.technicalInputs[index].technicalKey}`));

  const technicalIds = new Map<string, string>();
  for (const item of fixture.technicalInputs) {
    const found = technicalByKey.get(item.technicalKey);
    if (found?.id) technicalIds.set(item.technicalKey, String(found.id));
  }
  const familyRows = technicalIds.size
    ? await rows(client, "catalogo_insumo_familias", (q) => q.in("insumo_tecnico_id", [...technicalIds.values()]))
    : [];
  const expectedFamilyKeys = fixture.technicalInputs.flatMap((item) => item.familyKeys.map((familyKey) => ({ technicalKey: item.technicalKey, insumo_tecnico_id: technicalIds.get(item.technicalKey), family_key: familyKey })));
  for (const row of familyRows) {
    assert(expectedFamilyKeys.some((item) => item.insumo_tecnico_id === row.insumo_tecnico_id && item.family_key === row.family_key), "Insumo tiene asociación familiar ajena al fixture.");
  }
  const familyActions = expectedFamilyKeys.map((record) => record.insumo_tecnico_id
    ? exact(familyRows.find((row) => row.insumo_tecnico_id === record.insumo_tecnico_id && row.family_key === record.family_key), { insumo_tecnico_id: record.insumo_tecnico_id, family_key: record.family_key }, `familia/${record.family_key}`)
    : "INSERT" as const);

  const presentations = sourceId
    ? await rows(client, "catalogo_presentaciones_proveedor", (q) => q.eq("fuente_tecnica_id", sourceId).eq("proveedor_key", fixture.supplierKey))
    : [];
  assert(presentations.every((row) => fixture.presentations.some((item) => item.sku === row.sku_proveedor)), "La revisión contiene presentaciones ajenas al fixture.");
  const presentationRecords = fixture.presentations.map((item) => ({
    proveedor_key: fixture.supplierKey,
    fuente_tecnica_id: sourceId,
    insumo_tecnico_id: technicalIds.get(item.technicalKey),
    sku_proveedor: item.sku,
    descripcion: item.description,
    modo_acabado: item.finishResolution === "finish_independent" ? "independiente" : "especifico",
    acabado_codigo: item.finishCode,
    acabado_nombre: item.finishName,
    unidad_compra: item.purchaseUnit,
    largo_comercial_mm: item.commercialLengthMm,
    estado_asociacion: "confirmada",
    evidencia_asociacion: item.associationEvidence,
  }));
  const presentationBySku = new Map(presentations.map((row) => [String(row.sku_proveedor), row]));
  const presentationActions = presentationRecords.map((record, index) => exact(presentationBySku.get(fixture.presentations[index].sku), record, `presentación/${fixture.presentations[index].sku}`));

  const priceRows = listId
    ? await rows(client, "catalogo_precios_presentacion", (q) => q.eq("lista_precio_id", listId))
    : [];
  assert(priceRows.every((row) => presentations.some((presentation) => presentation.id === row.presentacion_id)), "La revisión de precios contiene precios para presentaciones ajenas al fixture.");
  const priceRecords = fixture.presentations.map((item) => {
    const presentation = presentationBySku.get(item.sku);
    return { lista_precio_id: listId, presentacion_id: presentation?.id, proveedor_key: fixture.supplierKey, precio_neto: item.netPrice, moneda: item.currency, evidencia_precio: item.priceEvidence, sku: item.sku };
  });
  const priceActions = priceRecords.map((record) => {
    const actual = priceRows.find((row) => row.presentacion_id === record.presentacion_id);
    if (!actual) return "INSERT" as const;
    const numericMismatches = ["lista_precio_id", "presentacion_id", "proveedor_key", "precio_neto", "moneda"]
      .filter((key) => stable(actual[key]) !== stable(record[key]));
    if (numericMismatches.length) throw new Error(`CONFLICTO precio/${record.sku}: ${numericMismatches.join(", ")}`);
    if (stable(actual.evidencia_precio) === stable(record.evidencia_precio)) return "EXISTENTE" as const;
    const previous = actual.evidencia_precio as Row | undefined;
    const expectedEvidence = record.evidencia_precio as Row;
    const onlyKnownNoteDiffers = previous?.sourceReference === expectedEvidence.sourceReference
      && previous?.page === expectedEvidence.page
      && previous?.observedAs === expectedEvidence.observedAs
      && previous?.confidence === expectedEvidence.confidence
      && previous?.note === previousPriceEvidenceNote;
    if (!onlyKnownNoteDiffers) throw new Error(`CONFLICTO precio/${record.sku}: evidencia_precio`);
    return "METADATA" as const;
  });

  const rowActions = [
    { table: "catalogo_proveedores", key: fixture.supplierKey, action: providerAction },
    { table: "catalogo_fuentes_tecnicas", key: `${fixture.supplierKey}/${fixture.catalogRevision}`, action: sourceAction },
    { table: "catalogo_listas_precios", key: `${fixture.supplierKey}/${fixture.priceListRevision}`, action: listAction },
    ...fixture.technicalInputs.map((item, index) => ({ table: "catalogo_insumos_tecnicos", key: item.technicalKey, action: technicalActions[index] })),
    ...expectedFamilyKeys.map((item, index) => ({ table: "catalogo_insumo_familias", key: `${item.technicalKey}/${item.family_key}`, action: familyActions[index] })),
    ...fixture.presentations.map((item, index) => ({ table: "catalogo_presentaciones_proveedor", key: item.sku, action: presentationActions[index] })),
    ...fixture.presentations.map((item, index) => ({ table: "catalogo_precios_presentacion", key: `${fixture.priceListRevision}/${item.sku}`, action: priceActions[index] })),
  ];
  const actions = rowActions.map((item) => item.action);
  const plan = { INSERT: actions.filter((action) => action === "INSERT").length, EXISTENTE: actions.filter((action) => action === "EXISTENTE").length, METADATA: actions.filter((action) => action === "METADATA").length, CONFLICTO: 0 };
  console.log(JSON.stringify({ phase: applyRequested ? "preflight-antes-de-aplicar" : "preflight-solo-lectura", projectRef: expectedProjectRef, organizationId: expected.organizationId, supplier: fixture.supplierKey, technicalRevision: fixture.catalogRevision, priceRevision: fixture.priceListRevision, expectedRows: { provider: 1, source: 1, list: 1, technicalInputs: fixture.technicalInputs.length, familyLinks: fixture.technicalInputs.reduce((sum, item) => sum + item.familyKeys.length, 0), presentations: fixture.presentations.length, prices: fixture.presentations.length }, plan, rows: rowActions }, null, 2));

  if (!applyRequested) {
    console.log("Dry run: no se realizó ninguna escritura. Agrega --apply solo después de revisar esta clasificación.");
    return;
  }

  // Guard complete before first write. Missing-only INSERTs avoid overwriting existing data;
  // unique-key races fail closed, and reruns classify identical rows as EXISTENTE.
  const inserted = { provider: 0, source: 0, list: 0, technicalInputs: 0, familyLinks: 0, presentations: 0, prices: 0 };
  let provider = providers[0];
  if (!provider) {
    [provider] = await insertMissing(client, "catalogo_proveedores", [providerExpected], []);
    inserted.provider++;
  }
  let source = sources[0];
  if (!source) {
    [source] = await insertMissing(client, "catalogo_fuentes_tecnicas", [sourceExpected], []);
    inserted.source++;
  }
  let priceList = lists[0];
  if (!priceList) {
    [priceList] = await insertMissing(client, "catalogo_listas_precios", [listExpected], []);
    inserted.list++;
  }
  assert(provider && source?.id && priceList?.id, "No se resolvieron los identificadores del lote.");

  const currentTechnical = await rows(client, "catalogo_insumos_tecnicos", (q) => q.eq("fuente_tecnica_id", source.id));
  const currentTechnicalByKey = new Map(currentTechnical.map((row) => [String(row.clave_tecnica), row]));
  const missingTechnical = fixture.technicalInputs.filter((item) => !currentTechnicalByKey.has(item.technicalKey)).map((item) => ({
    fuente_tecnica_id: source.id,
    clave_tecnica: item.technicalKey,
    codigo_fuente: item.sourceCode,
    nombre: item.name,
    material: item.material,
    seccion_mm: item.sectionMm,
    evidencia: item.recipeComponentCodes?.length || item.recipeAccessoryNames?.length ? {
      ...item.evidence,
      ...(item.recipeComponentCodes?.length ? { recipeComponentCodes: item.recipeComponentCodes } : {}),
      ...(item.recipeAccessoryNames?.length ? { recipeAccessoryNames: item.recipeAccessoryNames } : {}),
    } : item.evidence,
  }));
  const addedTechnical = await insertMissing(client, "catalogo_insumos_tecnicos", missingTechnical, currentTechnical);
  inserted.technicalInputs = missingTechnical.length;
  const finalTechnicalByKey = new Map(addedTechnical.map((row) => [String(row.clave_tecnica), row]));

  const familyExpected = fixture.technicalInputs.flatMap((item) => item.familyKeys.map((familyKey) => ({ insumo_tecnico_id: finalTechnicalByKey.get(item.technicalKey)?.id, family_key: familyKey })));
  const currentFamilies = await rows(client, "catalogo_insumo_familias", (q) => q.in("insumo_tecnico_id", [...finalTechnicalByKey.values()].map((row) => row.id)));
  const familyMissing = familyExpected.filter((item) => !currentFamilies.some((row) => row.insumo_tecnico_id === item.insumo_tecnico_id && row.family_key === item.family_key));
  await insertMissing(client, "catalogo_insumo_familias", familyMissing, currentFamilies);
  inserted.familyLinks = familyMissing.length;

  const presentationRowsExpected = fixture.presentations.map((item) => ({ proveedor_key: fixture.supplierKey, fuente_tecnica_id: source.id, insumo_tecnico_id: finalTechnicalByKey.get(item.technicalKey)?.id, sku_proveedor: item.sku, descripcion: item.description, modo_acabado: item.finishResolution === "finish_independent" ? "independiente" : "especifico", acabado_codigo: item.finishCode, acabado_nombre: item.finishName, unidad_compra: item.purchaseUnit, largo_comercial_mm: item.commercialLengthMm, estado_asociacion: "confirmada", evidencia_asociacion: item.associationEvidence }));
  const currentPresentations = await rows(client, "catalogo_presentaciones_proveedor", (q) => q.eq("fuente_tecnica_id", source.id).eq("proveedor_key", fixture.supplierKey));
  const currentPresentationsBySku = new Map(currentPresentations.map((row) => [String(row.sku_proveedor), row]));
  const presentationsMissing = presentationRowsExpected.filter((item) => !currentPresentationsBySku.has(item.sku_proveedor));
  const addedPresentations = await insertMissing(client, "catalogo_presentaciones_proveedor", presentationsMissing, currentPresentations);
  inserted.presentations = presentationsMissing.length;
  const finalPresentationsBySku = new Map(addedPresentations.map((row) => [String(row.sku_proveedor), row]));

  const priceExpected = fixture.presentations.map((item) => ({ lista_precio_id: priceList.id, presentacion_id: finalPresentationsBySku.get(item.sku)?.id, proveedor_key: fixture.supplierKey, precio_neto: item.netPrice, moneda: item.currency, evidencia_precio: item.priceEvidence }));
  const currentPrices = await rows(client, "catalogo_precios_presentacion", (q) => q.eq("lista_precio_id", priceList.id));
  const priceMissing = priceExpected.filter((item) => !currentPrices.some((row) => row.presentacion_id === item.presentacion_id));
  await insertMissing(client, "catalogo_precios_presentacion", priceMissing, currentPrices);
  inserted.prices = priceMissing.length;

  const metadataRows = priceRecords.filter((_, index) => priceActions[index] === "METADATA");
  for (const record of metadataRows) {
    const presentation = finalPresentationsBySku.get(record.sku);
    assert(presentation?.id, `No se resolvió presentación ${record.sku} para su metadata.`);
    const { data, error } = await client.from("catalogo_precios_presentacion")
      .update({ evidencia_precio: record.evidencia_precio })
      .eq("lista_precio_id", priceList.id)
      .eq("presentacion_id", presentation.id)
      .eq("proveedor_key", fixture.supplierKey)
      .select("id");
    if (error) throw new Error(`Metadata ${record.sku}: ${error.message}`);
    assert(data?.length === 1, `La actualización limitada de metadata ${record.sku} no afectó exactamente una fila.`);
  }

  console.log(JSON.stringify({ phase: "resultado-importación", inserted, metadataUpdated: metadataRows.length, existingBeforeImport: plan.EXISTENTE, totalRows: Object.values(inserted).reduce((sum, count) => sum + count, 0), projectRef: expectedProjectRef, organizationId: expected.organizationId }, null, 2));
}

main().catch((error) => {
  console.error(`IMPORTACIÓN ABORTADA: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
