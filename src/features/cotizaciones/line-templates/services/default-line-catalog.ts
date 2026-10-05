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
  ) => Promise<Array<{ catalog_key?: string | null; vidrio_principal_recomendado?: string | null }>>;
  insertTemplate: (payload: Record<string, unknown>) => Promise<void>;
  setRecommendedGlassIfEmpty?: (
    organizationId: string | number,
    catalogKey: string,
    glass: string
  ) => Promise<void>;
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
  lineFamilyType?: "traditional" | "manufacturer_specific";
  lineSourceModel?: "multiprovider" | "manufacturer_specific";
  familyKey?: string;
  familyLabel?: string;
  configurationKey?: string;
  configurationLabel?: string;
  compatibility?: {
    componentTypes?: string[];
    openingTypes?: string[];
    leavesCounts?: number[];
    materials?: string[];
  };
  identitySource?: string;
  cuttingGuideSource?: string;
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
    vidrioPrincipalRecomendado:
      definition.catalogKey === "ventora:serie-3200-puerta-abatible-1h" ||
      definition.catalogKey === "ventora:l42" ||
      definition.catalogKey === "ventora:serie-42-proyectante-camara" ||
      definition.catalogKey === "ventora:serie-42-proyectante-sin-camara" ||
      definition.catalogKey === "ventora:s33-corredera-2h" ||
      definition.catalogKey === "ventora:s33-rpt-corredera-2h" ||
      definition.catalogKey === "ventora:serie-15-corredera-2h" ||
      definition.catalogKey === "ventora:serie-4000-corredera-2h" ||
      definition.catalogKey === "ventora:serie-4800-corredera-2h" ||
      definition.familyKey === "veratec:sliding-7400" ||
      definition.catalogKey === "ventora:winhouse-s60" ||
      definition.catalogKey === "ventora:winhouse-new-s75-doble-riel" ||
      definition.catalogKey === "ventora:winhouse-new-s75-triple-riel"
        ? definition.catalogKey === "ventora:s33-rpt-corredera-2h"
          ? "DVH 4+12+4"
          : definition.catalogKey.startsWith("ventora:winhouse-new-s75-")
            ? "DVH 4+10+5"
            : "Incoloro monolítico 4mm"
        : null,
    catalogMetadata: {
      needsCommercialPrice: true,
      cubicationStatus: "pending",
      lineFamilyType: definition.lineFamilyType ?? "manufacturer_specific",
      lineSourceModel: definition.lineSourceModel ?? "manufacturer_specific",
      ...(definition.identitySource ? { identitySource: definition.identitySource } : {}),
      ...(definition.cuttingGuideSource
        ? { cuttingGuideSource: definition.cuttingGuideSource }
        : {}),
      lineConfiguration: definition.configuracion,
      ...(definition.familyKey ? { familyKey: definition.familyKey } : {}),
      ...(definition.familyLabel ? { familyLabel: definition.familyLabel } : {}),
      ...(definition.configurationKey ? { configurationKey: definition.configurationKey } : {}),
      configurationLabel: definition.configurationLabel ?? definition.configuracion,
      ...(definition.compatibility ? { compatibility: definition.compatibility } : {}),
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
  const existingByKey = new Map(
    existing
      .filter((row): row is { catalog_key: string; vidrio_principal_recomendado?: string | null } => Boolean(row.catalog_key))
      .map((row) => [row.catalog_key, row])
  );
  const s60 = VENTORA_DEFAULT_LINE_CATALOG.find(
    (line) => line.catalogKey === "ventora:winhouse-s60"
  );
  const recommendedS60Glass = s60?.vidrioPrincipalRecomendado;
  const existingS60 = existingByKey.get("ventora:winhouse-s60");
  if (
    deps.setRecommendedGlassIfEmpty &&
    s60 &&
    recommendedS60Glass &&
    existingS60 &&
    !existingS60.vidrio_principal_recomendado?.trim()
  ) {
    try {
      await deps.setRecommendedGlassIfEmpty(
        organizationId,
        "ventora:winhouse-s60",
        recommendedS60Glass
      );
    } catch (error) {
      console.warn(
        "[seedDefaultLineCatalog] no se pudo completar el vidrio recomendado S60",
        { organizationId },
        error
      );
    }
  }
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
    catalogKey: "ventora:l20-fijos",
    nombre: "Serie 20 — Fijos",
    material: "Aluminio",
    configuracion: "Fijos 2 hojas",
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
    nombre: "AL-32",
    material: "Aluminio",
    configuracion: "Proyectante",
    proveedor: null,
    lineSystem: "AL-32",
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
    lineFamilyType: "traditional",
    lineSourceModel: "multiprovider",
  },
  {
    catalogKey: "ventora:serie-15-corredera-2h",
    nombre: "Línea 15 — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: "Línea 15",
    ventoraPlantillaId: null,
    lineFamilyType: "traditional",
    lineSourceModel: "multiprovider",
    identitySource: "Arquetipo · Catálogo Línea 15",
    cuttingGuideSource: "Despiece oficial Línea AL-15 corredera 2 hojas",
  },
  {
    catalogKey: "ventora:serie-4000-corredera-2h",
    nombre: "Línea 4000 — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: "Línea 4000",
    ventoraPlantillaId: null,
    lineFamilyType: "traditional",
    lineSourceModel: "multiprovider",
    identitySource: "Columbia · Línea 4000 corredera 2 hojas",
    cuttingGuideSource: "Despiece oficial Línea 4000 Columbia corredera 2 hojas",
  },
  {
    catalogKey: "ventora:serie-45-puerta",
    nombre: "Línea 45 — Puerta",
    material: "Aluminio",
    configuracion: "Puerta abatible 1 hoja",
    proveedor: null,
    lineSystem: "Línea 45",
    ventoraPlantillaId: null,
    lineFamilyType: "traditional",
    lineSourceModel: "multiprovider",
    identitySource: "Sodal / Indalum · Serie 45 practicable",
    cuttingGuideSource: "Matrices de extrusión Serie 45 practicable",
  },
  {
    catalogKey: "ventora:serie-12-shower-corredera",
    nombre: "Línea 12 — Shower Door",
    material: "Aluminio",
    configuracion: "Shower Door · Corredera 2 hojas",
    proveedor: null,
    lineSystem: "Línea 12",
    ventoraPlantillaId: null,
    lineFamilyType: "traditional",
    lineSourceModel: "multiprovider",
    identitySource: "Arquetipo · Catálogo Línea 12",
  },
  {
    catalogKey: "ventora:l42",
    nombre: "AL-42",
    material: "Aluminio",
    configuracion: "AL-42 normal · Proyectante / paño fijo",
    proveedor: null,
    lineSystem: "AL-42",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:serie-4800-corredera-2h",
    nombre: "Serie 4800 — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: "SODAL",
    lineSystem: "Serie 4800",
    ventoraPlantillaId: null,
    identitySource: "SODAL Diamond · Serie 4800 corredera 2 hojas",
  },
  {
    catalogKey: "ventora:veratec-7400-corredera",
    nombre: "Veratec 7400 — Corredera 2 hojas",
    material: "PVC",
    configuracion: "Corredera Sliding 7400 · 2 hojas",
    proveedor: "VERATEC",
    lineSystem: "7400",
    ventoraPlantillaId: null,
    familyKey: "veratec:sliding-7400",
    familyLabel: "Sliding 7400",
    configurationKey: "sliding-7400:corredera-2h",
    configurationLabel: "Corredera · 2 hojas",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Corredera"], leavesCounts: [2], materials: ["PVC"] },
    identitySource: "VERATEC · Catálogo Alumétrica · Línea 7400 PVC",
    cuttingGuideSource:
      "Alumétrica · Veratec 7400 corredera 2 hojas · pauta de corte visible",
  },
  {
    catalogKey: "ventora:veratec-7400-corredera-3h",
    nombre: "Veratec 7400 — Corredera 3 hojas",
    material: "PVC",
    configuracion: "Corredera Sliding 7400 · 3 hojas",
    proveedor: "VERATEC",
    lineSystem: "7400",
    ventoraPlantillaId: null,
    familyKey: "veratec:sliding-7400",
    familyLabel: "Sliding 7400",
    configurationKey: "sliding-7400:corredera-3h",
    configurationLabel: "Corredera · 3 hojas",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Corredera"], leavesCounts: [3], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Sliding 7400",
  },
  {
    catalogKey: "ventora:veratec-7400-monorriel",
    nombre: "Veratec 7400 — Corredera monorriel",
    material: "PVC",
    configuracion: "Corredera Sliding 7400 · Monorriel",
    proveedor: "VERATEC",
    lineSystem: "7400",
    ventoraPlantillaId: null,
    familyKey: "veratec:sliding-7400",
    familyLabel: "Sliding 7400",
    configurationKey: "sliding-7400:monorriel",
    configurationLabel: "Corredera · monorriel",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Corredera"], materials: ["PVC"] },
    identitySource: "Xelena · Díptico y lista de precios junio 2026 · Sliding 7400",
  },
  {
    catalogKey: "ventora:veratec-elegans-60-ventana-hoja-exterior",
    nombre: "Ventana · hoja exterior",
    material: "PVC",
    configuracion: "Elegans 60 · Ventana abatible · hoja exterior",
    proveedor: "VERATEC",
    lineSystem: "Elegans 60",
    ventoraPlantillaId: null,
    familyKey: "veratec:elegans-60",
    familyLabel: "Elegans 60",
    configurationKey: "elegans-60:ventana-hoja-exterior",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Abatible"], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Elegans 60",
  },
  {
    catalogKey: "ventora:veratec-elegans-60-ventana-hoja-interior",
    nombre: "Ventana · hoja interior",
    material: "PVC",
    configuracion: "Elegans 60 · Ventana abatible · hoja interior",
    proveedor: "VERATEC",
    lineSystem: "Elegans 60",
    ventoraPlantillaId: null,
    familyKey: "veratec:elegans-60",
    familyLabel: "Elegans 60",
    configurationKey: "elegans-60:ventana-hoja-interior",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Abatible"], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Elegans 60",
  },
  {
    catalogKey: "ventora:veratec-elegans-60-puerta-hoja-exterior",
    nombre: "Puerta · hoja exterior",
    material: "PVC",
    configuracion: "Elegans 60 · Puerta abatible · hoja exterior",
    proveedor: "VERATEC",
    lineSystem: "Elegans 60",
    ventoraPlantillaId: null,
    familyKey: "veratec:elegans-60",
    familyLabel: "Elegans 60",
    configurationKey: "elegans-60:puerta-hoja-exterior",
    compatibility: { componentTypes: ["Puerta"], openingTypes: ["Abatible"], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Elegans 60",
  },
  {
    catalogKey: "ventora:veratec-elegans-60-puerta-hoja-interior",
    nombre: "Puerta · hoja interior",
    material: "PVC",
    configuracion: "Elegans 60 · Puerta abatible · hoja interior",
    proveedor: "VERATEC",
    lineSystem: "Elegans 60",
    ventoraPlantillaId: null,
    familyKey: "veratec:elegans-60",
    familyLabel: "Elegans 60",
    configurationKey: "elegans-60:puerta-hoja-interior",
    compatibility: { componentTypes: ["Puerta"], openingTypes: ["Abatible"], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Elegans 60",
  },
  {
    catalogKey: "ventora:veratec-elegans-60-fijo",
    nombre: "Paño fijo",
    material: "PVC",
    configuracion: "Elegans 60 · Paño fijo",
    proveedor: "VERATEC",
    lineSystem: "Elegans 60",
    ventoraPlantillaId: null,
    familyKey: "veratec:elegans-60",
    familyLabel: "Elegans 60",
    configurationKey: "elegans-60:pano-fijo",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Fijo"], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Elegans 60",
  },
  {
    catalogKey: "ventora:veratec-compact-sliding-2h",
    nombre: "Compact Sliding · 2 hojas",
    material: "PVC",
    configuracion: "Compact Sliding · Corredera · 2 hojas",
    proveedor: "VERATEC",
    lineSystem: "Compact Sliding",
    ventoraPlantillaId: null,
    familyKey: "veratec:compact-sliding",
    familyLabel: "Compact Sliding",
    configurationKey: "compact-sliding:corredera-2h",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Corredera"], leavesCounts: [2], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Compact Sliding",
  },
  {
    catalogKey: "ventora:veratec-compact-sliding-3h",
    nombre: "Compact Sliding · 3 hojas",
    material: "PVC",
    configuracion: "Compact Sliding · Corredera · 3 hojas",
    proveedor: "VERATEC",
    lineSystem: "Compact Sliding",
    ventoraPlantillaId: null,
    familyKey: "veratec:compact-sliding",
    familyLabel: "Compact Sliding",
    configurationKey: "compact-sliding:corredera-3h",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Corredera"], leavesCounts: [3], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Compact Sliding",
  },
  {
    catalogKey: "ventora:veratec-compact-sliding-4h",
    nombre: "Compact Sliding · 4 hojas",
    material: "PVC",
    configuracion: "Compact Sliding · Corredera · 4 hojas",
    proveedor: "VERATEC",
    lineSystem: "Compact Sliding",
    ventoraPlantillaId: null,
    familyKey: "veratec:compact-sliding",
    familyLabel: "Compact Sliding",
    configurationKey: "compact-sliding:corredera-4h",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Corredera"], leavesCounts: [4], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Compact Sliding",
  },
  {
    catalogKey: "ventora:veratec-inova-corredera-2h",
    nombre: "Inova · Corredera representada",
    material: "PVC",
    configuracion: "Inova · Esquema de corredera del díptico",
    proveedor: "VERATEC",
    lineSystem: "Inova",
    ventoraPlantillaId: null,
    familyKey: "veratec:inova",
    familyLabel: "Inova",
    configurationKey: "inova:corredera-representada",
    configurationLabel: "Corredera · esquema del folleto",
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Corredera"], leavesCounts: [2], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Inova",
  },
  ...[
    ["2h-1fijo-1movil", "2 paños · 1 fijo + 1 móvil", 2],
    ["2h-2moviles", "2 paños · 2 móviles", 2],
    ["3h-2fijos-1movil", "3 paños · 2 fijos + 1 móvil", 3],
    ["3h-1fijo-2moviles", "3 paños · 1 fijo + 2 móviles", 3],
    ["4h-4moviles", "4 paños · 4 móviles", 4],
    ["4h-2fijos-2moviles", "4 paños · 2 fijos + 2 móviles", 4],
  ].map(([configurationKey, label, leavesCount]) => ({
    catalogKey: `ventora:veratec-elevadora-${configurationKey}`,
    nombre: `Elevadora · ${label}`,
    material: "PVC" as const,
    configuracion: `Elevadora · ${label}`,
    proveedor: "VERATEC",
    lineSystem: "Elevadora",
    ventoraPlantillaId: null,
    familyKey: "veratec:elevadora",
    familyLabel: "Elevadora",
    configurationKey: `elevadora:${configurationKey}`,
    compatibility: { componentTypes: ["Ventana"], openingTypes: ["Corredera"], leavesCounts: [leavesCount as number], materials: ["PVC"] },
    identitySource: "Xelena · Díptico de líneas PVC · Elevadora",
  })),
  {
    catalogKey: "ventora:veratec-eko-130",
    nombre: "EKO 130",
    material: "PVC",
    configuracion: "Catálogo comercial EKO 130",
    proveedor: "VERATEC",
    lineSystem: "EKO 130",
    ventoraPlantillaId: null,
    familyKey: "veratec:eko-130",
    familyLabel: "EKO 130",
    configurationKey: "eko-130:familia-comercial",
    identitySource: "Xelena · Díptico de líneas PVC · EKO 130",
  },
  {
    catalogKey: "ventora:veratec-eko-82",
    nombre: "EKO 82",
    material: "PVC",
    configuracion: "Catálogo comercial EKO 82",
    proveedor: "VERATEC",
    lineSystem: "EKO 82",
    ventoraPlantillaId: null,
    familyKey: "veratec:eko-82",
    familyLabel: "EKO 82",
    configurationKey: "eko-82:familia-comercial",
    identitySource: "Xelena · Díptico de líneas PVC · EKO 82",
  },
  {
    catalogKey: "ventora:optima-s28-corredera-2h",
    nombre: "Óptima S-28 — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "Corredera 2 hojas",
    proveedor: null,
    lineSystem: "S-28",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:optima-s28-corredera-3h",
    nombre: "Óptima S-28 — Corredera 3 hojas",
    material: "Aluminio",
    configuracion: "Corredera 3 hojas",
    proveedor: null,
    lineSystem: "S-28",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:s33-corredera-2h",
    nombre: "S-33 — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "S-33 Normal / Reforzada / TP · Corredera 2 hojas",
    proveedor: null,
    lineSystem: "S-33",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:s33-rpt-corredera-2h",
    nombre: "S-33 RPT — Corredera 2 hojas",
    material: "Aluminio",
    configuracion: "S-33 RPT · Corredera 2 hojas",
    proveedor: null,
    lineSystem: "S-33",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:serie-42-proyectante-camara",
    nombre: "Serie 42 — Proyectante con cámara",
    material: "Aluminio",
    configuracion: "AL-42 con cámara · Proyectante",
    proveedor: null,
    lineSystem: "AL-42",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:serie-42-proyectante-sin-camara",
    nombre: "Serie 42 — Proyectante sin cámara",
    material: "Aluminio",
    configuracion: "AL-42 sin cámara · Proyectante",
    proveedor: null,
    lineSystem: "AL-42",
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
    lineSystem: "New S75",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-new-s75-triple-riel",
    nombre: "WinHouse New S75 — Triple riel",
    material: "PVC",
    configuracion: "Triple riel",
    proveedor: "WinHouse",
    lineSystem: "New S75",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-s60",
    nombre: "WinHouse S60",
    material: "PVC",
    configuracion: "Abatible / doble contacto",
    proveedor: "WinHouse",
    lineSystem: "S60",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-andes-doble-riel",
    nombre: "WinHouse Andes — Doble riel",
    material: "PVC",
    configuracion: "Doble riel",
    proveedor: "WinHouse",
    lineSystem: "Andes",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-andes-monorriel",
    nombre: "WinHouse Andes Monorriel",
    material: "PVC",
    configuracion: "Monorriel",
    proveedor: "WinHouse",
    lineSystem: "Andes",
    ventoraPlantillaId: null,
  },
  {
    catalogKey: "ventora:winhouse-andes-proyectante",
    nombre: "WinHouse Andes — Proyectante",
    material: "PVC",
    configuracion: "Proyectante",
    proveedor: "WinHouse",
    lineSystem: "Andes",
    ventoraPlantillaId: null,
  },
];

export const VENTORA_DEFAULT_LINE_CATALOG: Array<
  Omit<CreateCotizacionLineTemplateInput, "organizationId">
> = VENTORA_DEFAULT_LINE_DEFINITIONS.map(buildVentoraDefaultLine);

/** Recupera la familia declarada por el catálogo canónico cuando un registro de taller antiguo no la conserva en metadata. */
export function resolveDefaultLineSupplierFamilyKey(catalogKey: string | null | undefined): string | null {
  const metadata = VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === catalogKey)?.catalogMetadata;
  const familyKey = metadata?.familyKey;
  return typeof familyKey === "string" && familyKey.trim() ? familyKey.trim() : null;
}

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
