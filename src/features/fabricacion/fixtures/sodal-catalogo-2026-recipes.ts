import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionAccesorio,
  type FabricacionBaseMedida,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionTipologia,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";

export type SodalCatalogo2026RecipeKey =
  | "ventora:optima-s28-corredera-2h"
  | "ventora:optima-s28-corredera-3h"
  | "ventora:s38-rpt-proyectante";

type RecipeInput = {
  lineName: string;
  createId?: () => string;
};

const DEFAULT_BAR_LENGTH_MM = 6000;

function fallbackId() {
  return `sodal-2026-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function profile(
  createId: () => string,
  input: {
    code: string;
    name: string;
    functionName: string;
    base: FabricacionBaseMedida;
    adjustmentMm: number;
    quantity: number;
    cut: string;
  },
): FabricacionComponentePerfil {
  return {
    id: createId(),
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.functionName,
    largoComercialMm: DEFAULT_BAR_LENGTH_MM,
    reglaMedida: { base: input.base, ajusteMm: input.adjustmentMm },
    reglaCantidad: { tipo: "fija", cantidad: input.quantity },
    requerido: true,
    corte: input.cut,
    observaciones: "Medida y cantidad transcritas de la pauta SODAL 2026.",
  };
}

function glass(
  createId: () => string,
  input: {
    name: string;
    widthBase: FabricacionBaseMedida;
    widthAdjustmentMm: number;
    heightBase: FabricacionBaseMedida;
    heightAdjustmentMm: number;
    quantity: number;
  },
): FabricacionVidrio {
  return {
    id: createId(),
    nombre: input.name,
    reglaAncho: { base: input.widthBase, ajusteMm: input.widthAdjustmentMm },
    reglaAlto: { base: input.heightBase, ajusteMm: input.heightAdjustmentMm },
    reglaCantidad: { tipo: "fija", cantidad: input.quantity },
    requerido: false,
    observaciones: "La ficha SODAL fija dimensiones; composición y espesor deben coincidir con la variante indicada.",
  };
}

function accessory(
  createId: () => string,
  input: { name: string; quantity: number; unit: string; formula?: string },
): FabricacionAccesorio {
  return {
    id: createId(),
    codigo: "",
    nombre: input.name,
    reglaCantidad: { tipo: "fija", cantidad: input.quantity },
    requerido: false,
    unidad: input.unit,
    ...(input.formula ? { formulaCantidad: input.formula } : {}),
    observaciones: input.formula
      ? "Consumo lineal según pauta SODAL 2026; pendiente de vincular SKU/código de compra del taller."
      : "Cantidad y descripción según pauta SODAL 2026; pendiente de vincular SKU/código de compra del taller.",
  };
}

function baseRecipe(input: RecipeInput & {
  code: string;
  variant: string;
  typology: FabricacionTipologia;
  leaves: number;
  profiles: FabricacionComponentePerfil[];
  glasses: FabricacionVidrio[];
  accessories: FabricacionAccesorio[];
  sourcePage: string;
}): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: createId(),
      codigo: input.code,
      nombre: `${input.lineName} — ${input.variant}`,
      tipologia: input.typology,
      hojas: input.leaves,
      modulos: 1,
      apertura: input.typology,
      herraje: null,
      variante: input.variant,
    },
    perfiles: input.profiles,
    vidrios: input.glasses,
    accesorios: input.accessories,
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: DEFAULT_BAR_LENGTH_MM,
    },
    notasValidacion: [
      `Fuente de fórmula: Catálogo SODAL 2026, página impresa ${input.sourcePage}.`,
      "Receta documental universal; el largo comercial de 6.000 mm es el preset Ventora y no un dato confirmado por la ficha.",
      "Los SKU de compra no aparecen en esta pauta y deben asociarse desde el catálogo del taller.",
    ],
  };
}

function createS28(input: RecipeInput, leaves: 2 | 3): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  const isTwo = leaves === 2;
  const frameCode = isTwo ? "S281" : "S285";
  const leafWidthBase: FabricacionBaseMedida = "ancho_por_hoja";
  const profiles = [
    profile(createId, {
      code: frameCode,
      name: isTwo ? "Riel S-28" : "Riel triple S-28",
      functionName: "Riel horizontal",
      base: "ancho_total",
      adjustmentMm: 0,
      quantity: 2,
      cut: "45°/45°",
    }),
    profile(createId, {
      code: frameCode,
      name: isTwo ? "Riel S-28" : "Riel triple S-28",
      functionName: "Riel vertical",
      base: "alto_total",
      adjustmentMm: 0,
      quantity: 2,
      cut: "45°/45°",
    }),
    profile(createId, {
      code: "S282",
      name: "Hoja TP S-28",
      functionName: "Cabezal y zócalo de hoja",
      base: leafWidthBase,
      adjustmentMm: isTwo ? 3 : 24,
      quantity: isTwo ? 4 : 6,
      cut: "45°/45°",
    }),
    profile(createId, {
      code: "S282",
      name: "Hoja TP S-28",
      functionName: "Piernas de hoja",
      base: "alto_total",
      adjustmentMm: -61,
      quantity: isTwo ? 4 : 6,
      cut: "45°/45°",
    }),
    profile(createId, {
      code: "S283",
      name: "Traslapo central S-28",
      functionName: "Traslapos de hoja",
      base: "alto_total",
      adjustmentMm: -61,
      quantity: isTwo ? 2 : 4,
      cut: "90°/90°",
    }),
    profile(createId, {
      code: "S286",
      name: "Perfil S-28 S286",
      functionName: "Perfil S286",
      base: "ancho_total",
      adjustmentMm: 0,
      quantity: 1,
      cut: "90°/90°",
    }),
  ];
  const accessories = [
    accessory(createId, { name: "Escuadra bloqueo Anudal S-28", quantity: isTwo ? 16 : 20, unit: "PZ" }),
    accessory(createId, { name: "Escuadra alineamiento S-28", quantity: isTwo ? 16 : 24, unit: "PZ" }),
    accessory(createId, { name: "Cremona 2 puntos", quantity: 2, unit: "PZ" }),
    accessory(createId, { name: "Manilla Alualpha 608", quantity: 2, unit: "PZ" }),
    accessory(createId, { name: "Cierre S/T perimetral", quantity: 2, unit: "PZ" }),
    accessory(createId, { name: "Carro simple (doble) aguja S-28", quantity: isTwo ? 4 : 6, unit: "PZ" }),
    accessory(createId, { name: "Tope amortiguador S-33", quantity: 4, unit: "PZ" }),
    accessory(createId, { name: "Sello estanco S-28 autoadhesivo", quantity: 2, unit: "MT" }),
    accessory(createId, { name: "Felpa 7 × 6 mm Fin Seal", quantity: 1, unit: "MT", formula: "6X + 6Y" }),
    accessory(createId, { name: "Felpa 7 × 8 mm Fin Seal (traslapos)", quantity: 1, unit: "MT", formula: isTwo ? "2Y" : "4Y" }),
    accessory(createId, { name: "Burlete TP 24/20 (S-33)", quantity: 1, unit: "MT", formula: "2X + 4Y" }),
  ];

  return baseRecipe({
    ...input,
    createId,
    code: `SODAL-S28-${leaves}H-TP20-2026`,
    variant: "Termopanel 20 mm",
    typology: "corredera",
    leaves,
    profiles,
    glasses: [glass(createId, {
      name: "Termopanel 20 mm S-28",
      widthBase: "ancho_por_hoja",
      widthAdjustmentMm: isTwo ? -107 : -86,
      heightBase: "alto_total",
      heightAdjustmentMm: -171,
      quantity: 2,
    })],
    accessories,
    sourcePage: "23",
  });
}

function createS38RPT(input: RecipeInput, variant: "proyectante" | "fijo-s383" | "fijo-s387"): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  const isProjecting = variant === "proyectante";
  const fixedProfileCode = variant === "fijo-s387" ? "S387" : "S383";
  const profiles = isProjecting
    ? [
        profile(createId, { code: "S381R", name: "Marco RPT S-38", functionName: "Marco horizontal", base: "ancho_total", adjustmentMm: 0, quantity: 2, cut: "45°/45°" }),
        profile(createId, { code: "S381R", name: "Marco RPT S-38", functionName: "Marco vertical", base: "alto_total", adjustmentMm: 0, quantity: 2, cut: "45°/45°" }),
        profile(createId, { code: "S386R", name: "Bastidor RPT S-38", functionName: "Bastidor horizontal", base: "ancho_total", adjustmentMm: -33, quantity: 2, cut: "45°/45°" }),
        profile(createId, { code: "S386R", name: "Bastidor RPT S-38", functionName: "Bastidor vertical", base: "alto_total", adjustmentMm: -33, quantity: 2, cut: "45°/45°" }),
      ]
    : [
        profile(createId, { code: "S381R", name: "Marco RPT S-38", functionName: "Marco horizontal", base: "ancho_total", adjustmentMm: 0, quantity: 2, cut: "45°/45°" }),
        profile(createId, { code: "S381R", name: "Marco RPT S-38", functionName: "Marco vertical", base: "alto_total", adjustmentMm: 0, quantity: 2, cut: "45°/45°" }),
        profile(createId, { code: fixedProfileCode, name: `Junquillo ${fixedProfileCode} (TP)`, functionName: "Junquillo horizontal", base: "ancho_total", adjustmentMm: -49, quantity: 2, cut: "90°/90°" }),
        profile(createId, { code: fixedProfileCode, name: `Junquillo ${fixedProfileCode} (TP)`, functionName: "Junquillo vertical", base: "alto_total", adjustmentMm: -85, quantity: 2, cut: "90°/90°" }),
      ];
  const variantLabel = isProjecting
    ? "RPT · Proyectante"
    : `RPT · Paño fijo · Junquillo ${fixedProfileCode}`;

  return baseRecipe({
    ...input,
    createId,
    code: `SODAL-S38RPT-${variant.toUpperCase()}-2026`,
    variant: variantLabel,
    typology: isProjecting ? "proyectante" : "pano_fijo",
    leaves: 1,
    profiles,
    glasses: [glass(createId, {
      name: isProjecting ? "Termopanel S-38 RPT proyectante" : `Termopanel S-38 RPT fijo · ${fixedProfileCode}`,
      widthBase: "ancho_total",
      widthAdjustmentMm: isProjecting ? -133 : -60,
      heightBase: "alto_total",
      heightAdjustmentMm: isProjecting ? -133 : -60,
      quantity: 1,
    })],
    accessories: isProjecting
      ? [
          accessory(createId, { name: "Escuadra Anudal S38", quantity: 8, unit: "PZ" }),
          accessory(createId, { name: "Brazo proyección Defender", quantity: 1, unit: "PR" }),
          accessory(createId, { name: "Cierre manilla Alualpha 607", quantity: 1, unit: "PZ" }),
          accessory(createId, { name: "Burlete DC GUA239", quantity: 1, unit: "MT", formula: "4X + 4Y" }),
          accessory(createId, { name: "Burlete TP 2218", quantity: 1, unit: "MT", formula: "2X + 2Y" }),
        ]
      : [
          accessory(createId, { name: "Escuadra Anudal S38", quantity: 4, unit: "PZ" }),
          accessory(createId, { name: "Burlete base GUA399", quantity: 1, unit: "MT", formula: "2X + 2Y" }),
          accessory(createId, { name: "Burlete cuña GUA259", quantity: 1, unit: "MT", formula: "2X + 2Y" }),
        ],
    sourcePage: "29",
  });
}

export const SODAL_CATALOGO_2026_RECIPE_FACTORIES: Record<
  SodalCatalogo2026RecipeKey,
  (input: RecipeInput) => FabricacionReceta[]
> = {
  "ventora:optima-s28-corredera-2h": (input) => [createS28(input, 2)],
  "ventora:optima-s28-corredera-3h": (input) => [createS28(input, 3)],
  "ventora:s38-rpt-proyectante": (input) => [
    createS38RPT(input, "proyectante"),
    createS38RPT(input, "fijo-s383"),
    createS38RPT(input, "fijo-s387"),
  ],
};

export function crearRecetasSodalCatalogo2026(input: RecipeInput & {
  catalogKey: SodalCatalogo2026RecipeKey;
}) {
  return SODAL_CATALOGO_2026_RECIPE_FACTORIES[input.catalogKey](input);
}
