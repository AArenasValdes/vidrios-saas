import {
  createEmptyRecipe,
  createRecipeComponent,
  type FabricationRecipe,
  type FabricationType,
  type RecipeComponent,
  type RecipeComponentFunction,
} from "./fabrication-recipe";

type TemplateSeed = {
  functionKey: RecipeComponentFunction;
  required?: boolean;
  quantityRule?: RecipeComponent["quantityRule"];
  quantityValue?: number;
  measureBase?: RecipeComponent["measureBase"];
  kind?: RecipeComponent["kind"];
};

const CORREDERA_SEEDS: TemplateSeed[] = [
  { functionKey: "riel_superior", measureBase: "vano_width", quantityValue: 1 },
  { functionKey: "riel_inferior", measureBase: "vano_width", quantityValue: 1 },
  { functionKey: "jamba", measureBase: "vano_height", quantityValue: 2 },
  {
    functionKey: "cabezal",
    measureBase: "half_vano_width",
    quantityRule: "per_sash",
    quantityValue: 1,
  },
  {
    functionKey: "zocalo",
    measureBase: "half_vano_width",
    quantityRule: "per_sash",
    quantityValue: 1,
  },
  {
    functionKey: "pierna",
    measureBase: "sash_height",
    quantityRule: "per_sash",
    quantityValue: 1,
  },
  {
    functionKey: "traslapo",
    measureBase: "sash_height",
    quantityRule: "per_sash",
    quantityValue: 1,
    required: false,
  },
  {
    functionKey: "vidrio",
    kind: "glass",
    measureBase: "glass_width",
    quantityRule: "per_sash",
    quantityValue: 1,
  },
  {
    functionKey: "accesorio",
    kind: "accessory",
    measureBase: "fixed",
    quantityRule: "two_per_sash",
    quantityValue: 1,
    required: false,
  },
];

const PROYECTANTE_SEEDS: TemplateSeed[] = [
  { functionKey: "marco", measureBase: "vano_width", quantityValue: 2 },
  { functionKey: "marco", measureBase: "vano_height", quantityValue: 2 },
  { functionKey: "hoja", measureBase: "sash_width", quantityValue: 2 },
  { functionKey: "hoja", measureBase: "sash_height", quantityValue: 2 },
  {
    functionKey: "junquillo",
    measureBase: "glass_width",
    quantityValue: 4,
    required: false,
  },
  {
    functionKey: "palillo",
    measureBase: "fixed",
    quantityValue: 1,
    required: false,
  },
  {
    functionKey: "vidrio",
    kind: "glass",
    measureBase: "glass_width",
    quantityValue: 1,
  },
  {
    functionKey: "accesorio",
    kind: "accessory",
    measureBase: "fixed",
    quantityValue: 1,
    required: false,
  },
];

const PANO_FIJO_SEEDS: TemplateSeed[] = [
  { functionKey: "marco", measureBase: "vano_width", quantityValue: 2 },
  { functionKey: "marco", measureBase: "vano_height", quantityValue: 2 },
  {
    functionKey: "junquillo",
    measureBase: "glass_width",
    quantityValue: 4,
    required: false,
  },
  {
    functionKey: "palillo",
    measureBase: "fixed",
    quantityValue: 1,
    required: false,
  },
  {
    functionKey: "vidrio",
    kind: "glass",
    measureBase: "glass_width",
    quantityValue: 1,
  },
];

const PUERTA_ABATIBLE_SEEDS: TemplateSeed[] = [
  { functionKey: "marco", measureBase: "vano_width", quantityValue: 2 },
  { functionKey: "jamba", measureBase: "vano_height", quantityValue: 2 },
  { functionKey: "cabezal", measureBase: "vano_width", quantityValue: 1 },
  { functionKey: "hoja", measureBase: "sash_width", quantityValue: 2 },
  { functionKey: "hoja", measureBase: "sash_height", quantityValue: 2 },
  {
    functionKey: "travesano",
    measureBase: "sash_width",
    quantityValue: 1,
    required: false,
  },
  {
    functionKey: "zocalo",
    measureBase: "sash_width",
    quantityValue: 1,
    required: false,
  },
  {
    functionKey: "junquillo",
    measureBase: "glass_width",
    quantityValue: 4,
    required: false,
  },
  {
    functionKey: "vidrio",
    kind: "glass",
    measureBase: "glass_width",
    quantityValue: 1,
  },
  {
    functionKey: "accesorio",
    kind: "accessory",
    measureBase: "fixed",
    quantityValue: 1,
    required: false,
  },
];

const SHOWER_CORREDERA_SEEDS: TemplateSeed[] = [
  { functionKey: "riel_superior", measureBase: "vano_width", quantityValue: 1 },
  { functionKey: "riel_inferior", measureBase: "vano_width", quantityValue: 1 },
  { functionKey: "jamba", measureBase: "vano_height", quantityValue: 2 },
  {
    functionKey: "pierna",
    measureBase: "sash_height",
    quantityRule: "two_per_sash",
    quantityValue: 1,
  },
  {
    functionKey: "vidrio",
    kind: "glass",
    measureBase: "glass_width",
    quantityRule: "per_sash",
    quantityValue: 1,
  },
  {
    functionKey: "accesorio",
    kind: "accessory",
    measureBase: "fixed",
    quantityRule: "per_sash",
    quantityValue: 1,
    required: false,
  },
];

const SHOWER_ABATIBLE_SEEDS: TemplateSeed[] = [
  { functionKey: "marco", measureBase: "vano_width", quantityValue: 1 },
  { functionKey: "jamba", measureBase: "vano_height", quantityValue: 2 },
  {
    functionKey: "hoja",
    measureBase: "sash_height",
    quantityValue: 2,
  },
  {
    functionKey: "vidrio",
    kind: "glass",
    measureBase: "glass_width",
    quantityValue: 1,
  },
  {
    functionKey: "accesorio",
    kind: "accessory",
    measureBase: "fixed",
    quantityValue: 1,
    required: false,
  },
];

function seedsForType(type: FabricationType): TemplateSeed[] {
  switch (type) {
    case "corredera_2_hojas":
    case "corredera_3_hojas":
    case "corredera_4_hojas":
    case "puerta_corredera":
    case "cierre_logia":
      return CORREDERA_SEEDS;
    case "proyectante":
    case "abatible":
      return PROYECTANTE_SEEDS;
    case "pano_fijo":
      return PANO_FIJO_SEEDS;
    case "puerta_abatible":
      return PUERTA_ABATIBLE_SEEDS;
    case "shower_corredera":
      return SHOWER_CORREDERA_SEEDS;
    case "shower_abatible":
      return SHOWER_ABATIBLE_SEEDS;
    case "personalizado":
      return [];
    default:
      return [];
  }
}

function defaultSashCount(type: FabricationType): number {
  if (type === "corredera_3_hojas") return 3;
  if (type === "corredera_4_hojas") return 4;
  if (
    type === "corredera_2_hojas" ||
    type === "puerta_corredera" ||
    type === "shower_corredera" ||
    type === "cierre_logia"
  ) {
    return 2;
  }
  return 1;
}

/**
 * Plantilla estructural sugerida: funciones habituales sin códigos ni mm universales.
 */
export function createStructuralRecipeTemplate(
  fabricationType: FabricationType
): FabricationRecipe {
  const base = createEmptyRecipe(fabricationType);
  const components = seedsForType(fabricationType).map((seed) =>
    createRecipeComponent({
      functionKey: seed.functionKey,
      required: seed.required ?? true,
      quantityRule: seed.quantityRule ?? "fixed",
      quantityValue: seed.quantityValue ?? 1,
      measureBase: seed.measureBase,
      kind: seed.kind,
    })
  );

  return {
    ...base,
    sashCount: defaultSashCount(fabricationType),
    status: components.length === 0 ? "sin_configurar" : "en_configuracion",
    components,
  };
}

export function fabricationTypeFromLegacySystem(
  system: string | null | undefined
): FabricationType {
  if (system === "pano_fijo") return "pano_fijo";
  if (system === "puerta_abatible_1_hoja") return "puerta_abatible";
  if (system === "corredera_2_hojas") return "corredera_2_hojas";
  return "corredera_2_hojas";
}
