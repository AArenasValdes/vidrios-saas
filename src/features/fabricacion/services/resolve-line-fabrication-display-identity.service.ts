import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  alignRecipeIdentityForCatalogDisplay,
  resolveArquetipoEstructuralId,
  ARQUETIPOS_ESTRUCTURALES,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import { BASES_TIPOLOGICAS_VENTORA } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { FABRICACION_STATUS_COPY } from "@/features/fabricacion/services/fabricacion-line-workflow.utils";
import {
  formatSodalL25ContextualLineName,
  formatSodalL25FullRecipeNameFromRecipe,
  formatSodalL25FullRecipeNameFromVariant,
  isSodalL25CatalogKey,
  resolveSodalL25CommercialLineDisplayName,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeStatus,
} from "@/features/fabricacion/types/fabricacion-persistence";

export type LineFabricationDisplayIdentity = {
  lineTitle: string;
  fabricationTitle: string;
  subtitleParts: string[];
  statusLabel: string;
};

function formatTipologiaLabel(tipologia: string) {
  const fromBase = BASES_TIPOLOGICAS_VENTORA.find(
    (entry) => entry.tipologia === tipologia
  )?.label;
  if (fromBase) return fromBase;
  return tipologia
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveCanonicalTipologia(input: {
  catalogKey?: string | null;
  recipe?: FabricacionReceta | null;
}) {
  const archetypeId = resolveArquetipoEstructuralId({
    catalogKey: input.catalogKey,
  });
  const archetype = archetypeId ? ARQUETIPOS_ESTRUCTURALES[archetypeId] : null;
  if (archetype) return archetype.tipologia;
  return input.recipe?.identidad.tipologia ?? null;
}

function buildFabricationTitle(input: {
  tipologia: string | null;
  hojas: number | null;
  variante: string | null;
  herraje: string | null;
}) {
  const parts: string[] = [];
  if (input.tipologia) {
    const tipologiaLabel = formatTipologiaLabel(input.tipologia);
    if (input.hojas && input.hojas > 0 && input.tipologia !== "pano_fijo") {
      parts.push(`${tipologiaLabel} · ${input.hojas} hojas`);
    } else {
      parts.push(tipologiaLabel);
    }
  }
  const variantLabel = input.variante?.trim() || input.herraje?.trim();
  if (variantLabel) {
    parts.push(variantLabel);
  }
  return parts.join(" · ");
}

export function resolveLineFabricationDisplayIdentity(input: {
  template: Pick<CotizacionLineTemplate, "nombre" | "catalogKey" | "proveedor">;
  recipe?: FabricationRecipeRecord | null;
  recipeDefinition?: FabricacionReceta | null;
  status?: FabricationRecipeStatus | "quote_only";
}): LineFabricationDisplayIdentity {
  const lineTitle = resolveSodalL25CommercialLineDisplayName({
    catalogKey: input.template.catalogKey,
    nombre: input.template.nombre,
  });
  const status =
    input.status ??
    input.recipe?.status ??
    ("quote_only" as FabricationRecipeStatus | "quote_only");
  const statusLabel =
    status === "quote_only"
      ? "Sin configurar"
      : FABRICACION_STATUS_COPY[status].label;

  const rawDefinition =
    input.recipeDefinition ??
    input.recipe?.definition ??
    null;

  const alignedDefinition = rawDefinition
    ? alignRecipeIdentityForCatalogDisplay({
        recipe: rawDefinition,
        catalogKey: input.template.catalogKey,
        lineName: input.template.nombre,
      })
    : null;

  const canonicalTipologia = resolveCanonicalTipologia({
    catalogKey: input.template.catalogKey,
    recipe: alignedDefinition,
  });

  const recipeTipologia = alignedDefinition?.identidad.tipologia ?? null;
  const tipologiaForDisplay =
    canonicalTipologia &&
    recipeTipologia &&
    canonicalTipologia !== recipeTipologia
      ? canonicalTipologia
      : recipeTipologia ?? canonicalTipologia;

  const fabricationTitle = (() => {
    if (isSodalL25CatalogKey(input.template.catalogKey)) {
      if (input.recipe) {
        return (
          formatSodalL25FullRecipeNameFromRecipe(input.recipe) ??
          formatSodalL25ContextualLineName(alignedDefinition?.identidad.hojas)
        );
      }
      if (alignedDefinition?.identidad.variante) {
        return (
          formatSodalL25FullRecipeNameFromVariant({
            leaves: alignedDefinition.identidad.hojas,
            variantSlug: alignedDefinition.identidad.variante,
          }) ??
          formatSodalL25ContextualLineName(alignedDefinition.identidad.hojas)
        );
      }
      return formatSodalL25ContextualLineName(alignedDefinition?.identidad.hojas);
    }

    return (
      buildFabricationTitle({
        tipologia: tipologiaForDisplay,
        hojas: alignedDefinition?.identidad.hojas ?? null,
        variante: alignedDefinition?.identidad.variante ?? null,
        herraje: alignedDefinition?.identidad.herraje ?? null,
      }) || "Fabricación pendiente"
    );
  })();

  const subtitleParts: string[] = [];
  if (input.template.proveedor?.trim()) {
    subtitleParts.push(input.template.proveedor.trim());
  }
  if (fabricationTitle !== "Fabricación pendiente") {
    subtitleParts.push(fabricationTitle);
  }

  return {
    lineTitle,
    fabricationTitle,
    subtitleParts,
    statusLabel,
  };
}
