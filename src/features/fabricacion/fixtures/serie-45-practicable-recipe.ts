import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionReglaMedida,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

export const SERIE_45_CATALOG_KEY = "ventora:serie-45-puerta";
export const SERIE_45_VARIANT = "puerta_1h";
export const SERIE_45_SOURCE_REFERENCE =
  "sodal+indalum:serie-45-practicable:puerta:1h:v2";

/** X = ancho total del vano. Y = alto total del vano. Ejemplo 1200 × 1000. */
export const SERIE_45_FIXTURE_1200X1000 = {
  anchoTotalMm: 1200,
  altoTotalMm: 1000,
  codes: ["4522", "4522", "4531", "4534", "4531", "4534", "4531", "4534", "4531", "4534"],
  quantities: [1, 2, 1, 2, 1, 1, 1, 2, 1, 2],
  lengthsMm: [1200, 1000, 1042, 1042, 1042, 1042, 972, 823, 972, 823],
  glass: { widthMm: 1030, heightMm: 817, quantity: 1 },
} as const;

/** Misma pauta con vano de cotización 1500 × 2000. */
export const SERIE_45_FIXTURE_1500X2000 = {
  anchoTotalMm: 1500,
  altoTotalMm: 2000,
  codes: SERIE_45_FIXTURE_1200X1000.codes,
  quantities: SERIE_45_FIXTURE_1200X1000.quantities,
  lengthsMm: [1500, 2000, 1342, 1342, 1342, 1342, 1972, 1823, 1972, 1823],
  glass: { widthMm: 1330, heightMm: 1817, quantity: 1 },
} as const;

type DestajeSpec = {
  destaje: number;
  code: string;
  name: string;
  functionName: string;
  reglaMedida: FabricacionReglaMedida;
  quantity: number;
  cut: string;
};

function destaje(id: string, spec: DestajeSpec): FabricacionComponentePerfil {
  return {
    id,
    codigoPerfil: spec.code,
    nombrePerfil: spec.name,
    funcion: spec.functionName,
    largoComercialMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    reglaMedida: spec.reglaMedida,
    reglaCantidad: { tipo: "fija", cantidad: spec.quantity },
    requerido: true,
    corte: spec.cut,
    observaciones: `Destaje ${spec.destaje}. Fórmula Serie 45 practicable; validar en taller.`,
  };
}

function buildDestajes(createId: () => string): FabricacionComponentePerfil[] {
  return [
    destaje(createId(), {
      destaje: 1,
      code: "4522",
      name: "Marco Superior",
      functionName: "Marco superior",
      reglaMedida: { base: "ancho_total", ajusteMm: 0 },
      quantity: 1,
      cut: "45° / 45°",
    }),
    destaje(createId(), {
      destaje: 2,
      code: "4522",
      name: "Jamba",
      functionName: "Jamba",
      reglaMedida: { base: "alto_total", ajusteMm: 0 },
      quantity: 2,
      cut: "45° / 90°",
    }),
    destaje(createId(), {
      destaje: 3,
      code: "4531",
      name: "Cabezal",
      functionName: "Cabezal",
      reglaMedida: { base: "ancho_total", ajusteMm: -158 },
      quantity: 1,
      cut: "90° / 90°",
    }),
    destaje(createId(), {
      destaje: 4,
      code: "4534",
      name: "Junquillo",
      functionName: "Junquillo horizontal",
      reglaMedida: { base: "ancho_total", ajusteMm: -158 },
      quantity: 2,
      cut: "90° / 90°",
    }),
    destaje(createId(), {
      destaje: 5,
      code: "4531",
      name: "Zócalo",
      functionName: "Zócalo",
      reglaMedida: { base: "ancho_total", ajusteMm: -158 },
      quantity: 1,
      cut: "90° / 90°",
    }),
    destaje(createId(), {
      destaje: 6,
      code: "4534",
      name: "Junquillo",
      functionName: "Junquillo",
      reglaMedida: { base: "ancho_total", ajusteMm: -158 },
      quantity: 1,
      cut: "90° / 90°",
    }),
    destaje(createId(), {
      destaje: 7,
      code: "4531",
      name: "Pierna",
      functionName: "Pierna",
      reglaMedida: { base: "alto_total", ajusteMm: -28 },
      quantity: 1,
      cut: "90° / 90°",
    }),
    destaje(createId(), {
      destaje: 8,
      code: "4534",
      name: "Junquillo",
      functionName: "Junquillo vertical",
      reglaMedida: { base: "alto_total", ajusteMm: -177 },
      quantity: 2,
      cut: "45° / 45°",
    }),
    destaje(createId(), {
      destaje: 9,
      code: "4531",
      name: "Pierna",
      functionName: "Pierna",
      reglaMedida: { base: "alto_total", ajusteMm: -28 },
      quantity: 1,
      cut: "90° / 90°",
    }),
    destaje(createId(), {
      destaje: 10,
      code: "4534",
      name: "Junquillo",
      functionName: "Junquillo vertical",
      reglaMedida: { base: "alto_total", ajusteMm: -177 },
      quantity: 2,
      cut: "90° / 90°",
    }),
  ];
}

function buildGlass(id: string): FabricacionVidrio {
  return {
    id,
    nombre: "Vidrio",
    reglaAncho: { base: "ancho_total", ajusteMm: -170 },
    reglaAlto: { base: "alto_total", ajusteMm: -183 },
    reglaCantidad: { tipo: "fija", cantidad: 1 },
    requerido: false,
    observaciones:
      "1 pieza: ancho X−170, alto Y−183. Monolítico o termopanel de cualquier espesor, según junquillo.",
  };
}

export function isCurrentSerie45PracticableRecipe(recipe: FabricacionReceta): boolean {
  const required = recipe.perfiles.filter((profile) => profile.requerido !== false);
  const codes = new Set(required.map((profile) => profile.codigoPerfil.trim()));
  const glass = recipe.vidrios[0];
  return (
    required.length === 10 &&
    codes.has("4522") &&
    codes.has("4531") &&
    codes.has("4534") &&
    glass?.reglaAncho.ajusteMm === -170 &&
    glass?.reglaAlto.ajusteMm === -183 &&
    !(recipe.identidad.apertura ?? "").trim()
  );
}

export function crearRecetaSerie45Practicable(input: {
  lineName: string;
  createId?: () => string;
}): FabricacionReceta {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const lineName = input.lineName.trim() || "Línea 45 — Puerta";

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    identidad: {
      recetaId: createId(),
      codigo: "SERIE-45-PUERTA-1H-V1",
      nombre: `${lineName} · Puerta 1 hoja`,
      tipologia: "puerta_abatible",
      hojas: 1,
      modulos: 1,
      apertura: null,
      herraje: null,
      variante: SERIE_45_VARIANT,
    },
    perfiles: buildDestajes(createId),
    vidrios: [buildGlass(createId())],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    datosPendientes: [],
    notasValidacion: [
      "Fórmulas de corte Serie 45 practicable. X = ancho total del vano; Y = alto total del vano.",
      "Composición: marco 4522, bastidor 4531, junquillo 4534.",
      "Vidrio X−170 / Y−183. Monolítico o termopanel según junquillo.",
      "El consumo ML con 10% merma es documental; el motor usa destajes.",
    ],
  };
}
