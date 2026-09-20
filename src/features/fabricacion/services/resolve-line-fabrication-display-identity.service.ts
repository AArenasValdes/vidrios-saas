import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  alignRecipeIdentityForCatalogDisplay,
  resolveArquetipoEstructuralId,
  ARQUETIPOS_ESTRUCTURALES,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import { BASES_TIPOLOGICAS_VENTORA } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  isL20CatalogKey,
  L20_ALUMETRICA_VARIANT_LABELS,
  resolveL20AperturaFromVariant,
  type L20AlumetricaVariantSlug,
} from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";
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

function isInternalPendingVariantLabel(variant: string | null | undefined) {
  return /pendiente/i.test(variant?.trim() ?? "");
}

function formatHojasLabel(hojas: number) {
  return hojas === 1 ? "1 hoja" : `${hojas} hojas`;
}

function titleCaseEsPhrase(value: string) {
  return value
    .split(/(\s+|·)/)
    .map((token) => {
      if (!token || /^\s+$/.test(token) || token === "·") return token;
      return token.charAt(0).toLocaleUpperCase("es-CL") + token.slice(1);
    })
    .join("");
}

function formatVariantSlugForDisplay(
  variant: string | null | undefined,
  catalogKey?: string | null
): string | null {
  const trimmed = variant?.trim();
  if (!trimmed) return null;
  if (isInternalPendingVariantLabel(trimmed)) return null;

  if (isL20CatalogKey(catalogKey)) {
    const normalized = trimmed.toLowerCase();
    if (normalized in L20_ALUMETRICA_VARIANT_LABELS) {
      return L20_ALUMETRICA_VARIANT_LABELS[normalized as L20AlumetricaVariantSlug];
    }
  }

  if (
    catalogKey === "ventora:serie-45-puerta" &&
    /^puerta([_\s-]*1h(oja)?s?)?$/i.test(trimmed)
  ) {
    return null;
  }

  if (trimmed === "estandar" || trimmed === "caracol" || trimmed === "normal") {
    return trimmed.charAt(0).toLocaleUpperCase("es-CL") + trimmed.slice(1);
  }

  return titleCaseEsPhrase(
    trimmed
      .replaceAll("_", " ")
      .replace(/\btp\b/gi, "TP")
      .replace(/(\d+)\s*mm/gi, "$1 mm")
  );
}

function resolveTipologiaLabelForDisplay(input: {
  tipologia: string | null;
  catalogKey?: string | null;
  apertura?: string | null;
  variante?: string | null;
}) {
  if (isL20CatalogKey(input.catalogKey)) {
    const apertura =
      input.apertura?.trim().toLowerCase() === "fija"
        ? "fija"
        : input.apertura?.trim().toLowerCase() === "corredera"
          ? "corredera"
          : resolveL20AperturaFromVariant(input.variante);
    if (apertura === "fija") return "Fijos";
    if (apertura === "corredera") return "Corredera";
  }

  return input.tipologia ? formatTipologiaLabel(input.tipologia) : null;
}

function buildFabricationTitle(input: {
  tipologia: string | null;
  hojas: number | null;
  variante: string | null;
  herraje: string | null;
  catalogKey?: string | null;
  apertura?: string | null;
}) {
  const parts: string[] = [];
  const tipologiaLabel = resolveTipologiaLabelForDisplay({
    tipologia: input.tipologia,
    catalogKey: input.catalogKey,
    apertura: input.apertura,
    variante: input.variante,
  });

  if (tipologiaLabel) {
    if (input.hojas && input.hojas > 0 && input.tipologia !== "pano_fijo") {
      parts.push(`${tipologiaLabel} · ${formatHojasLabel(input.hojas)}`);
    } else {
      parts.push(tipologiaLabel);
    }
  }

  const variantLabel =
    formatVariantSlugForDisplay(input.variante, input.catalogKey) ||
    formatVariantSlugForDisplay(input.herraje, input.catalogKey);
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
        catalogKey: input.template.catalogKey,
        apertura: alignedDefinition?.identidad.apertura ?? null,
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
