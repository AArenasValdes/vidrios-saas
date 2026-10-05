import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { SupplierCatalogImport } from "../schemas/catalogo-import.schema";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupplierCatalogDatabase } from "./supplier-catalog-database.types";
import { classifyImportRow, hasSkuInDifferentTechnicalRevision, technicalEvidence, type ImportAction } from "../services/catalogo-import-preflight.service";

type SupabaseLike = SupabaseClient<SupplierCatalogDatabase>;

function getClient() {
  return createAdminClient() as unknown as SupabaseLike;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function getOrCreateSource(client: SupabaseLike, input: SupplierCatalogImport) {
  const { error: insertError } = await client.from("catalogo_fuentes_tecnicas").upsert({
    proveedor_key: input.supplierKey,
    emisor: input.technicalSourcePublisher,
    revision: input.catalogRevision,
    referencia_fuente: input.catalogSourceReference,
  }, { onConflict: "proveedor_key,revision", ignoreDuplicates: true });
  throwIfError(insertError);

  const { data, error } = await client.from("catalogo_fuentes_tecnicas")
    .select("id")
    .eq("proveedor_key", input.supplierKey)
    .eq("revision", input.catalogRevision)
    .single();
  throwIfError(error);
  if (!data?.id) throw new Error("No se pudo resolver la revisión técnica importada.");
  return data.id as string;
}

async function getOrCreatePriceList(client: SupabaseLike, input: SupplierCatalogImport) {
  const { error: insertError } = await client.from("catalogo_listas_precios").upsert({
    proveedor_key: input.supplierKey,
    nombre: input.priceListName,
    revision: input.priceListRevision,
    publicado_en: input.priceListPublishedOn,
    vigente_hasta: input.priceListValidUntil,
    referencia_fuente: input.priceListSourceReference,
    moneda: input.priceListCurrency,
    base_precio: input.priceListPriceBasis === "per_meter"
      ? "metro_lineal"
      : input.priceListPriceBasis === "unknown" ? "desconocida" : "presentacion_comercial",
  }, { onConflict: "proveedor_key,revision", ignoreDuplicates: true });
  throwIfError(insertError);

  const { data, error } = await client.from("catalogo_listas_precios")
    .select("id")
    .eq("proveedor_key", input.supplierKey)
    .eq("revision", input.priceListRevision)
    .single();
  throwIfError(error);
  if (!data?.id) throw new Error("No se pudo resolver la lista de precios importada.");
  return data.id as string;
}

/** Importa solo asociaciones explícitas y conserva cada revisión como fila inmutable. */
export async function importSupplierCatalogBatch(input: SupplierCatalogImport, client: SupabaseLike = getClient()) {
  const preflight = await preflightSupplierCatalogBatch(input, client);
  const conflicts = preflight.filter((row) => row.action === "CONFLICTO");
  if (conflicts.length) throw new Error(`Importación detenida: ${conflicts.map((row) => `${row.table}/${row.key}: ${row.fields?.join(", ")}`).join("; ")}`);
  const { error: providerError } = await client.from("catalogo_proveedores").upsert({
    proveedor_key: input.supplierKey,
    nombre: input.supplierName,
    fabricante: input.manufacturerName,
  }, { onConflict: "proveedor_key", ignoreDuplicates: true });
  throwIfError(providerError);

  const sourceId = await getOrCreateSource(client, input);
  const priceListId = await getOrCreatePriceList(client, input);

  const technicalInputIds = new Map<string, string>();
  for (const technicalInput of input.technicalInputs) {
    const { error: insertError } = await client.from("catalogo_insumos_tecnicos").upsert({
      fuente_tecnica_id: sourceId,
      clave_tecnica: technicalInput.technicalKey,
      codigo_fuente: technicalInput.sourceCode,
      nombre: technicalInput.name,
      material: technicalInput.material,
      seccion_mm: technicalInput.sectionMm,
      evidencia: technicalEvidence(technicalInput),
    }, { onConflict: "fuente_tecnica_id,clave_tecnica", ignoreDuplicates: true });
    throwIfError(insertError);

    const { data, error } = await client.from("catalogo_insumos_tecnicos")
      .select("id")
      .eq("fuente_tecnica_id", sourceId)
      .eq("clave_tecnica", technicalInput.technicalKey)
      .single();
    throwIfError(error);
    if (!data?.id) throw new Error(`No se pudo resolver el insumo ${technicalInput.technicalKey}.`);
    const technicalInputId = data.id as string;
    technicalInputIds.set(technicalInput.technicalKey, technicalInputId);

    for (const familyKey of technicalInput.familyKeys) {
      const { error: familyError } = await client.from("catalogo_insumo_familias").upsert({
        insumo_tecnico_id: technicalInputId,
        family_key: familyKey,
      }, { onConflict: "insumo_tecnico_id,family_key", ignoreDuplicates: true });
      throwIfError(familyError);
    }
  }

  for (const presentation of input.presentations) {
    const technicalInputId = technicalInputIds.get(presentation.technicalKey);
    if (!technicalInputId) {
      throw new Error(`La presentación ${presentation.sku} no tiene insumo técnico explícito.`);
    }

    const { error: insertError } = await client.from("catalogo_presentaciones_proveedor").upsert({
      proveedor_key: input.supplierKey,
      fuente_tecnica_id: sourceId,
      insumo_tecnico_id: technicalInputId,
      sku_proveedor: presentation.sku,
      descripcion: presentation.description,
      modo_acabado: presentation.finishResolution === "finish_independent" ? "independiente" : "especifico",
      acabado_codigo: presentation.finishCode,
      acabado_nombre: presentation.finishName,
      unidad_compra: presentation.purchaseUnit,
      largo_comercial_mm: presentation.commercialLengthMm,
      estado_asociacion: "confirmada",
      evidencia_asociacion: presentation.associationEvidence,
    }, { onConflict: "fuente_tecnica_id,proveedor_key,sku_proveedor", ignoreDuplicates: true });
    throwIfError(insertError);

    const { data, error } = await client.from("catalogo_presentaciones_proveedor")
      .select("id")
      .eq("fuente_tecnica_id", sourceId)
      .eq("proveedor_key", input.supplierKey)
      .eq("sku_proveedor", presentation.sku)
      .eq("estado_asociacion", "confirmada")
      .single();
    throwIfError(error);
    if (!data?.id) throw new Error(`No se pudo resolver la presentación ${presentation.sku}.`);

    const { error: priceError } = await client.from("catalogo_precios_presentacion").upsert({
      lista_precio_id: priceListId,
      presentacion_id: data.id,
      proveedor_key: input.supplierKey,
      precio_neto: presentation.netPrice,
      moneda: presentation.currency,
      evidencia_precio: presentation.priceEvidence,
    }, { onConflict: "lista_precio_id,presentacion_id", ignoreDuplicates: true });
    throwIfError(priceError);
  }

  return {
    supplierKey: input.supplierKey,
    technicalSourceRevision: input.catalogRevision,
    priceListRevision: input.priceListRevision,
    technicalInputCount: input.technicalInputs.length,
    presentationCount: input.presentations.length,
    preflight,
  };
}

/** Read-only classification before the first write; existing incompatible rows abort the import. */
export async function preflightSupplierCatalogBatch(input: SupplierCatalogImport, client: SupabaseLike = getClient()): Promise<ImportAction[]> {
  const actions: ImportAction[] = [];
  const provider = await client.from("catalogo_proveedores").select("*").eq("proveedor_key", input.supplierKey).maybeSingle();
  throwIfError(provider.error);
  actions.push(classifyImportRow("catalogo_proveedores", input.supplierKey, provider.data, { proveedor_key: input.supplierKey, nombre: input.supplierName, fabricante: input.manufacturerName }));

  const source = await client.from("catalogo_fuentes_tecnicas").select("*").eq("proveedor_key", input.supplierKey).eq("revision", input.catalogRevision).maybeSingle();
  throwIfError(source.error);
  actions.push(classifyImportRow("catalogo_fuentes_tecnicas", input.catalogRevision, source.data, {
    proveedor_key: input.supplierKey, emisor: input.technicalSourcePublisher, revision: input.catalogRevision, referencia_fuente: input.catalogSourceReference,
  }));
  const list = await client.from("catalogo_listas_precios").select("*").eq("proveedor_key", input.supplierKey).eq("revision", input.priceListRevision).maybeSingle();
  throwIfError(list.error);
  actions.push(classifyImportRow("catalogo_listas_precios", input.priceListRevision, list.data, {
    proveedor_key: input.supplierKey, nombre: input.priceListName, revision: input.priceListRevision,
    publicado_en: input.priceListPublishedOn, vigente_hasta: input.priceListValidUntil,
    referencia_fuente: input.priceListSourceReference, moneda: input.priceListCurrency,
    base_precio: input.priceListPriceBasis === "per_meter" ? "metro_lineal" : input.priceListPriceBasis === "unknown" ? "desconocida" : "presentacion_comercial",
  }));

  const technicalRows = source.data ? await client.from("catalogo_insumos_tecnicos").select("*").eq("fuente_tecnica_id", source.data.id) : null;
  if (technicalRows) throwIfError(technicalRows.error);
  const technicalByKey = new Map((technicalRows?.data ?? []).map((row) => [row.clave_tecnica, row]));
  const technicalIds = new Map<string, string>();
  for (const row of input.technicalInputs) {
    const existing = technicalByKey.get(row.technicalKey);
    if (existing) technicalIds.set(row.technicalKey, existing.id);
    actions.push(classifyImportRow("catalogo_insumos_tecnicos", row.technicalKey, existing, {
      fuente_tecnica_id: source.data?.id, clave_tecnica: row.technicalKey, codigo_fuente: row.sourceCode,
      nombre: row.name, material: row.material, seccion_mm: row.sectionMm, evidencia: technicalEvidence(row),
    }));
  }

  const ids = [...technicalIds.values()];
  const familyRows = ids.length ? await client.from("catalogo_insumo_familias").select("*").in("insumo_tecnico_id", ids) : null;
  if (familyRows) throwIfError(familyRows.error);
  for (const row of input.technicalInputs) for (const familyKey of row.familyKeys) {
    const technicalId = technicalIds.get(row.technicalKey);
    const existing = (familyRows?.data ?? []).find((entry) => entry.insumo_tecnico_id === technicalId && entry.family_key === familyKey);
    actions.push(classifyImportRow("catalogo_insumo_familias", `${row.technicalKey}/${familyKey}`, existing, { insumo_tecnico_id: technicalId, family_key: familyKey }));
  }

  const presentationRows = source.data ? await client.from("catalogo_presentaciones_proveedor").select("*").eq("fuente_tecnica_id", source.data.id).eq("proveedor_key", input.supplierKey) : null;
  if (presentationRows) throwIfError(presentationRows.error);
  const presentationsBySku = new Map((presentationRows?.data ?? []).map((row) => [row.sku_proveedor, row]));
  const globalPresentationRows = input.presentations.length
    ? await client.from("catalogo_presentaciones_proveedor")
      .select("id,fuente_tecnica_id,sku_proveedor")
      .eq("proveedor_key", input.supplierKey)
      .in("sku_proveedor", input.presentations.map((row) => row.sku))
    : null;
  if (globalPresentationRows) throwIfError(globalPresentationRows.error);
  for (const row of input.presentations) {
    const sameRevision = presentationsBySku.get(row.sku);
    if (hasSkuInDifferentTechnicalRevision({
      sku: row.sku,
      sourceId: source.data?.id,
      existing: globalPresentationRows?.data ?? [],
    })) {
      actions.push({
        table: "catalogo_presentaciones_proveedor",
        key: row.sku,
        action: "CONFLICTO",
        fields: ["SKU ya existe en otra revisión técnica; este lote no debe duplicar la presentación"],
      });
      continue;
    }
    actions.push(classifyImportRow("catalogo_presentaciones_proveedor", row.sku, sameRevision, {
      proveedor_key: input.supplierKey, fuente_tecnica_id: source.data?.id, insumo_tecnico_id: technicalIds.get(row.technicalKey),
      sku_proveedor: row.sku, descripcion: row.description,
      modo_acabado: row.finishResolution === "finish_independent" ? "independiente" : "especifico",
      acabado_codigo: row.finishCode, acabado_nombre: row.finishName, unidad_compra: row.purchaseUnit,
      largo_comercial_mm: row.commercialLengthMm, estado_asociacion: "confirmada", evidencia_asociacion: row.associationEvidence,
    }));
  }

  const priceRows = list.data ? await client.from("catalogo_precios_presentacion").select("*").eq("lista_precio_id", list.data.id) : null;
  if (priceRows) throwIfError(priceRows.error);
  for (const row of input.presentations) {
    const presentation = presentationsBySku.get(row.sku);
    const existing = (priceRows?.data ?? []).find((entry) => entry.presentacion_id === presentation?.id);
    actions.push(classifyImportRow("catalogo_precios_presentacion", `${input.priceListRevision}/${row.sku}`, existing, {
      lista_precio_id: list.data?.id, presentacion_id: presentation?.id, proveedor_key: input.supplierKey,
      precio_neto: row.netPrice, moneda: row.currency, evidencia_precio: row.priceEvidence,
    }));
  }
  return actions;
}

export type { SupabaseLike as ProveedorCatalogosClient };

