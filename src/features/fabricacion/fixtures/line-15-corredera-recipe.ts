import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionReglaMedida,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

export const LINE_15_CATALOG_KEY = "ventora:serie-15-corredera-2h";

export const LINE_15_VARIANT_2H = "2h";
export const LINE_15_VARIANT_3H_3RIELES = "3h_3rieles";
export const LINE_15_VARIANT_4H_2RIELES = "4h_2rieles";
export const LINE_15_VARIANT_4H_4RIELES = "4h_4rieles";

export type Line15CorrederaVariant =
  | typeof LINE_15_VARIANT_2H
  | typeof LINE_15_VARIANT_3H_3RIELES
  | typeof LINE_15_VARIANT_4H_2RIELES
  | typeof LINE_15_VARIANT_4H_4RIELES;

export const LINE_15_SOURCE_REFERENCE_2H = "ventora:line-15-corredera:2h:v1";
export const LINE_15_SOURCE_REFERENCE_3H_3RIELES =
  "ventora:line-15-corredera:3h:3rieles:v1";
export const LINE_15_SOURCE_REFERENCE_4H_2RIELES =
  "ventora:line-15-corredera:4h:2rieles:v1";
export const LINE_15_SOURCE_REFERENCE_4H_4RIELES =
  "ventora:line-15-corredera:4h:4rieles:v1";

/** X = ancho total del vano. Y = alto total del vano. Ejemplo 1200 × 1000. */
export const LINE_15_FIXTURE_1200X1000 = {
  anchoTotalMm: 1200,
  altoTotalMm: 1000,
  codes: ["1501", "1502", "1503", "1504", "1505", "1506", "1507"],
  quantities: [1, 1, 2, 2, 2, 2, 2],
  lengthsMm: [1200, 1200, 950, 538, 538, 965, 965],
  glass: { widthMm: 616, heightMm: 920, quantity: 2 },
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
    observaciones: `Destaje ${spec.destaje}. Despiece oficial Línea AL-15; validar en taller.`,
  };
}

function horizontalLeafRule(
  variant: Line15CorrederaVariant
): FabricacionReglaMedida {
  switch (variant) {
    case LINE_15_VARIANT_3H_3RIELES:
      return { base: "ancho_total", multiplicador: 1 / 3, ajusteMm: 16 / 3 };
    case LINE_15_VARIANT_4H_2RIELES:
      return { base: "ancho_total", multiplicador: 1 / 4, ajusteMm: 6 / 4 };
    case LINE_15_VARIANT_4H_4RIELES:
      return { base: "ancho_total", multiplicador: 1 / 4, ajusteMm: 45 / 4 };
    default:
      return { base: "ancho_por_hoja", ajusteMm: -62 };
  }
}

function buildDestajes(
  createId: () => string,
  variant: Line15CorrederaVariant
): FabricacionComponentePerfil[] {
  const horizontal = horizontalLeafRule(variant);
  return [
    destaje(createId(), {
      destaje: 1,
      code: "1501",
      name: "Riel Superior",
      functionName: "Riel superior",
      reglaMedida: { base: "ancho_total", ajusteMm: 0 },
      quantity: 1,
    }),
    destaje(createId(), {
      destaje: 2,
      code: "1502",
      name: "Riel Inferior",
      functionName: "Riel inferior",
      reglaMedida: { base: "ancho_total", ajusteMm: 0 },
      quantity: 1,
    }),
    destaje(createId(), {
      destaje: 3,
      code: "1503",
      name: "Jamba",
      functionName: "Jamba",
      reglaMedida: { base: "alto_total", ajusteMm: -50 },
      quantity: 2,
    }),
    destaje(createId(), {
      destaje: 4,
      code: "1504",
      name: "Cabezal",
      functionName: "Cabezal de hoja",
      reglaMedida: horizontal,
      quantity: 2,
    }),
    destaje(createId(), {
      destaje: 5,
      code: "1505",
      name: "Zócalo",
      functionName: "Zócalo de hoja",
      reglaMedida: horizontal,
      quantity: 2,
    }),
    destaje(createId(), {
      destaje: 6,
      code: "1506",
      name: "Pierna",
      functionName: "Pierna de hoja",
      reglaMedida: { base: "alto_total", ajusteMm: -35 },
      quantity: 2,
    }),
    destaje(createId(), {
      destaje: 7,
      code: "1507",
      name: "Traslapo",
      functionName: "Traslapo de hoja",
      reglaMedida: { base: "alto_total", ajusteMm: -35 },
      quantity: 2,
    }),
  ];
}

function buildGlass(createId: () => string): FabricacionVidrio {
  return {
    id: createId(),
    nombre: "Vidrio monolítico de la hoja",
    reglaAncho: { base: "ancho_por_hoja", ajusteMm: 16 },
    reglaAlto: { base: "alto_total", ajusteMm: -80 },
    reglaCantidad: { tipo: "fija", cantidad: 2 },
    requerido: false,
    observaciones:
      "2 piezas: ancho X/2 + 16, alto Y − 80. Solo monolítico 3, 4 o 5 mm.",
  };
}

const VARIANT_META: Record<
  Line15CorrederaVariant,
  { label: string; hojas: number; modulos: number; sourceReference: string; code: string }
> = {
  [LINE_15_VARIANT_2H]: {
    label: "Corredera 2 hojas",
    hojas: 2,
    modulos: 2,
    sourceReference: LINE_15_SOURCE_REFERENCE_2H,
    code: "LINE-15-2H-V1",
  },
  [LINE_15_VARIANT_3H_3RIELES]: {
    label: "Corredera 3 hojas · 3 rieles",
    hojas: 3,
    modulos: 3,
    sourceReference: LINE_15_SOURCE_REFERENCE_3H_3RIELES,
    code: "LINE-15-3H-3RIELES-V1",
  },
  [LINE_15_VARIANT_4H_2RIELES]: {
    label: "Corredera 4 hojas · 2 rieles",
    hojas: 4,
    modulos: 4,
    sourceReference: LINE_15_SOURCE_REFERENCE_4H_2RIELES,
    code: "LINE-15-4H-2RIELES-V1",
  },
  [LINE_15_VARIANT_4H_4RIELES]: {
    label: "Corredera 4 hojas · 4 rieles",
    hojas: 4,
    modulos: 4,
    sourceReference: LINE_15_SOURCE_REFERENCE_4H_4RIELES,
    code: "LINE-15-4H-4RIELES-V1",
  },
};

export function line15SourceReference(variant: Line15CorrederaVariant): string {
  return VARIANT_META[variant].sourceReference;
}

export function isLine15FormulaSourceReference(
  sourceReference: string | null | undefined
): boolean {
  return (sourceReference ?? "").startsWith("ventora:line-15-corredera:");
}

export function isCurrentLine15CorrederaRecipe(
  recipe: FabricacionReceta,
  variant: Line15CorrederaVariant = LINE_15_VARIANT_2H
): boolean {
  const required = recipe.perfiles.filter((profile) => profile.requerido !== false);
  const codes = required.map((profile) => profile.codigoPerfil.trim());
  const glass = recipe.vidrios[0];
  const cabezal = required.find((profile) => profile.codigoPerfil === "1504");
  const horizontal = horizontalLeafRule(variant);

  return (
    required.length === 7 &&
    LINE_15_FIXTURE_1200X1000.codes.every((code) => codes.includes(code)) &&
    cabezal?.reglaMedida.base === horizontal.base &&
    cabezal.reglaMedida.ajusteMm === horizontal.ajusteMm &&
    cabezal.reglaMedida.multiplicador === horizontal.multiplicador &&
    (variant === LINE_15_VARIANT_2H
      ? glass?.reglaAncho.ajusteMm === 16 && glass.reglaAlto.ajusteMm === -80
      : true)
  );
}

export function crearRecetaLine15Corredera(input: {
  lineName: string;
  variant?: Line15CorrederaVariant;
  createId?: () => string;
}): FabricacionReceta {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const variant = input.variant ?? LINE_15_VARIANT_2H;
  const meta = VARIANT_META[variant];
  const lineName = input.lineName.trim() || "Línea 15 — Corredera 2 hojas";

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    identidad: {
      recetaId: createId(),
      codigo: meta.code,
      nombre: `${lineName} · ${meta.label}`,
      tipologia: "corredera",
      hojas: meta.hojas,
      modulos: meta.modulos,
      apertura: null,
      herraje: null,
      variante: variant,
    },
    perfiles: buildDestajes(createId, variant),
    vidrios: variant === LINE_15_VARIANT_2H ? [buildGlass(createId)] : [],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    datosPendientes:
      variant === LINE_15_VARIANT_2H
        ? []
        : ["Vidrio: usar fórmula 2H hasta validar medidas por variante."],
    notasValidacion: [
      "Despiece oficial Línea AL-15 corredera. X = ancho total del vano; Y = alto total del vano.",
      variant === LINE_15_VARIANT_2H
        ? "Vidrio 2 piezas monolíticas: X/2 + 16 / Y − 80."
        : "Cabezal y zócalo usan fórmula validada de variante; demás perfiles igual que 2H.",
      variant === LINE_15_VARIANT_3H_3RIELES
        ? "Cabezal/zócalo: (X + 16) / 3."
        : variant === LINE_15_VARIANT_4H_2RIELES
          ? "Cabezal/zócalo: (X + 6) / 4."
          : variant === LINE_15_VARIANT_4H_4RIELES
            ? "Cabezal/zócalo: (X + 45) / 4."
            : "Cabezal/zócalo: X/2 − 62.",
      "No es validación de taller.",
    ],
  };
}

export function crearRecetasLine15Corredera(input: {
  lineName: string;
  createId?: () => string;
}): FabricacionReceta[] {
  return [
    crearRecetaLine15Corredera({ ...input, variant: LINE_15_VARIANT_2H }),
    crearRecetaLine15Corredera({ ...input, variant: LINE_15_VARIANT_3H_3RIELES }),
    crearRecetaLine15Corredera({ ...input, variant: LINE_15_VARIANT_4H_2RIELES }),
    crearRecetaLine15Corredera({ ...input, variant: LINE_15_VARIANT_4H_4RIELES }),
  ];
}
