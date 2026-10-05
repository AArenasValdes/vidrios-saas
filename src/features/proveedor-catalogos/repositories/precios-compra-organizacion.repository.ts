import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupplierCatalogDatabase } from "./supplier-catalog-database.types";

function client() {
  return createAdminClient() as unknown as SupabaseClient<SupplierCatalogDatabase>;
}

export async function saveSupplierAdjustment(input: { organizationId: number; providerKey: string; percentage: number }) {
  const { error } = await client().from("organizacion_ajustes_proveedor").upsert({
    organization_id: input.organizationId,
    proveedor_key: input.providerKey,
    ajuste_porcentaje: input.percentage,
    activo: true,
    actualizado_en: new Date().toISOString(),
  }, { onConflict: "organization_id,proveedor_key" });
  if (error) throw new Error(error.message);
}

export async function savePresentationOverride(input: {
  organizationId: number;
  providerKey: string;
  presentationId: string;
  netPrice: number;
  currency: string;
}) {
  const admin = client();
  const { data: presentation, error: lookupError } = await admin.from("catalogo_presentaciones_proveedor")
    .select("id")
    .eq("id", input.presentationId)
    .eq("proveedor_key", input.providerKey)
    .eq("estado_asociacion", "confirmada")
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!presentation) throw new Error("La presentación no pertenece al proveedor activo.");
  const { error } = await admin.from("organizacion_precios_presentacion").upsert({
    organization_id: input.organizationId,
    presentacion_id: input.presentationId,
    precio_neto: input.netPrice,
    moneda: input.currency,
    actualizado_en: new Date().toISOString(),
  }, { onConflict: "organization_id,presentacion_id" });
  if (error) throw new Error(error.message);
}

export async function clearPresentationOverride(input: {
  organizationId: number;
  providerKey: string;
  presentationId: string;
}) {
  const admin = client();
  const { data: presentation, error: lookupError } = await admin.from("catalogo_presentaciones_proveedor")
    .select("id")
    .eq("id", input.presentationId)
    .eq("proveedor_key", input.providerKey)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!presentation) throw new Error("La presentación no pertenece al proveedor activo.");
  const { error } = await admin.from("organizacion_precios_presentacion")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("presentacion_id", input.presentationId);
  if (error) throw new Error(error.message);
}
