import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionReglaMedida,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";

/**
 * Fórmulas transcritas desde la pauta de corte que el usuario identifica como
 * facilitada por Veratec. La procedencia permite usarla como base documental,
 * pero no acredita largos, equivalencias comerciales ni validación física.
 */
export const VERATEC_WORKBOOK_SOURCE_REVISION =
  "pauta-de-corte-veratec.xlsx@sha256:30e4dc94d47aa698c48f82a89b330c601fb2794d06aed11783ac4c2c1f16de9c";

export const VERATEC_COMPACT_SLIDING_VARIANTS = [
  {
    slug: "compact_sliding_2h",
    leaves: 2,
    label: "2 hojas",
    sourceRevision: VERATEC_WORKBOOK_SOURCE_REVISION,
    sashWidthAdjustmentMm: -2,
    reinforcementWidthAdjustmentMm: -118,
    glassWidthAdjustmentMm: -118,
    sourceReference: "pauta-de-corte-veratec.xlsx#compact-sliding-2-hojas",
    pendingFields: [
      "La hoja dice ‘todos’ para junquillo. Debe elegirse por espesor de vidrio: 4 mm usa 67062VER; 20 mm usa 67464VER (díptico p. 3 y lista junio 2026 p. 4).",
      "La lista de junio publica Negro Mate del SKU de junquillo 67464VER en 6,8 m; el motor aún no resuelve largos de presentación por acabado antes del packing.",
      "Espesor/composición de vidrio y accesorios no definidos en esta hoja.",
      "Kerf y despunte inicial pendientes de parámetros del taller.",
    ],
  },
  {
    slug: "compact_sliding_3h",
    leaves: 3,
    label: "3 hojas",
    sourceRevision: VERATEC_WORKBOOK_SOURCE_REVISION,
    sashWidthAdjustmentMm: 24,
    reinforcementWidthAdjustmentMm: -92,
    glassWidthAdjustmentMm: -92,
    sourceReference: "pauta-de-corte-veratec.xlsx#compact-sliding-3-hojas",
    pendingFields: [
      "La hoja dice ‘todos’ para junquillo. Debe elegirse por espesor: 4 mm usa 67062VER; 20 mm usa 67464VER (díptico p. 3 y lista junio 2026 p. 4).",
      "El Negro Mate de 67464VER se comercializa en 6,8 m; el packing todavía no resuelve largo por acabado.",
      "Espesor/composición de vidrio y accesorios no definidos en esta hoja.",
      "Kerf y despunte inicial pendientes de parámetros del taller.",
    ],
  },
  {
    slug: "compact_sliding_4h",
    leaves: 4,
    label: "4 hojas",
    sourceRevision: VERATEC_WORKBOOK_SOURCE_REVISION,
    sashWidthAdjustmentMm: 17.8,
    reinforcementWidthAdjustmentMm: -98.2,
    glassWidthAdjustmentMm: -98.2,
    sourceReference: "pauta-de-corte-veratec.xlsx#compact-sliding-4-hojas",
    pendingFields: [
      "La hoja dice ‘todos’ para junquillo. Debe elegirse por espesor: 4 mm usa 67062VER; 20 mm usa 67464VER (díptico p. 3 y lista junio 2026 p. 4).",
      "El Negro Mate de 67464VER se comercializa en 6,8 m; el packing todavía no resuelve largo por acabado.",
      "Espesor/composición de vidrio y accesorios no definidos en esta hoja.",
      "Kerf y despunte inicial pendientes de parámetros del taller.",
    ],
  },
] as const;

export const VERATEC_7400_WORKBOOK_3H_VARIANTS = [
  {
    slug: "7400_3h_grande_2rieles",
    label: "3 hojas grandes · 2 rieles",
    leaves: 3,
    leafCode: "67414VER",
    leafName: "Hoja grande Sliding 7400",
    sashWidthAdjustmentMm: 3.3,
    reinforcementWidthAdjustmentMm: -162.7,
    glassWidthAdjustmentMm: -158.7,
    glassHeightAdjustmentMm: -250,
    reinforcementCode: "69069STL000",
    sourceReference: "pauta-de-corte-veratec.xlsx#corred2riel3hojas2mismoriel",
  },
  {
    slug: "7400_3h_chica_2rieles",
    label: "3 hojas chicas · 2 rieles",
    leaves: 3,
    leafCode: "67415VER",
    leafName: "Hoja chica Sliding 7400",
    sashWidthAdjustmentMm: -2.7,
    reinforcementWidthAdjustmentMm: -168.7,
    glassWidthAdjustmentMm: -128.7,
    glassHeightAdjustmentMm: -214,
    reinforcementCode: "69071STL000",
    sourceReference: "pauta-de-corte-veratec.xlsx#corred2rieles3hojas2mismoriel",
  },
] as const;

export const VERATEC_ELEGANS_FIXED_VARIANTS = [
  {
    slug: "elegans_fijo_marco_normal",
    label: "Paño fijo · marco normal",
    glassAdjustmentMm: -90,
    sourceReference: "pauta-de-corte-veratec.xlsx#FIJO",
  },
  {
    slug: "elegans_fijo_marco_rebajado",
    label: "Paño fijo · marco rebajado",
    glassAdjustmentMm: -82,
    sourceReference: "pauta-de-corte-veratec.xlsx#fijo-con-marco-rebajado",
  },
] as const;

export const VERATEC_ELEGANS_BATIENTE_VARIANTS = [
  {
    slug: "elegans_ventana_hoja_interior",
    label: "Ventana · hoja interior",
    catalogKey: "ventora:veratec-elegans-60-ventana-hoja-interior",
    sourceReference: "pauta-de-corte-veratec.xlsx#ABATIR-INT-Y-OB",
    typology: "abatible",
    sashCode: "65212VER",
    sashName: "Hoja de ventana interior",
    sashWidthAdjustmentMm: -58,
    sashHeightAdjustmentMm: -58,
    reinforcementCode: "61011VER990",
    reinforcementWidthAdjustmentMm: -178,
    reinforcementHeightAdjustmentMm: -178,
    reinforcementName: "Refuerzo de hoja · código de planilla",
    glassWidthAdjustmentMm: -183,
    glassHeightAdjustmentMm: -183,
  },
  {
    slug: "elegans_ventana_hoja_exterior",
    label: "Ventana · hoja exterior",
    catalogKey: "ventora:veratec-elegans-60-ventana-hoja-exterior",
    sourceReference: "pauta-de-corte-veratec.xlsx#ABATIR-EXT-Y-PROY",
    typology: "abatible",
    sashCode: "65209VER",
    sashName: "Hoja de ventana exterior",
    sashWidthAdjustmentMm: -58,
    sashHeightAdjustmentMm: -58,
    reinforcementCode: "69011VER990",
    reinforcementWidthAdjustmentMm: -190,
    reinforcementHeightAdjustmentMm: -190,
    reinforcementName: "Refuerzo de hoja · código de planilla",
    glassWidthAdjustmentMm: -244,
    glassHeightAdjustmentMm: -244,
  },
  {
    slug: "elegans_puerta_hoja_interior",
    label: "Puerta · hoja interior",
    catalogKey: "ventora:veratec-elegans-60-puerta-hoja-interior",
    sourceReference: "pauta-de-corte-veratec.xlsx#pta-int-paso-libre",
    typology: "puerta_abatible",
    sashCode: "65204VER",
    sashName: "Hoja de puerta interior",
    sashWidthAdjustmentMm: -58,
    sashHeightAdjustmentMm: -32,
    reinforcementCode: "69013STL001",
    reinforcementWidthAdjustmentMm: -222,
    reinforcementHeightAdjustmentMm: -195,
    reinforcementName: "Refuerzo de hoja",
    glassWidthAdjustmentMm: null,
    glassHeightAdjustmentMm: null,
  },
  {
    slug: "elegans_puerta_hoja_exterior",
    label: "Puerta · hoja exterior",
    catalogKey: "ventora:veratec-elegans-60-puerta-hoja-exterior",
    sourceReference: "pauta-de-corte-veratec.xlsx#pta-ext-paso-libre",
    typology: "puerta_abatible",
    sashCode: "65210VER",
    sashName: "Hoja de puerta exterior",
    sashWidthAdjustmentMm: -58,
    sashHeightAdjustmentMm: -32,
    reinforcementCode: "69025STL000",
    reinforcementWidthAdjustmentMm: -222,
    reinforcementHeightAdjustmentMm: -195,
    reinforcementName: "Refuerzo de hoja",
    glassWidthAdjustmentMm: null,
    glassHeightAdjustmentMm: null,
  },
] as const;

export const VERATEC_7400_MONORAIL_VARIANTS = [
  {
    slug: "7400_monorriel_hoja_grande",
    label: "Monorriel · hoja grande",
    sourceReference: "pauta-de-corte-veratec.xlsx#sliding-mono-riel-hoja-grande",
    leafCode: "67414VER",
    leafName: "Hoja grande",
    sashWidthBaseAdjustmentMm: -156.5,
    sashHeightAdjustmentMm: -88,
    reinforcementWidthAdjustmentMm: -176.5,
    reinforcementHeightAdjustmentMm: -270,
    sashGlassWidthAdjustmentMm: -146.5,
    fixedGlassWidthAdjustmentMm: -95.5,
    fixedGlassHeightAdjustmentMm: -120,
  },
  {
    slug: "7400_monorriel_hoja_chica",
    label: "Monorriel · hoja chica",
    sourceReference: "pauta-de-corte-veratec.xlsx#sliding-mono-riel-hoja-chica",
    leafCode: "67415VER",
    leafName: "Hoja chica",
    sashWidthBaseAdjustmentMm: -129.5,
    sashHeightAdjustmentMm: -88,
    reinforcementWidthAdjustmentMm: -149.5,
    reinforcementHeightAdjustmentMm: -234,
    sashGlassWidthAdjustmentMm: -129.5,
    fixedGlassWidthAdjustmentMm: -86.5,
    fixedGlassHeightAdjustmentMm: -120,
  },
] as const;

type CompactVariantSlug = (typeof VERATEC_COMPACT_SLIDING_VARIANTS)[number]["slug"];
type Sliding7400Workbook3HSlug = (typeof VERATEC_7400_WORKBOOK_3H_VARIANTS)[number]["slug"];
type ElegansFixedSlug = (typeof VERATEC_ELEGANS_FIXED_VARIANTS)[number]["slug"];
type ElegansBatienteVariant = (typeof VERATEC_ELEGANS_BATIENTE_VARIANTS)[number];
type Sliding7400MonorailVariant = (typeof VERATEC_7400_MONORAIL_VARIANTS)[number];

function measure(
  base: FabricacionReglaMedida["base"],
  ajusteMm: number
): FabricacionReglaMedida {
  return { base, ajusteMm };
}

function buildProfiles(
  variant: (typeof VERATEC_COMPACT_SLIDING_VARIANTS)[number],
  createId: () => string
): FabricacionComponentePerfil[] {
  const leaves = variant.leaves;
  const sashPieces = leaves * 2;
    const knownLengthCodes = new Set([
      "67460VER",
      "67461VER",
      "67463VER",
      "69083STL001",
      "69041STL000",
      // Alias funcional documentado: Excel 61013ver → riel oficial 61013VER001.
      "61013ver",
    ]);
  const addProfile = (input: {
    code: string;
    name: string;
    role: string;
    base: FabricacionReglaMedida["base"];
    adjustmentMm: number;
    count: number;
    cut: string;
  }): FabricacionComponentePerfil => ({
    id: createId(),
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.role,
    // 5.8 m está publicado para estas referencias en la lista junio 2026.
    // Los códigos sin asociación/presentación quedan sin largo configurado.
    largoComercialMm: knownLengthCodes.has(input.code) ? 5800 : null,
    largoComercialPendiente: !knownLengthCodes.has(input.code),
    reglaMedida: measure(input.base, input.adjustmentMm),
    reglaCantidad: { tipo: "fija", cantidad: input.count },
    requerido: true,
    corte: input.cut,
    ...(knownLengthCodes.has(input.code)
      ? {}
      : {
          datosPendientes: [
            "Confirmar asociación técnica y largo comercial antes de emitir barras de compra.",
          ],
        }),
    observaciones: `Fórmula transcrita de ${variant.sourceReference}.`,
  });

  return [
    addProfile({ code: "67460VER", name: "Marco Compact Sliding", role: "Marco", base: "ancho_total", adjustmentMm: 6, count: 2, cut: "45° / 45°" }),
    addProfile({ code: "67460VER", name: "Marco Compact Sliding", role: "Marco", base: "alto_total", adjustmentMm: 6, count: 2, cut: "45° / 45°" }),
    addProfile({ code: "69083STL001", name: "Refuerzo de marco", role: "Refuerzo de marco", base: "ancho_total", adjustmentMm: -70, count: 2, cut: "90° / 90°" }),
    addProfile({ code: "69083STL001", name: "Refuerzo de marco", role: "Refuerzo de marco", base: "alto_total", adjustmentMm: -70, count: 2, cut: "90° / 90°" }),
    addProfile({ code: "67461VER", name: "Hoja corredera Compact Sliding", role: "Hoja", base: "ancho_por_hoja", adjustmentMm: variant.sashWidthAdjustmentMm, count: sashPieces, cut: "45° / 45°" }),
    addProfile({ code: "67461VER", name: "Hoja corredera Compact Sliding", role: "Hoja", base: "alto_total", adjustmentMm: -80, count: sashPieces, cut: "45° / 45°" }),
    addProfile({ code: "69041STL000", name: "Refuerzo de hoja", role: "Refuerzo de hoja", base: "ancho_por_hoja", adjustmentMm: variant.reinforcementWidthAdjustmentMm, count: sashPieces, cut: "90° / 90°" }),
    addProfile({ code: "69041STL000", name: "Refuerzo de hoja", role: "Refuerzo de hoja", base: "alto_total", adjustmentMm: -196, count: sashPieces, cut: "90° / 90°" }),
    addProfile({ code: "67463VER", name: "Traslapo de hoja corredera", role: "Traslapo", base: "alto_total", adjustmentMm: -86, count: leaves === 2 ? 2 : 4, cut: "90° / 90°" }),
    addProfile({ code: "61013ver", name: "Riel Compact Sliding (código origen de hoja)", role: "Riel", base: "ancho_total", adjustmentMm: -106, count: 2, cut: "90° / 90°" }),
  ];
}

function buildGlass(
  variant: (typeof VERATEC_COMPACT_SLIDING_VARIANTS)[number],
  createId: () => string
): FabricacionVidrio {
  return {
    id: createId(),
    nombre: "Vidrio (espesor y composición por definir)",
    reglaAncho: measure("ancho_por_hoja", variant.glassWidthAdjustmentMm),
    reglaAlto: measure("alto_total", -196),
    reglaCantidad: { tipo: "fija", cantidad: variant.leaves },
    requerido: false,
    observaciones: `Medidas transcritas de ${variant.sourceReference}; no se infiere espesor ni tipo de acristalamiento.`,
    datosPendientes: ["Espesor y composición de vidrio no indicados en la hoja."],
  };
}

export function crearRecetaVeratecCompactSliding(input: {
  lineName: string;
  variant: CompactVariantSlug;
  createId?: () => string;
}): FabricacionReceta {
  const variant = VERATEC_COMPACT_SLIDING_VARIANTS.find(
    (candidate) => candidate.slug === input.variant
  );
  if (!variant) throw new Error(`Variante Compact Sliding desconocida: ${input.variant}`);

  const createId = input.createId ?? (() => crypto.randomUUID());
  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    permitirCalculoPreliminarConPendientes: true,
    identidad: {
      recetaId: createId(),
      codigo: `VERATEC-COMPACT-${variant.slug.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || "Compact Sliding"} · ${variant.label}`,
      tipologia: "corredera",
      hojas: variant.leaves,
      modulos: variant.leaves,
      apertura: null,
      herraje: null,
      variante: variant.slug,
    },
    perfiles: buildProfiles(variant, createId),
    vidrios: [buildGlass(variant, createId)],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: null,
    },
    notasValidacion: [
      `Fuente: ${variant.sourceReference}; revisión ${VERATEC_WORKBOOK_SOURCE_REVISION}.`,
      "Receta preliminar de la planilla aportada; no equivale a validación de fabricante ni de taller.",
      "El Excel indica ‘todos’ para el junquillo; el código debe elegirse por espesor (4 mm: 67062VER; 20 mm: 67464VER). No se incluye hasta que la selección del paño aporte el espesor explícito.",
      "Los largos comerciales solo se fijan cuando coinciden con presentaciones explícitas del catálogo local.",
      ...variant.pendingFields,
    ],
  };
}

export function crearRecetaVeratec7400Workbook3H(input: {
  lineName: string;
  variant: Sliding7400Workbook3HSlug;
  createId?: () => string;
}): FabricacionReceta {
  const variant = VERATEC_7400_WORKBOOK_3H_VARIANTS.find(
    (candidate) => candidate.slug === input.variant
  );
  if (!variant) throw new Error(`Variante Sliding 7400 desconocida: ${input.variant}`);

  const createId = input.createId ?? (() => crypto.randomUUID());
  const profile = (values: {
    code: string;
    name: string;
    role: string;
    base: FabricacionReglaMedida["base"];
    adjustmentMm: number;
    quantity: number;
    cut: string;
    multiplier?: number;
  }): FabricacionComponentePerfil => ({
    id: createId(),
    codigoPerfil: values.code,
    nombrePerfil: values.name,
    funcion: values.role,
    largoComercialMm:
      values.code === "67401VER"
        ? null
        : ["69014STL001", "67414VER", "67415VER", "69069STL000", "69071STL000", "67418VER", "61016ver"].includes(values.code)
          ? 5800
          : null,
    largoComercialPendiente: values.code === "67401VER",
    reglaMedida: {
      ...measure(values.base, values.adjustmentMm),
      ...(values.multiplier === undefined ? {} : { multiplicador: values.multiplier }),
    },
    reglaCantidad: { tipo: "fija", cantidad: values.quantity },
    requerido: true,
    corte: values.cut,
    observaciones: `Fórmula transcrita de ${variant.sourceReference}.`,
    ...(values.code === "67401VER"
      ? {
          datosPendientes: [
            "El largo de marco depende del acabado en la lista junio 2026: 5,8 m en varios acabados y 6,8 m en Negro/Negro Mate. Falta resolver el largo de presentación por acabado antes de consolidar barras.",
          ],
        }
      : {}),
  });
  const leafPieces = variant.leaves * 2;
  const glass: FabricacionVidrio = {
    id: createId(),
    nombre: "Vidrio (espesor y composición por definir)",
    reglaAncho: measure("ancho_por_hoja", variant.glassWidthAdjustmentMm),
    reglaAlto: measure("alto_total", variant.glassHeightAdjustmentMm),
    reglaCantidad: { tipo: "fija", cantidad: variant.leaves },
    requerido: false,
    observaciones: `Fórmula transcrita de ${variant.sourceReference}; no se infiere espesor.`,
    datosPendientes: ["Espesor y composición de vidrio no indicados en la hoja."],
  };

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    permitirCalculoPreliminarConPendientes: true,
    identidad: {
      recetaId: createId(),
      codigo: `VERATEC-7400-${variant.slug.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || "Sliding 7400"} · ${variant.label}`,
      tipologia: "corredera",
      hojas: variant.leaves,
      modulos: variant.leaves,
      apertura: null,
      herraje: null,
      variante: variant.slug,
    },
    perfiles: [
      profile({ code: "67401VER", name: "Marco corredera 2 rieles", role: "Marco", base: "ancho_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" }),
      profile({ code: "67401VER", name: "Marco corredera 2 rieles", role: "Marco", base: "alto_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" }),
      profile({ code: "69014STL001", name: "Refuerzo de marco", role: "Refuerzo de marco", base: "ancho_total", adjustmentMm: -70, quantity: 2, cut: "90° / 90°" }),
      profile({ code: "69014STL001", name: "Refuerzo de marco", role: "Refuerzo de marco", base: "alto_total", adjustmentMm: -70, quantity: 2, cut: "90° / 90°" }),
      profile({ code: variant.leafCode, name: variant.leafName, role: "Hoja", base: "ancho_por_hoja", adjustmentMm: variant.sashWidthAdjustmentMm, quantity: leafPieces, cut: "45° / 45°" }),
      profile({ code: variant.leafCode, name: variant.leafName, role: "Hoja", base: "alto_total", adjustmentMm: -88, quantity: leafPieces, cut: "45° / 45°" }),
      profile({ code: variant.reinforcementCode, name: "Refuerzo de hoja", role: "Refuerzo de hoja", base: "ancho_por_hoja", adjustmentMm: variant.reinforcementWidthAdjustmentMm, quantity: leafPieces, cut: "90° / 90°" }),
      profile({ code: variant.reinforcementCode, name: "Refuerzo de hoja", role: "Refuerzo de hoja", base: "alto_total", adjustmentMm: -254, quantity: leafPieces, cut: "90° / 90°" }),
      profile({ code: "67418VER", name: "Traslapo Sliding 7400", role: "Traslapo", base: "alto_total", adjustmentMm: -94, quantity: 2, cut: "90° / 90°" }),
      profile({ code: "61016ver", name: "Riel Sliding 7400 (código origen de hoja)", role: "Riel", base: "ancho_total", adjustmentMm: -114, quantity: 2, cut: "90° / 90°" }),
    ],
    vidrios: [glass],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: null,
    },
    notasValidacion: [
      `Fuente: ${variant.sourceReference}; revisión ${VERATEC_WORKBOOK_SOURCE_REVISION}.`,
      "Receta preliminar de la planilla aportada; no modifica ni reemplaza Sliding 7400 2H existente.",
      "La hoja 3H de gran hoja declara 2 o 3 rieles; se usa solo la pestaña que dice expresamente 2 rieles iguales.",
      "La hoja usa ‘todos’ para el junquillo y no entrega longitudes de corte para ese componente; se omite hasta capturar una fuente/fórmula verificable.",
      "61016ver es el código de origen de la hoja. La asociación funcional explícita es con Riel Sliding 61016VER001 del pendón p. 1 y lista p. 5; 61016VER000 es Tope estanco Compact y no se usa como riel.",
      "El marco 67401VER tiene largo comercial dependiente del acabado (5,8 m o 6,8 m en la lista de junio), por lo que el cálculo conjunto no debe fijarlo hasta resolver la presentación seleccionada.",
      "Espesor/composición de vidrio y accesorios quedan pendientes; estado conserva lista_para_validar.",
    ],
  };
}

export function crearRecetaVeratecElegansFijo(input: {
  lineName: string;
  variant: ElegansFixedSlug;
  createId?: () => string;
}): FabricacionReceta {
  const variant = VERATEC_ELEGANS_FIXED_VARIANTS.find(
    (candidate) => candidate.slug === input.variant
  );
  if (!variant) throw new Error(`Variante Elegans 60 fija desconocida: ${input.variant}`);

  const createId = input.createId ?? (() => crypto.randomUUID());
  const profile = (values: {
    code: string;
    name: string;
    role: string;
    base: FabricacionReglaMedida["base"];
    adjustmentMm: number;
    cut: string;
  }): FabricacionComponentePerfil => ({
    id: createId(),
    codigoPerfil: values.code,
    nombrePerfil: values.name,
    funcion: values.role,
    largoComercialMm: null,
    largoComercialPendiente: true,
    reglaMedida: measure(values.base, values.adjustmentMm),
    reglaCantidad: { tipo: "fija", cantidad: 2 },
    requerido: true,
    corte: values.cut,
    datosPendientes: [
      "El código de planilla no coincide con el perfil técnico/precio cargado; no se resuelve largo ni costo.",
    ],
    observaciones: `Fórmula transcrita de ${variant.sourceReference}.`,
  });
  const glass: FabricacionVidrio = {
    id: createId(),
    nombre: "Vidrio (espesor por definir)",
    reglaAncho: measure("ancho_total", variant.glassAdjustmentMm),
    reglaAlto: measure("alto_total", variant.glassAdjustmentMm),
    reglaCantidad: { tipo: "fija", cantidad: 1 },
    requerido: false,
    datosPendientes: ["La hoja calcula medidas, pero no establece espesor ni composición."],
    observaciones: `Fórmula transcrita de ${variant.sourceReference}.`,
  };

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    permitirCalculoPreliminarConPendientes: true,
    identidad: {
      recetaId: createId(),
      codigo: `VERATEC-ELEGANS-FIJO-${variant.slug.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || "Elegans 60 · Paño fijo"} · ${variant.label}`,
      tipologia: "pano_fijo",
      hojas: 1,
      modulos: 1,
      apertura: "fijo",
      herraje: null,
      variante: variant.slug,
    },
    perfiles: [
      profile({ code: "65201VER", name: "Marco fijo", role: "Marco", base: "ancho_total", adjustmentMm: 6, cut: "45° / 45°" }),
      profile({ code: "65201VER", name: "Marco fijo", role: "Marco", base: "alto_total", adjustmentMm: 6, cut: "45° / 45°" }),
      profile({ code: "61011VER999", name: "Refuerzo de marco", role: "Refuerzo", base: "ancho_total", adjustmentMm: -85, cut: "90° / 90°" }),
      profile({ code: "61011VER999", name: "Refuerzo de marco", role: "Refuerzo", base: "alto_total", adjustmentMm: -85, cut: "90° / 90°" }),
    ],
    vidrios: [glass],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: null,
    },
    notasValidacion: [
      `Fuente: ${variant.sourceReference}; revisión ${VERATEC_WORKBOOK_SOURCE_REVISION}.`,
      "La planilla BASE denomina los códigos como Soluex con descripción Veratec; no se enlazan por nombre a SKU/precio actuales.",
      "El junquillo figura como ‘todos’ sin código inequívoco y se omite del despiece.",
      "Longitudes, composición de vidrio, accesorios, kerf y despunte pendientes.",
      "Receta preliminar; no implica validación de fabricante ni de taller.",
    ],
  };
}

export function crearRecetaVeratecElegansBatiente(input: {
  variant: ElegansBatienteVariant["slug"];
  lineName: string;
  createId?: () => string;
}): FabricacionReceta {
  const variant = VERATEC_ELEGANS_BATIENTE_VARIANTS.find(
    (candidate) => candidate.slug === input.variant,
  );
  if (!variant) throw new Error(`Variante Elegans 60 desconocida: ${input.variant}`);
  const createId = input.createId ?? (() => crypto.randomUUID());
  const profile = (values: {
    code: string;
    name: string;
    role: string;
    base: FabricacionReglaMedida["base"];
    adjustmentMm: number;
    quantity: number;
  }): FabricacionComponentePerfil => ({
    id: createId(),
    codigoPerfil: values.code,
    nombrePerfil: values.name,
    funcion: values.role,
    largoComercialMm: null,
    largoComercialPendiente: true,
    reglaMedida: measure(values.base, values.adjustmentMm),
    reglaCantidad: { tipo: "fija", cantidad: values.quantity },
    requerido: true,
    corte: values.role === "Marco" || values.role === "Hoja" ? "45° / 45°" : "90° / 90°",
    datosPendientes: [
      "Largo de barra y precio se resuelven por la presentación exacta; si no existe, se completan en Mis precios.",
      ...(values.code.includes("999") || values.code.includes("990")
        ? ["Código transcrito del Excel; confirmar su equivalencia con el perfil comercial del taller."]
        : []),
    ],
    observaciones: `Fórmula transcrita de ${variant.sourceReference}.`,
  });
  const isDoor = variant.typology === "puerta_abatible";
  const frameWidthCount = isDoor ? 1 : 2;
  const frameHeightCount = 2;
  const profiles = [
    profile({ code: "65201VER", name: "Marco Elegans 60", role: "Marco", base: "ancho_total", adjustmentMm: 6, quantity: frameWidthCount }),
    profile({ code: "65201VER", name: "Marco Elegans 60", role: "Marco", base: "alto_total", adjustmentMm: 6, quantity: frameHeightCount }),
    profile({ code: "61011VER999", name: "Refuerzo de marco · código de planilla", role: "Refuerzo de marco", base: "ancho_total", adjustmentMm: -85, quantity: frameWidthCount }),
    profile({ code: "61011VER999", name: "Refuerzo de marco · código de planilla", role: "Refuerzo de marco", base: "alto_total", adjustmentMm: -85, quantity: frameHeightCount }),
    profile({ code: variant.sashCode, name: variant.sashName, role: "Hoja", base: "ancho_total", adjustmentMm: variant.sashWidthAdjustmentMm, quantity: 2 }),
    profile({ code: variant.sashCode, name: variant.sashName, role: "Hoja", base: "alto_total", adjustmentMm: variant.sashHeightAdjustmentMm, quantity: 2 }),
    profile({ code: variant.reinforcementCode, name: variant.reinforcementName, role: "Refuerzo de hoja", base: "ancho_total", adjustmentMm: variant.reinforcementWidthAdjustmentMm, quantity: 2 }),
    profile({ code: variant.reinforcementCode, name: variant.reinforcementName, role: "Refuerzo de hoja", base: "alto_total", adjustmentMm: variant.reinforcementHeightAdjustmentMm, quantity: 2 }),
  ];
  const glass = variant.glassWidthAdjustmentMm === null || variant.glassHeightAdjustmentMm === null
    ? []
    : [{
        id: createId(),
        nombre: "Vidrio (espesor/composición pendiente)",
        reglaAncho: measure("ancho_total", variant.glassWidthAdjustmentMm),
        reglaAlto: measure("alto_total", variant.glassHeightAdjustmentMm),
        reglaCantidad: { tipo: "fija" as const, cantidad: 1 },
        requerido: false,
        datosPendientes: ["La planilla no confirma espesor ni composición del vidrio."],
        observaciones: `Medidas transcritas de ${variant.sourceReference}.`,
      }];

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    permitirCalculoPreliminarConPendientes: true,
    identidad: {
      recetaId: createId(),
      codigo: `VERATEC-ELEGANS-${variant.slug.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || "Elegans 60"} · ${variant.label}`,
      tipologia: variant.typology,
      hojas: 1,
      modulos: 1,
      apertura: variant.typology === "puerta_abatible" ? "abatible" : "abatible",
      herraje: null,
      variante: variant.slug,
    },
    perfiles: profiles,
    vidrios: glass,
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: null,
    },
    datosPendientes: [
      "Junquillo indicado como ‘todos’: falta elegir el código compatible con el vidrio.",
      "Accesorios no calculados en esta base.",
      ...(!glass.length ? ["Las dimensiones de vidrio de la hoja no coinciden con la fórmula de cubicación; quedan pendientes."] : []),
      "La pauta de barras queda parcial hasta asociar los códigos a presentaciones con largo configurado.",
      "Kerf y despunte inicial son datos del taller; no están definidos por esta plantilla.",
    ],
    notasValidacion: [
      `Fuente: ${variant.sourceReference}; revisión ${VERATEC_WORKBOOK_SOURCE_REVISION}.`,
      "Pauta facilitada por Veratec. Es una base documental para probar y editar; no está validada físicamente por el taller.",
      "Los descuentos se transcriben separados del largo comercial, precio y parámetros de sierra.",
    ],
  };
}

export function crearRecetaVeratec7400Monorriel(input: {
  variant: Sliding7400MonorailVariant["slug"];
  lineName: string;
  createId?: () => string;
}): FabricacionReceta {
  const variant = VERATEC_7400_MONORAIL_VARIANTS.find(
    (candidate) => candidate.slug === input.variant,
  );
  if (!variant) throw new Error(`Variante Sliding 7400 monorriel desconocida: ${input.variant}`);
  const createId = input.createId ?? (() => crypto.randomUUID());
  const profile = (values: {
    code: string;
    name: string;
    role: string;
    base: FabricacionReglaMedida["base"];
    adjustmentMm: number;
    quantity: number;
    cut: string;
    multiplier?: number;
  }): FabricacionComponentePerfil => ({
    id: createId(),
    codigoPerfil: values.code,
    nombrePerfil: values.name,
    funcion: values.role,
    largoComercialMm: null,
    largoComercialPendiente: true,
    reglaMedida: {
      ...measure(values.base, values.adjustmentMm),
      ...(values.multiplier === undefined ? {} : { multiplicador: values.multiplier }),
    },
    reglaCantidad: { tipo: "fija", cantidad: values.quantity },
    requerido: true,
    corte: values.cut,
    datosPendientes: [
      "Confirmar presentación y largo comercial antes de calcular barras de compra.",
      ...(values.code === "61016ver" ? ["Código de origen normalizado al riel 61016VER001 según la asociación documentada."] : []),
    ],
    observaciones: `Fórmula transcrita de ${variant.sourceReference}.`,
  });
  const halfWidth = (adjustmentMm: number): FabricacionReglaMedida => ({
    base: "ancho_total",
    multiplicador: 0.5,
    ajusteMm: adjustmentMm,
  });
  const large = variant.slug === "7400_monorriel_hoja_grande";
  const profiles = [
    profile({ code: "67411VER", name: "Marco Sliding 7400 monorriel", role: "Marco", base: "ancho_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" }),
    profile({ code: "67411VER", name: "Marco Sliding 7400 monorriel", role: "Marco", base: "alto_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" }),
    profile({ code: "69083STL001", name: "Refuerzo de marco", role: "Refuerzo de marco", base: "ancho_total", adjustmentMm: -130, quantity: 2, cut: "90° / 90°" }),
    profile({ code: "69083STL001", name: "Refuerzo de marco", role: "Refuerzo de marco", base: "alto_total", adjustmentMm: -130, quantity: 2, cut: "90° / 90°" }),
    profile({ code: "69060STL001", name: "Refuerzo de marco", role: "Refuerzo de marco", base: "ancho_total", adjustmentMm: -90, quantity: 2, cut: "90° / 90°" }),
    profile({ code: "69060STL001", name: "Refuerzo de marco", role: "Refuerzo de marco", base: "alto_total", adjustmentMm: -90, quantity: 2, cut: "90° / 90°" }),
    profile({ code: variant.leafCode, name: variant.leafName, role: "Hoja", base: "ancho_total", adjustmentMm: variant.sashWidthBaseAdjustmentMm, multiplier: 0.5, quantity: 2, cut: "45° / 45°" }),
    profile({ code: variant.leafCode, name: variant.leafName, role: "Hoja", base: "alto_total", adjustmentMm: -88, quantity: 2, cut: "45° / 45°" }),
    profile({ code: large ? "69069STL000" : "69071STL000", name: "Refuerzo de hoja", role: "Refuerzo de hoja", base: "ancho_total", adjustmentMm: variant.reinforcementWidthAdjustmentMm, multiplier: 0.5, quantity: 2, cut: "90° / 90°" }),
    profile({ code: large ? "69069STL000" : "69071STL000", name: "Refuerzo de hoja", role: "Refuerzo de hoja", base: "alto_total", adjustmentMm: large ? -270 : -234, quantity: 2, cut: "90° / 90°" }),
    profile({ code: variant.leafCode, name: "Traslapo de hoja fija", role: "Traslapo", base: "alto_total", adjustmentMm: -96, quantity: 1, cut: "90° / 90°" }),
    profile({ code: "67405VER", name: "Remate monorriel", role: "Remate", base: "ancho_total", adjustmentMm: large ? -100.7 : -91.7, quantity: 2, cut: "45° / 45°" }),
    profile({ code: "67405VER", name: "Remate monorriel", role: "Remate", base: "alto_total", adjustmentMm: -102, quantity: 1, cut: "45° / 90°" }),
    profile({ code: "61016VER001", name: "Riel Sliding 7400", role: "Riel", base: "ancho_total", adjustmentMm: -114, quantity: 1, cut: "90° / 90°" }),
  ];
  const glassWidth = (adjustmentMm: number): FabricacionReglaMedida => ({
    base: "ancho_total",
    multiplicador: 0.5,
    ajusteMm: adjustmentMm,
  });
  const glass = [
    {
      id: createId(),
      nombre: "Vidrio hoja móvil (espesor/composición pendiente)",
      reglaAncho: glassWidth(variant.sashGlassWidthAdjustmentMm),
      reglaAlto: measure("alto_total", large ? -250 : -214),
      reglaCantidad: { tipo: "fija" as const, cantidad: 1 },
      requerido: false,
      datosPendientes: ["El espesor y la composición del vidrio no aparecen en la hoja."],
    },
    {
      id: createId(),
      nombre: "Vidrio paño fijo (espesor/composición pendiente)",
      reglaAncho: glassWidth(variant.fixedGlassWidthAdjustmentMm),
      reglaAlto: measure("alto_total", variant.fixedGlassHeightAdjustmentMm),
      reglaCantidad: { tipo: "fija" as const, cantidad: 1 },
      requerido: false,
      datosPendientes: ["El espesor y la composición del vidrio no aparecen en la hoja."],
    },
  ];

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    permitirCalculoPreliminarConPendientes: true,
    identidad: {
      recetaId: createId(),
      codigo: `VERATEC-7400-${variant.slug.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || "Sliding 7400 · Monorriel"} · ${variant.label}`,
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      apertura: "corredera",
      herraje: null,
      variante: variant.slug,
    },
    perfiles: profiles,
    vidrios: glass,
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: null,
    },
    datosPendientes: [
      "El Excel deja ‘todos’ en junquillos de hoja y paño fijo; se omiten hasta elegir SKU por vidrio.",
      "No se informan accesorios, espesor/composición del vidrio, kerf ni despunte.",
      "Completar largos y costos en la presentación del taller para obtener barras y costo técnico.",
    ],
    notasValidacion: [
      `Fuente: ${variant.sourceReference}; revisión ${VERATEC_WORKBOOK_SOURCE_REVISION}.`,
      "Pauta facilitada por Veratec. Cálculo preliminar editable; requiere prueba del taller antes de validar.",
    ],
  };
}
