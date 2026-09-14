import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { auditarLineaCatalogoVentora } from "@/features/cotizaciones/line-templates/services/auditoria-catalogo-lineas-ventora.service";
import { crearRecetaEstructuralParaLineaComercial } from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import {
  crearRecetasP2U,
  P2U_CATALOG_KEYS,
  type P2UCatalogKey,
} from "@/features/fabricacion/fixtures/traditional-p2u-recipes";
import {
  crearRecetasSodalP2A,
  SODAL_P2A_RECIPE_FACTORIES,
  type SodalP2ACatalogKey,
} from "@/features/fabricacion/fixtures/sodal-p2a-recipes";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import {
  buildFabricationRecipeSummary,
  getActiveRecipeProfileRules,
  getOptionalRecipeProfileRules,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";

export const FABRICACION_CONSISTENCY_WARNING_CODES = [
  "REFERENCE_NOT_IN_RECIPE",
  "RECIPE_CODE_NOT_IN_REFERENCES",
  "OPTIONAL_PROFILE_COUNTED_AS_ACTIVE",
  "VARIANT_REFERENCES_MIXED",
  "RULE_COUNT_LABELED_AS_PIECES",
  "PHYSICAL_COUNT_MISMATCH",
  "SIDEBAR_HERO_COUNT_MISMATCH",
  "INCOMPLETE_COMPOSITION_SHOWN_READY",
  "CATALOG_RECIPE_VARIANT_MISMATCH",
] as const;

export type FabricacionConsistencyWarningCode =
  (typeof FABRICACION_CONSISTENCY_WARNING_CODES)[number];

export type FabricacionLineConsistencyAudit = {
  catalogKey: string;
  nombre: string;
  variantes: string[];
  referenciasSistema: string[];
  variantesReceta: Array<{
    nombre: string;
    variante: string;
    tipologia: string;
    cantidadReglasActivas: number;
    reglasActivas: string[];
    cantidadReglasOpcionales: number;
    reglasOpcionales: string[];
    cantidadCortesActivos: number;
    vidrios: number;
    accesorios: number;
    composicionCompleta: boolean;
  }>;
  technicalStatus: "incomplete" | "calculable";
  validationStatus: "unverified" | "documented" | "workshop_validated";
  pricingStatus: "missing" | "configured";
  quotable: boolean;
  warnings: Array<{ code: FabricacionConsistencyWarningCode; detail: string }>;
};

type CatalogLine = (typeof VENTORA_DEFAULT_LINE_CATALOG)[number];

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function recipesForLine(line: CatalogLine): FabricacionReceta[] {
  if (line.catalogKey && line.catalogKey in P2U_CATALOG_KEYS) {
    return crearRecetasP2U({
      catalogKey: line.catalogKey as P2UCatalogKey,
      lineName: line.nombre,
    });
  }
  if (line.catalogKey && line.catalogKey in SODAL_P2A_RECIPE_FACTORIES) {
    return crearRecetasSodalP2A({
      catalogKey: line.catalogKey as SodalP2ACatalogKey,
      lineName: line.nombre,
    });
  }

  const recipe = crearRecetaEstructuralParaLineaComercial({
    catalogKey: line.catalogKey,
    structuralArchetypeId:
      typeof line.catalogMetadata?.structuralArchetypeId === "string"
        ? line.catalogMetadata.structuralArchetypeId
        : null,
    lineName: line.nombre,
  });
  return recipe ? [recipe] : [];
}

function referenceCodes(line: CatalogLine) {
  return unique(
    getVentoraProfileReferencesForCatalogKey(line.catalogKey)?.profiles
      .map((profile) => profile.code?.trim() ?? "") ?? []
  );
}

export function auditFabricationLineConsistency(
  line: CatalogLine
): FabricacionLineConsistencyAudit {
  const catalogKey = line.catalogKey ?? "";
  const catalogAudit = auditarLineaCatalogoVentora(line);
  const references = referenceCodes(line);
  const recipes = recipesForLine(line);
  const recipeCodes = unique(
    recipes.flatMap((recipe) => recipe.perfiles.map((profile) => profile.codigoPerfil.trim()))
  );
  const warnings: FabricacionLineConsistencyAudit["warnings"] = [];

  references
    .filter((code) => recipeCodes.length > 0 && !recipeCodes.includes(code))
    .forEach((code) =>
      warnings.push({
        code: "REFERENCE_NOT_IN_RECIPE",
        detail: `${code} está documentado en el sistema, pero no aparece en ninguna variante de receta auditada.`,
      })
    );
  recipeCodes
    .filter((code) => references.length > 0 && !references.includes(code))
    .forEach((code) =>
      warnings.push({
        code: "RECIPE_CODE_NOT_IN_REFERENCES",
        detail: `${code} aparece en receta, pero no en las referencias de catálogo disponibles.`,
      })
    );

  const variantesReceta = recipes.map((recipe) => {
    const summary = buildFabricationRecipeSummary(recipe);
    const activeRules = getActiveRecipeProfileRules(recipe);
    const optionalRules = getOptionalRecipeProfileRules(recipe);
    const invalidOptionalActive = activeRules.filter(
      (profile) =>
        !profile.requerido &&
        !profile.reglaMedida.condicion &&
        !profile.reglaCantidad.condicion
    );
    if (invalidOptionalActive.length > 0) {
      warnings.push({
        code: "OPTIONAL_PROFILE_COUNTED_AS_ACTIVE",
        detail: `${invalidOptionalActive.map((profile) => profile.codigoPerfil).join(", ")} no debe entrar en la composición activa sin selección explícita.`,
      });
    }

    const physicalCount = activeRules.reduce(
      (total, profile) => total + Math.max(1, Math.round(profile.reglaCantidad.cantidad)),
      0
    );
    if (physicalCount !== summary.activePieceCount) {
      warnings.push({
        code: "PHYSICAL_COUNT_MISMATCH",
        detail: `${recipe.identidad.nombre}: reglas y cortes físicos no coinciden.`,
      });
    }
    if (!summary.compositionComplete && evaluarRecetaListaParaProbar(recipe).listaParaProbar) {
      warnings.push({
        code: "INCOMPLETE_COMPOSITION_SHOWN_READY",
        detail: `${recipe.identidad.nombre}: composición pendiente, pero el gate la muestra lista.`,
      });
    }

    return {
      nombre: recipe.identidad.nombre,
      variante: recipe.identidad.variante,
      tipologia: recipe.identidad.tipologia,
      cantidadReglasActivas: activeRules.length,
      reglasActivas: activeRules.map((profile) => profile.codigoPerfil.trim()).filter(Boolean),
      cantidadReglasOpcionales: optionalRules.length,
      reglasOpcionales: optionalRules.map((profile) => profile.codigoPerfil.trim()).filter(Boolean),
      cantidadCortesActivos: summary.activePieceCount,
      vidrios: summary.activeGlassCount,
      accesorios: summary.activeAccessoryCount,
      composicionCompleta: summary.compositionComplete,
    };
  });

  const variantNames = unique(variantesReceta.map((variant) => variant.variante));

  return {
    catalogKey,
    nombre: line.nombre,
    variantes: variantNames,
    referenciasSistema: references,
    variantesReceta,
    technicalStatus: catalogAudit.technicalStatus,
    validationStatus: catalogAudit.validationStatus,
    pricingStatus: catalogAudit.pricingStatus,
    quotable: catalogAudit.quotable,
    warnings,
  };
}

export function auditCanonicalFabricationLines(
  lines: readonly CatalogLine[] = VENTORA_DEFAULT_LINE_CATALOG
): FabricacionLineConsistencyAudit[] {
  return lines.map((line) => auditFabricationLineConsistency(line));
}
