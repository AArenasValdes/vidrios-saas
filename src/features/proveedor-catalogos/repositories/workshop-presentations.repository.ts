import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCatalogGlassTechnicalSpec, type GlassTechnicalCategory } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import type { GlassSupplierCutPresentation } from "../services/glass-supplier-cut-cost.service";
import type { SupplierCatalogDatabase } from "./supplier-catalog-database.types";

export type WorkshopPresentationInput = {
  organizationId: number;
  familyKey: string;
  configurationKey: string | null;
  officialInputId: string | null;
  technicalCode: string | null;
  recipeCode: string | null;
  profileName: string | null;
  workshopSku: string;
  description: string;
  finishName: string | null;
  purchaseUnit: string;
  commercialLengthMm: number | null;
  netPrice: number | null;
  currency: string | null;
  supplierName?: string | null;
  preferred: boolean;
  userId: string;
};

function client() {
  return createAdminClient() as unknown as SupabaseClient<SupplierCatalogDatabase>;
}

export class WorkshopPresentationsSchemaMissingError extends Error {
  constructor() { super("Falta aplicar la migración de presentaciones privadas del taller."); }
}

export class WorkshopPresentationConflictError extends Error {
  constructor(message: string) { super(message); }
}

function isWorkshopSchemaMissingError(error: { code?: string | null; message?: string | null } | null | undefined) {
  const code = error?.code ?? "";
  return code === "42P01" || code === "42703" || code === "PGRST204" || code === "PGRST205";
}

export async function listWorkshopPresentations(organizationId: number, familyKey?: string) {
  let query = client().from("organizacion_presentaciones_taller")
    .select("*")
    .eq("organization_id", organizationId).is("eliminado_en", null);
  if (familyKey) query = query.eq("family_key", familyKey);
  const { data, error } = await query.order("creado_en", { ascending: true });
  if (error) {
    if (isWorkshopSchemaMissingError(error)) throw new WorkshopPresentationsSchemaMissingError();
    throw new Error(error.message);
  }
  return (data ?? []).filter((row) => row.tipo_insumo !== "vidrio");
}

export async function createWorkshopPresentation(input: WorkshopPresentationInput) {
  const admin = client();
  let technicalCode = input.technicalCode?.trim() ?? "";
  let profileName = input.profileName?.trim() ?? "";
  if (input.officialInputId) {
    const { data: official, error } = await admin.from("catalogo_insumos_tecnicos")
      .select("id, codigo_fuente, nombre").eq("id", input.officialInputId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!official) throw new Error("El perfil oficial indicado no existe.");
    const { data: family, error: familyError } = await admin.from("catalogo_insumo_familias")
      .select("family_key").eq("insumo_tecnico_id", input.officialInputId).eq("family_key", input.familyKey).maybeSingle();
    if (familyError) throw new Error(familyError.message);
    if (!family) throw new Error("El perfil oficial no pertenece a esta familia.");
    technicalCode = String(official.codigo_fuente);
    profileName = String(official.nombre);
  }
  if (!technicalCode || !profileName) throw new Error("Indica código y nombre del perfil privado.");
  const { data: officialSku, error: skuError } = await admin.from("catalogo_presentaciones_proveedor")
    .select("id").ilike("sku_proveedor", input.workshopSku).limit(1);
  if (skuError) throw new Error(skuError.message);
  if (officialSku?.length) throw new Error("Este SKU ya es oficial. Asigna tu precio a la presentación existente.");
  const { data, error } = await admin.from("organizacion_presentaciones_taller").insert({
    organization_id: input.organizationId,
    family_key: input.familyKey,
    configuration_key: input.configurationKey,
    insumo_oficial_id: input.officialInputId,
    codigo_tecnico: technicalCode,
    codigo_receta: input.recipeCode?.trim() || null,
    nombre_perfil: profileName,
    sku_taller: input.workshopSku.trim(),
    descripcion: input.description.trim(),
    modo_acabado: input.finishName ? "especifico" : "independiente",
    acabado_nombre: input.finishName?.trim() || null,
    unidad_compra: input.purchaseUnit.trim(),
    largo_comercial_mm: input.commercialLengthMm,
    precio_neto: input.netPrice,
    moneda: input.currency,
    ...(input.supplierName?.trim() ? { proveedor_nombre: input.supplierName.trim() } : {}),
    preferida: input.preferred,
    creado_por: input.userId,
  }).select("id, organization_id, family_key, configuration_key, insumo_oficial_id, codigo_tecnico, codigo_receta, nombre_perfil, sku_taller, descripcion, modo_acabado, acabado_nombre, unidad_compra, largo_comercial_mm, precio_neto, moneda, preferida, revision, creado_en").single();
  if (error) {
    if (error.code === "23505") throw new WorkshopPresentationConflictError("Ya existe ese costo para el perfil y acabado. Actualiza la referencia guardada.");
    throw new Error(error.message);
  }
  return data;
}

export async function listOfficialTechnicalInputsForFamily(familyKey: string) {
  const admin = client();
  const { data: families, error } = await admin.from("catalogo_insumo_familias")
    .select("insumo_tecnico_id").eq("family_key", familyKey);
  if (error) throw new Error(error.message);
  const ids = (families ?? []).map((row) => row.insumo_tecnico_id);
  if (ids.length === 0) return [];
  const { data: inputs, error: inputError } = await admin.from("catalogo_insumos_tecnicos")
    .select("id, codigo_fuente, nombre").in("id", ids).order("nombre");
  if (inputError) throw new Error(inputError.message);
  return inputs ?? [];
}

/** Identidad y asociación permanecen fijas; solo cambia la compra privada con revisión optimista. */
export async function updateWorkshopPresentationPurchase(input: {
  organizationId: number;
  familyKey: string;
  configurationKey: string | null;
  presentationId: string;
  expectedRevision: number;
  purchaseUnit: string;
  commercialLengthMm: number | null;
  netPrice: number | null;
  currency: string | null;
  supplierName?: string | null;
  preferred?: boolean;
}) {
  let query = client().from("organizacion_presentaciones_taller")
    .update({
      unidad_compra: input.purchaseUnit,
      largo_comercial_mm: input.commercialLengthMm,
      precio_neto: input.netPrice,
      moneda: input.currency,
      ...(input.supplierName === undefined ? {} : { proveedor_nombre: input.supplierName?.trim() || null }),
      ...(input.preferred === undefined ? {} : { preferida: input.preferred }),
      revision: input.expectedRevision + 1,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", input.presentationId)
    .eq("organization_id", input.organizationId)
    .eq("family_key", input.familyKey)
    .eq("revision", input.expectedRevision)
    .is("eliminado_en", null);
  query = input.configurationKey ? query.eq("configuration_key", input.configurationKey) : query.is("configuration_key", null);
  const { data, error } = await query
    .select("id, revision, unidad_compra, largo_comercial_mm, precio_neto, moneda, preferida")
    .maybeSingle();
  if (error?.code === "23505") throw new WorkshopPresentationConflictError("Ya hay una presentación elegida para este perfil y acabado. Desmarca la anterior primero.");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("La presentación cambió o no pertenece a esta configuración. Recarga y vuelve a intentarlo.");
  return data;
}

export type OrganizationGlassProductOption = {
  id: number;
  productId: string;
  name: string;
  category: GlassTechnicalCategory;
  thicknessMm: number | null;
};

export type WorkshopGlassCutPresentationRecord = GlassSupplierCutPresentation & {
  id: string;
  revision: number;
  glassLineTemplateId: number | null;
};

export async function listOrganizationGlassProducts(
  organizationId: number
): Promise<OrganizationGlassProductOption[]> {
  const { data, error } = await client()
    .from("cotizacion_line_templates")
    .select("id, nombre, categoria, catalog_metadata")
    .eq("organization_id", organizationId)
    .eq("categoria", "vidrio")
    .is("eliminado_en", null)
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const productId = String(row.id);
    const spec = buildCatalogGlassTechnicalSpec({
      productId,
      metadata:
        row.catalog_metadata && typeof row.catalog_metadata === "object" && !Array.isArray(row.catalog_metadata)
          ? (row.catalog_metadata as Record<string, unknown>)
          : undefined,
    });
    return {
      id: Number(row.id),
      productId,
      name: String(row.nombre ?? `Cristal ${productId}`),
      category: spec.category,
      thicknessMm: spec.thicknessMm,
    };
  });
}

function normalizeProviderSlug(value: string) {
  return (
    value
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "taller"
  );
}

export async function listWorkshopGlassCutPresentations(organizationId: number): Promise<{
  presentations: WorkshopGlassCutPresentationRecord[];
  schemaPending: boolean;
}> {
  const { data, error } = await client()
    .from("organizacion_presentaciones_taller")
    .select(
      "id, organization_id, revision, codigo_tecnico, descripcion, precio_neto, moneda, proveedor_nombre, provider_key, glass_product_id, glass_line_template_id, forma_compra_vidrio, categoria_vidrio, espesor_mm, minimo_cobrable_m2, vigente_desde, vigente_hasta"
    )
    .eq("organization_id", organizationId)
    .eq("tipo_insumo", "vidrio")
    .eq("forma_compra_vidrio", "supplier_cut")
    .is("eliminado_en", null)
    .order("creado_en", { ascending: true });
  if (error) {
    if (isWorkshopSchemaMissingError(error)) {
      return { presentations: [], schemaPending: true };
    }
    throw new Error(error.message);
  }
  const presentations: WorkshopGlassCutPresentationRecord[] = (data ?? []).flatMap((row) => {
    if (row.precio_neto == null || !row.moneda || !row.categoria_vidrio) return [];
    const category = row.categoria_vidrio as GlassTechnicalCategory;
    if (category === "pendiente") return [];
    const providerLabel = row.proveedor_nombre ? String(row.proveedor_nombre) : "Proveedor del taller";
    return [
      {
        id: String(row.id),
        revision: Number(row.revision ?? 1),
        presentationId: String(row.id),
        providerKey: row.provider_key?.trim() || `taller:${organizationId}`,
        providerLabel,
        organizationId: Number(row.organization_id),
        glassLineTemplateId: row.glass_line_template_id == null ? null : Number(row.glass_line_template_id),
        glassProductId: row.glass_product_id ? String(row.glass_product_id) : null,
        category,
        thicknessMm: row.espesor_mm == null ? null : Number(row.espesor_mm),
        glassDescription: String(row.descripcion),
        purchaseMode: "supplier_cut",
        purchaseUnit: "M2",
        netPricePerM2: Number(row.precio_neto),
        minBillableM2PerPane: row.minimo_cobrable_m2 == null ? null : Number(row.minimo_cobrable_m2),
        currency: String(row.moneda).trim().toUpperCase(),
        priceReferenceStatus: "within_stated_validity",
        validFrom: row.vigente_desde ? String(row.vigente_desde) : null,
        validUntil: row.vigente_hasta ? String(row.vigente_hasta) : null,
        origin: "workshop",
        workshopPriceConfirmed: true,
      },
    ];
  });
  return { presentations, schemaPending: false };
}

export async function createWorkshopGlassCutPresentation(input: {
  organizationId: number;
  glassLineTemplateId: number | null;
  glassProductId: string | null;
  category: Exclude<GlassTechnicalCategory, "pendiente" | "otro">;
  thicknessMm: number;
  description: string;
  providerKey: string | null;
  supplierName: string;
  netPricePerM2: number;
  minBillableM2PerPane: number | null;
  currency: "CLP";
  validFrom: string | null;
  validUntil: string | null;
  userId: string;
}) {
  const admin = client();
  let resolvedGlassProductId = input.glassProductId?.trim() || null;
  if (input.glassLineTemplateId != null) {
    const { data: tpl, error: tplError } = await admin
      .from("cotizacion_line_templates")
      .select("id, categoria")
      .eq("id", input.glassLineTemplateId)
      .eq("organization_id", input.organizationId)
      .is("eliminado_en", null)
      .maybeSingle();
    if (tplError) throw new Error(tplError.message);
    if (!tpl || tpl.categoria !== "vidrio") {
      throw new Error("El cristal seleccionado no pertenece a esta organización.");
    }
    resolvedGlassProductId = resolvedGlassProductId || String(tpl.id);
  }
  const providerKey =
    input.providerKey?.trim() || `taller:${input.organizationId}:${normalizeProviderSlug(input.supplierName)}`;
  const technicalCode = `VID-${input.category.toUpperCase()}-${String(input.thicknessMm).replace(".", "_")}MM`;
  const { data, error } = await admin
    .from("organizacion_presentaciones_taller")
    .insert({
      organization_id: input.organizationId,
      family_key: "ventora:vidrio",
      configuration_key: null,
      insumo_oficial_id: null,
      codigo_tecnico: technicalCode,
      codigo_receta: null,
      nombre_perfil: input.description.trim(),
      sku_taller: `vidrio-${randomUUID()}`,
      descripcion: input.description.trim(),
      modo_acabado: "independiente",
      acabado_nombre: null,
      unidad_compra: "M2",
      largo_comercial_mm: null,
      precio_neto: input.netPricePerM2,
      moneda: input.currency,
      proveedor_nombre: input.supplierName.trim(),
      preferida: false,
      creado_por: input.userId,
      tipo_insumo: "vidrio",
      provider_key: providerKey,
      glass_product_id: resolvedGlassProductId,
      glass_line_template_id: input.glassLineTemplateId,
      forma_compra_vidrio: "supplier_cut",
      categoria_vidrio: input.category,
      espesor_mm: input.thicknessMm,
      minimo_cobrable_m2: input.minBillableM2PerPane,
      vigente_desde: input.validFrom,
      vigente_hasta: input.validUntil,
    })
    .select(
      "id, revision, descripcion, precio_neto, moneda, proveedor_nombre, provider_key, glass_product_id, glass_line_template_id, categoria_vidrio, espesor_mm, minimo_cobrable_m2, vigente_desde, vigente_hasta"
    )
    .single();
  if (error) {
    if (isWorkshopSchemaMissingError(error)) throw new WorkshopPresentationsSchemaMissingError();
    if (error.code === "23505") {
      throw new WorkshopPresentationConflictError(
        "Ya existe un precio de vidrio al corte para este producto, categoría, espesor y proveedor."
      );
    }
    throw new Error(error.message);
  }
  return data;
}

export async function updateWorkshopGlassCutPresentation(input: {
  organizationId: number;
  presentationId: string;
  expectedRevision: number;
  supplierName: string;
  netPricePerM2: number;
  minBillableM2PerPane: number | null;
  currency: "CLP";
  validFrom: string | null;
  validUntil: string | null;
}) {
  const { data, error } = await client()
    .from("organizacion_presentaciones_taller")
    .update({
      proveedor_nombre: input.supplierName.trim(),
      precio_neto: input.netPricePerM2,
      moneda: input.currency,
      minimo_cobrable_m2: input.minBillableM2PerPane,
      vigente_desde: input.validFrom,
      vigente_hasta: input.validUntil,
      revision: input.expectedRevision + 1,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", input.presentationId)
    .eq("organization_id", input.organizationId)
    .eq("tipo_insumo", "vidrio")
    .eq("revision", input.expectedRevision)
    .is("eliminado_en", null)
    .select(
      "id, revision, descripcion, precio_neto, moneda, proveedor_nombre, provider_key, glass_product_id, glass_line_template_id, categoria_vidrio, espesor_mm, minimo_cobrable_m2, vigente_desde, vigente_hasta"
    )
    .maybeSingle();
  if (error) {
    if (isWorkshopSchemaMissingError(error)) throw new WorkshopPresentationsSchemaMissingError();
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("El precio de vidrio cambió o no pertenece a esta empresa. Recarga y vuelve a intentarlo.");
  }
  return data;
}
