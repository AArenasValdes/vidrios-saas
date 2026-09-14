import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionTipologia,
} from "@/features/fabricacion/types/fabricacion-domain";

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
    sourceReference: "alar:catalogo-2011:p109:pauta-corte:serie-15",
    sourceRevision: "Catálogo ALAR distribuido por Alumet, edición 2011, p. 109",
  },
  line4000: {
    sourceType: "manufacturer",
    sourceName: "Arquetipo",
    sourceReference: "arquetipo:catalogo-linea-estandar:p13-14:linea-4000",
    sourceRevision: "Catálogo Perfiles de Aluminio Arquetipo, páginas 14-15",
  },
  am35: {
    sourceType: "manufacturer",
    sourceName: "Arquetipo",
    sourceReference: "arquetipo:catalogo-linea-estandar:p17-18:linea-35",
    sourceRevision: "Catálogo Perfiles de Aluminio Arquetipo, páginas 18-19",
  },
  line45: {
    sourceType: "manufacturer",
    sourceName: "Arquetipo",
    sourceReference: "arquetipo:catalogo-linea-estandar:p19-20:linea-45",
    sourceRevision: "Catálogo Perfiles de Aluminio Arquetipo, páginas 20-21",
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

function createLine15(input: RecipeInput): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  return baseRecipe({
    ...input,
    createId,
    code: "ALAR-SERIE-15-2H-V1",
    variant: "Pauta ALAR · composición por resolver",
    typology: "corredera",
    leaves: 2,
    profiles: [
      profile(createId, { code: "1501", name: "Riel superior", functionName: "Riel superior", base: "ancho_total", adjustmentMm: 0, quantity: 1 }),
      profile(createId, { code: "1502", name: "Riel inferior", functionName: "Riel inferior", base: "ancho_total", adjustmentMm: 0, quantity: 1 }),
      profile(createId, { code: "1503", name: "Jamba", functionName: "Jamba", base: "alto_total", adjustmentMm: -7, quantity: 2 }),
      profile(createId, { code: "1504", name: "Cabezal", functionName: "Cabezal", base: "ancho_por_hoja", adjustmentMm: -3, quantity: 4 }),
      profile(createId, { code: "1505", name: "Zócalo", functionName: "Zócalo", base: "ancho_por_hoja", adjustmentMm: -3, quantity: 2 }),
      profile(createId, { code: "1506", name: "Pierna reforzada", functionName: "Pierna reforzada", base: "alto_total", adjustmentMm: -26, quantity: 2, required: false }),
      profile(createId, { code: "1507", name: "Pierna", functionName: "Pierna", base: "alto_total", adjustmentMm: -26, quantity: 2, required: false }),
      profile(createId, { code: "1508", name: "Traslapo reforzado", functionName: "Traslapo reforzado", base: "alto_total", adjustmentMm: -26, quantity: 2, required: false }),
    ],
    pending: ["Resolver si 1506, 1507 y 1508 son alternativas o componentes simultáneos."],
    notes: [
      "Pauta primaria ALAR: Catálogo distribuido por Alumet, edición 2011, p. 109.",
      "Identidad de perfiles contrastada con el catálogo Arquetipo de Línea 15.",
      "La pauta publica 1501–1508, pero no resuelve la composición entre pierna reforzada, pierna y traslapo reforzado; se muestran como opciones no obligatorias.",
      "Ejemplo documental 1200 × 1000: 1501=1200, 1502=1200, 1503=993, 1504=597, 1505=597 y perfiles 1506/1507/1508=974.",
      "No se agrega vidrio, accesorio ni largo comercial porque la pauta citada no los resuelve.",
    ],
  });
}

function createLine4000(input: RecipeInput): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  return baseRecipe({
    ...input,
    createId,
    code: "ARQUETIPO-SERIE-4000-2H-V1",
    variant: "Normal · Corredera 2 hojas",
    typology: "corredera",
    leaves: 2,
    profiles: [
      profile(createId, { code: "4001", name: "Riel superior", functionName: "Riel superior", base: "ancho_total", quantity: 1 }),
      profile(createId, { code: "4002", name: "Riel inferior", functionName: "Riel inferior", base: "ancho_total", quantity: 1 }),
      profile(createId, { code: "4003", name: "Jamba", functionName: "Jamba", base: "alto_total", quantity: 2 }),
      profile(createId, { code: "4004", name: "Cabezal", functionName: "Cabezal", base: "ancho_por_hoja", quantity: 2 }),
      profile(createId, { code: "4005", name: "Zócalo", functionName: "Zócalo", base: "ancho_por_hoja", quantity: 2 }),
      profile(createId, { code: "4007", name: "Traslapo", functionName: "Traslapo", base: "alto_total", quantity: 2 }),
      profile(createId, { code: "4008", name: "Pierna con aleta", functionName: "Pierna con aleta", base: "alto_total", quantity: 2 }),
    ],
    pending: ["Faltan ajustes y una pauta numérica oficial de corte para esta configuración."],
    notes: [
      "Identidad primaria Arquetipo: Catálogo Perfiles de Aluminio, Línea 4000, ventana corredera.",
      "ALAR/Alumet confirman la familia Serie/Columbia 4000 y sus perfiles equivalentes, pero no se usa esa coincidencia para inventar descuentos.",
      "Estado: línea tradicional documentada; pauta de corte pendiente, no lista para probar.",
    ],
  });
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
  const createId = input.createId ?? fallbackId;
  return baseRecipe({
    ...input,
    createId,
    code: "ARQUETIPO-SERIE-45-PUERTA-V1",
    variant: "Puerta · composición pendiente",
    typology: "puerta_abatible",
    leaves: 1,
    profiles: [
      profile(createId, { code: "4502", name: "Marco", functionName: "Marco", base: "ancho_total", quantity: 1 }),
      profile(createId, { code: "4504", name: "Junquillo", functionName: "Junquillo", base: "ancho_total", quantity: 1 }),
      profile(createId, { code: "4511", name: "Marco redondeado", functionName: "Marco alternativo", base: "ancho_total", quantity: 1, required: false }),
    ],
    pending: ["Faltan bastidor/hoja, composición de la puerta, variante y pauta de corte."],
    notes: [
      "Arquetipo documenta Línea 45 como puerta y muestra 4502, 4504 y 4511.",
      "ALAR/Alumet documentan más perfiles de Serie 45, pero no se mezclan automáticamente con la ficha Arquetipo.",
      "No se construye una hoja solo con 4502 y 4504 ni se importan perfiles de otra serie.",
    ],
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
  [P2U_CATALOG_KEYS.line15]: (input: RecipeInput) => [createLine15(input)],
  [P2U_CATALOG_KEYS.line4000]: (input: RecipeInput) => [createLine4000(input)],
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
