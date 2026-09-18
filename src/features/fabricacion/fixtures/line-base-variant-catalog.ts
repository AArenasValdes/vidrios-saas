import {
  crearRecetaPlantillaVentoraCorredera2H,
  crearBaseTipologicaVentora,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  crearRecetaSerie32ProyectanteNormal,
  crearRecetaSerie42Proyectante,
} from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import type { FabricacionReceta, FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

export const BASE_LINE_CATALOG_KEYS = [
  "ventora:l5000",
  "ventora:l20",
  "ventora:l25",
  "ventora:l32",
  "ventora:l42",
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
  herraje?: string | null;
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
  "ventora:l20": [correderaCaracolSlot("L20", "ventora-variant:l20:2h:caracol")],
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
  ],
};

export function getLineVariantSlots(catalogKey: string | null | undefined): LineVariantSlot[] {
  if (!catalogKey) return [];
  return LINE_BASE_VARIANT_CATALOG[catalogKey as BaseLineCatalogKey] ?? [];
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
  if (catalogKey === "ventora:l20") return "L20";
  if (catalogKey === "ventora:l25") return "L25";
  return undefined;
}
