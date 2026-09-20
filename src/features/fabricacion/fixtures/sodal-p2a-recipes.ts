import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionAccesorio,
  type FabricacionBaseMedida,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionTipologia,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";
import {
  SERIE_4800_VARIANT_NORMAL,
  SERIE_4800_VARIANT_REFORZADA,
  crearRecetaSerie4800Corredera,
} from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";

type RecipeInput = {
  lineName: string;
  createId?: () => string;
};

const DEFAULT_BAR_LENGTH_MM = 6000;

export const SODAL_P2A_SOURCE_TYPE = "manufacturer" as const;
export const SODAL_P2A_SOURCE_NAME = "SODAL" as const;

function fallbackId() {
  return `sodal-p2a-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  }
): FabricacionComponentePerfil {
  return {
    id: createId(),
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.functionName,
    largoComercialMm: DEFAULT_BAR_LENGTH_MM,
    reglaMedida: {
      base: input.base,
      ajusteMm: input.adjustmentMm,
    },
    reglaCantidad: {
      tipo: "fija",
      cantidad: input.quantity,
    },
    requerido: true,
    corte: input.cut,
    observaciones: "Regla tomada de la pauta primaria SODAL; no es validación de taller.",
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
  }
): FabricacionVidrio {
  return {
    id: createId(),
    nombre: input.name,
    reglaAncho: {
      base: input.widthBase,
      ajusteMm: input.widthAdjustmentMm,
    },
    reglaAlto: {
      base: input.heightBase,
      ajusteMm: input.heightAdjustmentMm,
    },
    reglaCantidad: {
      tipo: "fija",
      cantidad: input.quantity,
    },
    requerido: false,
    observaciones:
      "La fuente publica la medida; la composición/espesor del vidrio se define por especificación del taller.",
  };
}

function accessory(
  createId: () => string,
  input: {
    name: string;
    quantity: number;
    unit?: string;
    formula?: string;
  }
): FabricacionAccesorio {
  return {
    id: createId(),
    codigo: "",
    nombre: input.name,
    reglaCantidad: {
      tipo: "fija",
      cantidad: input.quantity,
    },
    requerido: false,
    ...(input.unit ? { unidad: input.unit } : {}),
    ...(input.formula ? { formulaCantidad: input.formula } : {}),
    observaciones: input.formula
      ? "Consumo lineal documentado por SODAL; la pauta queda visible y pendiente de conversión a unidad de compra."
      : "Accesorio y cantidad tomados de la pauta primaria SODAL.",
    ...(input.formula
      ? { datosPendientes: ["Representar el consumo lineal sin convertirlo en unidades ficticias"] }
      : {}),
  };
}

function baseRecipe(input: RecipeInput & {
  code: string;
  variant: string;
  typology: FabricacionTipologia;
  leaves: number;
  modules: number;
  profiles: FabricacionComponentePerfil[];
  glasses: FabricacionVidrio[];
  accessories: FabricacionAccesorio[];
  notes: string[];
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
      modulos: input.modules,
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
    notasValidacion: input.notes,
  };
}

function create4800(input: RecipeInput, reinforced: boolean): FabricacionReceta {
  return crearRecetaSerie4800Corredera({
    lineName: input.lineName,
    createId: input.createId,
    variant: reinforced ? SERIE_4800_VARIANT_REFORZADA : SERIE_4800_VARIANT_NORMAL,
  });
}

function createS33(input: RecipeInput, rpt: boolean): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  const variant = rpt ? "S-33 RPT" : "S-33 Normal";
  return baseRecipe({
    ...input,
    createId,
    code: `SODAL-S33-2H-${rpt ? "RPT" : "NORMAL"}-V1`,
    variant,
    typology: "corredera",
    leaves: 2,
    modules: 1,
    profiles: rpt
      ? [
          profile(createId, { code: "3324R", name: "Riel cámara RPT", functionName: "Riel superior cámara", base: "ancho_total", adjustmentMm: 0, quantity: 2, cut: "45°/45°" }),
          profile(createId, { code: "3324R", name: "Riel/jamba cámara RPT", functionName: "Marco horizontal y vertical", base: "alto_total", adjustmentMm: 0, quantity: 2, cut: "45°/45°" }),
          profile(createId, { code: "3308R", name: "Hoja TP RPT", functionName: "Cabezal/zócalo de hoja RPT", base: "ancho_por_hoja", adjustmentMm: 4, quantity: 4, cut: "45°/45°" }),
          profile(createId, { code: "3308R", name: "Hoja TP RPT", functionName: "Pierna de hoja RPT", base: "alto_total", adjustmentMm: -64, quantity: 4, cut: "45°/45°" }),
          profile(createId, { code: "3303", name: "Traslapo", functionName: "Traslapo de hoja", base: "alto_total", adjustmentMm: -64, quantity: 2, cut: "90°/90°" }),
        ]
      : [
          profile(createId, { code: "3324", name: "Riel cámara", functionName: "Riel superior cámara", base: "ancho_total", adjustmentMm: 0, quantity: 2, cut: "45°/45°" }),
          profile(createId, { code: "3324", name: "Riel cámara", functionName: "Marco horizontal y vertical", base: "alto_total", adjustmentMm: 0, quantity: 2, cut: "45°/45°" }),
          profile(createId, { code: "3308", name: "Hoja TP", functionName: "Cabezal/zócalo de hoja", base: "ancho_por_hoja", adjustmentMm: -4, quantity: 4, cut: "45°/45°" }),
          profile(createId, { code: "3308", name: "Hoja TP", functionName: "Pierna de hoja", base: "alto_total", adjustmentMm: -72, quantity: 4, cut: "45°/45°" }),
          profile(createId, { code: "3303", name: "Traslapo", functionName: "Traslapo de hoja", base: "alto_total", adjustmentMm: -72, quantity: 2, cut: "90°/90°" }),
        ],
    glasses: [glass(createId, rpt
      ? { name: "Termopanel", widthBase: "ancho_por_hoja", widthAdjustmentMm: -108, heightBase: "alto_total", heightAdjustmentMm: -176, quantity: 2 }
      : { name: "Vidrio de la hoja", widthBase: "ancho_por_hoja", widthAdjustmentMm: -117, heightBase: "alto_total", heightAdjustmentMm: -186, quantity: 2 })],
    accessories: rpt
      ? [
          accessory(createId, { name: "Escuadra bloqueo Anudal 3308R", quantity: 8, unit: "Pz" }),
          accessory(createId, { name: "Escuadra bloqueo Anudal S-33", quantity: 8, unit: "Pz" }),
          accessory(createId, { name: "Cremona de 2 puntos", quantity: 2, unit: "Pz" }),
          accessory(createId, { name: "Manilla Alualpha 608", quantity: 2, unit: "Pz" }),
          accessory(createId, { name: "Carro Mendavia doble aguja S-33", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Guía exterior S-33", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Guía interior S-33", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Tope amortiguador S-33", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Felpa 7 x 8 mm", quantity: 1, unit: "Mt", formula: "6X + 8Y" }),
          accessory(createId, { name: "Burlete TP S-33", quantity: 1, unit: "Mt", formula: "2X + 4Y" }),
        ]
      : [
          accessory(createId, { name: "Escuadra bloqueo Anudal", quantity: 8, unit: "Pz" }),
          accessory(createId, { name: "Escuadra Anudal 5081", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Cierre o cremona", quantity: 2, unit: "Pz" }),
          accessory(createId, { name: "Carro Mendavia doble aguja", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Guía exterior S-33", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Guía interior S-33", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Tope amortiguador S-33", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Sello central", quantity: 4, unit: "Pz" }),
          accessory(createId, { name: "Felpa 7 x 6", quantity: 1, unit: "Mt", formula: "4X + 6Y" }),
          accessory(createId, { name: "Burlete DVP", quantity: 1, unit: "Mt", formula: "2X + 4Y" }),
        ],
    notes: [
      `Fuente primaria SODAL: ${rpt ? "Catálogo SODAL RPT, ficha Serie S-33 RPT, pauta para dos hojas" : "Catálogo General 2018, p. 41, Serie S-33, pauta para dos hojas"}.`,
      rpt ? "S-33 RPT mantiene identidad propia: 3324R/3308R y termopanel; no se mezcla con S-33 normal." : "S-33 normal usa la pauta publicada 3324/3308/3303; no se conserva la referencia estructural incompleta anterior.",
      "Las fórmulas lineales de felpa/burlete quedan documentadas, pero no se convierten en unidades ficticias.",
      "Pendiente: prueba física de taller.",
    ],
  });
}

function createS83(input: RecipeInput, leaves: 4 | 8): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  const isFour = leaves === 4;
  return baseRecipe({
    ...input,
    createId,
    code: `SODAL-S83-${leaves}H-V1`,
    variant: `${leaves} hojas`,
    typology: "corredera",
    leaves,
    modules: 1,
    profiles: [
      profile(createId, { code: "S831", name: "Riel inferior 4L", functionName: "Riel inferior", base: "ancho_total", adjustmentMm: -26, quantity: 1, cut: "—" }),
      profile(createId, { code: "S832", name: "Riel superior", functionName: "Riel superior", base: "ancho_total", adjustmentMm: -26, quantity: 1, cut: "—" }),
      profile(createId, { code: "S833", name: "Jamba 4L", functionName: "Jamba", base: "alto_total", adjustmentMm: 0, quantity: 2, cut: "—" }),
      profile(createId, { code: "S834", name: "Zócalo", functionName: "Zócalo de hoja", base: "ancho_por_hoja", adjustmentMm: isFour ? -11 : -7, quantity: leaves, cut: "—" }),
    ],
    glasses: [glass(createId, { name: "Vidrio de hoja S-83", widthBase: "ancho_por_hoja", widthAdjustmentMm: isFour ? -11 : -8, heightBase: "alto_total", heightAdjustmentMm: -86, quantity: leaves })],
    accessories: [
      accessory(createId, { name: "Carro doble S83", quantity: isFour ? 8 : 16, unit: "Pz" }),
      accessory(createId, { name: "Tapa zócalo", quantity: isFour ? 8 : 16, unit: "Pz" }),
      accessory(createId, { name: "Tirador S83", quantity: isFour ? 2 : 4, unit: "Pz" }),
      accessory(createId, { name: "Felpa 5 x 5", quantity: 1, unit: "Mt", formula: "2X" }),
      accessory(createId, { name: "Felpa 7 x 6", quantity: 1, unit: "Mt", formula: "8X" }),
      accessory(createId, { name: "Burlete globo", quantity: isFour ? 2 : 3, unit: "Tr" }),
      accessory(createId, { name: "Burlete traslapo", quantity: isFour ? 6 : 12, unit: "Tr" }),
    ],
    notes: [
      `Fuente primaria SODAL: Catálogo General 2018, p. 45, Multi Slide S-83, pauta para ${leaves === 4 ? "cuatro" : "ocho"} hojas.`,
      "4H y 8H son recetas independientes: cambia el divisor y los descuentos del zócalo/vidrio, además de accesorios.",
      "Pendiente: composición del vidrio y prueba física de taller.",
    ],
  });
}

function create3200(input: RecipeInput, bastidor: "3221" | "3225"): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  return baseRecipe({
    ...input,
    createId,
    code: `SODAL-3200-1H-BASTIDOR-${bastidor}-V1`,
    variant: `3200 1H · Bastidor ${bastidor}`,
    typology: "puerta_abatible",
    leaves: 1,
    modules: 1,
    profiles: [
      profile(createId, { code: "3222", name: "Marco", functionName: "Marco superior", base: "ancho_total", adjustmentMm: 0, quantity: 1, cut: "45°/45°" }),
      profile(createId, { code: "3222", name: "Marco", functionName: "Marco lateral izquierdo", base: "alto_total", adjustmentMm: 0, quantity: 1, cut: "45°/90°" }),
      profile(createId, { code: "3222", name: "Marco", functionName: "Marco lateral derecho", base: "alto_total", adjustmentMm: 0, quantity: 1, cut: "90°/45°" }),
      profile(createId, { code: bastidor, name: `Bastidor ${bastidor}`, functionName: "Bastidor horizontal", base: "ancho_total", adjustmentMm: -42, quantity: 2, cut: "45°/45°" }),
      profile(createId, { code: bastidor, name: `Bastidor ${bastidor}`, functionName: "Bastidor vertical", base: "alto_total", adjustmentMm: -29, quantity: 2, cut: "45°/45°" }),
    ],
    glasses: [glass(createId, bastidor === "3221"
      ? { name: "Vidrio para bastidor 3221", widthBase: "ancho_total", widthAdjustmentMm: -141, heightBase: "alto_total", heightAdjustmentMm: -128, quantity: 1 }
      : { name: "Vidrio para bastidor 3225", widthBase: "ancho_total", widthAdjustmentMm: -190, heightBase: "alto_total", heightAdjustmentMm: -177, quantity: 1 })],
    accessories: [
      accessory(createId, { name: "Bisagra 3200 (Udinese)", quantity: 1, unit: "Jg" }),
      accessory(createId, { name: "Escuadra marco (DC 3800)", quantity: 2, unit: "Pz" }),
      accessory(createId, { name: "Escuadra bastidor 3200", quantity: 4, unit: "Pz" }),
      accessory(createId, { name: "Felpa 5 x 5 (marco)", quantity: 1, unit: "Mt", formula: "X + 2Y" }),
      accessory(createId, { name: "Burlete 305 ó 329", quantity: 1, unit: "Mt", formula: "2X + 2Y" }),
      accessory(createId, { name: "Cerradura ISEO (E.25 o E.35)", quantity: 1, unit: "Pz" }),
    ],
    notes: [
      "Fuente primaria SODAL: Catálogo General 2018, p. 21, Serie 3200, pauta para puerta abatir una hoja.",
      `La pauta publica el bastidor ${bastidor} y su medida de vidrio; se mantiene separado del otro bastidor.`,
      "La fuente comercial actual publica L/Liviana, ST/Standard y TP/TermoPanel, pero no entrega en la ficha consultada un mapeo inequívoco de esas etiquetas a 3221/3225.",
      "Advertencia conservada: la lámina de perfiles muestra también 3227 mientras la tabla de pauta dice 3225; no se corrige por intuición.",
      "Pendiente: mapeo L/ST/TP y prueba física de taller.",
    ],
  });
}

function create4600(input: RecipeInput, hydraulic: boolean): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  const variant = hydraulic ? "Quicio hidráulico MAB" : "Quicio mecánico Scanavini";
  return baseRecipe({
    ...input,
    createId,
    code: `SODAL-4600-VAIVEN-${hydraulic ? "HIDRAULICO" : "MECANICO"}-V1`,
    variant,
    typology: "puerta_vaiven",
    leaves: 1,
    modules: 1,
    profiles: hydraulic
      ? [
          profile(createId, { code: "4604", name: "Pierna", functionName: "Pierna de puerta", base: "ancho_total", adjustmentMm: -18, quantity: 2, cut: "—" }),
          profile(createId, { code: "4602", name: "Zócalo quicio MAB", functionName: "Zócalo quicio", base: "ancho_total", adjustmentMm: -118, quantity: 2, cut: "—" }),
        ]
      : [
          profile(createId, { code: "4601", name: "Perfil de puerta", functionName: "Perfil de puerta", base: "ancho_total", adjustmentMm: -21, quantity: 2, cut: "—" }),
          profile(createId, { code: "4603", name: "Zócalo quicio Scanavini", functionName: "Zócalo quicio", base: "ancho_total", adjustmentMm: -118, quantity: 2, cut: "—" }),
        ],
    glasses: [glass(createId, hydraulic
      ? { name: "Vidrio puerta vaivén hidráulica", widthBase: "ancho_total", widthAdjustmentMm: -102, heightBase: "alto_total", heightAdjustmentMm: -192, quantity: 1 }
      : { name: "Vidrio puerta vaivén mecánica", widthBase: "ancho_total", widthAdjustmentMm: -102, heightBase: "alto_total", heightAdjustmentMm: -195, quantity: 1 })],
    accessories: [
      accessory(createId, { name: hydraulic ? "Quicio hidráulico MAB" : "Quicio mecánico Scanavini", quantity: 1, unit: "Pz" }),
    ],
    notes: [
      "Fuente primaria SODAL: Catálogo General 2018, p. 23, Serie 4600; ficha actual SODAL confirma opciones de quicio mecánico e hidráulico.",
      "Las variantes mecánica e hidráulica tienen perfiles y descuentos de vidrio separados; nunca se combinan.",
      "Tipología canónica: puerta_vaiven; no es corredera.",
      "Pendiente: prueba física de taller.",
    ],
  });
}

export const SODAL_P2A_RECIPE_FACTORIES = {
  "ventora:serie-4800-corredera-2h": (input: RecipeInput) => [create4800(input, false), create4800(input, true)],
  "ventora:s33-corredera-2h": (input: RecipeInput) => [createS33(input, false)],
  "ventora:s33-rpt-corredera-2h": (input: RecipeInput) => [createS33(input, true)],
  "ventora:multislide-s83-4h": (input: RecipeInput) => [createS83(input, 4)],
  "ventora:multislide-s83-8h": (input: RecipeInput) => [createS83(input, 8)],
  "ventora:serie-3200-puerta-abatible-1h": (input: RecipeInput) => [create3200(input, "3221"), create3200(input, "3225")],
  "ventora:serie-4600-puerta-vaiven": (input: RecipeInput) => [create4600(input, false), create4600(input, true)],
} as const;

export type SodalP2ACatalogKey = keyof typeof SODAL_P2A_RECIPE_FACTORIES;

export function crearRecetasSodalP2A(input: RecipeInput & { catalogKey: SodalP2ACatalogKey }) {
  return SODAL_P2A_RECIPE_FACTORIES[input.catalogKey](input);
}

export function crearRecetaSodalP2A(input: RecipeInput & { catalogKey: SodalP2ACatalogKey }) {
  return crearRecetasSodalP2A(input)[0];
}
