import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type FabricationCutSettingsRecord = {
  organizationId: number;
  perdidaCorteMm: number;
  despunteInicialMm: number;
  procedimiento: "por_pieza";
  confirmedBy: string;
  confirmedAt: string;
  updatedBy: string;
  updatedAt: string;
};

type SettingsRow = {
  organization_id: number;
  kerf_mm: number;
  initial_trim_mm: number;
  procedure: "por_pieza";
  confirmed_by: string;
  confirmed_at: string;
  updated_by: string;
  updated_at: string;
};

type FabricationCutSettingsDatabase = {
  public: {
    Tables: {
      organization_fabrication_cut_settings: {
        Row: SettingsRow;
        Insert: Omit<SettingsRow, "created_at"> & { created_at?: string };
        Update: Partial<Omit<SettingsRow, "organization_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function client() {
  return createAdminClient() as unknown as SupabaseClient<FabricationCutSettingsDatabase>;
}

function mapRow(row: SettingsRow): FabricationCutSettingsRecord {
  return {
    organizationId: Number(row.organization_id),
    perdidaCorteMm: Number(row.kerf_mm),
    despunteInicialMm: Number(row.initial_trim_mm),
    procedimiento: row.procedure,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export class FabricationCutSettingsSchemaMissingError extends Error {
  constructor() {
    super("Falta aplicar la migración de parámetros de corte del taller.");
  }
}

function throwRepositoryError(error: { code?: string; message: string }): never {
  if (error.code === "42P01" || error.code === "PGRST205") {
    throw new FabricationCutSettingsSchemaMissingError();
  }
  throw new Error(error.message);
}

export async function getFabricationCutSettings(
  organizationId: number
): Promise<FabricationCutSettingsRecord | null> {
  const { data, error } = await client()
    .from("organization_fabrication_cut_settings")
    .select("organization_id, kerf_mm, initial_trim_mm, procedure, confirmed_by, confirmed_at, updated_by, updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throwRepositoryError(error);
  return data ? mapRow(data as SettingsRow) : null;
}

export async function saveFabricationCutSettings(input: {
  organizationId: number;
  perdidaCorteMm: number;
  despunteInicialMm: number;
  userId: string;
  confirmedAt?: string;
}): Promise<FabricationCutSettingsRecord> {
  const confirmedAt = input.confirmedAt ?? new Date().toISOString();
  const { data, error } = await client()
    .from("organization_fabrication_cut_settings")
    .upsert({
      organization_id: input.organizationId,
      kerf_mm: input.perdidaCorteMm,
      initial_trim_mm: input.despunteInicialMm,
      procedure: "por_pieza",
      confirmed_by: input.userId,
      confirmed_at: confirmedAt,
      updated_by: input.userId,
      updated_at: confirmedAt,
    }, { onConflict: "organization_id" })
    .select("organization_id, kerf_mm, initial_trim_mm, procedure, confirmed_by, confirmed_at, updated_by, updated_at")
    .single();
  if (error) throwRepositoryError(error);
  return mapRow(data as SettingsRow);
}
