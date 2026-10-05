import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { SupplierCatalogDatabase } from "./supplier-catalog-database.types";
import type { OrganizationPurchasePricing } from "../services/precio-compra.service";
import {
  selectSupplierPriceLists,
  type SupplierPriceListSelection,
} from "../services/price-list-selection.service";
import {
  technicalCostStatusFromDatabase,
  technicalCostStatusToDatabase,
  getRecipeAccessoriesFromItemSnapshot,
  type CatalogPresentationPrice,
  type TechnicalCostSnapshot,
} from "../services/costo-tecnico-parcial.service";
import type { ConfirmedSupplierPresentation } from "../services/supplier-presentation-resolution.service";
import { listWorkshopPresentations, WorkshopPresentationsSchemaMissingError } from "./workshop-presentations.repository";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

function getClient() {
  return createAdminClient() as unknown as SupabaseClient<SupplierCatalogDatabase>;
}

/** Catálogo técnico confirmado, independiente de que una lista tenga precio activo. */
export async function readConfirmedSupplierPresentations(organizationId?: number): Promise<ConfirmedSupplierPresentation[]> {
  const admin = getClient();
  const workshopRows = organizationId ? await listWorkshopPresentations(organizationId).catch((error: unknown) => {
    if (error instanceof WorkshopPresentationsSchemaMissingError) return [];
    throw error;
  }) : [];
  const workshopPresentations: ConfirmedSupplierPresentation[] = workshopRows.map((row) => ({
    presentationId: String(row.id),
    providerKey: `taller:${organizationId}`,
    supplierSku: String(row.sku_taller),
    technicalCode: String(row.codigo_tecnico),
    recipeComponentCodes: row.codigo_receta ? [String(row.codigo_receta)] : [],
    familyKeys: [String(row.family_key)],
    configurationKey: row.configuration_key ? String(row.configuration_key) : null,
    preferred: row.preferida === true,
    finishCode: null,
    finishName: row.acabado_nombre ? String(row.acabado_nombre) : null,
    finishResolution: row.modo_acabado === "independiente" ? "finish_independent" : "specific",
    commercialLengthMm: row.largo_comercial_mm == null ? null : Number(row.largo_comercial_mm),
  }));
  const { data: presentations, error } = await admin.from("catalogo_presentaciones_proveedor")
    .select("id, proveedor_key, sku_proveedor, modo_acabado, acabado_codigo, acabado_nombre, largo_comercial_mm, insumo_tecnico_id")
    .eq("estado_asociacion", "confirmada");
  if (error) throw new Error(error.message);
  const technicalIds = [...new Set((presentations ?? []).map((row) => row.insumo_tecnico_id).filter(Boolean).map(String))];
  if (technicalIds.length === 0) return workshopPresentations;
  const [{ data: inputs, error: inputError }, { data: familyRows, error: familyError }] = await Promise.all([
    admin.from("catalogo_insumos_tecnicos").select("id, codigo_fuente, evidencia").in("id", technicalIds),
    admin.from("catalogo_insumo_familias").select("insumo_tecnico_id, family_key").in("insumo_tecnico_id", technicalIds),
  ]);
  if (inputError) throw new Error(inputError.message);
  if (familyError) throw new Error(familyError.message);
  const inputById = new Map((inputs ?? []).map((row) => [String(row.id), row]));
  const familiesByInput = new Map<string, string[]>();
  for (const row of familyRows ?? []) {
    const key = String(row.insumo_tecnico_id);
    familiesByInput.set(key, [...(familiesByInput.get(key) ?? []), String(row.family_key)]);
  }
  const officialPresentations: ConfirmedSupplierPresentation[] = (presentations ?? []).flatMap((row) => {
    if (!row.insumo_tecnico_id) return [];
    const technical = inputById.get(String(row.insumo_tecnico_id));
    if (!technical) return [];
    const evidence = technical.evidencia && typeof technical.evidencia === "object" && !Array.isArray(technical.evidencia)
      ? technical.evidencia as Record<string, unknown>
      : {};
    const recipeComponentCodes = Array.isArray(evidence.recipeComponentCodes)
      ? evidence.recipeComponentCodes.filter((code): code is string => typeof code === "string" && code.trim().length > 0)
      : [];
    return [{
      presentationId: String(row.id),
      providerKey: String(row.proveedor_key),
      supplierSku: String(row.sku_proveedor),
      technicalCode: String(technical.codigo_fuente),
      recipeComponentCodes,
      familyKeys: familiesByInput.get(String(row.insumo_tecnico_id)) ?? [],
      finishCode: row.acabado_codigo == null ? null : String(row.acabado_codigo),
      finishName: row.acabado_nombre == null ? null : String(row.acabado_nombre),
      finishResolution: row.modo_acabado === "independiente" ? "finish_independent" as const : "specific" as const,
      commercialLengthMm: row.largo_comercial_mm == null ? null : Number(row.largo_comercial_mm),
    }];
  });
  return [...officialPresentations, ...workshopPresentations];
}

export async function readWorkshopPresentationPrices(organizationId: number): Promise<CatalogPresentationPrice[]> {
  const rows = await listWorkshopPresentations(organizationId).catch((error: unknown) => {
    if (error instanceof WorkshopPresentationsSchemaMissingError) return [];
    throw error;
  });
  return rows.map((row) => ({
    presentationId: String(row.id),
    providerKey: `taller:${organizationId}`,
    familyKeys: [String(row.family_key)],
    configurationKey: row.configuration_key ? String(row.configuration_key) : null,
    technicalCode: String(row.codigo_tecnico),
    recipeComponentCodes: row.codigo_receta ? [String(row.codigo_receta)] : [],
    technicalName: String(row.nombre_perfil),
    supplierSku: String(row.sku_taller),
    presentationDescription: String(row.descripcion),
    finishCode: "",
    finishName: row.acabado_nombre ? String(row.acabado_nombre) : null,
    finishResolution: row.modo_acabado === "independiente" ? "finish_independent" : "specific",
    purchaseUnit: String(row.unidad_compra),
    commercialLengthMm: row.largo_comercial_mm == null ? null : Number(row.largo_comercial_mm),
    netPrice: row.precio_neto == null ? null : Number(row.precio_neto),
    priceBasis: "commercial_presentation" as const,
    currency: row.moneda ? String(row.moneda) : null,
    priceListId: `taller:${organizationId}`,
    priceListRevision: `taller-v${Number(row.revision)}`,
    origin: "workshop" as const,
  }));
}

export async function readSupplierName(providerKey: string) {
  const { data, error } = await getClient().from("catalogo_proveedores")
    .select("nombre").eq("proveedor_key", providerKey).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.nombre ?? providerKey;
}

export async function getExistingTechnicalCostSnapshot(input: {
  quoteId: number;
  organizationId: number;
}) {
  const { data, error } = await getClient()
    .from("cotizacion_costos_tecnicos")
    .select("snapshot, estado, calculado_en")
    .eq("cotizacion_id", input.quoteId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? {
    snapshot: data.snapshot as TechnicalCostSnapshot,
    status: technicalCostStatusFromDatabase(String(data.estado)) ?? "partial",
    calculatedAt: data.calculado_en as string,
  } : null;
}

export async function readQuoteForTechnicalCost(input: {
  quoteId: number;
  organizationId: number;
}) {
  const admin = getClient();
  const { data, error } = await admin.from("cotizaciones")
    .select("id, organization_id, creado_en, fabricacion_trabajo_snapshot")
    .eq("id", input.quoteId)
    .eq("organization_id", input.organizationId)
    .is("eliminado_en", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: items, error: itemError } = await admin.from("cotizacion_items")
    .select("id, codigo, color, vidrio, observaciones, fabricacion_snapshot")
    .eq("cotizacion_id", input.quoteId)
    .eq("organization_id", input.organizationId)
    .is("eliminado_en", null);
  if (itemError) throw new Error(itemError.message);

  return {
    createdAt: data.creado_en as string | null,
    workSnapshot: data.fabricacion_trabajo_snapshot,
    items: (items ?? []).map((item) => ({
      id: String(item.id),
      code: String(item.codigo ?? "").trim(),
      color: item.color as string | null,
      glassDescription: item.vidrio as string | null,
      colorHex: decodeCotizacionItemPresentationMeta(item.observaciones).colorHex,
      finishName: decodeCotizacionItemPresentationMeta(item.observaciones).catalogTerminacion,
      catalogLineKey: decodeCotizacionItemPresentationMeta(item.observaciones).catalogLineKey,
      configurationKey: VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === decodeCotizacionItemPresentationMeta(item.observaciones).catalogLineKey)?.catalogMetadata?.configurationKey as string | undefined,
      fabricacionSnapshot: item.fabricacion_snapshot,
      recipeAccessories: getRecipeAccessoriesFromItemSnapshot(item.fabricacion_snapshot, String(item.codigo ?? "").trim()),
    })),
  };
}

export async function readSupplierPresentationPrices(input: {
  selectedByProvider?: Readonly<Record<string, SupplierPriceListSelection>>;
  preferredListIdsByProvider?: Readonly<Record<string, string>>;
  asOf?: Date;
} = {}): Promise<CatalogPresentationPrice[]> {
  const admin = getClient();
  const { data: lists, error: listsError } = await admin.from("catalogo_listas_precios")
    .select("id, proveedor_key, revision, publicado_en, vigente_desde, vigente_hasta, creado_en, moneda, base_precio");
  if (listsError) throw new Error(listsError.message);
  const selectedLists = selectSupplierPriceLists({
    lists: (lists ?? []).map((list) => ({
      id: String(list.id),
      providerKey: String(list.proveedor_key),
      revision: String(list.revision),
      publishedOn: list.publicado_en as string | null,
      validFrom: list.vigente_desde as string | null,
      validUntil: list.vigente_hasta as string | null,
      createdAt: String(list.creado_en),
    })),
    selectedByProvider: input.selectedByProvider,
    preferredListIdsByProvider: input.preferredListIdsByProvider,
    asOf: input.asOf,
  });
  const selectedListIds = [...selectedLists.values()].map((list) => list.id);
  const providerKeys = [...selectedLists.keys()];
  if (selectedListIds.length === 0 || providerKeys.length === 0) return [];

  const { data: prices, error: pricesError } = await admin.from("catalogo_precios_presentacion")
    .select("lista_precio_id, presentacion_id, precio_neto, moneda")
    .in("lista_precio_id", selectedListIds);
  if (pricesError) throw new Error(pricesError.message);
  const providerByListId = new Map((lists ?? []).map((list) => [String(list.id), String(list.proveedor_key)]));
  const priceByPresentation = new Map((prices ?? []).map((price) => [
    `${String(price.presentacion_id)}|${providerByListId.get(String(price.lista_precio_id)) ?? ""}`,
    price,
  ]));
  const { data: presentations, error: presentationError } = await admin.from("catalogo_presentaciones_proveedor")
    .select("id, proveedor_key, sku_proveedor, descripcion, modo_acabado, acabado_codigo, acabado_nombre, unidad_compra, largo_comercial_mm, insumo_tecnico_id")
    .in("proveedor_key", providerKeys)
    .eq("estado_asociacion", "confirmada");
  if (presentationError) throw new Error(presentationError.message);
  const technicalInputIds = [...new Set((presentations ?? []).map((row) => row.insumo_tecnico_id).filter(Boolean).map(String))];
  if (technicalInputIds.length === 0) return [];

  const { data: technicalInputs, error: technicalInputError } = await admin.from("catalogo_insumos_tecnicos")
    .select("id, codigo_fuente, nombre, evidencia")
    .in("id", technicalInputIds);
  if (technicalInputError) throw new Error(technicalInputError.message);
  const inputById = new Map((technicalInputs ?? []).map((row) => [String(row.id), row]));
  const { data: inputFamilies, error: familyError } = await admin.from("catalogo_insumo_familias")
    .select("insumo_tecnico_id, family_key")
    .in("insumo_tecnico_id", technicalInputIds);
  if (familyError) throw new Error(familyError.message);
  const familyKeysByInputId = new Map<string, string[]>();
  for (const row of inputFamilies ?? []) {
    const key = String(row.insumo_tecnico_id);
    familyKeysByInputId.set(key, [...(familyKeysByInputId.get(key) ?? []), String(row.family_key)]);
  }

  return (presentations ?? []).flatMap((presentation) => {
    const providerKey = String(presentation.proveedor_key);
    const selectedList = selectedLists.get(providerKey);
    if (!selectedList) return [];
    const listMetadata = (lists ?? []).find((list) => String(list.id) === selectedList.id);
    const price = priceByPresentation.get(`${String(presentation.id)}|${providerKey}`);
    const technicalInput = inputById.get(String(presentation.insumo_tecnico_id));
    const isFinishIndependent = presentation.modo_acabado === "independiente";
    if (!technicalInput || (!isFinishIndependent && !presentation.acabado_nombre)) return [];
    const evidence = technicalInput.evidencia && typeof technicalInput.evidencia === "object" && !Array.isArray(technicalInput.evidencia)
      ? technicalInput.evidencia as Record<string, unknown>
      : {};
    const recipeComponentCodes = Array.isArray(evidence.recipeComponentCodes)
      ? evidence.recipeComponentCodes.filter((code): code is string => typeof code === "string" && code.trim().length > 0)
      : [];
    const recipeAccessoryNames = Array.isArray(evidence.recipeAccessoryNames)
      ? evidence.recipeAccessoryNames.filter((name): name is string => typeof name === "string" && name.trim().length > 0)
      : [];
    if (presentation.largo_comercial_mm == null && recipeAccessoryNames.length === 0) return [];
    return [{
      presentationId: String(presentation.id),
      providerKey,
      familyKeys: familyKeysByInputId.get(String(presentation.insumo_tecnico_id)) ?? [],
      technicalCode: String(technicalInput.codigo_fuente),
      recipeComponentCodes,
      recipeAccessoryNames,
      technicalName: String(technicalInput.nombre),
      supplierSku: String(presentation.sku_proveedor),
      presentationDescription: String(presentation.descripcion),
      finishCode: presentation.acabado_codigo == null ? "" : String(presentation.acabado_codigo),
      finishName: presentation.acabado_nombre == null ? null : String(presentation.acabado_nombre),
      finishResolution: presentation.modo_acabado === "independiente" ? "finish_independent" : "specific",
      purchaseUnit: String(presentation.unidad_compra),
      commercialLengthMm: presentation.largo_comercial_mm == null ? null : Number(presentation.largo_comercial_mm),
      netPrice: price ? Number(price.precio_neto) : null,
      priceBasis: listMetadata?.base_precio === "presentacion_comercial"
        ? "commercial_presentation"
        : listMetadata?.base_precio === "metro_lineal" ? "per_meter" : "unknown",
      currency: price?.moneda ?? listMetadata?.moneda ?? null,
      priceListId: String(selectedList.id),
      priceListRevision: String(selectedList.revision),
    }];
  });
}

export async function readSupplierNames(providerKeys: readonly string[]) {
  if (providerKeys.length === 0) return new Map<string, string>();
  const { data, error } = await getClient().from("catalogo_proveedores")
    .select("proveedor_key, nombre").in("proveedor_key", [...providerKeys]);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [String(row.proveedor_key), String(row.nombre)]));
}

export async function readOrganizationPurchasePricing(input: {
  organizationId: number;
  providerKeys: readonly string[];
  presentationIds: readonly string[];
}): Promise<OrganizationPurchasePricing> {
  if (input.providerKeys.length === 0) return { adjustments: [], overrides: [] };
  const admin = getClient();
  const { data: adjustments, error: adjustmentError } = await admin.from("organizacion_ajustes_proveedor")
    .select("proveedor_key, ajuste_porcentaje, activo")
    .eq("organization_id", input.organizationId)
    .in("proveedor_key", [...input.providerKeys]);
  if (adjustmentError) throw new Error(adjustmentError.message);
  if (input.presentationIds.length === 0) return {
    adjustments: (adjustments ?? []).map((row) => ({ providerKey: row.proveedor_key, percentage: Number(row.ajuste_porcentaje), active: row.activo })),
    overrides: [],
  };
  const { data: overrides, error: overrideError } = await admin.from("organizacion_precios_presentacion")
    .select("presentacion_id, precio_neto, moneda")
    .eq("organization_id", input.organizationId)
    .in("presentacion_id", [...input.presentationIds]);
  if (overrideError) throw new Error(overrideError.message);
  return {
    adjustments: (adjustments ?? []).map((row) => ({ providerKey: row.proveedor_key, percentage: Number(row.ajuste_porcentaje), active: row.activo })),
    overrides: (overrides ?? []).map((row) => ({ presentationId: row.presentacion_id, netPrice: Number(row.precio_neto), currency: row.moneda })),
  };
}

export async function persistTechnicalCostSnapshot(input: {
  quoteId: number;
  organizationId: number;
  snapshot: TechnicalCostSnapshot;
}) {
  const { data, error } = await getClient().from("cotizacion_costos_tecnicos").insert({
    cotizacion_id: input.quoteId,
    organization_id: input.organizationId,
    estado: technicalCostStatusToDatabase(input.snapshot.status),
    snapshot: input.snapshot,
  }).select("snapshot, estado, calculado_en").single();
  if (error) {
    // A concurrent first calculation wins. Its frozen values are the source of truth.
    if (error.code === "23505") {
      const existing = await getExistingTechnicalCostSnapshot(input);
      if (existing) return existing;
    }
    throw new Error(error.message);
  }
  return {
    snapshot: data.snapshot as TechnicalCostSnapshot,
    status: technicalCostStatusFromDatabase(String(data.estado)) ?? input.snapshot.status,
    calculatedAt: data.calculado_en as string,
  };
}

