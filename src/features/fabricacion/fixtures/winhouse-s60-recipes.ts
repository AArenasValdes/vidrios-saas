import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionTipologia,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";

export const WINHOUSE_S60_CATALOG_KEY = "ventora:winhouse-s60";
export const WINHOUSE_S60_SOURCE_REVISION = "alumetrica-winhouse-s60-2026-09-26-v2";

export const WINHOUSE_S60_VARIANTS = {
  fijoMonolitico: "fijo_monolitico_4_5mm",
  fijoTermopanel1720: "fijo_termopanel_17_20mm",
  fijoTermopanel2224: "fijo_termopanel_22_24mm",
  proyectanteMonolitico: "proyectante_monolitico_4_5mm",
  proyectanteTermopanel1720: "proyectante_termopanel_17_20mm",
  proyectanteTermopanel2224: "proyectante_termopanel_22_24mm",
  abatibleDobleTermopanel1720: "abatible_doble_termopanel_17_20mm",
  abatibleDobleTermopanel2224: "abatible_doble_termopanel_22_24mm",
} as const;

type S60Variant = {
  slug: (typeof WINHOUSE_S60_VARIANTS)[keyof typeof WINHOUSE_S60_VARIANTS];
  label: string;
  typology: FabricacionTipologia;
  leaves: number;
  aperture: string;
  card: number;
  kind: "fixed" | "single_sash" | "double_casement";
  glassLabel: string;
  glassWidthAdjustment: number;
  glassHeightAdjustment: number;
  glassCount: number;
  pending: string[];
};

const COMMON_PENDING = [
  "Cruzar aliases MARCOS60/HVIS60/HVES60 con el perfil físico WinHouse y el código usado por el taller",
  "Confirmar perfiles y ubicación de los refuerzos; la ficha no los cruza inequívocamente con los códigos principales",
  "Confirmar largos comerciales por perfil antes de generar pauta por barra",
  "Definir kerf y despunte del taller",
  "Confirmar cortes a inglete, cortes a tope y mecanizados por encuentro",
  "Completar herrajes y accesorios específicos de la apertura",
  "Probar las reglas con medidas reales del taller antes de validar",
];

const VARIANTS: S60Variant[] = [
  {
    slug: WINHOUSE_S60_VARIANTS.fijoMonolitico,
    label: "Fijo · Monolítico 4–5 mm",
    typology: "pano_fijo",
    leaves: 1,
    aperture: "fijo",
    card: 9,
    kind: "fixed",
    glassLabel: "Vidrio monolítico 4–5 mm",
    glassWidthAdjustment: -104,
    glassHeightAdjustment: -104,
    glassCount: 1,
    pending: [
      "Alumétrica indica 2 hojas para marco fijo; se registra 1 paño conforme al dibujo oficial de fijo, pendiente de cotejo con el taller",
    ],
  },
  {
    slug: WINHOUSE_S60_VARIANTS.fijoTermopanel1720,
    label: "Fijo · Termopanel 17–20 mm",
    typology: "pano_fijo",
    leaves: 1,
    aperture: "fijo",
    card: 10,
    kind: "fixed",
    glassLabel: "Termopanel 17–20 mm",
    glassWidthAdjustment: -104,
    glassHeightAdjustment: -104,
    glassCount: 1,
    pending: [
      "Alumétrica indica 2 hojas para marco fijo; se registra 1 paño conforme al dibujo oficial de fijo, pendiente de cotejo con el taller",
    ],
  },
  {
    slug: WINHOUSE_S60_VARIANTS.fijoTermopanel2224,
    label: "Fijo · Termopanel 22–24 mm",
    typology: "pano_fijo",
    leaves: 1,
    aperture: "fijo",
    card: 11,
    kind: "fixed",
    glassLabel: "Termopanel 22–24 mm",
    glassWidthAdjustment: -104,
    glassHeightAdjustment: -104,
    glassCount: 1,
    pending: [
      "Alumétrica indica 2 hojas para marco fijo; se registra 1 paño conforme al dibujo oficial de fijo, pendiente de cotejo con el taller",
    ],
  },
  {
    slug: WINHOUSE_S60_VARIANTS.proyectanteMonolitico,
    label: "Proyectante · Monolítico 4–5 mm",
    typology: "proyectante",
    leaves: 1,
    aperture: "proyectante",
    card: 15,
    kind: "single_sash",
    glassLabel: "Vidrio monolítico 4–5 mm",
    glassWidthAdjustment: -202,
    glassHeightAdjustment: -202,
    glassCount: 1,
    pending: [
      "Alumétrica indica 2 hojas, pero su vidrio/cortes describen un paño; se registra como 1 hoja según la apertura proyectante oficial",
    ],
  },
  {
    slug: WINHOUSE_S60_VARIANTS.proyectanteTermopanel1720,
    label: "Proyectante · Termopanel 17–20 mm",
    typology: "proyectante",
    leaves: 1,
    aperture: "proyectante",
    card: 16,
    kind: "single_sash",
    glassLabel: "Termopanel 17–20 mm",
    glassWidthAdjustment: -202,
    glassHeightAdjustment: -202,
    glassCount: 1,
    pending: [
      "Alumétrica indica 2 hojas, pero su vidrio/cortes describen un paño; se registra como 1 hoja según la apertura proyectante oficial",
      "Confirmar con WinHouse la compatibilidad exacta de termopanel con el junquillo y la hoja seleccionados",
    ],
  },
  {
    slug: WINHOUSE_S60_VARIANTS.proyectanteTermopanel2224,
    label: "Proyectante · Termopanel 22–24 mm",
    typology: "proyectante",
    leaves: 1,
    aperture: "proyectante",
    card: 17,
    kind: "single_sash",
    glassLabel: "Termopanel 22–24 mm",
    glassWidthAdjustment: -202,
    glassHeightAdjustment: -202,
    glassCount: 1,
    pending: [
      "Alumétrica indica 2 hojas, pero su vidrio/cortes describen un paño; se registra como 1 hoja según la apertura proyectante oficial",
      "Confirmar con WinHouse la compatibilidad exacta de termopanel con el junquillo y la hoja seleccionados",
    ],
  },
  {
    slug: WINHOUSE_S60_VARIANTS.abatibleDobleTermopanel1720,
    label: "Abatible doble · Termopanel 17–20 mm",
    typology: "abatible",
    leaves: 2,
    aperture: "abatible_doble",
    card: 3,
    kind: "double_casement",
    glassLabel: "Termopanel 17–20 mm por hoja",
    glassWidthAdjustment: -166,
    glassHeightAdjustment: -202,
    glassCount: 2,
    pending: [
      "La tarjeta no distingue apertura interior/exterior; confirmar el sentido y el herraje",
      "La regla de junquillo X−158 no define claramente si el largo es por hoja; mantener junquillo pendiente",
    ],
  },
  {
    slug: WINHOUSE_S60_VARIANTS.abatibleDobleTermopanel2224,
    label: "Abatible doble · Termopanel 22–24 mm",
    typology: "abatible",
    leaves: 2,
    aperture: "abatible_doble",
    card: 4,
    kind: "double_casement",
    glassLabel: "Termopanel 22–24 mm por hoja",
    glassWidthAdjustment: -166,
    glassHeightAdjustment: -202,
    glassCount: 2,
    pending: [
      "La tarjeta no distingue apertura interior/exterior; confirmar el sentido y el herraje",
      "La regla de junquillo X−158 no define claramente si el largo es por hoja; mantener junquillo pendiente",
    ],
  },
];

function profile(input: {
  id: string;
  code: string;
  name: string;
  functionName: string;
  base: FabricacionComponentePerfil["reglaMedida"]["base"];
  adjustment: number;
  quantity: number;
  cut?: string;
}): FabricacionComponentePerfil {
  return {
    id: input.id,
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.functionName,
    largoComercialMm: null,
    reglaMedida: { base: input.base, ajusteMm: input.adjustment },
    reglaCantidad: { tipo: "fija", cantidad: input.quantity },
    requerido: true,
    ...(input.cut ? { corte: input.cut } : {}),
    observaciones: "Alias y fórmula transcritos desde la tarjeta Alumétrica indicada; código físico WinHouse pendiente de cruce.",
    datosPendientes: input.code.trim()
      ? []
      : [
          "Confirmar perfil físico y código de Alumétrica",
          "Confirmar cantidad y orientación con un armado real",
        ],
  };
}

function buildProfiles(variant: S60Variant, createId: () => string): FabricacionComponentePerfil[] {
  const rows: FabricacionComponentePerfil[] = [];
  const pushPair = (input: {
    code: string;
    name: string;
    functionName: string;
    widthBase: FabricacionComponentePerfil["reglaMedida"]["base"];
    widthAdjustment: number;
    heightBase: FabricacionComponentePerfil["reglaMedida"]["base"];
    heightAdjustment: number;
    quantity: number;
    cut?: string;
  }) => {
    rows.push(
      profile({ id: createId(), code: input.code, name: input.name, functionName: `${input.functionName} horizontal`, base: input.widthBase, adjustment: input.widthAdjustment, quantity: input.quantity, cut: input.cut }),
      profile({ id: createId(), code: input.code, name: input.name, functionName: `${input.functionName} vertical`, base: input.heightBase, adjustment: input.heightAdjustment, quantity: input.quantity, cut: input.cut }),
    );
  };

  if (variant.kind === "fixed") {
    pushPair({ code: "MARCOS60", name: "MARCOS60 · Marco fijo S60", functionName: "Marco fijo", widthBase: "ancho_total", widthAdjustment: 5, heightBase: "alto_total", heightAdjustment: 5, quantity: 2, cut: "45° / 45°" });
    pushPair({ code: "PL-S60-TC-BMF-12", name: "Ref. Box marco fijo inclinado S60 1.2 mm", functionName: "Refuerzo marco", widthBase: "ancho_total", widthAdjustment: -116, heightBase: "alto_total", heightAdjustment: -116, quantity: 2, cut: "90° / 90°" });
    const beadCode = variant.glassLabel.includes("4–5")
      ? "Jun4-5mm"
      : variant.glassLabel.includes("17–20")
        ? "Jun17-20"
        : "Jun22-24";
    pushPair({ code: beadCode, name: `Junquillo S60 · ${variant.glassLabel}`, functionName: "Junquillo", widthBase: "ancho_total", widthAdjustment: -96, heightBase: "alto_total", heightAdjustment: -96, quantity: 2, cut: "45° / 45°" });
  } else if (variant.kind === "single_sash") {
    pushPair({ code: "MARCOS60", name: "Marco fijo S60 · alias Alumétrica", functionName: "Marco", widthBase: "ancho_total", widthAdjustment: 5, heightBase: "alto_total", heightAdjustment: 5, quantity: 2 });
    pushPair({ code: "", name: "Hoja ventana S60 · interior/exterior por confirmar", functionName: "Hoja", widthBase: "ancho_total", widthAdjustment: -75, heightBase: "alto_total", heightAdjustment: -75, quantity: 2 });
    pushPair({ code: "", name: "Refuerzo de marco · código Alumétrica no identificado", functionName: "Refuerzo marco", widthBase: "ancho_total", widthAdjustment: -116, heightBase: "alto_total", heightAdjustment: -116, quantity: 2 });
    pushPair({ code: "", name: "Refuerzo de hoja · código Alumétrica no identificado", functionName: "Refuerzo hoja", widthBase: "ancho_total", widthAdjustment: -214, heightBase: "alto_total", heightAdjustment: -214, quantity: 2 });
    pushPair({ code: "", name: `Junquillo ${variant.glassLabel}`, functionName: "Junquillo", widthBase: "ancho_total", widthAdjustment: -194, heightBase: "alto_total", heightAdjustment: -194, quantity: 2 });
  } else {
    pushPair({ code: "MARCOS60", name: "Marco fijo S60 · alias Alumétrica", functionName: "Marco", widthBase: "ancho_total", widthAdjustment: 5, heightBase: "alto_total", heightAdjustment: 5, quantity: 2 });
    pushPair({ code: "", name: "Hoja ventana S60 · interior/exterior por confirmar", functionName: "Hoja doble", widthBase: "ancho_por_hoja", widthAdjustment: -39, heightBase: "alto_total", heightAdjustment: -75, quantity: 4 });
    pushPair({ code: "", name: "Refuerzo de marco · código Alumétrica no identificado", functionName: "Refuerzo marco", widthBase: "ancho_total", widthAdjustment: -116, heightBase: "alto_total", heightAdjustment: -116, quantity: 2 });
    pushPair({ code: "", name: "Refuerzo de hoja · código Alumétrica no identificado", functionName: "Refuerzo hoja doble", widthBase: "ancho_por_hoja", widthAdjustment: -177, heightBase: "alto_total", heightAdjustment: -214, quantity: 4 });
    // Alumétrica publica el junquillo doble como X−158, sin precisar si X es total o por hoja.
    // Se deja fuera del cálculo hasta resolver esa ambigüedad.
  }

  return rows;
}

function buildGlass(variant: S60Variant, createId: () => string): FabricacionVidrio {
  const widthBase = variant.kind === "double_casement" ? "ancho_por_hoja" : "ancho_total";
  return {
    id: createId(),
    nombre: variant.glassLabel,
    reglaAncho: { base: widthBase, ajusteMm: variant.glassWidthAdjustment },
    reglaAlto: { base: "alto_total", ajusteMm: variant.glassHeightAdjustment },
    reglaCantidad: { tipo: "fija", cantidad: variant.glassCount },
    requerido: false,
    observaciones: `Regla transcrita de tarjeta Alumétrica #${variant.card}; valor candidato sujeto a prueba física.`,
    datosPendientes: [
      "Confirmar cantidad de paños y composición del vidrio",
      "Confirmar compatibilidad del espesor con hoja y junquillo WinHouse",
    ],
  };
}

export function crearRecetaWinHouseS60Candidata(input: {
  lineName: string;
  variant: (typeof VARIANTS)[number]["slug"];
  createId?: () => string;
}): FabricacionReceta {
  const variant = VARIANTS.find((candidate) => candidate.slug === input.variant);
  if (!variant) throw new Error(`Variante S60 desconocida: ${input.variant}`);
  const createId = input.createId ?? (() => crypto.randomUUID());
  const fixedDocumented = variant.kind === "fixed";
  const pending = fixedDocumented ? [] : [...COMMON_PENDING, ...variant.pending];

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "requiere_revision",
    identidad: {
      recetaId: createId(),
      codigo: `WINHOUSE-S60-${variant.slug.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || "WinHouse S60"} · ${variant.label}`,
      tipologia: variant.typology,
      hojas: variant.leaves,
      modulos: variant.leaves,
      apertura: variant.aperture,
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
    datosPendientes: pending,
    notasValidacion: [
      `Fuente: Alumétrica, ficha WinHouse S60, tarjeta #${variant.card}; X = ancho total e Y = alto total, mm.`,
      "WinHouse oficial se usa para normalizar apertura y número de hojas; las fórmulas de corte provienen de Alumétrica.",
      fixedDocumented
        ? "Los códigos de corte son los aliases exactos de Alumétrica; su cruce con el código físico del taller aún se debe revisar."
        : "Los aliases de hoja/refuerzo aún requieren cruce con el perfil físico y la posición de armado.",
      fixedDocumented
        ? "Tarjetas 9–11: se usan los aliases, fórmulas, cantidades y ángulos publicados por Alumétrica para producir un snapshot preliminar. Falta validar con fabricación real; no marcar como probada o validada."
        : "Borrador documental. No marcar como probado o validado; bloqueada para snapshot hasta resolver los pendientes de identidad y composición.",
      ...(fixedDocumented
        ? ["WinHouse dibuja un paño fijo; las tarjetas Alumétrica reportan dos hojas aunque asignan un vidrio. Se normaliza a un paño fijo y se conserva esta discrepancia como nota de revisión."]
        : []),
      ...pending,
    ],
  };
}

export const WINHOUSE_S60_CANDIDATE_VARIANTS = VARIANTS;
