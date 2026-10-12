import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionReglaMedida,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";

export const VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX = "ventora:veratec-bahar-5200";
export const VERATEC_BAHAR_5200_FAMILY_KEY = "veratec:bahar-5200";
export const VERATEC_BAHAR_5200_SOURCE_REVISION =
  "pauta-de-corte-veratec.xlsx + MATERIALES PRECIO VERATEC.xlsx#BAHAR";

export const VERATEC_BAHAR_5200_VARIANTS = [
  {
    slug: "bahar_5200_fijo",
    catalogKey: `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-fijo`,
    label: "Paño fijo",
    typology: "pano_fijo" as const,
    sourceReference: "pauta-de-corte-veratec.xlsx#FIJO",
    profiles: [
      { code: "65201VER", name: "Marco fijo Bahar", role: "Marco", base: "ancho_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" },
      { code: "65201VER", name: "Marco fijo Bahar", role: "Marco", base: "alto_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" },
      { code: "61011VER999", name: "Refuerzo · código de planilla", role: "Refuerzo", base: "ancho_total", adjustmentMm: -85, quantity: 2, cut: "90° / 90°" },
      { code: "61011VER999", name: "Refuerzo · código de planilla", role: "Refuerzo", base: "alto_total", adjustmentMm: -85, quantity: 2, cut: "90° / 90°" },
    ],
    glassAdjustmentMm: -90,
  },
  {
    slug: "bahar_5200_ventana_interior",
    catalogKey: `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-ventana-interior`,
    label: "Ventana · hoja interior",
    typology: "abatible" as const,
    sourceReference: "pauta-de-corte-veratec.xlsx#ABATIR-INT-Y-OB",
    profiles: [
      { code: "65201VER", name: "Marco fijo Bahar", role: "Marco", base: "ancho_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" },
      { code: "65201VER", name: "Marco fijo Bahar", role: "Marco", base: "alto_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" },
      { code: "61011VER999", name: "Refuerzo de marco · código de planilla", role: "Refuerzo de marco", base: "ancho_total", adjustmentMm: -85, quantity: 2, cut: "90° / 90°" },
      { code: "61011VER999", name: "Refuerzo de marco · código de planilla", role: "Refuerzo de marco", base: "alto_total", adjustmentMm: -85, quantity: 2, cut: "90° / 90°" },
      { code: "65212VER", name: "Hoja Bahar interior", role: "Hoja", base: "ancho_total", adjustmentMm: -58, quantity: 2, cut: "45° / 45°" },
      { code: "65212VER", name: "Hoja Bahar interior", role: "Hoja", base: "alto_total", adjustmentMm: -58, quantity: 2, cut: "45° / 45°" },
      { code: "61011VER990", name: "Refuerzo de hoja · código de planilla", role: "Refuerzo de hoja", base: "ancho_total", adjustmentMm: -178, quantity: 2, cut: "90° / 90°" },
      { code: "61011VER990", name: "Refuerzo de hoja · código de planilla", role: "Refuerzo de hoja", base: "alto_total", adjustmentMm: -178, quantity: 2, cut: "90° / 90°" },
    ],
    glassAdjustmentMm: -183,
  },
  {
    slug: "bahar_5200_ventana_exterior",
    catalogKey: `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-ventana-exterior`,
    label: "Ventana · hoja exterior",
    typology: "abatible" as const,
    sourceReference: "pauta-de-corte-veratec.xlsx#ABATIR-EXT-Y-PROY",
    profiles: [
      { code: "65201VER", name: "Marco fijo Bahar", role: "Marco", base: "ancho_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" },
      { code: "65201VER", name: "Marco fijo Bahar", role: "Marco", base: "alto_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" },
      { code: "61011VER999", name: "Refuerzo de marco · código de planilla", role: "Refuerzo de marco", base: "ancho_total", adjustmentMm: -85, quantity: 2, cut: "90° / 90°" },
      { code: "61011VER999", name: "Refuerzo de marco · código de planilla", role: "Refuerzo de marco", base: "alto_total", adjustmentMm: -85, quantity: 2, cut: "90° / 90°" },
      { code: "65209VER", name: "Hoja Bahar exterior", role: "Hoja", base: "ancho_total", adjustmentMm: -58, quantity: 2, cut: "45° / 45°" },
      { code: "65209VER", name: "Hoja Bahar exterior", role: "Hoja", base: "alto_total", adjustmentMm: -58, quantity: 2, cut: "45° / 45°" },
      { code: "61011VER990", name: "Refuerzo de hoja · código de planilla", role: "Refuerzo de hoja", base: "ancho_total", adjustmentMm: -181, quantity: 2, cut: "90° / 90°" },
      { code: "61011VER990", name: "Refuerzo de hoja · código de planilla", role: "Refuerzo de hoja", base: "alto_total", adjustmentMm: -176, quantity: 2, cut: "90° / 90°" },
    ],
    glassAdjustmentMm: -186,
  },
] as const;

/** La hoja de pauta identifica la misma construcción exterior para abatir y proyectar. */
export const VERATEC_BAHAR_5200_PROYECTANTE_VARIANT = {
  ...VERATEC_BAHAR_5200_VARIANTS[2],
  slug: "bahar_5200_ventana_proyectante",
  catalogKey: `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-ventana-exterior`,
  label: "Ventana · proyectante",
  typology: "proyectante" as const,
  sourceReference: "pauta-de-corte-veratec.xlsx#ABATIR-EXT-Y-PROY",
};

export const VERATEC_BAHAR_5200_WINDOW_VARIANTS = [
  ...VERATEC_BAHAR_5200_VARIANTS,
  VERATEC_BAHAR_5200_PROYECTANTE_VARIANT,
] as const;

/** Fórmulas de las cuatro hojas finales del libro de pauta, todas para la puerta plegable Bahar 5200. */
export const VERATEC_BAHAR_5200_PLEGABLE_VARIANTS = [
  {
    slug: "bahar_5200_plegable_3_3_0",
    catalogKey: `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-plegable-3-3-0`,
    label: "Plegable · 3/3/0",
    sourceReference: "pauta-de-corte-veratec.xlsx#Plegable 3-3-0!D3:E18",
    leaves: 3,
    nominalSample: { width: 2600, height: 2015 },
    regularLeafCount: 2,
    firstLeafCount: 1,
    fourthLeafCount: 0,
    leafWidthMultiplier: 1 / 3,
    regularLeafWidthAdjustmentMm: -48,
    firstLeafWidthAdjustmentMm: 42,
    fourthLeafWidthAdjustmentMm: null,
  },
  {
    slug: "bahar_5200_plegable_4_3_1",
    catalogKey: `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-plegable-4-3-1`,
    label: "Plegable · 4/3/1",
    sourceReference: "pauta-de-corte-veratec.xlsx#Plegable 4-3-1!D3:E20",
    leaves: 4,
    nominalSample: { width: 2885, height: 2225 },
    regularLeafCount: 3,
    firstLeafCount: 1,
    fourthLeafCount: 0,
    leafWidthMultiplier: 1 / 4,
    regularLeafWidthAdjustmentMm: -35.5,
    firstLeafWidthAdjustmentMm: 54.5,
    fourthLeafWidthAdjustmentMm: null,
  },
  {
    slug: "bahar_5200_plegable_6_5_1",
    catalogKey: `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-plegable-6-5-1`,
    label: "Plegable · 6/5/1",
    sourceReference: "pauta-de-corte-veratec.xlsx#Plegable 6-5-1!D3:E21",
    leaves: 6,
    nominalSample: { width: 4955, height: 2210 },
    regularLeafCount: 4,
    firstLeafCount: 1,
    fourthLeafCount: 1,
    leafWidthMultiplier: 1 / 6,
    regularLeafWidthAdjustmentMm: -31.333333333333332,
    firstLeafWidthAdjustmentMm: 58.666666666666664,
    fourthLeafWidthAdjustmentMm: 18.666666666666668,
  },
  {
    slug: "bahar_5200_plegable_7_4_3",
    catalogKey: `${VERATEC_BAHAR_5200_CATALOG_KEY_PREFIX}-plegable-7-4-3`,
    label: "Plegable · 7/4/3",
    sourceReference: "pauta-de-corte-veratec.xlsx#Plegable 7-4-3!D3:E21",
    leaves: 7,
    nominalSample: { width: 5410, height: 2277 },
    regularLeafCount: 4,
    firstLeafCount: 2,
    fourthLeafCount: 1,
    leafWidthMultiplier: 1 / 7,
    regularLeafWidthAdjustmentMm: -39.42857142857143,
    firstLeafWidthAdjustmentMm: 50.57142857142857,
    fourthLeafWidthAdjustmentMm: 10.571428571428571,
  },
] as const;

type BaharVariant = (typeof VERATEC_BAHAR_5200_WINDOW_VARIANTS)[number];
type BaharPlegableVariant = (typeof VERATEC_BAHAR_5200_PLEGABLE_VARIANTS)[number];

function measure(base: FabricacionReglaMedida["base"], ajusteMm: number): FabricacionReglaMedida {
  return { base, ajusteMm };
}

export function crearRecetaVeratecBahar5200(input: {
  lineName: string;
  variant: BaharVariant["slug"] | BaharPlegableVariant["slug"];
  createId?: () => string;
}): FabricacionReceta {
  const foldingVariant = VERATEC_BAHAR_5200_PLEGABLE_VARIANTS.find((candidate) => candidate.slug === input.variant);
  if (foldingVariant) {
    return crearRecetaVeratecBahar5200Plegable({
      lineName: input.lineName,
      variant: foldingVariant,
      createId: input.createId,
    });
  }
  const variant = VERATEC_BAHAR_5200_WINDOW_VARIANTS.find((candidate) => candidate.slug === input.variant);
  if (!variant) throw new Error(`Variante Bahar 5200 desconocida: ${input.variant}`);
  const createId = input.createId ?? (() => crypto.randomUUID());
  const profile = (values: (typeof variant.profiles)[number]): FabricacionComponentePerfil => ({
    id: createId(),
    codigoPerfil: values.code,
    nombrePerfil: values.name,
    funcion: values.role,
    largoComercialMm: 5800,
    largoComercialPendiente: false,
    reglaMedida: measure(values.base, values.adjustmentMm),
    reglaCantidad: { tipo: "fija", cantidad: values.quantity },
    requerido: true,
    corte: values.cut,
    ...(values.code.startsWith("61011")
      ? {
          datosPendientes: [
            "La pauta cita este código, pero la lista de precios Bahar no incluye su correspondencia ni precio.",
          ],
        }
      : {}),
    observaciones: `Medida transcrita de ${variant.sourceReference}. Largo de 5.800 mm según presentaciones de perfiles Bahar en la lista entregada.`,
  });
  const frameOnly = variant.typology === "pano_fijo";

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    permitirCalculoPreliminarConPendientes: true,
    identidad: {
      recetaId: createId(),
      codigo: `VERATEC-BAHAR-5200-${variant.slug.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || "Bahar 5200"} · ${variant.label}`,
      tipologia: variant.typology,
      hojas: frameOnly ? 1 : 1,
      modulos: 1,
      apertura: frameOnly ? "fijo" : variant.typology === "proyectante" ? "proyectante" : "abatible",
      herraje: null,
      variante: variant.slug,
    },
    perfiles: variant.profiles.map(profile),
    vidrios: [
      {
        id: createId(),
        nombre: "Vidrio · espesor por elegir",
        reglaAncho: measure("ancho_total", variant.glassAdjustmentMm),
        reglaAlto: measure("alto_total", variant.glassAdjustmentMm),
        reglaCantidad: { tipo: "fija", cantidad: 1 },
        requerido: false,
        observaciones: `Medidas transcritas de ${variant.sourceReference}; la hoja no define el espesor final del vidrio.`,
        datosPendientes: ["Elegir el vidrio compatible y confirmar junquillo según espesor."],
      },
    ],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: 5800,
    },
    datosPendientes: [
      "El Excel deja el junquillo como ‘todos’; debe elegirse según espesor de vidrio.",
      "La pauta incluye refuerzos 61011VER999/990 sin precio ni equivalencia en la lista Bahar.",
      "Kerf y despunte inicial dependen del taller y quedan por configurar.",
      "Base documental lista para probar; no validada físicamente.",
    ],
    notasValidacion: [
      `Fuente: ${variant.sourceReference}; revisión ${VERATEC_BAHAR_5200_SOURCE_REVISION}.`,
      "Los SKU y precios netos se relacionan solo cuando coinciden explícitamente con la lista Bahar.",
      "No se añadieron recetas de puerta porque las hojas de la pauta mezclan códigos 65212/65210/65204 y descripciones de otra configuración.",
    ],
  };
}

function crearRecetaVeratecBahar5200Plegable(input: {
  lineName: string;
  variant: BaharPlegableVariant;
  createId?: () => string;
}): FabricacionReceta {
  const { variant } = input;
  const createId = input.createId ?? (() => crypto.randomUUID());
  const leafHeightAdjustmentMm = -133;
  const glassAdjustmentMm = -214;
  const profile = (
    name: string,
    role: string,
    rule: FabricacionReglaMedida,
    quantity: number,
    code: string,
  ): FabricacionComponentePerfil => ({
    id: createId(),
    codigoPerfil: code,
    nombrePerfil: name,
    funcion: role,
    largoComercialMm: 5800,
    largoComercialPendiente: false,
    reglaMedida: rule,
    reglaCantidad: { tipo: "fija", cantidad: quantity },
    requerido: true,
    corte: "45° / 45°",
    observaciones: `Fórmula transcrita de ${variant.sourceReference}; código cotejado con MATERIALES PRECIO VERATEC.xlsx · BAHAR.`,
  });
  const leafWidth = (adjustment: number): FabricacionReglaMedida => ({
    base: "ancho_total",
    multiplicador: variant.leafWidthMultiplier,
    ajusteMm: adjustment,
  });
  const leafGlass = (adjustment: number, quantity: number): FabricacionVidrio => ({
    id: createId(),
    nombre: `Vidrio · ${quantity} paño${quantity === 1 ? "" : "s"} · espesor por elegir`,
    reglaAncho: { ...leafWidth(adjustment), ajusteMm: adjustment + glassAdjustmentMm },
    reglaAlto: measure("alto_total", leafHeightAdjustmentMm + glassAdjustmentMm),
    reglaCantidad: { tipo: "fija", cantidad: quantity },
    requerido: false,
    observaciones: `Ancho de vidrio = ancho de hoja − 214 mm; alto = alto de hoja − 214 mm, según ${variant.sourceReference}.`,
    datosPendientes: ["La pauta no especifica espesor de vidrio ni selección automática de junquillo."],
  });
  const profileParts: FabricacionComponentePerfil[] = [
    profile("Marco fijo Bahar", "Marco", measure("ancho_total", 6), 2, "65201VER"),
    profile("Marco fijo Bahar", "Marco", measure("alto_total", -69), 2, "65201VER"),
    profile("Hoja de puerta interior Bahar · hojas regulares", "Hoja", leafWidth(variant.regularLeafWidthAdjustmentMm), variant.regularLeafCount * 2, "65204VER"),
    profile("Hoja de puerta interior Bahar · hoja 1", "Hoja", leafWidth(variant.firstLeafWidthAdjustmentMm), variant.firstLeafCount * 2, "65204VER"),
    ...(variant.fourthLeafCount > 0
      ? [profile("Hoja de puerta interior Bahar · hoja 4", "Hoja", leafWidth(variant.fourthLeafWidthAdjustmentMm ?? 0), variant.fourthLeafCount * 2, "65204VER")]
      : []),
    profile("Hoja de puerta interior Bahar", "Hoja", measure("alto_total", leafHeightAdjustmentMm), variant.leaves * 2, "65204VER"),
  ];
  const glasses = [
    leafGlass(variant.regularLeafWidthAdjustmentMm, variant.regularLeafCount),
    leafGlass(variant.firstLeafWidthAdjustmentMm, variant.firstLeafCount),
    ...(variant.fourthLeafCount > 0
      ? [leafGlass(variant.fourthLeafWidthAdjustmentMm ?? 0, variant.fourthLeafCount)]
      : []),
  ];

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    permitirCalculoPreliminarConPendientes: true,
    identidad: {
      recetaId: createId(),
      codigo: `VERATEC-BAHAR-5200-${variant.slug.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || "Bahar 5200"} · ${variant.label}`,
      tipologia: "puerta_abatible",
      hojas: variant.leaves,
      modulos: 1,
      apertura: "plegable",
      herraje: null,
      variante: variant.slug,
    },
    perfiles: profileParts,
    vidrios: glasses,
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: 5800,
    },
    datosPendientes: [
      "La pauta no especifica junquillo para estas composiciones ni el espesor final del vidrio.",
      "La hoja no registra perfiles de refuerzo ni accesorios para plegado; no se agregaron consumos supuestos.",
      "Configurar kerf y despunte del taller.",
      "Las cuatro composiciones son cálculos documentales; requieren prueba y validación del taller.",
    ],
    notasValidacion: [
      `Fuente: ${variant.sourceReference}; muestras originales ${variant.nominalSample.width} × ${variant.nominalSample.height} mm.`,
      "Los perfiles 65201VER y 65204VER se cotejaron con la lista de perfiles Bahar 5200; el precio de compra es referencia neta de la revisión histórica del Excel.",
      "Las medidas fraccionarias de la hoja se redondean al milímetro entero por el motor de cubicación.",
      "Estado: lista para probar; no certificada por Veratec ni validada físicamente.",
    ],
  };
}
