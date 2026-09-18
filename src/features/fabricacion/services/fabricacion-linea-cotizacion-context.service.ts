import type { ComponentFormState } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  ARQUETIPOS_ESTRUCTURALES,
  CATALOG_KEY_TO_ARQUETIPO,
  resolveArquetipoEstructuralId,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import { inferirTipologiaFabricacionPieza } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";
import { resolveCommercialFabricacionHojas } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import {
  resolveFabricationRecipe,
  resolverRecetaFabricacionCompatible,
} from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import {
  isSodalL25CatalogKey,
  resolveSodalL25QuoteConfig,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { countLeafModules } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

export type FabricacionLineaCotizacionContext = {
  fabricacionTipologia: string;
  fabricacionHojas: number | null;
  fabricacionModulos: number | null;
  fabricationRecipeId: string;
  fabricacionApertura: string;
  fabricacionHerraje: string;
  fabricacionVariante: string;
};

function normalizeLineTemplateId(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function contextFromRecipe(
  recipe: FabricationRecipeRecord
): FabricacionLineaCotizacionContext {
  const identidad = recipe.definition.identidad;
  return {
    fabricacionTipologia: identidad.tipologia,
    fabricacionHojas: identidad.hojas,
    fabricacionModulos: identidad.modulos,
    fabricationRecipeId: recipe.status === "validated" ? recipe.id : "",
    fabricacionApertura: identidad.apertura ?? "",
    fabricacionHerraje: identidad.herraje ?? "",
    fabricacionVariante: identidad.variante ?? "",
  };
}

function parseLineConfigurationContext(
  lineConfiguration: unknown
): FabricacionLineaCotizacionContext | null {
  if (typeof lineConfiguration !== "string" || !lineConfiguration.trim()) {
    return null;
  }

  const source = lineConfiguration.toLowerCase();

  if (source.includes("corredera") && source.includes("3")) {
    return {
      fabricacionTipologia: "corredera",
      fabricacionHojas: 3,
      fabricacionModulos: 3,
      fabricationRecipeId: "",
      fabricacionApertura: "",
      fabricacionHerraje: "",
      fabricacionVariante: "",
    };
  }

  if (source.includes("corredera")) {
    return {
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      fabricacionModulos: 2,
      fabricationRecipeId: "",
      fabricacionApertura: "",
      fabricacionHerraje: "",
      fabricacionVariante: "",
    };
  }

  if (source.includes("proyectante")) {
    return {
      fabricacionTipologia: "proyectante",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricationRecipeId: "",
      fabricacionApertura: "",
      fabricacionHerraje: "",
      fabricacionVariante: "",
    };
  }

  if (source.includes("abatible") && source.includes("puerta")) {
    return {
      fabricacionTipologia: "puerta_abatible",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricationRecipeId: "",
      fabricacionApertura: "",
      fabricacionHerraje: "",
      fabricacionVariante: "",
    };
  }

  if (source.includes("abatible")) {
    return {
      fabricacionTipologia: "abatible",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricationRecipeId: "",
      fabricacionApertura: "",
      fabricacionHerraje: "",
      fabricacionVariante: "",
    };
  }

  if (source.includes("fijo") || source.includes("paño fijo")) {
    return {
      fabricacionTipologia: "pano_fijo",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricationRecipeId: "",
      fabricacionApertura: "",
      fabricacionHerraje: "",
      fabricacionVariante: "",
    };
  }

  return null;
}

export function resolveFabricacionContextFromLineCatalog(
  template: Pick<CotizacionLineTemplate, "catalogKey" | "catalogMetadata">
): FabricacionLineaCotizacionContext | null {
  const metadata = template.catalogMetadata ?? {};
  const canonicalProjectingLine =
    template.catalogKey === "ventora:l32" || template.catalogKey === "ventora:l42";
  const fromConfiguration = canonicalProjectingLine
    ? null
    : parseLineConfigurationContext(metadata.lineConfiguration);
  if (fromConfiguration) {
    return fromConfiguration;
  }

  const archetypeId = canonicalProjectingLine
    ? CATALOG_KEY_TO_ARQUETIPO[template.catalogKey ?? ""]
    : resolveArquetipoEstructuralId({
        catalogKey: template.catalogKey,
        structuralArchetypeId:
          typeof metadata.structuralArchetypeId === "string"
            ? metadata.structuralArchetypeId
            : null,
      });
  if (!archetypeId) return null;

  const archetype = ARQUETIPOS_ESTRUCTURALES[archetypeId];
  return {
    fabricacionTipologia: archetype.tipologia,
    fabricacionHojas: archetype.hojas,
    fabricacionModulos: archetype.modulos,
    fabricationRecipeId: "",
    fabricacionApertura: "",
    fabricacionHerraje: "",
    fabricacionVariante: "",
  };
}

export function resolveFabricacionContextForLineAssignment(input: {
  template: Pick<CotizacionLineTemplate, "id" | "catalogKey" | "catalogMetadata">;
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
  form: Pick<
    ComponentFormState,
    | "tipo"
    | "nombre"
    | "descripcion"
    | "sistema"
    | "configuracion"
    | "fabricacionHojas"
    | "fabricacionTipologia"
    | "sheetScheme"
    | "hojasBase"
    | "guidedVisualConfig"
    | "catalogLineKey"
    | "fabricacionGlazing"
    | "fabricacionLeg"
    | "fabricacionReinforcement"
    | "fabricacionVariante"
    | "vidrio"
    | "catalogEspesor"
    | "catalogTerminacion"
  >;
}): FabricacionLineaCotizacionContext | null {
  const catalogContext = resolveFabricacionContextFromLineCatalog(input.template);
  const lineTemplateId = normalizeLineTemplateId(input.template.id);
  if (!lineTemplateId) {
    return catalogContext;
  }

  const lineRecipes = input.recipes.filter(
    (recipe) => recipe.lineTemplateId === lineTemplateId && !recipe.eliminadoEn
  );

  const tipologiaHint =
    input.form.fabricacionTipologia ||
    inferirTipologiaFabricacionPieza({
      tipo: input.form.tipo,
      nombre: input.form.nombre,
      descripcion: input.form.descripcion,
      sistema: input.form.sistema,
      configuracion: input.form.configuracion,
    }) ||
    catalogContext?.fabricacionTipologia ||
    null;

  const guidedVisualLeafCount = input.form.guidedVisualConfig?.root
    ? countLeafModules(input.form.guidedVisualConfig.root)
    : null;
  const hojasHint =
    resolveCommercialFabricacionHojas({
      sheetScheme: input.form.sheetScheme,
      fabricacionHojas: input.form.fabricacionHojas,
      hojasBase: input.form.hojasBase,
      guidedVisualLeafCount:
        guidedVisualLeafCount && guidedVisualLeafCount > 0 ? guidedVisualLeafCount : null,
    }) ?? catalogContext?.fabricacionHojas ?? null;

  if (tipologiaHint && lineRecipes.length > 0) {
    const sodalConfig = isSodalL25CatalogKey(input.template.catalogKey)
      ? resolveSodalL25QuoteConfig({
          catalogKey: input.template.catalogKey,
          presentation: {
            fabricacionGlazing: input.form.fabricacionGlazing ?? "",
            fabricacionLeg: input.form.fabricacionLeg ?? "",
            fabricacionReinforcement: input.form.fabricacionReinforcement ?? "",
            fabricacionVariante: input.form.fabricacionVariante ?? "",
            fabricacionHojas: hojasHint,
            sheetScheme: input.form.sheetScheme ?? "",
          },
          vidrio: input.form.vidrio,
          catalogEspesor: input.form.catalogEspesor,
          catalogTerminacion: input.form.catalogTerminacion,
          sheetScheme: input.form.sheetScheme,
          fabricacionHojas: hojasHint,
        })
      : null;

    const resolution =
      sodalConfig?.complete
        ? resolveFabricationRecipe(lineRecipes, {
            organizationId: input.organizationId,
            lineTemplateId,
            catalogKey: input.template.catalogKey,
            tipologia: tipologiaHint,
            hojas: sodalConfig.hojas,
            glazing: sodalConfig.glazing,
            leg: sodalConfig.leg,
            reinforcement: sodalConfig.reinforcement,
            variante: sodalConfig.variantSlug,
            allowPreliminaryNonValidated: false,
          })
        : resolverRecetaFabricacionCompatible(lineRecipes, {
            organizationId: input.organizationId,
            lineTemplateId,
            tipologia: tipologiaHint,
            hojas: hojasHint,
            allowPreliminaryNonValidated: !isSodalL25CatalogKey(input.template.catalogKey),
          });

    const recipe =
      resolution.estado === "receta_unica" || resolution.estado === "receta_no_validada"
        ? resolution.receta
        : resolution.candidatas.length === 1
          ? resolution.candidatas[0]
          : null;

    if (recipe) {
      return contextFromRecipe(recipe);
    }
  }

  const validated = lineRecipes.filter((recipe) => recipe.status === "validated");
  if (validated.length === 1) {
    const validatedTipologia = validated[0].definition.identidad.tipologia;
    const catalogTipologia = catalogContext?.fabricacionTipologia ?? null;
    const tipologiasCoinciden =
      !catalogTipologia ||
      normalizeText(validatedTipologia) === normalizeText(catalogTipologia);
    const formTipologia = input.form.fabricacionTipologia || null;
    const formCoincide =
      !formTipologia ||
      normalizeText(validatedTipologia) === normalizeText(formTipologia);

    if (tipologiasCoinciden && formCoincide) {
      return contextFromRecipe(validated[0]);
    }
  }

  return catalogContext;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function mergeFabricacionLineaContextIntoForm(
  form: ComponentFormState,
  context: FabricacionLineaCotizacionContext | null
): ComponentFormState {
  if (!context) return form;

  return {
    ...form,
    fabricacionTipologia: context.fabricacionTipologia,
    fabricacionHojas: context.fabricacionHojas,
    fabricacionModulos: context.fabricacionModulos,
    fabricationRecipeId: context.fabricationRecipeId,
    fabricacionApertura: context.fabricacionApertura,
    fabricacionHerraje: context.fabricacionHerraje,
    fabricacionVariante: context.fabricacionVariante,
  };
}
