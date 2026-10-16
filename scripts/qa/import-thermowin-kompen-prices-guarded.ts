import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { THERMOWIN_KOMPEN_PRECIOS_2026 as fixture } from "../../src/features/proveedor-catalogos/fixtures/thermowin-kompen-precios-2026.ts";

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };
type Query = PromiseLike<Result> & {
  eq(column: string, value: unknown): Query;
  in(column: string, values: unknown[]): Query;
  select(columns: string): Query;
};
type Builder = Query & {
  insert(rows: Row[]): Query;
  upsert(rows: Row[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): Query;
};
type Client = { from(table: string): Builder };

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  const raw = match[2];
  process.env[match[1]] = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1)
    : raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1) : raw.replace(/\s+#.*$/, "");
}

const expectedProjectRef = "yrtrwgkaopfumpidjthk";
const apply = process.argv.includes("--apply");
const client = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
) as unknown as Client;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Row).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function exact(actual: Row | undefined, expected: Row, label: string) {
  if (!actual) return "INSERT";
  const mismatches = Object.entries(expected).filter(([key, value]) => stable(actual[key]) !== stable(value));
  assert(mismatches.length === 0, `CONFLICTO ${label}: ${mismatches.map(([key]) => key).join(", ")}`);
  return "EXISTENTE";
}

async function rows(table: string, filters: Array<[string, unknown]> = []): Promise<Row[]> {
  let query = client.from(table).select("*");
  for (const [column, value] of filters) query = query.eq(column, value);
  const result = await query;
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return result.data ?? [];
}

async function upsert(table: string, records: Row[], conflict: string) {
  if (!records.length) return;
  const result = await client.from(table).upsert(records, { onConflict: conflict, ignoreDuplicates: true });
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceKey, "Faltan URL de Supabase o SUPABASE_SERVICE_ROLE_KEY.");
  assert(new URL(url).hostname === `${expectedProjectRef}.supabase.co`, "El proyecto Supabase no coincide con el proyecto Ventora esperado.");
  assert(fixture.supplierKey === "thermowin-kompen" && fixture.priceListRevision === "2026", "El proveedor o la lista cambió; detener y revisar el lote.");
  assert(fixture.presentations.length === 46 && fixture.technicalInputs.length === 30, "El fixture cambió; detener y revisar el lote.");

  const provider = { proveedor_key: fixture.supplierKey, nombre: fixture.supplierName, fabricante: fixture.manufacturerName };
  const source = { proveedor_key: fixture.supplierKey, emisor: fixture.technicalSourcePublisher, revision: fixture.catalogRevision, referencia_fuente: fixture.catalogSourceReference };
  const priceList = { proveedor_key: fixture.supplierKey, nombre: fixture.priceListName, revision: fixture.priceListRevision, publicado_en: fixture.priceListPublishedOn, vigente_hasta: fixture.priceListValidUntil, referencia_fuente: fixture.priceListSourceReference, moneda: "CLP", base_precio: "presentacion_comercial" };
  const [providers, sources, lists] = await Promise.all([
    rows("catalogo_proveedores", [["proveedor_key", fixture.supplierKey]]),
    rows("catalogo_fuentes_tecnicas", [["proveedor_key", fixture.supplierKey], ["revision", fixture.catalogRevision]]),
    rows("catalogo_listas_precios", [["proveedor_key", fixture.supplierKey], ["revision", fixture.priceListRevision]]),
  ]);
  assert(providers.length <= 1 && sources.length <= 1 && lists.length <= 1, "Hay claves duplicadas; no se escribió nada.");
  const providerAction = exact(providers[0], provider, "proveedor");
  const sourceAction = exact(sources[0], source, "fuente");
  const listAction = exact(lists[0], priceList, "lista de precios");
  const sourceId = sources[0]?.id;
  const listId = lists[0]?.id;

  const technicalRows = sourceId ? await rows("catalogo_insumos_tecnicos", [["fuente_tecnica_id", sourceId]]) : [];
  assert(technicalRows.every((row) => fixture.technicalInputs.some((item) => item.technicalKey === row.clave_tecnica)), "La revisión ya contiene códigos fuera del lote; no se escribió nada.");
  const technicalByKey = new Map(technicalRows.map((row) => [String(row.clave_tecnica), row]));
  const technicalRecords = fixture.technicalInputs.map((item) => ({
    fuente_tecnica_id: sourceId,
    clave_tecnica: item.technicalKey,
    codigo_fuente: item.sourceCode,
    nombre: item.name,
    material: item.material,
    seccion_mm: item.sectionMm,
    evidencia: {
      ...item.evidence,
      ...(item.recipeComponentCodes?.length ? { recipeComponentCodes: item.recipeComponentCodes } : {}),
      ...(item.recipeAccessoryNames?.length ? { recipeAccessoryNames: item.recipeAccessoryNames } : {}),
    },
  }));
  const technicalActions = fixture.technicalInputs.map((item, index) => exact(technicalByKey.get(item.technicalKey), technicalRecords[index]!, `insumo/${item.technicalKey}`));
  const technicalIds = new Map(technicalRows.map((row) => [String(row.clave_tecnica), row.id]));
  const linkedTechnicalIds = [...technicalIds.values()];
  const allFamilyRows = linkedTechnicalIds.length
    ? (await Promise.all(linkedTechnicalIds.map((id) => rows("catalogo_insumo_familias", [["insumo_tecnico_id", id]])))).flat()
    : [];
  const familyRecords = fixture.technicalInputs.flatMap((item) => item.familyKeys.map((familyKey) => ({ technicalKey: item.technicalKey, insumo_tecnico_id: technicalIds.get(item.technicalKey), family_key: familyKey })));
  assert(allFamilyRows.every((row) => familyRecords.some((expected) => expected.insumo_tecnico_id === row.insumo_tecnico_id && expected.family_key === row.family_key)), "Hay vínculos de familia ajenos a este lote.");
  const familyActions = familyRecords.map((record) => exact(allFamilyRows.find((row) => row.insumo_tecnico_id === record.insumo_tecnico_id && row.family_key === record.family_key), { insumo_tecnico_id: record.insumo_tecnico_id, family_key: record.family_key }, `familia/${record.technicalKey}/${record.family_key}`));

  const presentationRows = sourceId ? await rows("catalogo_presentaciones_proveedor", [["fuente_tecnica_id", sourceId], ["proveedor_key", fixture.supplierKey]]) : [];
  assert(presentationRows.every((row) => fixture.presentations.some((item) => item.sku === row.sku_proveedor)), "La revisión ya contiene presentaciones fuera del lote.");
  const presentationBySku = new Map(presentationRows.map((row) => [String(row.sku_proveedor), row]));
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
  const presentationActions = fixture.presentations.map((item, index) => exact(presentationBySku.get(item.sku), presentationRecords[index]!, `presentacion/${item.sku}`));
  const prices = listId ? await rows("catalogo_precios_presentacion", [["lista_precio_id", listId]]) : [];
  assert(prices.every((row) => presentationRows.some((presentation) => presentation.id === row.presentacion_id)), "La lista contiene precios de presentaciones ajenas al lote.");
  const priceActions = fixture.presentations.map((item) => {
    const presentation = presentationBySku.get(item.sku);
    return exact(prices.find((row) => row.presentacion_id === presentation?.id), {
      lista_precio_id: listId,
      presentacion_id: presentation?.id,
      proveedor_key: fixture.supplierKey,
      precio_neto: item.netPrice,
      moneda: item.currency,
      evidencia_precio: item.priceEvidence,
    }, `precio/${item.sku}`);
  });

  const actions = [providerAction, sourceAction, listAction, ...technicalActions, ...familyActions, ...presentationActions, ...priceActions];
  const plan = { INSERT: actions.filter((action) => action === "INSERT").length, EXISTENTE: actions.filter((action) => action === "EXISTENTE").length };
  console.log(JSON.stringify({ phase: apply ? "preflight-antes-de-aplicar" : "preflight-solo-lectura", projectRef: expectedProjectRef, supplier: fixture.supplierKey, priceRevision: fixture.priceListRevision, rows: { technicalInputs: fixture.technicalInputs.length, familyLinks: familyRecords.length, presentations: fixture.presentations.length, prices: fixture.presentations.length }, plan }, null, 2));
  if (!apply) {
    console.log("Dry run: no se realizó ninguna escritura. Usa --apply para insertar solo filas faltantes, sin actualizar las existentes.");
    return;
  }

  await upsert("catalogo_proveedores", [provider], "proveedor_key");
  await upsert("catalogo_fuentes_tecnicas", [source], "proveedor_key,revision");
  await upsert("catalogo_listas_precios", [priceList], "proveedor_key,revision");
  const resolvedSource = (await rows("catalogo_fuentes_tecnicas", [["proveedor_key", fixture.supplierKey], ["revision", fixture.catalogRevision]]))[0];
  const resolvedList = (await rows("catalogo_listas_precios", [["proveedor_key", fixture.supplierKey], ["revision", fixture.priceListRevision]]))[0];
  assert(resolvedSource?.id && resolvedList?.id, "No se pudieron obtener los IDs de fuente/lista.");

  const completeTechnical = technicalRecords.map((row) => ({ ...row, fuente_tecnica_id: resolvedSource.id }));
  await upsert("catalogo_insumos_tecnicos", completeTechnical, "fuente_tecnica_id,clave_tecnica");
  const storedTechnical = await rows("catalogo_insumos_tecnicos", [["fuente_tecnica_id", resolvedSource.id]]);
  const storedTechnicalIds = new Map(storedTechnical.map((row) => [String(row.clave_tecnica), row.id]));
  const completeFamilies = familyRecords.map((row) => ({ insumo_tecnico_id: storedTechnicalIds.get(row.technicalKey), family_key: row.family_key }));
  await upsert("catalogo_insumo_familias", completeFamilies, "insumo_tecnico_id,family_key");
  const completePresentations = presentationRecords.map((row, index) => ({ ...row, fuente_tecnica_id: resolvedSource.id, insumo_tecnico_id: storedTechnicalIds.get(fixture.presentations[index]!.technicalKey) }));
  await upsert("catalogo_presentaciones_proveedor", completePresentations, "fuente_tecnica_id,proveedor_key,sku_proveedor");
  const storedPresentations = await rows("catalogo_presentaciones_proveedor", [["fuente_tecnica_id", resolvedSource.id], ["proveedor_key", fixture.supplierKey]]);
  const presentationIds = new Map(storedPresentations.map((row) => [String(row.sku_proveedor), row.id]));
  const completePrices = fixture.presentations.map((item) => ({
    lista_precio_id: resolvedList.id,
    presentacion_id: presentationIds.get(item.sku),
    proveedor_key: fixture.supplierKey,
    precio_neto: item.netPrice,
    moneda: item.currency,
    evidencia_precio: item.priceEvidence,
  }));
  await upsert("catalogo_precios_presentacion", completePrices, "lista_precio_id,presentacion_id");
  const [verifiedPresentations, verifiedPrices, verifiedFamilies, verifiedTechnical] = await Promise.all([
    rows("catalogo_presentaciones_proveedor", [["fuente_tecnica_id", resolvedSource.id], ["proveedor_key", fixture.supplierKey]]),
    rows("catalogo_precios_presentacion", [["lista_precio_id", resolvedList.id]]),
    Promise.all([...storedTechnicalIds.values()].map((id) => rows("catalogo_insumo_familias", [["insumo_tecnico_id", id]]))).then((result) => result.flat()),
    rows("catalogo_insumos_tecnicos", [["fuente_tecnica_id", resolvedSource.id]]),
  ]);
  assert(verifiedTechnical.length === fixture.technicalInputs.length && verifiedFamilies.length === familyRecords.length && verifiedPresentations.length === fixture.presentations.length && verifiedPrices.length === fixture.presentations.length, "La lectura posterior no confirma todas las filas del lote.");
  const verifiedTechnicalByKey = new Map(verifiedTechnical.map((row) => [String(row.clave_tecnica), row]));
  for (const [index, item] of fixture.technicalInputs.entries()) exact(verifiedTechnicalByKey.get(item.technicalKey), { ...technicalRecords[index], fuente_tecnica_id: resolvedSource.id }, `verificación-insumo/${item.technicalKey}`);
  const verifiedPresentationsBySku = new Map(verifiedPresentations.map((row) => [String(row.sku_proveedor), row]));
  for (let index = 0; index < fixture.presentations.length; index++) exact(verifiedPresentationsBySku.get(fixture.presentations[index]!.sku), completePresentations[index]!, `verificación-presentación/${fixture.presentations[index]!.sku}`);
  for (const item of fixture.presentations) {
    const presentationId = presentationIds.get(item.sku);
    exact(verifiedPrices.find((row) => row.presentacion_id === presentationId), { lista_precio_id: resolvedList.id, presentacion_id: presentationId, proveedor_key: fixture.supplierKey, precio_neto: item.netPrice, moneda: item.currency, evidencia_precio: item.priceEvidence }, `verificación-precio/${item.sku}`);
  }
  console.log(JSON.stringify({ phase: "importación-verificada", projectRef: expectedProjectRef, provider: fixture.supplierKey, technicalRevision: fixture.catalogRevision, priceRevision: fixture.priceListRevision, technicalInputs: verifiedTechnical.length, familyLinks: verifiedFamilies.length, presentations: verifiedPresentations.length, prices: verifiedPrices.length, totalNetPricesCLP: fixture.presentations.reduce((sum, item) => sum + (item.netPrice ?? 0), 0) }, null, 2));
}

main().catch((error) => {
  console.error(`IMPORTACIÓN DETENIDA: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
