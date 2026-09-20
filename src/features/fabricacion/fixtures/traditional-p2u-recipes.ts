import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionTipologia,
} from "@/features/fabricacion/types/fabricacion-domain";
import { crearRecetaSerie45Practicable } from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import { crearRecetasLine15Corredera } from "@/features/fabricacion/fixtures/line-15-corredera-recipe";
import { crearRecetasLine4000Corredera } from "@/features/fabricacion/fixtures/line-4000-corredera-recipe";

type RecipeInput = { lineName: string; createId?: () => string };

export const P2U_CATALOG_KEYS = {
  line15: "ventora:serie-15-corredera-2h",
  line4000: "ventora:serie-4000-corredera-2h",
  line45: "ventora:serie-45-puerta",
  line12: "ventora:serie-12-shower-corredera",
  am35: "ventora:l35",
} as const;

export type P2UCatalogKey = (typeof P2U_CATALOG_KEYS)[keyof typeof P2U_CATALOG_KEYS];

export const P2U_RECIPE_SOURCES = {
  line15: {
    sourceType: "supplier",
    sourceName: "ALAR",
    sourceReference: "ventora:line-15-corredera:2h:v1",
    sourceRevision: "Despiece oficial Línea AL-15 corredera 2 hojas",
  },
  line4000: {
    sourceType: "manufacturer",
    sourceName: "Columbia",
    sourceReference: "ventora:line-4000-corredera:2h:v1",
    sourceRevision: "Despiece oficial Línea 4000 Columbia corredera 2 hojas",
  },
  am35: {
    sourceType: "manufacturer",
    sourceName: "Arquetipo",
    sourceReference: "arquetipo:catalogo-linea-estandar:p17-18:linea-35",
    sourceRevision: "Catálogo Perfiles de Aluminio Arquetipo, páginas 18-19",
  },
  line45: {
    sourceType: "manufacturer",
    sourceName: "Sodal / Indalum",
    sourceReference: "sodal+indalum:serie-45-practicable:puerta:1h",
    sourceRevision: "docs/fabricacion/2026-09-20-serie-45-practicable-formulas.md",
  },
  line12: {
    sourceType: "manufacturer",
    sourceName: "Arquetipo",
    sourceReference: "arquetipo:catalogo-linea-estandar:p20-21:linea-12-shower",
    sourceRevision: "Catálogo Perfiles de Aluminio Arquetipo, páginas 21-22",
  },
} as const;

function fallbackId() {
  return `p2u-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function profile(
  createId: () => string,
  input: {
    code: string;
    name: string;
    functionName: string;
    base: "ancho_total" | "alto_total" | "ancho_por_hoja";
    quantity: number;
    required?: boolean;
    adjustmentMm?: number;
    cut?: string;
  }
): FabricacionComponentePerfil {
  return {
    id: createId(),
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.functionName,
    reglaMedida: {
      base: input.base,
      ...(input.adjustmentMm == null ? {} : { ajusteMm: input.adjustmentMm }),
    },
    reglaCantidad: { tipo: "fija", cantidad: input.quantity },
    requerido: input.required ?? true,
    ...(input.cut ? { corte: input.cut } : {}),
    observaciones: "Identidad documentada; no equivale a validación física de taller.",
  };
}

function baseRecipe(
  input: RecipeInput & {
    code: string;
    variant: string;
    typology: FabricacionTipologia;
    leaves: number;
    profiles: FabricacionComponentePerfil[];
    notes: string[];
    pending: string[];
  }
): FabricacionReceta {
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
    vidrios: [],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: null,
    },
    datosPendientes: input.pending,
    notasValidacion: input.notes,
  };
}

function createAm35(input: RecipeInput, typology: "puerta_abatible" | "puerta_vaiven"): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  const label = typology === "puerta_abatible" ? "Abatible" : "Vaivén";
  return baseRecipe({
    ...input,
    createId,
    code: `ARQUETIPO-AM35-${typology === "puerta_abatible" ? "ABATIBLE" : "VAIVEN"}-V1`,
    variant: `AM-35 · ${label}`,
    typology,
    leaves: 1,
    profiles: [
      profile(createId, { code: "3502", name: "Marco", functionName: "Marco", base: "ancho_total", quantity: 1 }),
      profile(createId, { code: "3501", name: "Bastidor", functionName: "Bastidor", base: "ancho_total", quantity: 1 }),
      profile(createId, { code: "3508", name: "Bastidor liviano", functionName: "Bastidor alternativo", base: "ancho_total", quantity: 1, required: false }),
      profile(createId, { code: "3503", name: "Junquillo 45°", functionName: "Junquillo alternativo", base: "ancho_total", quantity: 1, required: false, cut: "45°" }),
      profile(createId, { code: "3504", name: "Junquillo recto", functionName: "Junquillo alternativo", base: "ancho_total", quantity: 1, required: false }),
      profile(createId, { code: "3506", name: "Tapa lisa", functionName: "Tapa alternativa", base: "alto_total", quantity: 1, required: false }),
      profile(createId, { code: "3507", name: "Tapa portafelpa", functionName: "Tapa alternativa", base: "alto_total", quantity: 1, required: false }),
      profile(createId, { code: "3509", name: "Traslapo", functionName: "Traslapo", base: "alto_total", quantity: 1 }),
    ],
    pending: ["Faltan composición, ajustes y pauta de corte específica para la variante."],
    notes: [
      "AM-35 reutiliza la línea comercial existente; no se crea un segundo catálogo.",
      "Arquetipo documenta Línea 35 para puerta abatir y vaivén; Alumet documenta bastidor normal y liviano para ambas aplicaciones.",
      "Los perfiles alternativos no se convierten en una composición simultánea y no se reutilizan fórmulas de Serie 3200 o 4600.",
    ],
  });
}

function createLine45(input: RecipeInput): FabricacionReceta {
  return crearRecetaSerie45Practicable({
    lineName: input.lineName,
    createId: input.createId,
  });
}

function createLine12(input: RecipeInput): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  return baseRecipe({
    ...input,
    createId,
    code: "ARQUETIPO-SHOWER-12-2H-V1",
    variant: "Tina · 2 hojas correderas",
    typology: "shower",
    leaves: 2,
    profiles: [
      profile(createId, { code: "1201", name: "Riel inferior", functionName: "Riel inferior de marco", base: "ancho_total", quantity: 1, cut: "90°" }),
      profile(createId, { code: "1202", name: "Jamba", functionName: "Jamba de marco", base: "alto_total", quantity: 2, cut: "90°" }),
      profile(createId, { code: "1203", name: "Riel superior", functionName: "Riel superior de marco", base: "ancho_total", quantity: 1, cut: "90°" }),
      profile(createId, { code: "1204", name: "Bastidor hoja", functionName: "Bastidor de hoja", base: "ancho_por_hoja", quantity: 4, cut: "45°" }),
    ],
    pending: ["Faltan ajustes numéricos, composición de receptáculo y pauta completa de corte."],
    notes: [
      "Arquetipo documenta Shower Door Línea 12: corredera colgante para tina o receptáculo.",
      "La fuente documenta marco con cortes a 90° y hojas con cortes a 45°; se conserva solo como metadata de corte.",
      "Quincallería documentada: caja/rodamiento Shower S-12, guías interior/exterior, tirador y unión L-12; sus consumos quedan pendientes.",
      "No se inventan descuentos ni se presenta como receta calculable.",
    ],
  });
}

export const P2U_RECIPE_FACTORIES = {
  [P2U_CATALOG_KEYS.line15]: (input: RecipeInput) => crearRecetasLine15Corredera(input),
  [P2U_CATALOG_KEYS.line4000]: (input: RecipeInput) => crearRecetasLine4000Corredera(input),
  [P2U_CATALOG_KEYS.am35]: (input: RecipeInput) => [
    createAm35(input, "puerta_abatible"),
    createAm35(input, "puerta_vaiven"),
  ],
  [P2U_CATALOG_KEYS.line45]: (input: RecipeInput) => [createLine45(input)],
  [P2U_CATALOG_KEYS.line12]: (input: RecipeInput) => [createLine12(input)],
} as const;

export function crearRecetasP2U(input: RecipeInput & { catalogKey: P2UCatalogKey }) {
  return P2U_RECIPE_FACTORIES[input.catalogKey](input);
}

export function crearRecetaP2U(input: RecipeInput & { catalogKey: P2UCatalogKey }) {
  return crearRecetasP2U(input)[0];
}
