import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
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
  preferred: boolean;
  userId: string;
};

function client() {
  return createAdminClient() as unknown as SupabaseClient<SupplierCatalogDatabase>;
}

export class WorkshopPresentationsSchemaMissingError extends Error {
  constructor() { super("Falta aplicar la migración de presentaciones privadas del taller."); }
}

export async function listWorkshopPresentations(organizationId: number, familyKey?: string) {
  let query = client().from("organizacion_presentaciones_taller")
    .select("id, organization_id, family_key, configuration_key, insumo_oficial_id, codigo_tecnico, codigo_receta, nombre_perfil, sku_taller, descripcion, modo_acabado, acabado_nombre, unidad_compra, largo_comercial_mm, precio_neto, moneda, preferida, revision, creado_en")
    .eq("organization_id", organizationId).is("eliminado_en", null);
  if (familyKey) query = query.eq("family_key", familyKey);
  const { data, error } = await query.order("creado_en", { ascending: true });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") throw new WorkshopPresentationsSchemaMissingError();
    throw new Error(error.message);
  }
  return data ?? [];
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
    preferida: input.preferred,
    creado_por: input.userId,
  }).select("id, organization_id, family_key, configuration_key, insumo_oficial_id, codigo_tecnico, codigo_receta, nombre_perfil, sku_taller, descripcion, modo_acabado, acabado_nombre, unidad_compra, largo_comercial_mm, precio_neto, moneda, preferida, revision, creado_en").single();
  if (error) {
    if (error.code === "23505") throw new Error("Ya existe ese SKU o una presentación elegida para el mismo perfil y acabado.");
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
  preferred: boolean;
}) {
  let query = client().from("organizacion_presentaciones_taller")
    .update({
      unidad_compra: input.purchaseUnit,
      largo_comercial_mm: input.commercialLengthMm,
      precio_neto: input.netPrice,
      moneda: input.currency,
      preferida: input.preferred,
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
  if (error?.code === "23505") throw new Error("Ya hay una presentación elegida para este perfil y acabado. Desmarca la anterior primero.");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("La presentación cambió o no pertenece a esta configuración. Recarga y vuelve a intentarlo.");
  return data;
}
