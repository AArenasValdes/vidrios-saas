import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionReglaMedida,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

export const SERIE_4800_CATALOG_KEY = "ventora:serie-4800-corredera-2h";
export const SERIE_4800_VARIANT_NORMAL = "normal";
export const SERIE_4800_VARIANT_REFORZADA = "reforzada";
export type Serie4800CorrederaVariant =
  | typeof SERIE_4800_VARIANT_NORMAL
  | typeof SERIE_4800_VARIANT_REFORZADA;

export const SERIE_4800_SOURCE_REFERENCE_NORMAL =
  "sodal:serie-4800-corredera:2h:normal:v1";
export const SERIE_4800_SOURCE_REFERENCE_REFORZADA =
  "sodal:serie-4800-corredera:2h:reforzada:v1";

/** X = ancho total del vano. Y = alto total del vano. Ejemplo 1200 × 1000. */
export const SERIE_4800_FIXTURE_1200X1000 = {
  anchoTotalMm: 1200,
  altoTotalMm: 1000,
  codesNormal: ["4801", "4802", "4803", "4804", "4805", "4806", "4808"],
  codesReforzada: ["4801", "4802", "4803", "4804", "4805", "4810", "4811"],
  quantities: [1, 1, 2, 2, 2, 2, 2],
  lengthsMm: [1184, 1184, 1000, 585, 585, 968, 968],
  glass: { widthMm: 556, heightMm: 907, quantity: 2 },
} as const;

type DestajeSpec = {
  destaje: number;
  code: string;
  name: string;
  functionName: string;
  reglaMedida: FabricacionReglaMedida;
  quantity: number;
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
    corte: "90° / 90°",
    observaciones: `Destaje ${spec.destaje}. Fórmula SODAL 4800 Diamond; validar en taller.`,
  };
}

function buildDestajes(
  createId: () => string,
  variant: Serie4800CorrederaVariant
): FabricacionComponentePerfil[] {
  const reinforced = variant === SERIE_4800_VARIANT_REFORZADA;
  return [
    destaje(createId(), {
      destaje: 1,
      code: "4801",
      name: "Riel Inferior",
      functionName: "Riel inferior",
      reglaMedida: { base: "ancho_total", ajusteMm: -16 },
      quantity: 1,
    }),
    destaje(createId(), {
      destaje: 2,
      code: "4802",
      name: "Riel Superior",
      functionName: "Riel superior",
      reglaMedida: { base: "ancho_total", ajusteMm: -16 },
      quantity: 1,
    }),
    destaje(createId(), {
      destaje: 3,
      code: "4803",
      name: "Jamba",
      functionName: "Jamba",
      reglaMedida: { base: "alto_total", ajusteMm: 0 },
      quantity: 2,
    }),
    destaje(createId(), {
      destaje: 4,
      code: "4804",
      name: "Zócalo",
      functionName: "Zócalo de hoja",
      reglaMedida: { base: "ancho_por_hoja", ajusteMm: -15 },
      quantity: 2,
    }),
    destaje(createId(), {
      destaje: 5,
      code: "4805",
      name: "Cabezal",
      functionName: "Cabezal de hoja",
      reglaMedida: { base: "ancho_por_hoja", ajusteMm: -15 },
      quantity: 2,
    }),
    destaje(createId(), {
      destaje: 6,
      code: reinforced ? "4810" : "4806",
      name: reinforced ? "Traslapo Reforzado" : "Traslapo",
      functionName: reinforced ? "Traslapo reforzado" : "Traslapo de hoja",
      reglaMedida: { base: "alto_total", ajusteMm: -32 },
      quantity: 2,
    }),
    destaje(createId(), {
      destaje: 7,
      code: reinforced ? "4811" : "4808",
      name: reinforced ? "Pierna Reforzada" : "Pierna con Aleta",
      functionName: reinforced ? "Pierna reforzada" : "Pierna de hoja",
      reglaMedida: { base: "alto_total", ajusteMm: -32 },
      quantity: 2,
    }),
  ];
}

function buildGlass(createId: () => string): FabricacionVidrio {
  return {
    id: createId(),
    nombre: "Vidrio monolítico de la hoja",
    reglaAncho: { base: "ancho_por_hoja", ajusteMm: -44 },
    reglaAlto: { base: "alto_total", ajusteMm: -93 },
    reglaCantidad: { tipo: "fija", cantidad: 2 },
    requerido: false,
    observaciones:
      "2 piezas: ancho X/2 − 44, alto Y − 93. Solo monolítico; termopanel no admitido.",
  };
}

export function serie4800SourceReference(
  variant: Serie4800CorrederaVariant
): string {
  return variant === SERIE_4800_VARIANT_REFORZADA
    ? SERIE_4800_SOURCE_REFERENCE_REFORZADA
    : SERIE_4800_SOURCE_REFERENCE_NORMAL;
}

export function isSerie4800FormulaSourceReference(
  sourceReference: string | null | undefined
): boolean {
  return (sourceReference ?? "").startsWith("sodal:serie-4800-corredera:");
}

export function isCurrentSerie4800CorrederaRecipe(
  recipe: FabricacionReceta,
  variant?: Serie4800CorrederaVariant
): boolean {
  const required = recipe.perfiles.filter((profile) => profile.requerido !== false);
  const codes = required.map((profile) => profile.codigoPerfil.trim());
  const expected =
    (variant ?? recipe.identidad.variante) === SERIE_4800_VARIANT_REFORZADA
      ? SERIE_4800_FIXTURE_1200X1000.codesReforzada
      : SERIE_4800_FIXTURE_1200X1000.codesNormal;
  const glass = recipe.vidrios[0];
  return (
    required.length === 7 &&
    expected.every((code) => codes.includes(code)) &&
    glass?.reglaAncho.base === "ancho_por_hoja" &&
    glass.reglaAncho.ajusteMm === -44 &&
    glass.reglaAlto.ajusteMm === -93 &&
    glass.reglaCantidad.cantidad === 2
  );
}

export function crearRecetaSerie4800Corredera(input: {
  lineName: string;
  variant?: Serie4800CorrederaVariant;
  createId?: () => string;
}): FabricacionReceta {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const variant = input.variant ?? SERIE_4800_VARIANT_NORMAL;
  const lineName = input.lineName.trim() || "Serie 4800 — Corredera 2 hojas";
  const variantLabel = variant === SERIE_4800_VARIANT_REFORZADA ? "Reforzada" : "Normal";

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    identidad: {
      recetaId: createId(),
      codigo: `SERIE-4800-2H-${variant.toUpperCase()}-V1`,
      nombre: `${lineName} · ${variantLabel}`,
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      apertura: null,
      herraje: null,
      variante: variant,
    },
    perfiles: buildDestajes(createId, variant),
    vidrios: [buildGlass(createId)],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    datosPendientes: [],
    notasValidacion: [
      "Fórmulas de corte SODAL 4800 corredera 2 hojas (Diamond). X = ancho total del vano; Y = alto total del vano.",
      variant === SERIE_4800_VARIANT_REFORZADA
        ? "Variante reforzada: traslapo 4810 y pierna 4811."
        : "Variante normal: traslapo 4806 y pierna 4808.",
      "Zócalo y cabezal usan X/2 − 15 (ancho por hoja). Pierna usa Y − 32, igual que el traslapo.",
      "Vidrio 2 piezas monolíticas: X/2 − 44 / Y − 93. Termopanel no admitido.",
      "El consumo ML con 10% merma es documental; el motor usa destajes.",
    ],
  };
}

export function crearRecetasSerie4800Corredera(input: {
  lineName: string;
  createId?: () => string;
}): FabricacionReceta[] {
  return [
    crearRecetaSerie4800Corredera({ ...input, variant: SERIE_4800_VARIANT_NORMAL }),
    crearRecetaSerie4800Corredera({ ...input, variant: SERIE_4800_VARIANT_REFORZADA }),
  ];
}
