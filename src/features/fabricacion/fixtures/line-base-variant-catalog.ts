import {
  crearRecetaPlantillaVentoraCorredera2H,
  crearBaseTipologicaVentora,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  crearRecetaSerie32ProyectanteNormal,
  crearRecetaSerie42Proyectante,
} from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import {
  crearRecetaL20AlumetricaVariant,
  isL20CatalogKey,
  L20_ALUMETRICA_VARIANT_LABELS,
  L20_CORREDERA_VARIANT_SLUGS,
  L20_FIJOS_CATALOG_KEY,
  L20_FIJOS_VARIANT_SLUGS,
  type L20AlumetricaVariantSlug,
  resolveL20AperturaFromVariant,
} from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";
import {
  SERIE_4800_CATALOG_KEY,
  SERIE_4800_SOURCE_REFERENCE_NORMAL,
  SERIE_4800_SOURCE_REFERENCE_REFORZADA,
  SERIE_4800_VARIANT_NORMAL,
  SERIE_4800_VARIANT_REFORZADA,
  crearRecetaSerie4800Corredera,
} from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";
import {
  LINE_15_CATALOG_KEY,
  LINE_15_SOURCE_REFERENCE_2H,
  LINE_15_SOURCE_REFERENCE_3H_3RIELES,
  LINE_15_SOURCE_REFERENCE_4H_2RIELES,
  LINE_15_SOURCE_REFERENCE_4H_4RIELES,
  LINE_15_VARIANT_2H,
  LINE_15_VARIANT_3H_3RIELES,
  LINE_15_VARIANT_4H_2RIELES,
  LINE_15_VARIANT_4H_4RIELES,
  crearRecetaLine15Corredera,
} from "@/features/fabricacion/fixtures/line-15-corredera-recipe";
import {
  LINE_4000_CATALOG_KEY,
  LINE_4000_SOURCE_REFERENCE_2H,
  LINE_4000_SOURCE_REFERENCE_3H_3RIELES,
  LINE_4000_SOURCE_REFERENCE_4H_2RIELES,
  LINE_4000_SOURCE_REFERENCE_4H_4RIELES,
  LINE_4000_VARIANT_2H,
  LINE_4000_VARIANT_3H_3RIELES,
  LINE_4000_VARIANT_4H_2RIELES,
  LINE_4000_VARIANT_4H_4RIELES,
  crearRecetaLine4000Corredera,
} from "@/features/fabricacion/fixtures/line-4000-corredera-recipe";
import {
  crearRecetaSerie42Alar,
  crearRecetaSerie42Sodal,
  SERIE_42_PROVIDER_VARIANTS,
} from "@/features/fabricacion/fixtures/serie-42-provider-recipes";
import {
  crearRecetaVeratec7400Corredera,
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_SOURCE_REVISION,
  VERATEC_7400_SOURCE_VARIANTS,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import type { FabricacionReceta, FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeSourceType } from "@/features/fabricacion/types/fabricacion-persistence";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

export const BASE_LINE_CATALOG_KEYS = [
  "ventora:l5000",
  "ventora:l20",
  L20_FIJOS_CATALOG_KEY,
  "ventora:l25",
  "ventora:l32",
  "ventora:l42",
  VERATEC_7400_CATALOG_KEY,
] as const;

export type BaseLineCatalogKey = (typeof BASE_LINE_CATALOG_KEYS)[number];

export type LineVariantEvidenceLevel =
  | "workshop_partial"
  | "documented"
  | "structural_only"
  | "none";

export type LineVariantSlot = {
  typology: FabricacionTipologia;
  leavesCount: number;
  modulesCount: number;
  /** Clave estable para matching (slug). */
  variantSlug: string;
  /** Etiqueta humana en UI. */
  variantLabel: string;
  /** Apertura comercial para resolver receta en cotización (p. ej. L20 fijos). */
  apertura?: string | null;
  herraje?: string | null;
  /** Procedencia documental cuando la variante viene de fabricante/proveedor. */
  sourceType?: Extract<FabricationRecipeSourceType, "manufacturer" | "supplier">;
  sourceName?: string;
  sourceRevision?: string;
  evidenceLevel: LineVariantEvidenceLevel;
  /** Tiene perfiles con ajusteMm documentado y composición calculable. */
  complete: boolean;
  pendingFields: readonly string[];
  sourceReference: string;
  buildDefinition: (input: { lineName: string; plantillaId?: PlantillaVentoraCorrederaId }) => FabricacionReceta;
};

function finalizeCorrederaCaracolRecipe(
  recipe: FabricacionReceta,
  input: { lineName: string; plantillaId: PlantillaVentoraCorrederaId; variantLabel: string }
): FabricacionReceta {
  return {
    ...recipe,
    identidad: {
      ...recipe.identidad,
      nombre: `${input.lineName.trim() || input.plantillaId} · Corredera 2 hojas · ${input.variantLabel}`,
      variante: "caracol",
      herraje: "caracol",
    },
  };
}

function createIncompleteCorrederaVariant(input: {
  lineName: string;
  plantillaId: PlantillaVentoraCorrederaId;
  leavesCount: number;
  variantSlug: string;
  variantLabel: string;
  pendingFields: readonly string[];
  catalogNotes?: readonly string[];
}): FabricacionReceta {
  const base = crearBaseTipologicaVentora({
    tipologia: "corredera",
    hojas: input.leavesCount,
    modulos: input.leavesCount,
    lineName: input.lineName.trim() || input.plantillaId,
  });

  return {
    ...base,
    identidad: {
      ...base.identidad,
      codigo: `${input.plantillaId}-${input.leavesCount}H-${input.variantSlug.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || input.plantillaId} · Corredera ${input.leavesCount} hojas · ${input.variantLabel}`,
      variante: input.variantSlug,
      herraje: "reforzada",
    },
    datosPendientes: [...input.pendingFields],
    notasValidacion: [
      `Variante ${input.variantLabel} registrada sin fórmulas validadas de taller.`,
      "Configura perfiles, cantidades, descuentos mm y largos comerciales antes de probar.",
      ...(input.catalogNotes ?? []),
    ],
    configuracionCorte: {
      ...(base.configuracionCorte ?? {
        perdidaCorteMm: null,
        despunteInicialMm: null,
        sobranteMinimoAprovechableMm: null,
      }),
      largoComercialDefaultMm:
        base.configuracionCorte?.largoComercialDefaultMm ?? VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
  };
}

const L25_3H_4H_PENDING: readonly string[] = [
  "Confirmar perfiles reforzados para corredera de 3 o 4 hojas",
  "Confirmar descuentos mm de pierna reforzada y pierna abierta",
  "Confirmar cantidades por perfil según composición real del taller",
  "Confirmar reglas de encuentro central (2531) si aplica",
  "Confirmar adaptador de 4ª hoja (2521) si aplica",
  "Confirmar vidrio y accesorios de la variante",
];

const L25_CATALOG_NOTES: readonly string[] = [
  "Referencias documentadas en catálogo (2513, 2514, 2516, 2518, 2521, 2531) son orientativas; no entran al cálculo hasta configurarse en la receta.",
];

function correderaCaracolSlot(
  plantillaId: PlantillaVentoraCorrederaId,
  sourceReference: string
): LineVariantSlot {
  return {
    typology: "corredera",
    leavesCount: 2,
    modulesCount: 2,
    variantSlug: "caracol",
    variantLabel: "Caracol",
    herraje: "caracol",
    evidenceLevel: "workshop_partial",
    complete: true,
    pendingFields: [
      "Confirmar evidencia física completa en taller",
      "Confirmar vidrio y accesorios",
    ],
    sourceReference,
    buildDefinition: ({ lineName }) =>
      finalizeCorrederaCaracolRecipe(
        crearRecetaPlantillaVentoraCorredera2H(plantillaId),
        { lineName, plantillaId, variantLabel: "Caracol" }
      ),
  };
}

function l20AlumetricaSlot(variant: L20AlumetricaVariantSlug): LineVariantSlot {
  const label = L20_ALUMETRICA_VARIANT_LABELS[variant];
  const isReferenceVariant = variant === "pierna_cerrada_jamba_2009";
  return {
    typology: "corredera",
    leavesCount: 2,
    modulesCount: 2,
    variantSlug: variant,
    variantLabel: label,
    apertura: resolveL20AperturaFromVariant(variant),
    herraje: null,
    evidenceLevel: isReferenceVariant ? "workshop_partial" : "documented",
    complete: true,
    pendingFields: isReferenceVariant
      ? ["Confirmar evidencia física completa en taller"]
      : ["Confirmar evidencia física completa en taller", "Confirmar accesorios"],
    sourceReference: `ventora-variant:l20:2h:${variant}`,
    buildDefinition: ({ lineName }) =>
      crearRecetaL20AlumetricaVariant({ variant, lineName }),
  };
}

function l20AlumetricaSlotsForVariants(
  variants: readonly L20AlumetricaVariantSlug[],
): LineVariantSlot[] {
  return variants.map((variant) => l20AlumetricaSlot(variant));
}

function l25ExtendedSlots(plantillaId: PlantillaVentoraCorrederaId): LineVariantSlot[] {
  return [
    {
      typology: "corredera",
      leavesCount: 3,
      modulesCount: 3,
      variantSlug: "reforzada_pierna_abierta",
      variantLabel: "Reforzada · Pierna abierta",
      herraje: "reforzada",
      evidenceLevel: "none",
      complete: false,
      pendingFields: L25_3H_4H_PENDING,
      sourceReference: "ventora-variant:l25:3h:reforzada_pierna_abierta",
      buildDefinition: ({ lineName }) =>
        createIncompleteCorrederaVariant({
          lineName,
          plantillaId,
          leavesCount: 3,
          variantSlug: "reforzada_pierna_abierta",
          variantLabel: "Reforzada · Pierna abierta",
          pendingFields: L25_3H_4H_PENDING,
          catalogNotes: L25_CATALOG_NOTES,
        }),
    },
    {
      typology: "corredera",
      leavesCount: 4,
      modulesCount: 4,
      variantSlug: "reforzada_pierna_abierta",
      variantLabel: "Reforzada · Pierna abierta",
      herraje: "reforzada",
      evidenceLevel: "none",
      complete: false,
      pendingFields: L25_3H_4H_PENDING,
      sourceReference: "ventora-variant:l25:4h:reforzada_pierna_abierta",
      buildDefinition: ({ lineName }) =>
        createIncompleteCorrederaVariant({
          lineName,
          plantillaId,
          leavesCount: 4,
          variantSlug: "reforzada_pierna_abierta",
          variantLabel: "Reforzada · Pierna abierta",
          pendingFields: L25_3H_4H_PENDING,
          catalogNotes: L25_CATALOG_NOTES,
        }),
    },
  ];
}

export const LINE_BASE_VARIANT_CATALOG: Partial<Record<BaseLineCatalogKey, LineVariantSlot[]>> = {
  "ventora:l5000": [correderaCaracolSlot("L5000", "ventora-variant:l5000:2h:caracol")],
  "ventora:l20": l20AlumetricaSlotsForVariants(L20_CORREDERA_VARIANT_SLUGS),
  [L20_FIJOS_CATALOG_KEY]: l20AlumetricaSlotsForVariants(L20_FIJOS_VARIANT_SLUGS),
  "ventora:l25": [
    correderaCaracolSlot("L25", "ventora-variant:l25:2h:caracol"),
    ...l25ExtendedSlots("L25"),
  ],
  "ventora:l32": [
    {
      typology: "proyectante",
      leavesCount: 1,
      modulesCount: 1,
      variantSlug: "normal",
      variantLabel: "Normal",
      evidenceLevel: "workshop_partial",
      complete: false,
      pendingFields: [
        "Confirmar composición exacta de 3204/3205",
        "Confirmar vidrio y accesorios",
        "Confirmar evidencia física completa en taller",
      ],
      sourceReference: "ventora-variant:l32:1h:normal",
      buildDefinition: ({ lineName }) =>
        crearRecetaSerie32ProyectanteNormal({ lineName }),
    },
  ],
  "ventora:l42": [
    {
      typology: "proyectante",
      leavesCount: 1,
      modulesCount: 1,
      variantSlug: "normal",
      variantLabel: "Normal",
      evidenceLevel: "workshop_partial",
      complete: false,
      pendingFields: [
        "Completar par de junquillos 4229",
        "Confirmar vidrio y accesorios",
        "Confirmar evidencia física completa en taller",
      ],
      sourceReference: "ventora-variant:l42:1h:normal",
      buildDefinition: ({ lineName }) =>
        crearRecetaSerie42Proyectante({
          variant: "normal",
          lineName,
        }),
    },
    {
      typology: "proyectante",
      leavesCount: 1,
      modulesCount: 1,
      variantSlug: SERIE_42_PROVIDER_VARIANTS.alar,
      variantLabel: "ALAR · Marco fijo 4201",
      sourceType: "supplier",
      sourceName: "ALAR",
      sourceRevision: "pauta-aportada-2026-09-21-v1",
      evidenceLevel: "workshop_partial",
      complete: false,
      pendingFields: [
        "Definir medida interior del junquillo 4229/4206",
        "Confirmar medida de vidrio",
      ],
      sourceReference: "user-provided:alar-linea42:proyectante-4201:2026-09-21",
      buildDefinition: ({ lineName }) => crearRecetaSerie42Alar({ lineName }),
    },
    {
      typology: "proyectante",
      leavesCount: 1,
      modulesCount: 1,
      variantSlug: SERIE_42_PROVIDER_VARIANTS.alarWaterChamber,
      variantLabel: "ALAR · Cámara de agua 4204",
      sourceType: "supplier",
      sourceName: "ALAR",
      sourceRevision: "pauta-aportada-2026-09-21-v1",
      evidenceLevel: "workshop_partial",
      complete: false,
      pendingFields: [
        "Definir medida interior del junquillo 4229/4206",
        "Confirmar medida de vidrio",
        "Confirmar ángulo de corte del 4204 para el ensamble real",
      ],
      sourceReference:
        "user-provided:alar-linea42:4204-camara-agua:2026-09-21",
      buildDefinition: ({ lineName }) =>
        crearRecetaSerie42Alar({ lineName, waterChamber: true }),
    },
    {
      typology: "proyectante",
      leavesCount: 1,
      modulesCount: 1,
      variantSlug: SERIE_42_PROVIDER_VARIANTS.sodal,
      variantLabel: "SODAL · Sin cámara · Monolítico",
      sourceType: "manufacturer",
      sourceName: "SODAL",
      sourceRevision: "alumetrica-serie-4200-2026-09-21-v1",
      evidenceLevel: "documented",
      complete: true,
      pendingFields: ["Probar una fabricación real antes de validar"],
      sourceReference:
        "alumetrica:sodal-serie-4200:proyectante-sin-camara:monolitico:v1",
      buildDefinition: ({ lineName }) => crearRecetaSerie42Sodal({ lineName }),
    },
  ],
  [VERATEC_7400_CATALOG_KEY]: VERATEC_7400_SOURCE_VARIANTS.map((variant) => {
    const isMonolithic = variant.slug === "monolitico_4mm";
    const isTwentyFour = variant.slug === "termopanel_24mm";
    return {
      typology: "corredera",
      leavesCount: 2,
      modulesCount: 2,
      variantSlug: variant.slug,
      variantLabel: variant.label,
      sourceType: "manufacturer",
      sourceName: "VERATEC",
      sourceRevision: VERATEC_7400_SOURCE_REVISION,
      evidenceLevel: "documented",
      complete: isMonolithic,
      pendingFields: isMonolithic
        ? ["Probar una fabricación real en taller antes de validar"]
        : isTwentyFour
          ? [
              "Confirmar si la fórmula del junquillo debe usar 6307 o 7063",
              "Probar una fabricación real en taller antes de validar",
            ]
          : [
              "Aclarar la diferencia entre el nombre ‘Monolítico 20 mm’ y la categoría termopanel de la ficha",
              "Probar una fabricación real en taller antes de validar",
            ],
      sourceReference: variant.sourceReference,
      buildDefinition: ({ lineName }) =>
        crearRecetaVeratec7400Corredera({
          lineName,
          variant: variant.slug,
        }),
    };
  }),
};

const SERIE_4800_VARIANT_SLOTS: LineVariantSlot[] = [
  {
    typology: "corredera",
    leavesCount: 2,
    modulesCount: 2,
    variantSlug: SERIE_4800_VARIANT_NORMAL,
    variantLabel: "Normal",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: [],
    sourceReference: SERIE_4800_SOURCE_REFERENCE_NORMAL,
    buildDefinition: ({ lineName }) =>
      crearRecetaSerie4800Corredera({
        lineName,
        variant: SERIE_4800_VARIANT_NORMAL,
      }),
  },
  {
    typology: "corredera",
    leavesCount: 2,
    modulesCount: 2,
    variantSlug: SERIE_4800_VARIANT_REFORZADA,
    variantLabel: "Reforzada",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: [],
    sourceReference: SERIE_4800_SOURCE_REFERENCE_REFORZADA,
    buildDefinition: ({ lineName }) =>
      crearRecetaSerie4800Corredera({
        lineName,
        variant: SERIE_4800_VARIANT_REFORZADA,
      }),
  },
];

const LINE_15_VARIANT_SLOTS: LineVariantSlot[] = [
  {
    typology: "corredera",
    leavesCount: 2,
    modulesCount: 2,
    variantSlug: LINE_15_VARIANT_2H,
    variantLabel: "Corredera 2 hojas",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: [],
    sourceReference: LINE_15_SOURCE_REFERENCE_2H,
    buildDefinition: ({ lineName }) =>
      crearRecetaLine15Corredera({ lineName, variant: LINE_15_VARIANT_2H }),
  },
  {
    typology: "corredera",
    leavesCount: 3,
    modulesCount: 3,
    variantSlug: LINE_15_VARIANT_3H_3RIELES,
    variantLabel: "3 hojas · 3 rieles",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: ["Vidrio por variante"],
    sourceReference: LINE_15_SOURCE_REFERENCE_3H_3RIELES,
    buildDefinition: ({ lineName }) =>
      crearRecetaLine15Corredera({ lineName, variant: LINE_15_VARIANT_3H_3RIELES }),
  },
  {
    typology: "corredera",
    leavesCount: 4,
    modulesCount: 4,
    variantSlug: LINE_15_VARIANT_4H_2RIELES,
    variantLabel: "4 hojas · 2 rieles",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: ["Vidrio por variante"],
    sourceReference: LINE_15_SOURCE_REFERENCE_4H_2RIELES,
    buildDefinition: ({ lineName }) =>
      crearRecetaLine15Corredera({ lineName, variant: LINE_15_VARIANT_4H_2RIELES }),
  },
  {
    typology: "corredera",
    leavesCount: 4,
    modulesCount: 4,
    variantSlug: LINE_15_VARIANT_4H_4RIELES,
    variantLabel: "4 hojas · 4 rieles",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: ["Vidrio por variante"],
    sourceReference: LINE_15_SOURCE_REFERENCE_4H_4RIELES,
    buildDefinition: ({ lineName }) =>
      crearRecetaLine15Corredera({ lineName, variant: LINE_15_VARIANT_4H_4RIELES }),
  },
];

const LINE_4000_VARIANT_SLOTS: LineVariantSlot[] = [
  {
    typology: "corredera",
    leavesCount: 2,
    modulesCount: 2,
    variantSlug: LINE_4000_VARIANT_2H,
    variantLabel: "Corredera 2 hojas",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: [],
    sourceReference: LINE_4000_SOURCE_REFERENCE_2H,
    buildDefinition: ({ lineName }) =>
      crearRecetaLine4000Corredera({ lineName, variant: LINE_4000_VARIANT_2H }),
  },
  {
    typology: "corredera",
    leavesCount: 3,
    modulesCount: 3,
    variantSlug: LINE_4000_VARIANT_3H_3RIELES,
    variantLabel: "3 hojas · 3 rieles",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: ["Vidrio por variante"],
    sourceReference: LINE_4000_SOURCE_REFERENCE_3H_3RIELES,
    buildDefinition: ({ lineName }) =>
      crearRecetaLine4000Corredera({ lineName, variant: LINE_4000_VARIANT_3H_3RIELES }),
  },
  {
    typology: "corredera",
    leavesCount: 4,
    modulesCount: 4,
    variantSlug: LINE_4000_VARIANT_4H_2RIELES,
    variantLabel: "4 hojas · 2 rieles",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: ["Vidrio por variante"],
    sourceReference: LINE_4000_SOURCE_REFERENCE_4H_2RIELES,
    buildDefinition: ({ lineName }) =>
      crearRecetaLine4000Corredera({ lineName, variant: LINE_4000_VARIANT_4H_2RIELES }),
  },
  {
    typology: "corredera",
    leavesCount: 4,
    modulesCount: 4,
    variantSlug: LINE_4000_VARIANT_4H_4RIELES,
    variantLabel: "4 hojas · 4 rieles",
    evidenceLevel: "documented",
    complete: true,
    pendingFields: ["Vidrio por variante"],
    sourceReference: LINE_4000_SOURCE_REFERENCE_4H_4RIELES,
    buildDefinition: ({ lineName }) =>
      crearRecetaLine4000Corredera({ lineName, variant: LINE_4000_VARIANT_4H_4RIELES }),
  },
];

export function getLineVariantSlots(catalogKey: string | null | undefined): LineVariantSlot[] {
  if (!catalogKey) return [];
  if (catalogKey === SERIE_4800_CATALOG_KEY) return SERIE_4800_VARIANT_SLOTS;
  if (catalogKey === VERATEC_7400_CATALOG_KEY) {
    return LINE_BASE_VARIANT_CATALOG[VERATEC_7400_CATALOG_KEY] ?? [];
  }
  if (catalogKey === LINE_15_CATALOG_KEY) return LINE_15_VARIANT_SLOTS;
  if (catalogKey === LINE_4000_CATALOG_KEY) return LINE_4000_VARIANT_SLOTS;
  return LINE_BASE_VARIANT_CATALOG[catalogKey as BaseLineCatalogKey] ?? [];
}

/** Árbol de fabricación: Serie 20 muestra corredera y fijos juntos. */
export function getLineVariantSlotsForFabricationTree(
  catalogKey: string | null | undefined
): LineVariantSlot[] {
  if (isL20CatalogKey(catalogKey)) {
    return [
      ...l20AlumetricaSlotsForVariants(L20_CORREDERA_VARIANT_SLUGS),
      ...l20AlumetricaSlotsForVariants(L20_FIJOS_VARIANT_SLUGS),
    ];
  }
  return getLineVariantSlots(catalogKey);
}

export function shouldShowFabricationVariantGallery(
  catalogKey: string | null | undefined
): boolean {
  if (isL20CatalogKey(catalogKey)) return true;
  return getLineVariantSlots(catalogKey).length > 1;
}

export function isBaseLineCatalogKey(
  catalogKey: string | null | undefined
): catalogKey is BaseLineCatalogKey {
  return BASE_LINE_CATALOG_KEYS.includes(catalogKey as BaseLineCatalogKey);
}

export function resolvePlantillaIdFromCatalogKey(
  catalogKey: string | null | undefined
): PlantillaVentoraCorrederaId | undefined {
  if (catalogKey === "ventora:l5000") return "L5000";
  if (catalogKey === "ventora:l20" || catalogKey === L20_FIJOS_CATALOG_KEY) return "L20";
  if (catalogKey === "ventora:l25") return "L25";
  return undefined;
}
