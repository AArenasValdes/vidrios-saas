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
  { catalogKey: "ventora:l5000", nombre: "Serie 5000", proveedor: "Arquetipo", configuracion: "Corredera 2 hojas", lineSystem: "L5000", familyKey: "arquetipo:l5000", familyLabel: "Arquetipo · Línea 5000", identitySource: "Arquetipo · Catálogo de perfiles Línea 5000" },
  { catalogKey: "ventora:l20", nombre: "Serie 20", proveedor: null, configuracion: "Corredera 2 hojas", lineSystem: "L20", identitySource: "Alumétrica · Línea 20" },
  { catalogKey: "ventora:l20-fijos", nombre: "Serie 20 — Fijos", proveedor: null, configuracion: "Fijos 2 hojas", lineSystem: "L20", identitySource: "Alumétrica · Línea 20 · paños fijos" },
  { catalogKey: "ventora:l25", nombre: "Serie 25", proveedor: "SODAL", configuracion: "Corredera 2 hojas", lineSystem: "L25", identitySource: "SODAL · Línea 25" },
  { catalogKey: "ventora:l32", nombre: "AL-32", proveedor: "SODAL", configuracion: "Proyectante", lineSystem: "AL-32", identitySource: "SODAL · AL-32 proyectante" },
  { catalogKey: "ventora:l35", nombre: "AM-35 · Puerta abatible y vaivén", proveedor: "Arquetipo", configuracion: "Puerta abatible y vaivén", lineSystem: "AM-35", familyKey: "arquetipo:l35", familyLabel: "Arquetipo · Línea 35", identitySource: "Arquetipo · Catálogo de perfiles Línea 35" },
  { catalogKey: "ventora:serie-15-corredera-2h", nombre: "Línea 15 — Corredera 2 hojas", proveedor: null, configuracion: "Corredera 2 hojas", lineSystem: "Línea 15", identitySource: "Línea 15 corredera · identidad de receta Ventora no asociada al catálogo de compra Arquetipo", cuttingGuideSource: "Despiece oficial Línea AL-15 corredera 2 hojas" },
  { catalogKey: "ventora:serie-4000-corredera-2h", nombre: "Línea 4000 — Corredera 2 hojas", proveedor: null, configuracion: "Corredera 2 hojas", lineSystem: "Línea 4000", identitySource: "Columbia · Línea 4000 corredera 2 hojas", cuttingGuideSource: "Despiece oficial Línea 4000 Columbia corredera 2 hojas" },
  { catalogKey: "ventora:serie-45-puerta", nombre: "Línea 45 — Puerta", proveedor: "Sodal / Indalum", configuracion: "Puerta abatible 1 hoja", lineSystem: "Línea 45", identitySource: "Sodal / Indalum · Serie 45 practicable", cuttingGuideSource: "Matrices de extrusión Serie 45 practicable" },
  { catalogKey: "ventora:serie-12-shower-corredera", nombre: "Línea 12 — Shower Door", proveedor: "Arquetipo", configuracion: "Shower Door · Corredera 2 hojas", lineSystem: "Línea 12", familyKey: "arquetipo:l12", familyLabel: "Arquetipo · Línea 12", identitySource: "Arquetipo · Catálogo Línea 12" },
  { catalogKey: "ventora:l42", nombre: "AL-42", proveedor: "SODAL", configuracion: "AL-42 normal · Proyectante / paño fijo", lineSystem: "AL-42", identitySource: "SODAL · AL-42 proyectante" },
  { catalogKey: "ventora:arquetipo-l15-corredera-2h", nombre: "Arquetipo · Línea 15 — Corredera 2 hojas", proveedor: "Arquetipo", configuracion: "Corredera 2 hojas", lineSystem: "Línea 15", familyKey: "arquetipo:l15", familyLabel: "Arquetipo · Línea 15" },
  { catalogKey: "ventora:arquetipo-l20-corredera-2h", nombre: "Arquetipo · Línea 20 — Corredera 2 hojas", proveedor: "Arquetipo", configuracion: "Corredera 2 hojas", lineSystem: "Línea 20", familyKey: "arquetipo:l20", familyLabel: "Arquetipo · Línea 20" },
  { catalogKey: "ventora:arquetipo-l25-corredera-2h", nombre: "Arquetipo · Línea 25 — Corredera 2 hojas", proveedor: "Arquetipo", configuracion: "Corredera 2 hojas", lineSystem: "Línea 25", familyKey: "arquetipo:l25", familyLabel: "Arquetipo · Línea 25" },
  { catalogKey: "ventora:arquetipo-l32-proyectante", nombre: "Arquetipo · Línea 32 — Proyectante y paño fijo", proveedor: "Arquetipo", configuracion: "Proyectante / paño fijo", lineSystem: "Línea 32", familyKey: "arquetipo:l32", familyLabel: "Arquetipo · Línea 32" },
  { catalogKey: "ventora:arquetipo-l4000-corredera-2h", nombre: "Arquetipo · Línea 4000 — Corredera 2 hojas", proveedor: "Arquetipo", configuracion: "Corredera 2 hojas", lineSystem: "Línea 4000", familyKey: "arquetipo:l4000", familyLabel: "Arquetipo · Línea 4000" },
  { catalogKey: "ventora:arquetipo-l45-puerta", nombre: "Arquetipo · Línea 45 — Puerta abatible", proveedor: "Arquetipo", configuracion: "Puerta abatible 1 hoja", lineSystem: "Línea 45", familyKey: "arquetipo:l45", familyLabel: "Arquetipo · Línea 45" },
  { catalogKey: "ventora:arquetipo-l42-proyectante", nombre: "Arquetipo · Línea 42 — Proyectante y paño fijo", proveedor: "Arquetipo", configuracion: "Proyectante / paño fijo", lineSystem: "Línea 42", familyKey: "arquetipo:l42", familyLabel: "Arquetipo · Línea 42" },
];
const managedKeys = lineSpecs.map((line) => line.catalogKey);
const canonicalByKey = new Map(lineSpecs.map((line) => [line.catalogKey, line]));
const newKeys = new Set([
  "ventora:arquetipo-l15-corredera-2h", "ventora:arquetipo-l20-corredera-2h",
  "ventora:arquetipo-l25-corredera-2h", "ventora:arquetipo-l32-proyectante",
  "ventora:arquetipo-l4000-corredera-2h", "ventora:arquetipo-l45-puerta",
  "ventora:arquetipo-l42-proyectante",
]);

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
      .select("id, organization_id, catalog_key, proveedor, catalog_metadata, sort_order, eliminado_en")
      .in("organization_id", ids)
      .in("catalog_key", managedKeys);
    if (error) throw new Error(`Líneas existentes: ${error.message}`);
    existingRows.push(...(data ?? []) as Row[]);
  }

  const activeRows = existingRows.filter((row) => row.eliminado_en == null);
  const activeByOrgKey = new Map(activeRows.map((row) => [`${String(row.organization_id)}|${String(row.catalog_key)}`, row]));
  const updates: Array<{ row: Row; provider: string | null; metadata: Row }> = [];
  const inserts: Array<{ organizationId: string; catalogKey: string; payload: Row }> = [];
  const preservedCustomRowIds = new Set<string>();
  let preservedCustomProviders = 0;
  for (const row of activeRows) {
    const key = String(row.catalog_key);
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

  for (const organizationId of uniqueOrganizationIds) {
    for (const catalogKey of newKeys) {
      const active = activeByOrgKey.has(`${organizationId}|${catalogKey}`);
      const historical = existingRows.some((row) => String(row.organization_id) === organizationId && String(row.catalog_key) === catalogKey);
      if (active || historical) continue;
      const canonical = canonicalByKey.get(catalogKey);
      if (!canonical) continue;
      const orgRows = activeRows.filter((row) => String(row.organization_id) === organizationId);
      const maxSortOrder = orgRows.reduce((max, row) => Math.max(max, Number(row.sort_order) || 0), 0);
      const catalogMetadata = {
        needsCommercialPrice: true,
        cubicationStatus: "pending",
        lineFamilyType: "traditional",
        lineSourceModel: "multiprovider",
        lineConfiguration: canonical.configuracion,
        ...(canonical.familyKey ? { familyKey: canonical.familyKey } : {}),
        ...(canonical.familyLabel ? { familyLabel: canonical.familyLabel } : {}),
        configurationLabel: canonical.configuracion,
        structuralArchetypeId: null,
        lineSystem: canonical.lineSystem,
        ...(canonical.identitySource ? { identitySource: canonical.identitySource } : {}),
      };
      inserts.push({
        organizationId,
        catalogKey,
        payload: {
          organization_id: organizationId,
          nombre: canonical.nombre,
          categoria: "aluminio",
          unidad_cobro: "m2",
          material: "Aluminio",
          catalog_key: canonical.catalogKey,
          vidrio_principal_recomendado: null,
          costo_base: 0,
          precio_m2_sugerido: 0,
          minimo_cobrable: 0,
          redondeo_precio: 1000,
          merma_pct: 0,
          margen_objetivo_pct: null,
          proveedor: canonical.proveedor ?? null,
          vigencia_desde: null,
          vigencia_hasta: null,
          catalog_metadata: catalogMetadata,
          is_active: true,
          sort_order: maxSortOrder + inserts.filter((item) => item.organizationId === organizationId).length + 1,
        },
      });
    }
  }

  console.log(JSON.stringify({
    phase: applyRequested ? "preflight-apply" : "preflight-simulation",
    projectRef: expectedProjectRef,
    chileOrganizations: uniqueOrganizationIds.length,
    canonicalRowsToUpdate: updates.length,
    arquetipoEntriesToInsert: inserts.length,
    customProvidersPreserved: preservedCustomProviders,
    entriesBySupplier: { arquetipoNew: inserts.length, identifiedAluminumSuppliers: updates.filter((item) => ["SODAL", "Sodal / Indalum"].includes(item.provider ?? "")).length },
  }, null, 2));
  if (!applyRequested) return;

  for (const { row, provider, metadata } of updates) {
    const { error } = await client.from("cotizacion_line_templates")
      .update({ proveedor: provider, catalog_metadata: metadata })
      .eq("id", String(row.id))
      .eq("organization_id", String(row.organization_id))
      .eq("catalog_key", String(row.catalog_key))
      .is("eliminado_en", null);
    if (error) throw new Error(`Actualizar línea ${String(row.catalog_key)}: ${error.message}`);
  }
  for (let offset = 0; offset < inserts.length; offset += 100) {
    const batch = inserts.slice(offset, offset + 100).map((item) => item.payload);
    const { error } = await client.from("cotizacion_line_templates").insert(batch);
    if (error) throw new Error(`Insertar familias Arquetipo: ${error.message}`);
  }

  const { data: verified, error: verifyError } = await client.from("cotizacion_line_templates")
    .select("id, organization_id, catalog_key, proveedor, catalog_metadata")
    .in("organization_id", uniqueOrganizationIds)
    .in("catalog_key", managedKeys)
    .is("eliminado_en", null);
  if (verifyError) throw new Error(`Verificación final del catálogo: ${verifyError.message}`);
  const verificationRows = (verified ?? []) as Row[];
  const wrongProviderCount = verificationRows.filter((row) => {
    const expected = canonicalByKey.get(String(row.catalog_key))?.proveedor ?? null;
    return !preservedCustomRowIds.has(String(row.id)) && row.proveedor !== expected;
  }).length;
  assert(wrongProviderCount === 0, "La verificación encontró proveedores canónicos pendientes de sincronizar.");
  console.log(JSON.stringify({ phase: "catalogo-global-verificado", lineasActivasLeidas: verificationRows.length, lineasActualizadas: updates.length, entradasArquetipoCreadas: inserts.length, proveedoresCanonicosPendientes: wrongProviderCount }, null, 2));
}

main().catch((error: unknown) => {
  console.error(`ORGANIZACIÓN GLOBAL DE LÍNEAS ABORTADA: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
