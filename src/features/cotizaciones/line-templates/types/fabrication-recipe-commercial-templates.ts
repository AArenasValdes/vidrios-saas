/**
 * Biblioteca comercial V1: plantillas iniciales sugeridas (corredera) +
 * bases tipológicas pendientes (sin mm inventados).
 *
 * Naming: L5000 / L20 / L25 = “Plantillas iniciales sugeridas”, no verificadas
 * hasta pruebas reales de fabricación.
 *
 * Investigación documental externa solo prioriza catálogo/líneas. No agregar
 * seeds, adjustMm ni reglas de corte desde presencia en catálogos públicos.
 */

import {
  BASE_TIPOLOGICA_COPY,
  PLANTILLA_SUGERIDA_COPY,
  createEmptyRecipe,
  createRecipeComponent,
  type FabricationRecipe,
  type FabricationType,
  type MeasureBase,
  type RecipeComponent,
  type RecipeComponentFunction,
} from "./fabrication-recipe";
import { createStructuralRecipeTemplate } from "./fabrication-recipe-templates";

export { BASE_TIPOLOGICA_COPY, PLANTILLA_SUGERIDA_COPY };

export type CommercialTemplateKind = "plantilla_sugerida" | "base_tipologica";

export type CommercialTemplateMeta = {
  id: string;
  kind: CommercialTemplateKind;
  lineHint: string;
  title: string;
  subtitle: string;
  fabricationType: FabricationType;
  /** Hint: sash_width ≈ vano/hojas hasta tener hoja real del taller. */
  sashApproximationHint: string | null;
};

type ProfileSeed = {
  functionKey: RecipeComponentFunction;
  measureBase: MeasureBase;
  profileCode?: string;
  adjustMm?: number;
  quantityRule?: RecipeComponent["quantityRule"];
  quantityValue?: number;
  required?: boolean;
  notes?: string;
};

const SASH_APPROX_HINT =
  "Ancho/alto de hoja aproximados como vano ÷ hojas. Ajusta si tu taller mide la hoja real.";

function profile(
  functionKey: RecipeComponentFunction,
  measureBase: MeasureBase,
  adjustMm = 0,
  extras: Partial<ProfileSeed> = {}
): ProfileSeed {
  return {
    functionKey,
    measureBase,
    profileCode: extras.profileCode,
    adjustMm,
    quantityRule: extras.quantityRule ?? "fixed",
    quantityValue: extras.quantityValue ?? 1,
    required: extras.required ?? true,
    notes: extras.notes,
  };
}

export type CommercialProfileOption = {
  code: string;
  label: string;
  note?: string;
};

export type CommercialProfileFunction = Extract<
  RecipeComponentFunction,
  | "riel_superior"
  | "riel_inferior"
  | "jamba"
  | "cabezal"
  | "zocalo"
  | "pierna"
  | "traslapo"
>;

export type CommercialTemplateProfileCatalog = {
  defaults: Record<CommercialProfileFunction, CommercialProfileOption>;
  alternatives: Partial<
    Record<CommercialProfileFunction, readonly CommercialProfileOption[]>
  >;
  complements?: readonly CommercialProfileOption[];
};

/**
 * Códigos entregados para precargar las plantillas. Son referencias editables:
 * el taller puede reemplazarlos o retirar el componente en el editor.
 */
export const COMMERCIAL_TEMPLATE_PROFILE_CATALOG: Record<
  "L5000" | "L20" | "L25",
  CommercialTemplateProfileCatalog
> = {
  L5000: {
    defaults: {
      riel_superior: { code: "5001", label: "Riel superior" },
      riel_inferior: { code: "5002", label: "Riel inferior" },
      jamba: { code: "5003", label: "Jamba" },
      cabezal: { code: "5004", label: "Cabezal" },
      zocalo: { code: "5005", label: "Zócalo" },
      pierna: { code: "5006", label: "Pierna" },
      traslapo: { code: "5007", label: "Traslapo" },
    },
    alternatives: {},
  },
  L20: {
    defaults: {
      riel_superior: { code: "2001", label: "Riel superior" },
      riel_inferior: { code: "2002", label: "Riel inferior estándar" },
      jamba: { code: "2009", label: "Jamba" },
      cabezal: { code: "2004", label: "Cabezal" },
      zocalo: { code: "2005", label: "Zócalo" },
      pierna: { code: "2010", label: "Pierna / batiente" },
      traslapo: { code: "2019", label: "Traslapo monolítico" },
    },
    alternatives: {
      riel_superior: [
        { code: "2014", label: "Riel portafelpa" },
      ],
      riel_inferior: [
        { code: "2014", label: "Riel portafelpa" },
      ],
      traslapo: [
        { code: "2016", label: "Traslapo doble vidrio / termopanel" },
      ],
    },
  },
  L25: {
    defaults: {
      riel_superior: { code: "2501", label: "Riel superior" },
      riel_inferior: { code: "2502", label: "Riel inferior estándar" },
      jamba: { code: "2509", label: "Jamba" },
      cabezal: { code: "2504", label: "Cabezal" },
      zocalo: { code: "2505", label: "Zócalo" },
      pierna: { code: "2510", label: "Batiente / pierna monolítico" },
      traslapo: { code: "2507", label: "Traslapo monolítico" },
    },
    alternatives: {
      riel_inferior: [
        { code: "2513", label: "Riel cámara de agua" },
        { code: "2514", label: "Riel zona lluviosa" },
      ],
      pierna: [
        { code: "2516", label: "Batiente termopanel" },
      ],
      traslapo: [
        { code: "2518", label: "Traslapo termopanel" },
      ],
    },
    complements: [
      { code: "2521", label: "Adaptador de 4ta hoja" },
      { code: "2531", label: "Encuentro central" },
    ],
  },
};

/** L5000 corredera caracol — descuentos del plan V1. */
const L5000_SEEDS: ProfileSeed[] = [
  profile("riel_superior", "vano_width", 0, { profileCode: "5001" }),
  profile("riel_inferior", "vano_width", 0, { profileCode: "5002" }),
  profile("jamba", "vano_height", 3, { profileCode: "5003", quantityValue: 2 }),
  profile("cabezal", "sash_width", 2, { profileCode: "5004", quantityRule: "per_sash", quantityValue: 1 }),
  profile("zocalo", "sash_width", 2, { profileCode: "5005", quantityRule: "per_sash", quantityValue: 1 }),
  profile("pierna", "sash_height", 18, { profileCode: "5006", quantityRule: "per_sash", quantityValue: 1 }),
  profile("traslapo", "sash_height", 18, {
    profileCode: "5007",
    quantityRule: "per_sash",
    quantityValue: 1,
    required: false,
  }),
];

/** L20 corredera caracol. */
const L20_SEEDS: ProfileSeed[] = [
  profile("riel_superior", "vano_width", 12, {
    profileCode: "2001",
    notes: "Variante disponible: 2014 · Riel portafelpa.",
  }),
  profile("riel_inferior", "vano_width", 12, {
    profileCode: "2002",
    notes: "Variante disponible: 2014 · Riel portafelpa.",
  }),
  profile("jamba", "vano_height", 0, { profileCode: "2009", quantityValue: 2 }),
  profile("cabezal", "sash_width", 2, { profileCode: "2004", quantityRule: "per_sash", quantityValue: 1 }),
  profile("zocalo", "sash_width", 2, { profileCode: "2005", quantityRule: "per_sash", quantityValue: 1 }),
  profile("pierna", "sash_height", 27, { profileCode: "2010", quantityRule: "per_sash", quantityValue: 1 }),
  profile("traslapo", "sash_height", 27, {
    profileCode: "2019",
    notes: "Variante disponible: 2016 · Traslapo doble vidrio / termopanel.",
    quantityRule: "per_sash",
    quantityValue: 1,
    required: false,
  }),
];

/** L25 corredera caracol. */
const L25_SEEDS: ProfileSeed[] = [
  profile("riel_superior", "vano_width", 16, { profileCode: "2501" }),
  profile("riel_inferior", "vano_width", 16, {
    profileCode: "2502",
    notes: "Variantes disponibles: 2513 · Riel cámara de agua; 2514 · Riel zona lluviosa.",
  }),
  profile("jamba", "vano_height", 0, { profileCode: "2509", quantityValue: 2 }),
  profile("cabezal", "sash_width", 0, { profileCode: "2504", quantityRule: "per_sash", quantityValue: 1 }),
  profile("zocalo", "sash_width", 0, { profileCode: "2505", quantityRule: "per_sash", quantityValue: 1 }),
  profile("pierna", "sash_height", 35, {
    profileCode: "2510",
    quantityRule: "per_sash",
    quantityValue: 1,
    notes: "Variante disponible: 2516 · Batiente termopanel.",
  }),
  profile("traslapo", "sash_height", 35, {
    profileCode: "2507",
    notes:
      "Variantes disponibles: 2518 · Traslapo termopanel. Complementos: 2521 · Adaptador de 4ta hoja; 2531 · Encuentro central.",
    quantityRule: "per_sash",
    quantityValue: 1,
    required: false,
  }),
];

function buildSuggestedComponents(seeds: ProfileSeed[]): RecipeComponent[] {
  const profiles = seeds.map((seed) =>
    createRecipeComponent({
      functionKey: seed.functionKey,
      profileCode: seed.profileCode,
      measureBase: seed.measureBase,
      adjustMode: (seed.adjustMm ?? 0) > 0 ? "subtract" : "none",
      adjustMm: seed.adjustMm ?? 0,
      quantityRule: seed.quantityRule ?? "fixed",
      quantityValue: seed.quantityValue ?? 1,
      required: seed.required ?? true,
      notes: seed.notes ?? "",
      kind: "profile",
    })
  );

  const glass = createRecipeComponent({
    functionKey: "vidrio",
    kind: "glass",
    measureBase: "glass_width",
    quantityRule: "per_sash",
    quantityValue: 1,
    required: true,
  });

  const caracol = createRecipeComponent({
    functionKey: "accesorio",
    kind: "accessory",
    profileName: "Caracol",
    measureBase: "fixed",
    quantityRule: "per_sash",
    quantityValue: 1,
    required: false,
    notes: "Herraje caracol (no es perfil).",
  });

  return [...profiles, glass, caracol];
}

function createSuggestedSlidingRecipe(input: {
  lineHint: string;
  variant: string;
  seeds: ProfileSeed[];
}): FabricationRecipe {
  const base = createEmptyRecipe("corredera_2_hojas");
  return {
    ...base,
    fabricationType: "corredera_2_hojas",
    aperturaTipo: "corredera",
    herrajeTipo: "caracol",
    herrajeLabel: "",
    variant: input.variant,
    sashCount: 2,
    moduleCount: 1,
    status: "en_configuracion",
    sourceKind: "plantilla_sugerida",
    components: buildSuggestedComponents(input.seeds),
  };
}

export const COMMERCIAL_SUGGESTED_TEMPLATES: CommercialTemplateMeta[] = [
  {
    id: "sugerida_l5000_corredera_caracol",
    kind: "plantilla_sugerida",
    lineHint: "L5000",
    title: "L5000 · Corredera caracol",
    subtitle: PLANTILLA_SUGERIDA_COPY,
    fabricationType: "corredera_2_hojas",
    sashApproximationHint: SASH_APPROX_HINT,
  },
  {
    id: "sugerida_l20_corredera_caracol",
    kind: "plantilla_sugerida",
    lineHint: "L20",
    title: "L20 · Corredera caracol",
    subtitle: PLANTILLA_SUGERIDA_COPY,
    fabricationType: "corredera_2_hojas",
    sashApproximationHint: SASH_APPROX_HINT,
  },
  {
    id: "sugerida_l25_corredera_caracol",
    kind: "plantilla_sugerida",
    lineHint: "L25",
    title: "L25 · Corredera caracol",
    subtitle: PLANTILLA_SUGERIDA_COPY,
    fabricationType: "corredera_2_hojas",
    sashApproximationHint: SASH_APPROX_HINT,
  },
];

export const COMMERCIAL_PENDING_BASES: CommercialTemplateMeta[] = [
  {
    id: "base_pano_fijo",
    kind: "base_tipologica",
    lineHint: "",
    title: "Paño fijo",
    subtitle: BASE_TIPOLOGICA_COPY,
    fabricationType: "pano_fijo",
    sashApproximationHint: null,
  },
  {
    id: "base_abatible_1_hoja",
    kind: "base_tipologica",
    lineHint: "",
    title: "Abatible 1 hoja",
    subtitle: BASE_TIPOLOGICA_COPY,
    fabricationType: "abatible",
    sashApproximationHint: null,
  },
  {
    id: "base_proyectante_1_hoja",
    kind: "base_tipologica",
    lineHint: "",
    title: "Proyectante 1 hoja",
    subtitle: BASE_TIPOLOGICA_COPY,
    fabricationType: "proyectante",
    sashApproximationHint: null,
  },
  {
    id: "base_puerta_abatible_1_hoja",
    kind: "base_tipologica",
    lineHint: "",
    title: "Puerta abatible 1 hoja",
    subtitle: BASE_TIPOLOGICA_COPY,
    fabricationType: "puerta_abatible",
    sashApproximationHint: null,
  },
  {
    id: "base_puerta_corredera_2_hojas",
    kind: "base_tipologica",
    lineHint: "",
    title: "Puerta corredera 2 hojas",
    subtitle: BASE_TIPOLOGICA_COPY,
    fabricationType: "puerta_corredera",
    sashApproximationHint: null,
  },
];

export function createCommercialSuggestedRecipe(
  templateId: string
): FabricationRecipe | null {
  switch (templateId) {
    case "sugerida_l5000_corredera_caracol":
      return createSuggestedSlidingRecipe({
        lineHint: "L5000",
        variant: "L5000 caracol",
        seeds: L5000_SEEDS,
      });
    case "sugerida_l20_corredera_caracol":
      return createSuggestedSlidingRecipe({
        lineHint: "L20",
        variant: "L20 caracol",
        seeds: L20_SEEDS,
      });
    case "sugerida_l25_corredera_caracol":
      return createSuggestedSlidingRecipe({
        lineHint: "L25",
        variant: "L25 caracol",
        seeds: L25_SEEDS,
      });
    default:
      return null;
  }
}

export function createCommercialPendingBaseRecipe(
  templateId: string
): FabricationRecipe | null {
  const meta = COMMERCIAL_PENDING_BASES.find((entry) => entry.id === templateId);
  if (!meta) return null;
  const structural = createStructuralRecipeTemplate(meta.fabricationType);
  return {
    ...structural,
    variant: meta.title,
    sourceKind: "base_tipologica",
    status: "en_configuracion",
    herrajeTipo: "ninguno",
    // Seeds estructurales sin mm inventados: sin adjustMm.
    components: structural.components.map((component) => ({
      ...component,
      adjustMode: "none" as const,
      adjustMm: 0,
      notes:
        component.notes ||
        "Completa descuentos y códigos con tu forma de fabricar.",
    })),
  };
}

export function createCommercialTemplateRecipe(
  templateId: string
): FabricationRecipe | null {
  return (
    createCommercialSuggestedRecipe(templateId) ??
    createCommercialPendingBaseRecipe(templateId)
  );
}

/** Sugiere plantilla según nombre de línea (L5000 / L20 / L25). */
export function matchSuggestedTemplateIdByLineName(
  lineName: string | null | undefined
): string | null {
  const normalized = (lineName ?? "").toLocaleUpperCase("es");
  if (normalized.includes("L5000") || normalized.includes("5000")) {
    return "sugerida_l5000_corredera_caracol";
  }
  if (/\bL20\b/.test(normalized) || normalized.includes(" L20")) {
    return "sugerida_l20_corredera_caracol";
  }
  if (/\bL25\b/.test(normalized) || normalized.includes(" L25")) {
    return "sugerida_l25_corredera_caracol";
  }
  return null;
}
