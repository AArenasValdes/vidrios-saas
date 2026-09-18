import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  parseSodalL25VariantSlug,
  SODAL_L25_CATALOG_KEY,
  type SodalL25GlazingSlug,
  type SodalL25LegSlug,
  type SodalL25ReinforcementSlug,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { isZetaConfirmedSourceReference } from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export const SODAL_L25_COMMERCIAL_BASE_NAME = "L25";
export const SODAL_L25_TYPOLOGY_LABEL = "Corredera";

const GLAZING_LABELS: Record<SodalL25GlazingSlug, string> = {
  monolithic: "Monolítico",
  dvh: "DVH",
};

const LEG_LABELS: Record<SodalL25LegSlug, string> = {
  open: "Pierna abierta",
  closed: "Pierna cerrada",
};

const REINFORCEMENT_LABELS: Record<SodalL25ReinforcementSlug, string> = {
  normal: "Normal",
  reinforced: "Reforzada",
};

export function isSodalL25CatalogKey(catalogKey: string | null | undefined): boolean {
  return catalogKey === SODAL_L25_CATALOG_KEY;
}

export function formatSodalL25GlazingLabel(
  glazing: SodalL25GlazingSlug | string | null | undefined
): string {
  if (glazing === "dvh") return GLAZING_LABELS.dvh;
  if (glazing === "monolithic") return GLAZING_LABELS.monolithic;
  return "";
}

export function formatSodalL25LegLabel(
  leg: SodalL25LegSlug | string | null | undefined
): string {
  if (leg === "open") return LEG_LABELS.open;
  if (leg === "closed") return LEG_LABELS.closed;
  return "";
}

export function formatSodalL25ReinforcementLabel(
  reinforcement: SodalL25ReinforcementSlug | string | null | undefined
): string {
  if (reinforcement === "normal") return REINFORCEMENT_LABELS.normal;
  if (reinforcement === "reinforced") return REINFORCEMENT_LABELS.reinforced;
  return "";
}

export function formatSodalL25ContextualLineName(leaves: number | null | undefined): string {
  if (!Number.isInteger(leaves) || !leaves || leaves <= 0) {
    return SODAL_L25_COMMERCIAL_BASE_NAME;
  }
  return `${SODAL_L25_COMMERCIAL_BASE_NAME} ${SODAL_L25_TYPOLOGY_LABEL} · ${leaves} hojas`;
}

export function formatSodalL25FullRecipeName(input: {
  leaves: number;
  glazing: SodalL25GlazingSlug;
  leg: SodalL25LegSlug;
  reinforcement: SodalL25ReinforcementSlug;
}): string {
  return [
    `${SODAL_L25_COMMERCIAL_BASE_NAME} ${SODAL_L25_TYPOLOGY_LABEL} ${input.leaves} hojas`,
    formatSodalL25GlazingLabel(input.glazing),
    formatSodalL25LegLabel(input.leg),
    formatSodalL25ReinforcementLabel(input.reinforcement),
  ].join(" · ");
}

export function formatSodalL25FullRecipeNameFromVariant(input: {
  leaves: number | null | undefined;
  variantSlug: string | null | undefined;
}): string | null {
  const parsed = parseSodalL25VariantSlug(input.variantSlug);
  if (!parsed || !Number.isInteger(input.leaves) || !input.leaves || input.leaves <= 0) {
    return null;
  }

  return formatSodalL25FullRecipeName({
    leaves: input.leaves,
    glazing: parsed.glazing,
    leg: parsed.leg,
    reinforcement: parsed.reinforcement,
  });
}

export function formatSodalL25FullRecipeNameFromRecipe(
  recipe: Pick<FabricationRecipeRecord, "definition" | "sourceReference">
): string | null {
  const { identidad } = recipe.definition;
  const parsed = parseSodalL25VariantSlug(identidad.variante);
  if (!parsed) return null;

  return formatSodalL25FullRecipeName({
    leaves: identidad.hojas,
    glazing: parsed.glazing,
    leg: parsed.leg,
    reinforcement: parsed.reinforcement,
  });
}

export function resolveEffectiveSodalL25CatalogKey(input: {
  catalogLineKey?: string | null;
  catalogKey?: string | null;
  nombre?: string | null;
}): string | null {
  const explicit = (input.catalogLineKey || input.catalogKey || "").trim();
  if (isSodalL25CatalogKey(explicit)) {
    return SODAL_L25_CATALOG_KEY;
  }
  if (explicit) {
    return explicit;
  }

  const normalizedNombre = (input.nombre ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (
    normalizedNombre === "l25" ||
    normalizedNombre === "serie 25" ||
    /^l25(\s|$|-)/.test(normalizedNombre) ||
    /^serie\s*25(\s|$|-)/.test(normalizedNombre)
  ) {
    return SODAL_L25_CATALOG_KEY;
  }

  return null;
}

export function resolveSodalL25CommercialLineDisplayName(input: {
  nombre?: string | null;
  catalogKey?: string | null;
}): string {
  if (
    isSodalL25CatalogKey(
      resolveEffectiveSodalL25CatalogKey({
        catalogKey: input.catalogKey,
        nombre: input.nombre,
      })
    )
  ) {
    return SODAL_L25_COMMERCIAL_BASE_NAME;
  }
  return (input.nombre ?? "").trim() || "Línea";
}

export function resolveCotizacionItemSodalL25LineDisplayLabel(input: {
  catalogLineKey?: string | null;
  referencia?: string | null;
  lineaComercial?: string | null;
  fabricacionHojas?: number | null;
  sheetScheme?: string | null;
  hojasBase?: 1 | 2 | null;
  fabricacionGlazing?: string | null;
  fabricacionLeg?: string | null;
  fabricacionReinforcement?: string | null;
  fabricacionVariante?: string | null;
}): string | null {
  if (!isSodalL25CatalogKey(input.catalogLineKey)) {
    return null;
  }

  const leaves =
    (Number.isInteger(input.fabricacionHojas) && input.fabricacionHojas! > 0
      ? input.fabricacionHojas
      : null) ??
    extractLeavesFromSheetScheme(input.sheetScheme) ??
    input.hojasBase ??
    null;

  const parsedVariant = parseSodalL25VariantSlug(input.fabricacionVariante);
  const glazing = (input.fabricacionGlazing as SodalL25GlazingSlug | "") || parsedVariant?.glazing;
  const leg = (input.fabricacionLeg as SodalL25LegSlug | "") || parsedVariant?.leg;
  const reinforcement =
    (input.fabricacionReinforcement as SodalL25ReinforcementSlug | "") ||
    parsedVariant?.reinforcement;

  if (
    leaves &&
    glazing &&
    leg &&
    reinforcement &&
    (glazing === "monolithic" || glazing === "dvh") &&
    (leg === "open" || leg === "closed") &&
    (reinforcement === "normal" || reinforcement === "reinforced")
  ) {
    return formatSodalL25FullRecipeName({
      leaves,
      glazing,
      leg,
      reinforcement,
    });
  }

  if (leaves) {
    return formatSodalL25ContextualLineName(leaves);
  }

  return SODAL_L25_COMMERCIAL_BASE_NAME;
}

function extractLeavesFromSheetScheme(sheetScheme: string | null | undefined): number | null {
  const match = (sheetScheme ?? "").match(/(\d+)\s*hojas?/i);
  if (!match?.[1]) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function scoreLineTemplateForQuotePicker(template: CotizacionLineTemplate): number {
  let score = 0;
  if (template.precioM2Sugerido > 0) score += 4;
  if (template.isActive) score += 2;
  const normalizedName = template.nombre.trim().toLowerCase();
  if (normalizedName === "l25") score += 3;
  if (normalizedName === "serie 25") score += 2;
  if (!/\bl25\b\s+\d+$/i.test(normalizedName)) score += 1;
  return score;
}

/** Una sola fila comercial L25 en selectores de cotización. */
export function dedupeLineTemplatesForQuotePicker(
  templates: readonly CotizacionLineTemplate[]
): CotizacionLineTemplate[] {
  const l25Templates = templates.filter((template) => isSodalL25CatalogKey(template.catalogKey));
  if (l25Templates.length <= 1) {
    return [...templates];
  }

  const preferredL25 = [...l25Templates].sort(
    (left, right) => scoreLineTemplateForQuotePicker(right) - scoreLineTemplateForQuotePicker(left)
  )[0];
  const result: CotizacionLineTemplate[] = [];
  let l25Inserted = false;

  for (const template of templates) {
    if (isSodalL25CatalogKey(template.catalogKey)) {
      if (l25Inserted) continue;
      result.push(preferredL25!);
      l25Inserted = true;
      continue;
    }
    result.push(template);
  }

  return result;
}

export function formatLineTemplateQuotePickerLabel(
  template: Pick<CotizacionLineTemplate, "nombre" | "catalogKey">
): string {
  return resolveSodalL25CommercialLineDisplayName(template);
}

export function isSodalL25ZetaValidatedRecipeForPresentation(
  recipe: Pick<FabricationRecipeRecord, "status" | "sourceReference" | "eliminadoEn">
): boolean {
  return (
    recipe.status === "validated" &&
    isZetaConfirmedSourceReference(recipe.sourceReference) &&
    !recipe.eliminadoEn
  );
}

export {
  GLAZING_LABELS as SODAL_L25_GLAZING_LABELS,
  LEG_LABELS as SODAL_L25_LEG_LABELS,
  REINFORCEMENT_LABELS as SODAL_L25_REINFORCEMENT_LABELS,
};
