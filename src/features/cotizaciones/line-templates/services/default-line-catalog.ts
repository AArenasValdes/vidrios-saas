import type { CreateCotizacionLineTemplateInput } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import {
  resolveDefaultLineCatalogSeedDecision,
  type SeedDefaultLineCatalogResult,
} from "@/features/cotizaciones/line-templates/services/line-catalog-country";
import { CATALOG_KEY_TO_ARQUETIPO } from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";

export {
  CHILE_DEFAULT_LINE_CATALOG_COUNTRY_CODE,
  auditNonChileOrganizationsWithVentoraCatalog,
  isChileOrganizationCountry,
  type NonChileVentoraCatalogAuditResult,
  type NonChileVentoraCatalogAuditRow,
  type SeedDefaultLineCatalogResult,
  type SeedDefaultLineCatalogStatus,
} from "@/features/cotizaciones/line-templates/services/line-catalog-country";

export const DEFAULT_PRICE_ROUNDING_CLP = 1000;

export type SeedLineTemplateDeps = {
  listAllTemplates: (
    organizationId: string | number
  ) => Promise<Array<{ catalog_key?: string | null }>>;
  insertTemplate: (payload: Record<string, unknown>) => Promise<void>;
};

export const VENTORA_LINE_CATALOG_KEY_PREFIX = "ventora:";

type VentoraDefaultLineDefinition = {
  catalogKey: string;
  nombre: string;
  material: "Aluminio" | "PVC";
  configuracion: string;
  proveedor: string | null;
  lineSystem: string | null;
  ventoraPlantillaId: string | null;
};

function buildVentoraDefaultLine(
  definition: VentoraDefaultLineDefinition
): Omit<CreateCotizacionLineTemplateInput, "organizationId"> {
  const workshopProfiles = getVentoraProfileReferencesForCatalogKey(
    definition.catalogKey
  );

  return {
    nombre: definition.nombre,
    material: definition.material,
    proveedor: definition.proveedor,
    catalogKey: definition.catalogKey,
    precioM2Sugerido: 0,
    minimoCobrable: 0,
    redondeoPrecio: DEFAULT_PRICE_ROUNDING_CLP,
    vidrioPrincipalRecomendado: null,
    catalogMetadata: {
      needsCommercialPrice: true,
      cubicationStatus: "pending",
      lineConfiguration: definition.configuracion,
      structuralArchetypeId: CATALOG_KEY_TO_ARQUETIPO[definition.catalogKey] ?? null,
      ...(definition.lineSystem ? { lineSystem: definition.lineSystem } : {}),
      ...(definition.ventoraPlantillaId
        ? { ventoraPlantillaId: definition.ventoraPlantillaId }
        : {}),
      ...(workshopProfiles ? { workshopProfiles } : {}),
    },
  };
}

function resolveMaterialCategory(
  material: CreateCotizacionLineTemplateInput["material"]
): "aluminio" | "pvc" {
  return material === "PVC" ? "pvc" : "aluminio";
}

function buildSeedRowPayload(
  organizationId: string | number,
  line: Omit<CreateCotizacionLineTemplateInput, "organizationId">,
  sortOrder: number
): Record<string, unknown> {
  const categoria = line.categoria ?? resolveMaterialCategory(line.material);

  return {
    organization_id: organizationId,
    nombre: line.nombre,
    categoria,
    unidad_cobro: line.unidadCobro ?? "m2",
    material: line.material,
    catalog_key: line.catalogKey ?? null,
    vidrio_principal_recomendado: line.vidrioPrincipalRecomendado ?? null,
    costo_base: line.costoBase ?? 0,
    precio_m2_sugerido: line.precioM2Sugerido,
    minimo_cobrable: line.minimoCobrable ?? 0,
    redondeo_precio: line.redondeoPrecio ?? DEFAULT_PRICE_ROUNDING_CLP,
    merma_pct: line.mermaPct ?? 0,
    margen_objetivo_pct: line.margenObjetivoPct ?? null,
    proveedor: line.proveedor ?? null,
    vigencia_desde: line.vigenciaDesde ?? null,
    vigencia_hasta: line.vigenciaHasta ?? null,
    catalog_metadata: line.catalogMetadata ?? { needsCommercialPrice: true },
    is_active: line.isActive ?? true,
    sort_order: sortOrder,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export type SeedDefaultLineCatalogOptions = {
  countryCode?: string | null;
};

/**
 * Inserta solo las líneas canónicas Ventora ausentes en la organización.
 * Solo aplica para country_code CL. Idempotente: no sobrescribe precios,
 * vidrio habitual ni líneas privadas.
 */
export async function seedDefaultLineCatalog(
  organizationId: string | number,
  deps: SeedLineTemplateDeps,
  options?: SeedDefaultLineCatalogOptions
): Promise<SeedDefaultLineCatalogResult> {
  const decision = resolveDefaultLineCatalogSeedDecision(options?.countryCode);

  if (!decision.shouldSeed) {
    if (decision.status === "blocked_missing_country") {
      console.warn(
        "[seedDefaultLineCatalog] seed bloqueado: complete el país de la organización antes de sembrar el catálogo base de Chile",
        { organizationId }
      );
    }

    return {
      seeded: 0,
      skipped: 0,
      status: decision.status ?? "blocked_non_chile",
    };
  }

  const existing = await deps.listAllTemplates(organizationId);
  const toInsert = getMissingVentoraCatalogLines(existing.map((row) => row.catalog_key));

  let seeded = 0;
  let skipped = VENTORA_DEFAULT_LINE_CATALOG.length - toInsert.length;
  const baseSortOrder = existing.length;

  for (let index = 0; index < toInsert.length; index += 1) {
    const line = toInsert[index];
    if (!line) continue;

    const payload = buildSeedRowPayload(organizationId, line, baseSortOrder + index);

    try {
      await deps.insertTemplate(payload);
      seeded += 1;
    } catch (error) {
      if (isUniqueViolation(error)) {
        skipped += 1;
        continue;
      }

      console.warn("[seedDefaultLineCatalog] insert failed", line.catalogKey, error);
      skipped += 1;
    }
  }

  return { seeded, skipped, status: "completed" };
}

const VENTORA_DEFAULT_LINE_DEFINITIONS: VentoraDefaultLineDefinition[] = [
  {
    catalogKey: "ventora:l5000",
    nombre: "Serie 5000",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: "L5000",
    ventoraPlantillaId: "L5000",
  },
  {
    catalogKey: "ventora:l20",
    nombre: "Serie 20",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: "L20",
    ventoraPlantillaId: "L20",
  },
  {
    catalogKey: "ventora:l25",
    nombre: "Serie 25",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: "L25",
    ventoraPlantillaId: "L25",
  },
  {
    catalogKey: "ventora:l32",
    nombre: "Serie 32",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: "L32",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:l35",
    nombre: "AM-35 · Puerta abatible y vaivén",
    material: "Aluminio",
    configuracion: "Puerta abatible y vaivén",
    proveedor: null,
    lineSystem: "AM-35",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:l42",
    nombre: "Serie 42",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: "L42",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:serie-4800-corredera-2h",
    nombre: "Serie 4800 — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:optima-s28-corredera-2h",
    nombre: "Óptima S-28 — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:optima-s28-corredera-3h",
    nombre: "Óptima S-28 — Corredera 3 hojas",
    material: "Aluminio",
    configuracion: "Corredera 3 hojas",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:s33-corredera-2h",
    nombre: "S-33 — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:s33-rpt-corredera-2h",
    nombre: "S-33 RPT — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:serie-42-proyectante-camara",
    nombre: "Serie 42 — Proyectante con cámara",
    material: "Aluminio",
    configuracion: "Proyectante con cámara",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:serie-42-proyectante-sin-camara",
    nombre: "Serie 42 — Proyectante sin cámara",
    material: "Aluminio",
    configuracion: "Proyectante sin cámara",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:s38-proyectante",
    nombre: "S-38 — Proyectante",
    material: "Aluminio",
    configuracion: "Proyectante",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:s38-rpt-proyectante",
    nombre: "S-38 RPT — Proyectante",
    material: "Aluminio",
    configuracion: "Proyectante",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:multislide-s83-4h",
    nombre: "MultiSlide S-83 — 4 hojas",
    material: "Aluminio",
    configuracion: "4 hojas",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:multislide-s83-8h",
    nombre: "MultiSlide S-83 — 8 hojas",
    material: "Aluminio",
    configuracion: "8 hojas",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:serie-3200-puerta-abatible-1h",
    nombre: "Serie 3200 — Puerta abatible 1 hoja",
    material: "Aluminio",
    configuracion: "Puerta abatible 1 hoja",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:serie-4600-puerta-vaiven",
    nombre: "Serie 4600 — Puerta vaivén",
    material: "Aluminio",
    configuracion: "Puerta vaivén",
    proveedor: null,
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-new-s75-doble-riel",
    nombre: "WinHouse New S75 — Doble riel",
    material: "PVC",
    configuracion: "Doble riel",
    proveedor: "WinHouse",
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-new-s75-triple-riel",
    nombre: "WinHouse New S75 — Triple riel",
    material: "PVC",
    configuracion: "Triple riel",
    proveedor: "WinHouse",
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-s60",
    nombre: "WinHouse S60",
    material: "PVC",
    configuracion: "S60",
    proveedor: "WinHouse",
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-andes-doble-riel",
    nombre: "WinHouse Andes — Doble riel",
    material: "PVC",
    configuracion: "Doble riel",
    proveedor: "WinHouse",
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-andes-monorriel",
    nombre: "WinHouse Andes Monorriel",
    material: "PVC",
    configuracion: "Monorriel",
    proveedor: "WinHouse",
    lineSystem: null,
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-andes-proyectante",
    nombre: "WinHouse Andes — Proyectante",
    material: "PVC",
    configuracion: "Proyectante",
    proveedor: "WinHouse",
    lineSystem: null,
    ventoraPlantillaId: null,
  },
];

export const VENTORA_DEFAULT_LINE_CATALOG: Array<
  Omit<CreateCotizacionLineTemplateInput, "organizationId">
> = VENTORA_DEFAULT_LINE_DEFINITIONS.map(buildVentoraDefaultLine);

/** Alias explícito: catálogo predeterminado sembrado solo para organizaciones CL. */
export const CHILE_DEFAULT_LINE_CATALOG = VENTORA_DEFAULT_LINE_CATALOG;

export function isVentoraCatalogKey(catalogKey: string | null | undefined): boolean {
  return Boolean(catalogKey?.startsWith(VENTORA_LINE_CATALOG_KEY_PREFIX));
}

export function getMissingVentoraCatalogKeys(
  existingCatalogKeys: Array<string | null | undefined>
): string[] {
  const present = new Set(
    existingCatalogKeys.filter((key): key is string => Boolean(key?.trim()))
  );
  return VENTORA_DEFAULT_LINE_CATALOG.flatMap((line) => {
    const key = line.catalogKey?.trim();
    if (!key || present.has(key)) return [];
    return [key];
  });
}

export function getMissingVentoraCatalogLines(
  existingCatalogKeys: Array<string | null | undefined>
): Array<Omit<CreateCotizacionLineTemplateInput, "organizationId">> {
  const missing = new Set(getMissingVentoraCatalogKeys(existingCatalogKeys));
  return VENTORA_DEFAULT_LINE_CATALOG.filter((line) => {
    const key = line.catalogKey?.trim();
    return Boolean(key && missing.has(key));
  });
}
