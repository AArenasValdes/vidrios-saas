import { L20_FIJOS_CATALOG_KEY } from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";
import {
  ARQUETIPOS_ESTRUCTURALES,
  resolveArquetipoEstructuralId,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

export type LineTemplateFamilyKey =
  | "correderas"
  | "fijos"
  | "proyectantes"
  | "puertas"
  | "fachadas"
  | "cristales"
  | "especiales"
  | "otras";

export const LINE_TEMPLATE_FAMILY_ORDER: LineTemplateFamilyKey[] = [
  "correderas",
  "fijos",
  "proyectantes",
  "puertas",
  "fachadas",
  "cristales",
  "especiales",
  "otras",
];

export const LINE_TEMPLATE_FAMILY_LABELS: Record<LineTemplateFamilyKey, string> = {
  correderas: "Correderas",
  fijos: "Fijos",
  proyectantes: "Proyectantes",
  puertas: "Puertas",
  fachadas: "Fachadas",
  cristales: "Cristales",
  especiales: "Especiales",
  otras: "Sin clasificar",
};

export function resolveFamilyFromLineConfiguration(lineConfiguration: string): LineTemplateFamilyKey | null {
  const normalized = lineConfiguration.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes("corredera") || normalized.includes("monorriel") || normalized.includes("riel")) {
    return "correderas";
  }
  if (
    normalized.includes("fijo") ||
    normalized.includes("fija") ||
    normalized.includes("paño fijo") ||
    normalized.includes("pano fijo")
  ) {
    return "fijos";
  }
  if (normalized.includes("proyectante")) {
    return "proyectantes";
  }
  if (
    normalized.includes("puerta") ||
    normalized.includes("abatible") ||
    normalized.includes("vaivén") ||
    normalized.includes("vaiven")
  ) {
    return "puertas";
  }
  if (normalized.includes("fachada")) {
    return "fachadas";
  }
  if (normalized.includes("shower") || normalized.includes("espejo") || normalized.includes("mampara")) {
    return "especiales";
  }

  return null;
}

function resolveFamilyFromArchetypeTipologia(
  tipologia: string
): LineTemplateFamilyKey {
  if (tipologia === "corredera" || tipologia === "pvc_monorriel") {
    return "correderas";
  }
  if (tipologia === "pano_fijo") {
    return "fijos";
  }
  if (tipologia === "proyectante") {
    return "proyectantes";
  }
  if (
    tipologia === "puerta_abatible" ||
    tipologia === "puerta_vaiven" ||
    tipologia === "abatible"
  ) {
    return "puertas";
  }
  if (tipologia === "shower") {
    return "especiales";
  }

  return "otras";
}

/** Agrupación visual por familia/tipo; reutiliza arquetipo y lineConfiguration existentes. */
export function resolveLineTemplateFamilyKey(
  template: CotizacionLineTemplate
): LineTemplateFamilyKey {
  if (template.categoria === "vidrio") {
    return "cristales";
  }

  if (template.catalogKey === L20_FIJOS_CATALOG_KEY) {
    return "fijos";
  }

  const metadata = template.catalogMetadata as Record<string, unknown> | null | undefined;
  const structuralArchetypeId =
    typeof metadata?.structuralArchetypeId === "string"
      ? metadata.structuralArchetypeId
      : null;
  const lineConfiguration =
    typeof metadata?.lineConfiguration === "string" ? metadata.lineConfiguration : "";

  const archetypeId = resolveArquetipoEstructuralId({
    catalogKey: template.catalogKey,
    structuralArchetypeId,
  });

  if (archetypeId) {
    return resolveFamilyFromArchetypeTipologia(
      ARQUETIPOS_ESTRUCTURALES[archetypeId].tipologia
    );
  }

  return resolveFamilyFromLineConfiguration(lineConfiguration) ?? "otras";
}

export type LineTemplateFamilyGroup<T extends CotizacionLineTemplate = CotizacionLineTemplate> = {
  key: LineTemplateFamilyKey;
  label: string;
  templates: T[];
};

export function groupLineTemplatesByFamily<T extends CotizacionLineTemplate>(
  templates: readonly T[],
  options?: { fallbackToName?: boolean }
): LineTemplateFamilyGroup<T>[] {
  const buckets = new Map<LineTemplateFamilyKey, T[]>();

  for (const template of templates) {
    let key = resolveLineTemplateFamilyKey(template);
    if (options?.fallbackToName && key === "otras") {
      key = resolveFamilyFromLineConfiguration(template.nombre) ?? "otras";
    }
    const current = buckets.get(key);
    if (current) {
      current.push(template);
    } else {
      buckets.set(key, [template]);
    }
  }

  return LINE_TEMPLATE_FAMILY_ORDER.flatMap((key) => {
    const items = buckets.get(key);
    if (!items?.length) return [];

    return [
      {
        key,
        label: LINE_TEMPLATE_FAMILY_LABELS[key],
        templates: [...items].sort((left, right) =>
          left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" })
        ),
      },
    ];
  });
}

export type DocumentedLineFamilyGroup<T extends CotizacionLineTemplate> = {
  key: string;
  label: string;
  categoryKey: LineTemplateFamilyKey;
  templates: T[];
};

/** La identidad canónica completa metadata antigua de catálogo sin reescribir precios ni filas privadas. */
export function resolveDocumentedLineIdentity(template: CotizacionLineTemplate) {
  const canonical = VENTORA_DEFAULT_LINE_CATALOG.find((entry) => entry.catalogKey === template.catalogKey);
  const stored = template.catalogMetadata;
  const fallback = canonical?.catalogMetadata;
  return {
    familyKey: typeof stored?.familyKey === "string" && stored.familyKey.trim()
      ? stored.familyKey : typeof fallback?.familyKey === "string" ? fallback.familyKey : null,
    familyLabel: typeof stored?.familyLabel === "string" && stored.familyLabel.trim()
      ? stored.familyLabel : typeof fallback?.familyLabel === "string" ? fallback.familyLabel : null,
    configurationLabel: typeof stored?.configurationLabel === "string" && stored.configurationLabel.trim()
      ? stored.configurationLabel : typeof fallback?.configurationLabel === "string" ? fallback.configurationLabel : null,
  };
}

/** Usa la identidad documental de la familia; las líneas sin ella conservan su agrupación visual. */
export function groupLineTemplatesByDocumentedFamily<T extends CotizacionLineTemplate>(
  templates: readonly T[]
): DocumentedLineFamilyGroup<T>[] {
  const buckets = new Map<string, DocumentedLineFamilyGroup<T>>();
  for (const template of templates) {
    const documented = resolveDocumentedLineIdentity(template);
    const familyKey = documented.familyKey;
    const explicitKey = typeof familyKey === "string" && familyKey.trim() ? familyKey.trim() : null;
    const categoryKey = resolveLineTemplateFamilyKey(template);
    const key = explicitKey ?? `category:${categoryKey}`;
    const familyLabel = documented.familyLabel;
    const label = explicitKey && typeof familyLabel === "string" && familyLabel.trim()
      ? familyLabel.trim()
      : LINE_TEMPLATE_FAMILY_LABELS[categoryKey];
    const group = buckets.get(key);
    if (group) group.templates.push(template);
    else buckets.set(key, { key, label, categoryKey, templates: [template] });
  }
  return [...buckets.values()].map((group) => ({
    ...group,
    templates: group.templates.sort((left, right) =>
      left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" })
    ),
  })).sort((left, right) => {
    const leftRank = LINE_TEMPLATE_FAMILY_ORDER.indexOf(left.categoryKey);
    const rightRank = LINE_TEMPLATE_FAMILY_ORDER.indexOf(right.categoryKey);
    return leftRank - rightRank || left.label.localeCompare(right.label, "es", { sensitivity: "base" });
  });
}
