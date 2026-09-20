import { L20_FIJOS_CATALOG_KEY } from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";
import {
  ARQUETIPOS_ESTRUCTURALES,
  resolveArquetipoEstructuralId,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

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

function resolveFamilyFromLineConfiguration(lineConfiguration: string): LineTemplateFamilyKey | null {
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
  templates: readonly T[]
): LineTemplateFamilyGroup<T>[] {
  const buckets = new Map<LineTemplateFamilyKey, T[]>();

  for (const template of templates) {
    const key = resolveLineTemplateFamilyKey(template);
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
