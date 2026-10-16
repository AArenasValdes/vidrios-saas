import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { SupplierCatalogDatabase } from "./supplier-catalog-database.types";

export type SupplierFamilyPreference = {
  organizationId: number;
  familyKey: string;
  providerKey: string;
  updatedAt: string;
};

function client() {
  return createAdminClient() as unknown as SupabaseClient<SupplierCatalogDatabase>;
}

export class SupplierFamilyPreferencesSchemaMissingError extends Error {
  constructor() { super("Falta aplicar la migración de proveedores habituales por familia."); }
}

export async function listSupplierFamilyPreferences(organizationId: number): Promise<SupplierFamilyPreference[]> {
  const { data, error } = await client().from("organization_supplier_family_preferences")
    .select("organization_id, family_key, provider_key, updated_at")
    .eq("organization_id", organizationId);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    organizationId: Number(row.organization_id),
    familyKey: String(row.family_key),
    providerKey: String(row.provider_key),
    updatedAt: String(row.updated_at),
  }));
}

export async function upsertSupplierFamilyPreference(input: {
  organizationId: number;
  familyKey: string;
  providerKey: string;
}): Promise<SupplierFamilyPreference> {
  const { data, error } = await client().from("organization_supplier_family_preferences")
    .upsert({
      organization_id: input.organizationId,
      family_key: input.familyKey,
      provider_key: input.providerKey,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,family_key" })
    .select("organization_id, family_key, provider_key, updated_at")
    .single();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") throw new SupplierFamilyPreferencesSchemaMissingError();
    throw new Error(error.message);
  }
  return {
    organizationId: Number(data.organization_id),
    familyKey: String(data.family_key),
    providerKey: String(data.provider_key),
    updatedAt: String(data.updated_at),
  };
}

export async function deleteSupplierFamilyPreference(input: {
  organizationId: number;
  familyKey: string;
}): Promise<void> {
  const { error } = await client().from("organization_supplier_family_preferences")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("family_key", input.familyKey);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") throw new SupplierFamilyPreferencesSchemaMissingError();
    throw new Error(error.message);
  }
}
