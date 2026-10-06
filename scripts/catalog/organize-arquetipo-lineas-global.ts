import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;
type LineSpec = {
  catalogKey: string;
  nombre: string;
  proveedor: string | null;
  configuracion: string;
  lineSystem: string;
  familyKey?: string;
  familyLabel?: string;
  identitySource?: string;
  cuttingGuideSource?: string;
};
const expectedProjectRef = "yrtrwgkaopfumpidjthk";
const applyRequested = process.argv.includes("--apply");
const lineSpecs: LineSpec[] = [
  { catalogKey: "ventora:l5000", nombre: "Serie 5000", proveedor: null, configuracion: "Corredera 2 hojas", lineSystem: "L5000", familyKey: "universal:aluminio:l5000", familyLabel: "Línea 5000 · Aluminio universal", identitySource: "Línea 5000 · identidad universal confirmada por el taller" },
  { catalogKey: "ventora:l20", nombre: "Serie 20", proveedor: null, configuracion: "Corredera 2 hojas", lineSystem: "L20", familyKey: "universal:aluminio:l20", familyLabel: "Línea 20 · Aluminio universal", identitySource: "Línea 20 · identidad universal confirmada por el taller" },
  { catalogKey: "ventora:l20-fijos", nombre: "Serie 20 — Fijos", proveedor: null, configuracion: "Fijos 2 hojas", lineSystem: "L20", familyKey: "universal:aluminio:l20", familyLabel: "Línea 20 · Aluminio universal", identitySource: "Línea 20 · identidad universal confirmada por el taller" },
  { catalogKey: "ventora:l25", nombre: "Serie 25", proveedor: null, configuracion: "Corredera 2 hojas", lineSystem: "L25", familyKey: "universal:aluminio:l25", familyLabel: "Línea 25 · Aluminio universal", identitySource: "Línea 25 · identidad universal confirmada por el taller" },
  { catalogKey: "ventora:l32", nombre: "Línea 32", proveedor: null, configuracion: "Proyectante / paño fijo", lineSystem: "AL-32", familyKey: "universal:aluminio:l32", familyLabel: "Línea 32 · Aluminio universal", identitySource: "Línea 32 · identidad universal confirmada por el taller" },
  { catalogKey: "ventora:l35", nombre: "Línea 35 · Puerta abatible y vaivén", proveedor: null, configuracion: "Puerta abatible y vaivén", lineSystem: "AM-35", familyKey: "universal:aluminio:l35", familyLabel: "Línea 35 · Aluminio universal", identitySource: "Línea 35 · identidad universal confirmada por el taller" },
  { catalogKey: "ventora:serie-15-corredera-2h", nombre: "Línea 15 — Corredera 2 hojas", proveedor: null, configuracion: "Corredera 2 hojas", lineSystem: "Línea 15", familyKey: "universal:aluminio:l15", familyLabel: "Línea 15 · Aluminio universal", identitySource: "Línea 15 · identidad universal confirmada por el taller", cuttingGuideSource: "Despiece oficial Línea AL-15 corredera 2 hojas" },
  { catalogKey: "ventora:serie-4000-corredera-2h", nombre: "Línea 4000 — Corredera 2 hojas", proveedor: null, configuracion: "Corredera 2 hojas", lineSystem: "Línea 4000", familyKey: "universal:aluminio:l4000", familyLabel: "Línea 4000 · Aluminio universal", identitySource: "Línea 4000 · identidad universal confirmada por el taller", cuttingGuideSource: "Despiece oficial Línea 4000" },
  { catalogKey: "ventora:serie-45-puerta", nombre: "Línea 45 — Puerta", proveedor: null, configuracion: "Puerta abatible 1 hoja", lineSystem: "Línea 45", familyKey: "universal:aluminio:l45", familyLabel: "Línea 45 · Aluminio universal", identitySource: "Línea 45 · identidad universal confirmada por el taller", cuttingGuideSource: "Matriz Serie 45 practicable" },
  { catalogKey: "ventora:serie-12-shower-corredera", nombre: "Línea 12 — Shower Door", proveedor: null, configuracion: "Shower Door · Corredera 2 hojas", lineSystem: "Línea 12", familyKey: "universal:aluminio:l12", familyLabel: "Línea 12 · Aluminio universal", identitySource: "Línea 12 · identidad universal confirmada por el taller" },
  { catalogKey: "ventora:l42", nombre: "Línea 42", proveedor: null, configuracion: "Proyectante / paño fijo", lineSystem: "AL-42", familyKey: "universal:aluminio:l42", familyLabel: "Línea 42 · Aluminio universal", identitySource: "Línea 42 · identidad universal confirmada por el taller" },
];
const managedKeys = lineSpecs.map((line) => line.catalogKey);
const canonicalByKey = new Map(lineSpecs.map((line) => [line.catalogKey, line]));
const duplicateToCanonical = new Map([
  ["ventora:arquetipo-l15-corredera-2h", "ventora:serie-15-corredera-2h"],
  ["ventora:arquetipo-l20-corredera-2h", "ventora:l20"],
  ["ventora:arquetipo-l25-corredera-2h", "ventora:l25"],
  ["ventora:arquetipo-l32-proyectante", "ventora:l32"],
  ["ventora:arquetipo-l4000-corredera-2h", "ventora:serie-4000-corredera-2h"],
  ["ventora:arquetipo-l45-puerta", "ventora:serie-45-puerta"],
  ["ventora:arquetipo-l42-proyectante", "ventora:l42"],
]);
const allManagedKeys = [...managedKeys, ...duplicateToCanonical.keys()];

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

function managedMetadata(current: unknown, canonical: LineSpec) {
  const currentMetadata = current && typeof current === "object" && !Array.isArray(current) ? current as Row : {};
  const canonicalMetadata = {
    ...(canonical.familyKey ? { familyKey: canonical.familyKey } : {}),
    ...(canonical.familyLabel ? { familyLabel: canonical.familyLabel } : {}),
    ...(canonical.identitySource ? { identitySource: canonical.identitySource } : {}),
    ...(canonical.cuttingGuideSource ? { cuttingGuideSource: canonical.cuttingGuideSource } : {}),
  };
  const fields = ["familyKey", "familyLabel", "identitySource", "cuttingGuideSource"];
  const result: Row = { ...currentMetadata };
  for (const field of fields) {
    if (field in canonicalMetadata) result[field] = canonicalMetadata[field];
  }
  return result;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceKey, "Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  const host = new URL(url).hostname;
  assert(host === `${expectedProjectRef}.supabase.co`, "El destino no coincide con el proyecto de producción esperado.");
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const activeOrganizationIds: string[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await client.from("organizations").select("id").is("eliminado_en", null).range(from, from + 499);
    if (error) throw new Error(`Organizaciones activas: ${error.message}`);
    activeOrganizationIds.push(...(data ?? []).map((row) => String(row.id)));
    if ((data ?? []).length < 500) break;
  }
  const organizationIds: string[] = [];
  for (let offset = 0; offset < activeOrganizationIds.length; offset += 100) {
    const { data, error } = await client.from("organization_profile")
      .select("organization_id")
      .in("organization_id", activeOrganizationIds.slice(offset, offset + 100))
      .eq("country_code", "CL");
    if (error) throw new Error(`Perfiles de organización: ${error.message}`);
    organizationIds.push(...(data ?? []).map((row) => String(row.organization_id)));
  }
  const uniqueOrganizationIds = [...new Set(organizationIds)];
  const existingRows: Row[] = [];
  for (let offset = 0; offset < uniqueOrganizationIds.length; offset += 100) {
    const ids = uniqueOrganizationIds.slice(offset, offset + 100);
    const { data, error } = await client.from("cotizacion_line_templates")
      .select("id, organization_id, catalog_key, proveedor, catalog_metadata, sort_order, is_active, eliminado_en")
      .in("organization_id", ids)
      .in("catalog_key", allManagedKeys);
    if (error) throw new Error(`Líneas existentes: ${error.message}`);
    existingRows.push(...(data ?? []) as Row[]);
  }

  const activeRows = existingRows.filter((row) => row.eliminado_en == null);
  const updates: Array<{ row: Row; provider: string | null; metadata: Row; active?: boolean }> = [];
  const preservedCustomRowIds = new Set<string>();
  let preservedCustomProviders = 0;
  for (const row of activeRows) {
    const key = String(row.catalog_key);
    const canonicalAlias = duplicateToCanonical.get(key);
    if (canonicalAlias) {
      const metadata = {
        ...(row.catalog_metadata && typeof row.catalog_metadata === "object" ? row.catalog_metadata as Row : {}),
        universalCatalogAlias: true,
        universalCatalogKey: canonicalAlias,
        familyKey: `universal:aluminio:l${canonicalAlias.includes("4000") ? "4000" : canonicalAlias.match(/l(\d+)|serie-(\d+)/)?.[1] ?? canonicalAlias.match(/serie-(\d+)/)?.[1] ?? ""}`,
      };
      updates.push({ row, provider: null, metadata, active: false });
      continue;
    }
    const canonical = canonicalByKey.get(key);
    if (!canonical) continue;
    const desiredProvider = canonical.proveedor ?? null;
    const currentProvider = typeof row.proveedor === "string" && row.proveedor.trim() ? row.proveedor.trim() : null;
    const isKnownManagedProvider = currentProvider == null || ["Arquetipo", "Alumétrica", "SODAL", "Columbia", "Sodal / Indalum"].includes(currentProvider);
    if (!isKnownManagedProvider) {
      preservedCustomProviders += 1;
      preservedCustomRowIds.add(String(row.id));
      continue;
    }
    const metadata = managedMetadata(row.catalog_metadata, canonical);
    if (currentProvider !== desiredProvider || JSON.stringify(metadata) !== JSON.stringify(row.catalog_metadata ?? {})) {
      updates.push({ row, provider: desiredProvider, metadata });
    }
  }

  console.log(JSON.stringify({
    phase: applyRequested ? "preflight-apply" : "preflight-simulation",
    projectRef: expectedProjectRef,
    chileOrganizations: uniqueOrganizationIds.length,
    canonicalRowsToUpdate: updates.length,
    duplicateEntriesToArchive: updates.filter((item) => item.active === false).length,
    customProvidersPreserved: preservedCustomProviders,
    entriesBySupplier: { universal: true, identifiedAluminumSuppliers: 0 },
  }, null, 2));
  if (!applyRequested) return;

  for (const { row, provider, metadata, active } of updates) {
    const { error } = await client.from("cotizacion_line_templates")
      .update({ proveedor: provider, catalog_metadata: metadata, ...(active === undefined ? {} : { is_active: active }) })
      .eq("id", String(row.id))
      .eq("organization_id", String(row.organization_id))
      .eq("catalog_key", String(row.catalog_key))
      .is("eliminado_en", null);
    if (error) throw new Error(`Actualizar línea ${String(row.catalog_key)}: ${error.message}`);
  }
  const { data: verified, error: verifyError } = await client.from("cotizacion_line_templates")
    .select("id, organization_id, catalog_key, proveedor, catalog_metadata, is_active")
    .in("organization_id", uniqueOrganizationIds)
    .in("catalog_key", allManagedKeys)
    .is("eliminado_en", null);
  if (verifyError) throw new Error(`Verificación final del catálogo: ${verifyError.message}`);
  const verificationRows = (verified ?? []) as Row[];
  const wrongProviderCount = verificationRows.filter((row) => {
    const alias = duplicateToCanonical.has(String(row.catalog_key));
    const expected = canonicalByKey.get(String(row.catalog_key))?.proveedor ?? null;
    return !preservedCustomRowIds.has(String(row.id)) && (row.proveedor !== expected || alias && row.is_active !== false);
  }).length;
  assert(wrongProviderCount === 0, "La verificación encontró proveedores canónicos pendientes de sincronizar.");
  console.log(JSON.stringify({ phase: "catalogo-global-verificado", lineasLeidas: verificationRows.length, lineasActualizadas: updates.length, entradasDuplicadasArchivadas: updates.filter((item) => item.active === false).length, proveedoresCanonicosPendientes: wrongProviderCount }, null, 2));
}

main().catch((error: unknown) => {
  console.error(`ORGANIZACIÓN GLOBAL DE LÍNEAS ABORTADA: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
