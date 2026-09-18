import {
  formatSodalL25ContextualLineName,
  formatSodalL25LegLabel,
  formatSodalL25ReinforcementLabel,
  isSodalL25CatalogKey,
  resolveEffectiveSodalL25CatalogKey,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import {
  buildSodalL25VariantSlug,
  isValidSodalL25Combination,
  parseSodalL25VariantSlug,
  SODAL_L25_CATALOG_KEY,
  type SodalL25GlazingSlug,
  type SodalL25LegSlug,
  type SodalL25ReinforcementSlug,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import {
  isSodalL25ZetaValidatedRecipe,
  resolveFabricationRecipe,
} from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { resolveCommercialFabricacionHojas } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

export type SodalL25QuoteConfig = {
  catalogKey: string;
  glazing: SodalL25GlazingSlug;
  leg: SodalL25LegSlug;
  reinforcement: SodalL25ReinforcementSlug;
  variantSlug: string;
  hojas: number;
  complete: boolean;
};

export type SodalL25VariantOption<T extends string> = {
  value: T;
  label: string;
  available: boolean;
};

export { isSodalL25CatalogKey };

export function inferSodalL25GlazingFromGlass(input: {
  vidrio?: string | null;
  catalogEspesor?: string | null;
  catalogTerminacion?: string | null;
}): SodalL25GlazingSlug {
  const haystack = `${input.vidrio ?? ""} ${input.catalogEspesor ?? ""} ${input.catalogTerminacion ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (
    haystack.includes("dvh") ||
    haystack.includes("termopanel") ||
    haystack.includes("dv ") ||
    haystack.includes("doble vidrio")
  ) {
    return "dvh";
  }

  return "monolithic";
}

export function applySodalL25VidrioToForm<T extends {
  catalogLineKey?: string;
  referencia?: string;
  fabricacionLeg?: string;
  fabricacionReinforcement?: string;
  fabricacionVariante?: string;
  fabricacionGlazing?: string;
}>(form: T, vidrio: string): T & { vidrio: string } {
  const catalogKey = resolveEffectiveSodalL25CatalogKey({
    catalogLineKey: form.catalogLineKey,
    nombre: form.referencia,
  });
  if (!isSodalL25CatalogKey(catalogKey)) {
    return { ...form, vidrio };
  }

  const config = resolveSodalL25QuoteConfig({
    catalogKey,
    presentation: {
      fabricacionGlazing: "",
      fabricacionLeg: form.fabricacionLeg ?? "",
      fabricacionReinforcement: form.fabricacionReinforcement ?? "",
      fabricacionVariante: form.fabricacionVariante ?? "",
    },
    vidrio,
  });

  return {
    ...form,
    vidrio,
    fabricacionGlazing: config?.glazing ?? inferSodalL25GlazingFromGlass({ vidrio }),
    fabricacionVariante: config?.variantSlug || form.fabricacionVariante,
  };
}

export function resolveSodalL25QuoteConfig(input: {
  catalogKey?: string | null;
  presentation?: Pick<
    CotizacionItemPresentationMeta,
    | "fabricacionGlazing"
    | "fabricacionLeg"
    | "fabricacionReinforcement"
    | "fabricacionVariante"
    | "fabricacionHojas"
    | "sheetScheme"
  >;
  vidrio?: string | null;
  catalogEspesor?: string | null;
  catalogTerminacion?: string | null;
  sheetScheme?: string | null;
  fabricacionHojas?: number | null;
}): SodalL25QuoteConfig | null {
  if (!isSodalL25CatalogKey(input.catalogKey)) {
    return null;
  }

  const parsedVariant = parseSodalL25VariantSlug(input.presentation?.fabricacionVariante);
  const inferredGlazing = inferSodalL25GlazingFromGlass({
    vidrio: input.vidrio,
    catalogEspesor: input.catalogEspesor,
    catalogTerminacion: input.catalogTerminacion,
  });
  const storedGlazing =
    (input.presentation?.fabricacionGlazing as SodalL25GlazingSlug | "") ||
    parsedVariant?.glazing ||
    "";
  const vidrioHint = (input.vidrio ?? "").trim();
  const glazing = vidrioHint ? inferredGlazing : storedGlazing || inferredGlazing;
  const leg =
    (input.presentation?.fabricacionLeg as SodalL25LegSlug | "") ||
    parsedVariant?.leg ||
    "";
  const reinforcement =
    (input.presentation?.fabricacionReinforcement as SodalL25ReinforcementSlug | "") ||
    parsedVariant?.reinforcement ||
    "";

  const hojas =
    resolveCommercialFabricacionHojas({
      sheetScheme: input.sheetScheme ?? input.presentation?.sheetScheme,
      fabricacionHojas: input.fabricacionHojas ?? input.presentation?.fabricacionHojas,
    }) ?? 0;

  const complete =
    hojas > 0 &&
    Boolean(leg) &&
    Boolean(reinforcement) &&
    isValidSodalL25Combination({ glazing, leg: leg as SodalL25LegSlug, reinforcement: reinforcement as SodalL25ReinforcementSlug });

  const variantSlug =
    leg && reinforcement
      ? buildSodalL25VariantSlug({
          glazing,
          leg: leg as SodalL25LegSlug,
          reinforcement: reinforcement as SodalL25ReinforcementSlug,
        })
      : parsedVariant?.variantSlug ?? "";

  return {
    catalogKey: SODAL_L25_CATALOG_KEY,
    glazing,
    leg: (leg || "open") as SodalL25LegSlug,
    reinforcement: (reinforcement || "normal") as SodalL25ReinforcementSlug,
    variantSlug,
    hojas,
    complete,
  };
}

export function listSodalL25LegOptions(input: {
  recipes: FabricationRecipeRecord[];
  glazing: SodalL25GlazingSlug;
  hojas: number;
  reinforcement?: SodalL25ReinforcementSlug | null;
}): SodalL25VariantOption<SodalL25LegSlug>[] {
  const reinforcements: SodalL25ReinforcementSlug[] = input.reinforcement
    ? [input.reinforcement]
    : ["normal", "reinforced"];

  return (["open", "closed"] as const).map((leg) => ({
    value: leg,
    label: formatSodalL25LegLabel(leg),
    available: reinforcements.some((reinforcement) =>
      input.recipes.some(
        (recipe) =>
          isSodalL25ZetaValidatedRecipe(recipe) &&
          recipe.definition.identidad.hojas === input.hojas &&
          recipe.definition.identidad.variante ===
            buildSodalL25VariantSlug({
              glazing: input.glazing,
              leg,
              reinforcement,
            })
      )
    ),
  }));
}

export function listSodalL25ReinforcementOptions(input: {
  recipes: FabricationRecipeRecord[];
  glazing: SodalL25GlazingSlug;
  hojas: number;
  leg: SodalL25LegSlug | null;
}): SodalL25VariantOption<SodalL25ReinforcementSlug>[] {
  return (["normal", "reinforced"] as const).map((reinforcement) => ({
    value: reinforcement,
    label: formatSodalL25ReinforcementLabel(reinforcement),
    available: input.leg
      ? input.recipes.some(
          (recipe) =>
            isSodalL25ZetaValidatedRecipe(recipe) &&
            recipe.definition.identidad.hojas === input.hojas &&
            recipe.definition.identidad.variante ===
              buildSodalL25VariantSlug({
                glazing: input.glazing,
                leg: input.leg!,
                reinforcement,
              })
        )
      : false,
  }));
}

export function describeSodalL25PautaMessage(config: SodalL25QuoteConfig | null): string | null {
  if (!config) return null;
  if (config.complete) return null;
  if (config.hojas > 0) {
    return `Selecciona pierna y refuerzo para ${formatSodalL25ContextualLineName(config.hojas)}.`;
  }
  return "Selecciona la configuración L25 para generar la pauta de corte.";
}

export function resolveSodalL25FabricacionSnapshot(input: {
  organizationId: number | null;
  lineTemplateId: number;
  recipes: FabricationRecipeRecord[];
  config: SodalL25QuoteConfig;
  anchoTotalMm: number;
  altoTotalMm: number;
  cantidad: number;
  tipologia?: string | null;
}): {
  snapshot: FabricacionCotizacionSnapshot | null;
  recipe: FabricationRecipeRecord | null;
  message: string | null;
} {
  if (!input.config.complete || input.anchoTotalMm <= 0 || input.altoTotalMm <= 0) {
    return {
      snapshot: null,
      recipe: null,
      message: describeSodalL25PautaMessage(input.config),
    };
  }

  const resolution = resolveFabricationRecipe(input.recipes, {
    organizationId: input.organizationId,
    lineTemplateId: input.lineTemplateId,
    catalogKey: SODAL_L25_CATALOG_KEY,
    tipologia: input.tipologia || "corredera",
    hojas: input.config.hojas,
    modulos: 1,
    glazing: input.config.glazing,
    leg: input.config.leg,
    reinforcement: input.config.reinforcement,
    variante: input.config.variantSlug,
    allowPreliminaryNonValidated: false,
  });

  if (resolution.estado !== "receta_unica") {
    return {
      snapshot: null,
      recipe: null,
      message: describeSodalL25PautaMessage(input.config),
    };
  }

  const snapshot = construirSnapshotFabricacionCotizacion({
    recipe: resolution.receta,
    entrada: {
      anchoTotalMm: input.anchoTotalMm,
      altoTotalMm: input.altoTotalMm,
      cantidad: input.cantidad,
      hojas: resolution.receta.definition.identidad.hojas,
      modulos: resolution.receta.definition.identidad.modulos,
      variante: resolution.receta.definition.identidad.variante,
    },
  });

  return {
    snapshot,
    recipe: resolution.receta,
    message: null,
  };
}
