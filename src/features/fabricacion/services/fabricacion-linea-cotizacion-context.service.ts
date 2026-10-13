import type { ComponentFormState } from "@/features/cotizaciones/new-quote/workflow-ui";
import { getCatalogProductConfigurations } from "@/features/cotizaciones/line-templates/services/line-template-compatibility.service";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  ARQUETIPOS_ESTRUCTURALES,
  CATALOG_KEY_TO_ARQUETIPO,
  resolveArquetipoEstructuralId,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import {
  isL20CatalogKey,
  resolveL20AperturaForCatalogKey,
} from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";
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
import {
  resolveWinHouseS60QuoteTypology,
  resolveWinHouseS60QuoteVariant,
} from "@/features/fabricacion/services/winhouse-s60-quote-config.service";
import { resolveWinHouseNewS75QuoteVariant } from "@/features/fabricacion/services/winhouse-new-s75-quote-config.service";
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
  fabricacionConfiguracionId?: string;
  fabricacionComposicionId?: string;
};

const WINHOUSE_CATALOG_KEYS = new Set([
  "ventora:winhouse-s60",
  "ventora:winhouse-new-s75-doble-riel",
  "ventora:winhouse-new-s75-triple-riel",
]);

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
    fabricacionConfiguracionId: identidad.configurationId ?? "",
    fabricacionComposicionId: identidad.compositionId ?? "",
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
    | "fabricacionConfiguracionId"
    | "fabricacionComposicionId"
    | "fabricationRecipeId"
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

  const selectedWorkshopRecipe = lineRecipes.find(
    (recipe) => recipe.id === input.form.fabricationRecipeId &&
      recipe.definition.identidad.configurationId?.startsWith("workshop:")
  );
  if (selectedWorkshopRecipe) return contextFromRecipe(selectedWorkshopRecipe);
  const workshopLineConfigurations = lineRecipes.filter((recipe) =>
    recipe.definition.identidad.configurationId?.startsWith("workshop:")
  );
  if (workshopLineConfigurations.length > 0) {
    const opening = normalizeConfigurationOpening(input.form.sistema || input.form.configuracion);
    const component = normalizeText(input.form.tipo);
    const workshopMatches = workshopLineConfigurations.filter((recipe) => {
      const identity = recipe.definition.identidad;
      const expectedComponent = identity.tipologia.includes("puerta") ? "puerta" : identity.tipologia === "pano_fijo" ? "paño fijo" : "ventana";
      return (!input.form.fabricacionConfiguracionId || identity.configurationId === input.form.fabricacionConfiguracionId) &&
        (!opening || normalizeConfigurationOpening(identity.apertura) === opening) &&
        (!component || component.startsWith(normalizeText(expectedComponent))) &&
        (!input.form.fabricacionVariante || identity.variante === input.form.fabricacionVariante) &&
        (!input.form.fabricacionHojas || identity.hojas === input.form.fabricacionHojas);
    });
    const matchingConfigurationIds = Array.from(new Set(workshopMatches.map((recipe) => recipe.definition.identidad.configurationId)));
    if (matchingConfigurationIds.length === 1) {
      const configurationId = matchingConfigurationIds[0] ?? "";
      const compositionMatches = input.form.fabricacionComposicionId
        ? workshopMatches.filter((recipe) => recipe.definition.identidad.compositionId === input.form.fabricacionComposicionId)
        : workshopMatches;
      const selectedComposition = compositionMatches.length === 1 ? compositionMatches[0] : null;
      return {
        fabricacionTipologia: selectedComposition?.definition.identidad.tipologia ?? workshopMatches[0].definition.identidad.tipologia,
          fabricacionHojas: input.form.fabricacionHojas ?? (new Set(workshopMatches.map((recipe) => recipe.definition.identidad.hojas)).size === 1 ? workshopMatches[0].definition.identidad.hojas : null),
          fabricacionModulos: input.form.fabricacionHojas ?? (new Set(workshopMatches.map((recipe) => recipe.definition.identidad.modulos)).size === 1 ? workshopMatches[0].definition.identidad.modulos : null),
        fabricationRecipeId: selectedComposition?.status === "validated" ? selectedComposition.id : "",
        fabricacionApertura: selectedComposition?.definition.identidad.apertura ?? workshopMatches[0].definition.identidad.apertura ?? "",
        fabricacionHerraje: selectedComposition?.definition.identidad.herraje ?? "",
        fabricacionVariante: selectedComposition?.definition.identidad.variante ?? input.form.fabricacionVariante ?? "",
        fabricacionConfiguracionId: configurationId,
        fabricacionComposicionId: selectedComposition?.definition.identidad.compositionId ?? input.form.fabricacionComposicionId ?? "",
      };
    }
  }

  const declaredConfigurations = getCatalogProductConfigurations(input.template.catalogKey);
  if (declaredConfigurations.length > 0) {
    const requestedOpening = normalizeConfigurationOpening(
      input.form.sistema || input.form.configuracion
    );
    const requestedComponent = normalizeText(input.form.tipo);
    const matchingConfigurations = declaredConfigurations.filter((configuration) => {
      const componentMatches = !requestedComponent ||
        requestedComponent === normalizeText(configuration.componentType) ||
        requestedComponent.startsWith(normalizeText(configuration.componentType));
      const openingMatches = !requestedOpening ||
        normalizeConfigurationOpening(configuration.openingType) === requestedOpening;
      const idMatches = !input.form.fabricacionConfiguracionId ||
        configuration.id === input.form.fabricacionConfiguracionId;
      return componentMatches && openingMatches && idMatches;
    });
    if (matchingConfigurations.length === 1) {
      const configuration = matchingConfigurations[0];
      const matchingRecipes = lineRecipes
        .filter((recipe) =>
          (recipe.definition.identidad.configurationId === configuration.id ||
            (!recipe.definition.identidad.configurationId &&
              recipe.definition.identidad.variante === configuration.variant &&
              recipe.definition.identidad.tipologia === configuration.typology)) &&
          (!input.form.fabricacionComposicionId || recipe.definition.identidad.compositionId === input.form.fabricacionComposicionId)
        )
        .sort((left, right) => Number(right.status === "validated") - Number(left.status === "validated"));
      const matchingRecipe = matchingRecipes.length === 1 ? matchingRecipes[0] : null;
      const identity = matchingRecipe?.definition.identidad;
      return {
        fabricacionTipologia: configuration.typology,
        fabricacionHojas: identity?.hojas ?? (configuration.leavesCounts?.length === 1 ? configuration.leavesCounts[0] : null),
        fabricacionModulos: identity?.modulos ?? (configuration.leavesCounts?.length === 1 ? configuration.leavesCounts[0] : null),
        fabricationRecipeId: matchingRecipe?.status === "validated" ? matchingRecipe.id : "",
        fabricacionApertura: configuration.openingType,
        fabricacionHerraje: identity?.herraje ?? "",
        fabricacionVariante: identity?.variante ?? configuration.variant,
        fabricacionConfiguracionId: configuration.id,
        fabricacionComposicionId: identity?.compositionId ?? input.form.fabricacionComposicionId ?? "",
      };
    }
    if (requestedOpening || input.form.fabricacionConfiguracionId) return catalogContext;
  }

  const inferredTipologia = inferirTipologiaFabricacionPieza({
      tipo: input.form.tipo,
      nombre: input.form.nombre,
      descripcion: input.form.descripcion,
      sistema: input.form.sistema,
      configuracion: input.form.configuracion,
    });
  // Al cambiar la línea comercial, no heredar la tipología de la pieza anterior:
  // por ejemplo, una Ventana corredera genérica no convierte S60 en corredera.
  const hasAuthoritativeWinHouseContext = WINHOUSE_CATALOG_KEYS.has(
    input.template.catalogKey ?? ""
  );
  const explicitS60Typology = input.template.catalogKey === "ventora:winhouse-s60"
    ? resolveWinHouseS60QuoteTypology({
        selectedTypology: input.form.fabricacionTipologia,
        componentType: input.form.tipo,
        componentName: input.form.nombre,
        description: input.form.descripcion,
      })
    : null;
  const tipologiaHint = hasAuthoritativeWinHouseContext
    ? explicitS60Typology || catalogContext?.fabricacionTipologia || inferredTipologia || null
    : input.form.fabricacionTipologia ||
      inferredTipologia ||
      catalogContext?.fabricacionTipologia ||
      null;

  const guidedVisualLeafCount = input.form.guidedVisualConfig?.root
    ? countLeafModules(input.form.guidedVisualConfig.root)
    : null;
  const resolvedHojasHint =
    resolveCommercialFabricacionHojas({
      sheetScheme: input.form.sheetScheme,
      fabricacionHojas: input.form.fabricacionHojas,
      hojasBase: input.form.hojasBase,
      guidedVisualLeafCount:
        guidedVisualLeafCount && guidedVisualLeafCount > 0 ? guidedVisualLeafCount : null,
    }) ?? catalogContext?.fabricacionHojas ?? null;
  const hojasHint =
    input.template.catalogKey === "ventora:winhouse-s60" &&
    (explicitS60Typology === "pano_fijo" || explicitS60Typology === "proyectante")
      ? 1
      : hasAuthoritativeWinHouseContext &&
          input.template.catalogKey !== "ventora:winhouse-s60"
        ? catalogContext?.fabricacionHojas ?? resolvedHojasHint
        : resolvedHojasHint;

  if (tipologiaHint && lineRecipes.length > 0) {
    const s60Config = resolveWinHouseS60QuoteVariant({
      catalogKey: input.template.catalogKey,
      tipologia: tipologiaHint,
      hojas: hojasHint,
      vidrio: input.form.vidrio,
    });
    const s60Variant = s60Config.variant || input.form.fabricacionVariante?.trim() || null;
    const s75Config = resolveWinHouseNewS75QuoteVariant({
      catalogKey: input.template.catalogKey,
      tipologia: tipologiaHint,
      hojas: hojasHint,
      vidrio: input.form.vidrio,
      variantHint: input.form.fabricacionVariante,
      configuration: input.form.configuracion,
      componentName: input.form.nombre,
      system: input.form.sistema,
    });
    const s75Variant = s75Config.variant?.slug || null;
    if (s60Config.handled && !s60Config.variant && !input.form.fabricacionVariante?.trim()) {
      return catalogContext;
    }
    if (s75Config.handled && !s75Config.variant) {
      return catalogContext;
    }
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
    const l20Apertura = isL20CatalogKey(input.template.catalogKey)
      ? input.template.catalogKey === "ventora:l20"
        ? "corredera"
        : resolveL20AperturaForCatalogKey(
            input.template.catalogKey,
            input.form.fabricacionVariante,
          )
      : null;
    const l20Variante = input.form.fabricacionVariante?.trim() || null;

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
        : isL20CatalogKey(input.template.catalogKey) && (l20Apertura || l20Variante)
          ? resolveFabricationRecipe(lineRecipes, {
              organizationId: input.organizationId,
              lineTemplateId,
              catalogKey: input.template.catalogKey,
              tipologia: tipologiaHint,
              hojas: hojasHint,
              apertura: l20Apertura,
              variante: l20Variante,
              allowPreliminaryNonValidated: false,
            })
          : s75Variant
            ? resolveFabricationRecipe(lineRecipes, {
                organizationId: input.organizationId,
                lineTemplateId,
                catalogKey: input.template.catalogKey,
                tipologia: tipologiaHint,
                hojas: hojasHint,
                variante: s75Variant,
                allowPreliminaryNonValidated: false,
              })
          : s60Variant
            ? resolveFabricationRecipe(lineRecipes, {
                organizationId: input.organizationId,
                lineTemplateId,
                catalogKey: input.template.catalogKey,
                tipologia: tipologiaHint,
                hojas: hojasHint,
                variante: s60Variant,
                allowPreliminaryNonValidated: false,
              })
          : resolverRecetaFabricacionCompatible(lineRecipes, {
              organizationId: input.organizationId,
              lineTemplateId,
              tipologia: tipologiaHint,
              hojas: hojasHint,
              allowPreliminaryNonValidated: false,
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

  const selectedS60 = resolveWinHouseS60QuoteVariant({
    catalogKey: input.template.catalogKey,
    tipologia: tipologiaHint,
    hojas: hojasHint,
    vidrio: input.form.vidrio,
  });
  const selectedS75 = resolveWinHouseNewS75QuoteVariant({
    catalogKey: input.template.catalogKey,
    tipologia: tipologiaHint,
    hojas: hojasHint,
    vidrio: input.form.vidrio,
    variantHint: input.form.fabricacionVariante,
    configuration: input.form.configuracion,
    componentName: input.form.nombre,
    system: input.form.sistema,
  });
  if (selectedS75.variant && tipologiaHint) {
    return {
      fabricacionTipologia: tipologiaHint,
      fabricacionHojas: hojasHint,
      fabricacionModulos: hojasHint,
      fabricationRecipeId: "",
      fabricacionApertura: "corredera",
      fabricacionHerraje: "",
      fabricacionVariante: selectedS75.variant.slug,
    };
  }
  if (selectedS60.variant && tipologiaHint) {
    return {
      fabricacionTipologia: tipologiaHint,
      fabricacionHojas: hojasHint,
      fabricacionModulos: hojasHint,
      fabricationRecipeId: "",
      fabricacionApertura: "",
      fabricacionHerraje: "",
      fabricacionVariante: selectedS60.variant,
    };
  }

  return catalogContext;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function normalizeConfigurationOpening(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (normalized.includes("corredera")) return "corredera";
  if (normalized.includes("proyectante")) return "proyectante";
  if (normalized.includes("abatible") || normalized.includes("abatir")) return "abatible";
  if (normalized.includes("vaiven")) return "vaiven";
  if (normalized.includes("fijo")) return "fijo";
  return normalized;
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
    fabricacionConfiguracionId: context.fabricacionConfiguracionId,
    fabricacionComposicionId: context.fabricacionComposicionId,
  };
}
