import {
  aplicarAjustesPlantillaVentora,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import {
  crearRecetaSerie32ProyectanteNormal,
  crearRecetaSerie42Proyectante,
  type Serie42ProyectanteVariantId,
} from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import {
  crearRecetaSerieS33,
  type SerieS33VariantId,
} from "@/features/fabricacion/fixtures/plantillas-ventora-s33";
import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionBaseMedida,
  type FabricacionReceta,
  type FabricacionReglaCantidadTipo,
  type FabricacionTipologia,
} from "@/features/fabricacion/types/fabricacion-domain";

/** Grupo visible en la hoja técnica de cada pieza. */
export type GrupoPiezaEstructural =
  | "marco"
  | "hoja"
  | "puerta"
  | "refuerzo"
  | "otro";

export const GRUPO_PIEZA_ESTRUCTURAL_LABELS: Record<GrupoPiezaEstructural, string> = {
  marco: "Marco",
  hoja: "Hoja",
  puerta: "Puerta",
  refuerzo: "Refuerzo",
  otro: "Otro",
};

export type ArquetipoEstructuralId =
  | "corredera_2h"
  | "corredera_3h"
  | "proyectante"
  | "multislide_4h"
  | "multislide_8h"
  | "puerta_abatible"
  | "puerta_vaiven"
  | "pvc_corredera_2h"
  | "pvc_corredera_3h"
  | "pvc_monorriel"
  | "pvc_s60"
  | "pvc_proyectante";

type PerfilEstructural = {
  nombre: string;
  funcion: string;
  grupo: GrupoPiezaEstructural;
  medida: FabricacionBaseMedida;
  cantidadTipo: FabricacionReglaCantidadTipo;
  cantidad: number;
};

type VidrioEstructural = {
  nombre: string;
  ancho: FabricacionBaseMedida;
  alto: FabricacionBaseMedida;
  cantidadTipo: FabricacionReglaCantidadTipo;
  cantidad: number;
};

type AccesorioEstructural = {
  nombre: string;
  cantidadTipo: FabricacionReglaCantidadTipo;
  cantidad: number;
};

type ArquetipoEstructuralConfig = {
  id: ArquetipoEstructuralId;
  label: string;
  tipologia: FabricacionTipologia;
  hojas: number;
  modulos: number;
  perfiles: PerfilEstructural[];
  vidrios: VidrioEstructural[];
  accesorios: AccesorioEstructural[];
};

const PIECE_PENDING = [
  "Confirmar ajuste o descuento en mm",
  "Confirmar cantidad con el taller",
  "Confirmar codigo de perfil",
  "Confirmar largo comercial",
] as const;

function corredera2hPerfiles(): PerfilEstructural[] {
  return [
    { nombre: "Riel superior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Riel inferior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Jamba", funcion: "Perfil de marco", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Zócalo", funcion: "Perfil de hoja", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Cabezal", funcion: "Perfil de hoja", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Pierna", funcion: "Perfil de hoja", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Traslapo", funcion: "Perfil de hoja", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: 2 },
  ];
}

function corredera3hPerfiles(): PerfilEstructural[] {
  return [
    { nombre: "Riel superior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Riel inferior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Jamba", funcion: "Perfil de marco", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Zócalo", funcion: "Perfil de hoja", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: 3 },
    { nombre: "Cabezal", funcion: "Perfil de hoja", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: 3 },
    { nombre: "Pierna", funcion: "Perfil de hoja", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: 3 },
    { nombre: "Traslapo", funcion: "Perfil de hoja", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: 3 },
  ];
}

function proyectantePerfiles(): PerfilEstructural[] {
  return [
    { nombre: "Marco superior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Marco inferior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Marco lateral", funcion: "Perfil de marco", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Hoja superior", funcion: "Perfil de hoja", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
    { nombre: "Hoja inferior", funcion: "Perfil de hoja", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
    { nombre: "Hoja lateral", funcion: "Perfil de hoja", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "por_hoja", cantidad: 2 },
    { nombre: "Junquillo", funcion: "Acristalamiento", grupo: "otro", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
    { nombre: "Travesaño", funcion: "Refuerzo estructural", grupo: "otro", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: 1, },
  ];
}

function multislidePerfiles(hojas: 4 | 8): PerfilEstructural[] {
  const count = hojas;
  return [
    { nombre: "Riel superior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Riel inferior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Jamba", funcion: "Perfil de marco", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Perfil lateral", funcion: "Perfil de marco", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Zócalo", funcion: "Perfil de hoja", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: count },
    { nombre: "Cabezal", funcion: "Perfil de hoja", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: count },
    { nombre: "Pierna", funcion: "Perfil de hoja", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: count },
    { nombre: "Traslapo intermedio", funcion: "Perfil de hoja", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: Math.max(1, count - 1) },
    { nombre: "Traslapo lateral", funcion: "Perfil de hoja", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: 2 },
  ];
}

function puertaAbatiblePerfiles(): PerfilEstructural[] {
  return [
    { nombre: "Marco superior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Jamba", funcion: "Perfil de marco", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Hoja horizontal", funcion: "Perfil de puerta", grupo: "puerta", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 2 },
    { nombre: "Hoja vertical", funcion: "Perfil de puerta", grupo: "puerta", medida: "alto_por_hoja", cantidadTipo: "por_hoja", cantidad: 2 },
    { nombre: "Travesaño", funcion: "Refuerzo estructural", grupo: "otro", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
    { nombre: "Perfil de cierre", funcion: "Cierre", grupo: "otro", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: 1 },
  ];
}

function puertaVaivenPerfiles(): PerfilEstructural[] {
  return [
    { nombre: "Marco superior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Marco inferior", funcion: "Perfil de marco", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Jamba", funcion: "Perfil de marco", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Hoja horizontal", funcion: "Perfil de puerta", grupo: "puerta", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 2 },
    { nombre: "Hoja vertical", funcion: "Perfil de puerta", grupo: "puerta", medida: "alto_por_hoja", cantidadTipo: "por_hoja", cantidad: 2 },
    { nombre: "Riel o guía", funcion: "Guía de vaivén", grupo: "otro", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Perfil de cierre", funcion: "Cierre", grupo: "otro", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: 1 },
  ];
}

function pvcCorrederaPerfiles(hojas: 2 | 3): PerfilEstructural[] {
  const count = hojas;
  return [
    { nombre: "Marco PVC superior", funcion: "Marco PVC", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Marco PVC inferior", funcion: "Marco PVC", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Marco PVC lateral", funcion: "Marco PVC", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Hoja PVC superior", funcion: "Hoja PVC", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: count },
    { nombre: "Hoja PVC inferior", funcion: "Hoja PVC", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: count },
    { nombre: "Hoja PVC lateral", funcion: "Hoja PVC", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: count * 2 },
    { nombre: "Refuerzo", funcion: "Refuerzo PVC", grupo: "refuerzo", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: count },
    { nombre: "Junquillo", funcion: "Acristalamiento", grupo: "otro", medida: "ancho_por_hoja", cantidadTipo: "fija", cantidad: count },
    { nombre: "Traslapo", funcion: "Traslapo PVC", grupo: "hoja", medida: "alto_por_hoja", cantidadTipo: "fija", cantidad: count },
    { nombre: "Riel o solera", funcion: "Riel PVC", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
  ];
}

function pvcProyectantePerfiles(): PerfilEstructural[] {
  return [
    { nombre: "Marco PVC superior", funcion: "Marco PVC", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Marco PVC inferior", funcion: "Marco PVC", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Marco PVC lateral", funcion: "Marco PVC", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Hoja PVC", funcion: "Hoja PVC", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
    { nombre: "Refuerzo", funcion: "Refuerzo PVC", grupo: "refuerzo", medida: "alto_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
    { nombre: "Junquillo", funcion: "Acristalamiento", grupo: "otro", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
  ];
}

const SERIE_3200_VARIANTS = [
  {
    variant: "3200 1H · Bastidor 3221",
    code: "3221",
    name: "Bastidor 3221",
    glassWidthAdjustmentMm: -141,
    glassHeightAdjustmentMm: -128,
  },
  {
    variant: "3200 1H · Bastidor 3225",
    code: "3225",
    name: "Bastidor 3225",
    glassWidthAdjustmentMm: -190,
    glassHeightAdjustmentMm: -177,
  },
] as const;

function serie3200VariantCondition(variant: string) {
  return { variante: variant };
}

function serie3200Profile(input: {
  createId: () => string;
  name: string;
  code: string;
  functionName: string;
  quantity: number;
  measure: FabricacionBaseMedida;
  adjustmentMm: number;
  cut: string;
  variant?: string;
}): FabricacionReceta["perfiles"][number] {
  const condition = input.variant
    ? serie3200VariantCondition(input.variant)
    : undefined;
  return {
    id: input.createId(),
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.functionName,
    largoComercialMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    reglaMedida: {
      base: input.measure,
      multiplicador: 1,
      ajusteMm: input.adjustmentMm,
      ...(condition ? { condicion: condition } : {}),
    },
    reglaCantidad: {
      tipo: "fija",
      cantidad: input.quantity,
      multiplicador: 1,
      ...(condition ? { condicion: condition } : {}),
    },
    requerido: true,
    observaciones: [
      `Pieza: ${input.name}. Grupo: ${input.functionName}.`,
      `Serie 3200. Código ${input.code}.`,
      `Pauta una hoja: ${input.measure === "ancho_total" ? "W" : "H"} ${input.cut}.`,
      input.variant ? `Aplica a variante ${input.variant}.` : "Aplica a todas las variantes.",
      "Descuento documentado en Ventora; validar con una fabricación real antes de activar.",
    ].join(" "),
    datosPendientes: ["Validar la receta con una fabricación real"],
  };
}

function crearRecetaSerie3200(input: {
  lineName: string;
  createId: () => string;
}): FabricacionReceta {
  const lineName = input.lineName.trim() || "Serie 3200";
  const profiles: FabricacionReceta["perfiles"] = [
    serie3200Profile({
      createId: input.createId,
      name: "Marco superior",
      code: "3222",
      functionName: "Marco",
      quantity: 1,
      measure: "ancho_total",
      adjustmentMm: 0,
      cut: "45°/45°",
    }),
    serie3200Profile({
      createId: input.createId,
      name: "Jamba",
      code: "3222",
      functionName: "Marco",
      quantity: 2,
      measure: "alto_total",
      adjustmentMm: 0,
      cut: "45°/90°",
    }),
    ...SERIE_3200_VARIANTS.flatMap((variant) => [
      serie3200Profile({
        createId: input.createId,
        name: `${variant.name} horizontal`,
        code: variant.code,
        functionName: "Perfil de hoja",
        quantity: 2,
        measure: "ancho_total",
        adjustmentMm: -42,
        cut: "45°/45°",
        variant: variant.variant,
      }),
      serie3200Profile({
        createId: input.createId,
        name: `${variant.name} vertical`,
        code: variant.code,
        functionName: "Perfil de hoja",
        quantity: 2,
        measure: "alto_total",
        adjustmentMm: -29,
        cut: "45°/90°",
        variant: variant.variant,
      }),
    ]),
  ];

  const variantCondition = (variants: string[]) => ({ variante: variants });
  const glass = (variant: (typeof SERIE_3200_VARIANTS)[number], name: string) => ({
    id: input.createId(),
    nombre: name,
    reglaAncho: {
      base: "ancho_total" as const,
      ajusteMm: variant.glassWidthAdjustmentMm,
      multiplicador: 1,
    },
    reglaAlto: {
      base: "alto_total" as const,
      ajusteMm: variant.glassHeightAdjustmentMm,
      multiplicador: 1,
    },
    reglaCantidad: { tipo: "fija" as const, cantidad: 1, multiplicador: 1 },
    requerido: false,
    condicion: variantCondition([variant.variant]),
    observaciones: `Vidrio para ${variant.name}. Descuento documentado en Ventora; validar con una fabricación real antes de activar.`,
    datosPendientes: ["Validar la receta con una fabricación real"],
  });

  const accessories = [
    { name: "Bisagra Udinese 3200", quantity: 3, note: "Alternativa de bisagra. Elegir solo una familia." },
    { name: "Bisagra Gold 2F 3200 (Alualpha)", quantity: 2, note: "Alternativa de bisagra. Elegir solo una familia." },
    { name: "Cerradura Scanavini 1280", quantity: 1, note: "Aplicable al bastidor 3221." },
    { name: "Cerradura ISEO (inox)", quantity: 1, note: "Entrada 25/35 mm; aplicable a 3221 y 3225." },
    { name: "Escuadra Bastidor 3200", quantity: 1, note: "Cantidad a confirmar con el taller." },
    { name: "Escuadra Marco (DC 3800)", quantity: 1, note: "Cantidad a confirmar con el taller." },
    { name: "Cierrapuertas OMV 80250", quantity: 1, note: "Aéreo, hasta 100 kg. Cantidad a confirmar." },
  ].map((accessory) => ({
    id: input.createId(),
    codigo: "",
    nombre: accessory.name,
    reglaCantidad: {
      tipo: "fija" as const,
      cantidad: accessory.quantity,
      multiplicador: 1,
    },
    requerido: false,
    observaciones: `${accessory.note} Fuente: datos técnicos aportados para la Serie 3200.`,
    datosPendientes: ["Confirmar modelo y cantidad con el taller"],
  }));

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: input.createId(),
      codigo: "SERIE-3200-1H-V1",
      nombre: `${lineName} — Puerta abatible 1H`,
      tipologia: "puerta_abatible",
      hojas: 1,
      modulos: 1,
      apertura: "abatible",
      herraje: null,
      variante: SERIE_3200_VARIANTS[0].variant,
    },
    perfiles: profiles,
    vidrios: [
      glass(SERIE_3200_VARIANTS[0], "Monolítico 4 mm · Bastidor 3221"),
      glass(SERIE_3200_VARIANTS[1], "Monolítico 4 mm · Bastidor 3225"),
    ],
    accesorios: accessories,
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: [
      "Base técnica Serie 3200 de una hoja con dos variantes: bastidor 3221 y bastidor 3225.",
      "Marco 3222: 1 × W y 2 × H, sin marco inferior; cortes 45°/45° y 45°/90°.",
      "Bastidor 3221/3225: 2 × (W − 42) y 2 × (H − 29). No se mezclan ambas variantes.",
      "Vidrio bastidor 3221: W − 141 y H − 128. Vidrio bastidor 3225: W − 190 y H − 177.",
      "El perfil 3223 Tope 2ª Hoja queda fuera de esta receta porque la base es de una hoja.",
      "La receta permanece sin validar y no habilita pauta operativa hasta revisión del taller.",
    ],
  };
}

function pvcAbatiblePerfiles(): PerfilEstructural[] {
  return [
    { nombre: "Marco PVC superior", funcion: "Marco PVC", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Marco PVC inferior", funcion: "Marco PVC", grupo: "marco", medida: "ancho_total", cantidadTipo: "fija", cantidad: 1 },
    { nombre: "Marco PVC lateral", funcion: "Marco PVC", grupo: "marco", medida: "alto_total", cantidadTipo: "fija", cantidad: 2 },
    { nombre: "Hoja PVC abatible", funcion: "Hoja PVC", grupo: "hoja", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
    { nombre: "Refuerzo PVC", funcion: "Refuerzo PVC", grupo: "refuerzo", medida: "alto_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
    { nombre: "Junquillo", funcion: "Acristalamiento", grupo: "otro", medida: "ancho_por_hoja", cantidadTipo: "por_hoja", cantidad: 1 },
  ];
}

const vidrioVentanaEstandar: VidrioEstructural[] = [
  {
    nombre: "Vidrio principal",
    ancho: "ancho_por_hoja",
    alto: "alto_por_hoja",
    cantidadTipo: "por_hoja",
    cantidad: 1,
  },
];

const accesoriosCorredera: AccesorioEstructural[] = [
  { nombre: "Carros o rodamientos", cantidadTipo: "por_hoja", cantidad: 1 },
  { nombre: "Cierre o seguro", cantidadTipo: "fija", cantidad: 1 },
  { nombre: "Felpa o sello", cantidadTipo: "fija", cantidad: 1 },
];

const accesoriosProyectante: AccesorioEstructural[] = [
  { nombre: "Brazos proyectantes", cantidadTipo: "por_hoja", cantidad: 1 },
  { nombre: "Cierre o manilla", cantidadTipo: "por_hoja", cantidad: 1 },
  { nombre: "Burlete o sello", cantidadTipo: "fija", cantidad: 1 },
];

const accesoriosPuerta: AccesorioEstructural[] = [
  { nombre: "Bisagras", cantidadTipo: "por_hoja", cantidad: 1 },
  { nombre: "Cerradura o manilla", cantidadTipo: "por_hoja", cantidad: 1 },
  { nombre: "Burlete o sello", cantidadTipo: "fija", cantidad: 1 },
];

const accesoriosPvc: AccesorioEstructural[] = [
  { nombre: "Herraje PVC", cantidadTipo: "por_hoja", cantidad: 1 },
  { nombre: "Felpa o sello", cantidadTipo: "fija", cantidad: 1 },
  { nombre: "Tornillería", cantidadTipo: "fija", cantidad: 1 },
];

export const ARQUETIPOS_ESTRUCTURALES: Record<ArquetipoEstructuralId, ArquetipoEstructuralConfig> = {
  corredera_2h: {
    id: "corredera_2h",
    label: "Corredera 2 hojas",
    tipologia: "corredera",
    hojas: 2,
    modulos: 2,
    perfiles: corredera2hPerfiles(),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosCorredera,
  },
  corredera_3h: {
    id: "corredera_3h",
    label: "Corredera 3 hojas",
    tipologia: "corredera",
    hojas: 3,
    modulos: 3,
    perfiles: corredera3hPerfiles(),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosCorredera,
  },
  proyectante: {
    id: "proyectante",
    label: "Proyectante",
    tipologia: "proyectante",
    hojas: 1,
    modulos: 1,
    perfiles: proyectantePerfiles(),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosProyectante,
  },
  multislide_4h: {
    id: "multislide_4h",
    label: "MultiSlide 4 hojas",
    tipologia: "corredera",
    hojas: 4,
    modulos: 4,
    perfiles: multislidePerfiles(4),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosCorredera,
  },
  multislide_8h: {
    id: "multislide_8h",
    label: "MultiSlide 8 hojas",
    tipologia: "corredera",
    hojas: 8,
    modulos: 8,
    perfiles: multislidePerfiles(8),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosCorredera,
  },
  puerta_abatible: {
    id: "puerta_abatible",
    label: "Puerta abatible",
    tipologia: "puerta_abatible",
    hojas: 1,
    modulos: 1,
    perfiles: puertaAbatiblePerfiles(),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosPuerta,
  },
  puerta_vaiven: {
    id: "puerta_vaiven",
    label: "Puerta vaivén",
    tipologia: "puerta_vaiven",
    hojas: 1,
    modulos: 1,
    perfiles: puertaVaivenPerfiles(),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosPuerta,
  },
  pvc_corredera_2h: {
    id: "pvc_corredera_2h",
    label: "PVC corredera doble riel",
    tipologia: "corredera",
    hojas: 2,
    modulos: 2,
    perfiles: pvcCorrederaPerfiles(2),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosPvc,
  },
  pvc_corredera_3h: {
    id: "pvc_corredera_3h",
    label: "PVC corredera triple riel",
    tipologia: "corredera",
    hojas: 3,
    modulos: 3,
    perfiles: pvcCorrederaPerfiles(3),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosPvc,
  },
  pvc_monorriel: {
    id: "pvc_monorriel",
    label: "PVC monorriel",
    tipologia: "pvc_monorriel",
    hojas: 2,
    modulos: 2,
    perfiles: pvcCorrederaPerfiles(2),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosPvc,
  },
  pvc_s60: {
    id: "pvc_s60",
    label: "PVC S60 abatible / doble contacto",
    tipologia: "abatible",
    hojas: 1,
    modulos: 1,
    perfiles: pvcAbatiblePerfiles(),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosPvc,
  },
  pvc_proyectante: {
    id: "pvc_proyectante",
    label: "PVC proyectante",
    tipologia: "proyectante",
    hojas: 1,
    modulos: 1,
    perfiles: pvcProyectantePerfiles(),
    vidrios: vidrioVentanaEstandar,
    accesorios: accesoriosPvc,
  },
};

export const CATALOG_KEY_TO_ARQUETIPO: Record<string, ArquetipoEstructuralId> = {
  "ventora:l5000": "corredera_2h",
  "ventora:l20": "corredera_2h",
  "ventora:l25": "corredera_2h",
  "ventora:serie-4800-corredera-2h": "corredera_2h",
  "ventora:optima-s28-corredera-2h": "corredera_2h",
  "ventora:s33-corredera-2h": "corredera_2h",
  "ventora:s33-rpt-corredera-2h": "corredera_2h",
  "ventora:optima-s28-corredera-3h": "corredera_3h",
  "ventora:winhouse-new-s75-triple-riel": "pvc_corredera_3h",
  "ventora:l32": "proyectante",
  "ventora:l42": "proyectante",
  "ventora:serie-42-proyectante-camara": "proyectante",
  "ventora:serie-42-proyectante-sin-camara": "proyectante",
  "ventora:s38-proyectante": "proyectante",
  "ventora:s38-rpt-proyectante": "proyectante",
  "ventora:winhouse-andes-proyectante": "pvc_proyectante",
  "ventora:multislide-s83-4h": "multislide_4h",
  "ventora:multislide-s83-8h": "multislide_8h",
  "ventora:serie-3200-puerta-abatible-1h": "puerta_abatible",
  "ventora:serie-4600-puerta-vaiven": "puerta_vaiven",
  "ventora:winhouse-new-s75-doble-riel": "pvc_corredera_2h",
  "ventora:winhouse-s60": "pvc_s60",
  "ventora:winhouse-andes-doble-riel": "pvc_corredera_2h",
  "ventora:winhouse-andes-monorriel": "pvc_monorriel",
};

const SERIE_42_VARIANT_BY_CATALOG_KEY: Record<
  string,
  Serie42ProyectanteVariantId
> = {
  "ventora:l42": "normal",
  "ventora:serie-42-proyectante-camara": "con_camara",
  "ventora:serie-42-proyectante-sin-camara": "sin_camara",
};

const SERIE_S33_VARIANT_BY_CATALOG_KEY: Record<string, SerieS33VariantId> = {
  "ventora:s33-corredera-2h": "normal",
  "ventora:s33-rpt-corredera-2h": "rpt",
};

const PLANTILLA_BY_CATALOG_KEY: Partial<Record<string, PlantillaVentoraCorrederaId>> = {
  "ventora:l5000": "L5000",
  "ventora:l20": "L20",
  "ventora:l25": "L25",
};

export function resolveArquetipoEstructuralId(input: {
  catalogKey?: string | null;
  structuralArchetypeId?: string | null;
}): ArquetipoEstructuralId | null {
  if (input.catalogKey === "ventora:l32" || input.catalogKey === "ventora:l42") {
    return "proyectante";
  }
  if (input.catalogKey === "ventora:serie-4600-puerta-vaiven") {
    return "puerta_vaiven";
  }
  if (input.catalogKey === "ventora:winhouse-andes-monorriel") {
    return "pvc_monorriel";
  }
  const fromMetadata = input.structuralArchetypeId?.trim();
  if (fromMetadata && fromMetadata in ARQUETIPOS_ESTRUCTURALES) {
    return fromMetadata as ArquetipoEstructuralId;
  }

  const key = input.catalogKey?.trim();
  if (!key) return null;
  return CATALOG_KEY_TO_ARQUETIPO[key] ?? null;
}

/**
 * Alinea solo la identidad visible al catálogo. No cambia códigos, descuentos
 * ni persiste la receta; la receta histórica se conserva hasta un guardado
 * explícito del usuario.
 */
export function alignRecipeIdentityForCatalogDisplay<T extends FabricacionReceta>(input: {
  recipe: T;
  catalogKey?: string | null;
  lineName?: string | null;
}): T {
  const archetypeId = resolveArquetipoEstructuralId({ catalogKey: input.catalogKey });
  const archetype = archetypeId ? ARQUETIPOS_ESTRUCTURALES[archetypeId] : null;
  if (!archetype || input.recipe.identidad.tipologia === archetype.tipologia) {
    return input.recipe;
  }

  const lineName = input.lineName?.trim() || input.recipe.identidad.nombre;
  return {
    ...input.recipe,
    identidad: {
      ...input.recipe.identidad,
      nombre: `${lineName} — ${archetype.label}`,
      tipologia: archetype.tipologia,
      apertura: archetype.tipologia,
    },
  };
}

export function getGrupoPiezaFromObservaciones(
  observaciones: string | null | undefined
): GrupoPiezaEstructural | null {
  const match = observaciones?.match(/Grupo:\s*(marco|hoja|puerta|refuerzo|otro)/i);
  if (!match?.[1]) return null;
  return match[1].toLowerCase() as GrupoPiezaEstructural;
}

export function getPiezaNombreFromObservaciones(
  observaciones: string | null | undefined
): string | null {
  const match = observaciones?.match(/Pieza:\s*([^.]+)/i);
  const nombre = match?.[1]?.trim();
  return nombre || null;
}

export function describeCodigoPerfilEstructural(
  codigoPerfil: string | null | undefined
): string {
  const normalized = codigoPerfil?.trim();
  return normalized || "Pendiente de validar";
}

function buildRecetaFromArquetipo(
  config: ArquetipoEstructuralConfig,
  input: {
    lineName: string;
    createId: () => string;
  }
): FabricacionReceta {
  const lineName = input.lineName.trim() || "Línea";
  const hojas = config.hojas;
  const modulos = config.modulos;

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: input.createId(),
      codigo: `${lineName.toUpperCase().replace(/\s+/g, "-")}-${hojas}H-V1`,
      nombre: `${lineName} — ${config.label}`,
      tipologia: config.tipologia,
      hojas,
      modulos,
      apertura: config.tipologia,
      herraje: null,
      variante: "estandar",
    },
    perfiles: config.perfiles.map((profile) => ({
      id: input.createId(),
      codigoPerfil: "",
      nombrePerfil: "",
      funcion: profile.funcion,
      largoComercialMm: null,
      reglaMedida: {
        base: profile.medida,
        multiplicador: 1,
      },
      reglaCantidad: {
        tipo: profile.cantidadTipo,
        cantidad: profile.cantidad,
        multiplicador: 1,
      },
      requerido: true,
      observaciones: [
        `Pieza: ${profile.nombre}.`,
        `Grupo: ${profile.grupo}.`,
        `Tipo de perfil: ${profile.funcion}.`,
        `Medida base: ${profile.medida.replaceAll("_", " ")}.`,
        "Código: pendiente de validar.",
        "Estado: borrador técnico.",
      ].join(" "),
      datosPendientes: [...PIECE_PENDING],
    })),
    vidrios: config.vidrios.map((glass) => ({
      id: input.createId(),
      nombre: glass.nombre,
      reglaAncho: { base: glass.ancho, multiplicador: 1 },
      reglaAlto: { base: glass.alto, multiplicador: 1 },
      reglaCantidad: {
        tipo: glass.cantidadTipo,
        cantidad: glass.cantidad,
        multiplicador: 1,
      },
      requerido: false,
      observaciones: "Vidrio sugerido. Confirmar composición en el taller.",
      datosPendientes: [
        "Confirmar descuento de ancho y alto",
        "Confirmar cantidad con el taller",
        "Confirmar composicion del vidrio",
      ],
    })),
    accesorios: config.accesorios.map((accessory) => ({
      id: input.createId(),
      codigo: "",
      nombre: accessory.nombre,
      reglaCantidad: {
        tipo: accessory.cantidadTipo,
        cantidad: accessory.cantidad,
        multiplicador: 1,
      },
      requerido: false,
      observaciones: "Accesorio estructural sugerido. Confirmar modelo y cantidad.",
      datosPendientes: [
        "Confirmar accesorio usado por el taller",
        "Confirmar codigo y cantidad",
      ],
    })),
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: [
      `Arquetipo estructural Ventora: ${config.label}.`,
      "Borrador técnico visible: sin códigos ni descuentos inventados.",
      "No activa pauta de corte automática. Revisar, probar y validar en el taller.",
    ],
  };
}

export function crearRecetaDesdeArquetipoEstructural(input: {
  archetypeId: ArquetipoEstructuralId;
  lineName: string;
  catalogKey?: string | null;
  createId?: () => string;
}): FabricacionReceta {
  const config = ARQUETIPOS_ESTRUCTURALES[input.archetypeId];
  const createId =
    input.createId ??
    (() =>
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  let recipe = buildRecetaFromArquetipo(config, {
    lineName: input.lineName,
    createId,
  });

  const plantillaId = input.catalogKey
    ? PLANTILLA_BY_CATALOG_KEY[input.catalogKey.trim()]
    : undefined;

  if (
    plantillaId &&
    (input.archetypeId === "corredera_2h" || input.archetypeId === "corredera_3h")
  ) {
    recipe = aplicarAjustesPlantillaVentora(recipe, plantillaId);
  }

  return recipe;
}

export function crearRecetaEstructuralParaLineaComercial(input: {
  catalogKey?: string | null;
  structuralArchetypeId?: string | null;
  lineName: string;
  createId?: () => string;
}): FabricacionReceta | null {
  const serieS33Variant = input.catalogKey
    ? SERIE_S33_VARIANT_BY_CATALOG_KEY[input.catalogKey]
    : undefined;
  if (serieS33Variant) {
    return crearRecetaSerieS33({
      variant: serieS33Variant,
      lineName: input.lineName,
      createId: input.createId,
    });
  }
  const serie42Variant = input.catalogKey
    ? SERIE_42_VARIANT_BY_CATALOG_KEY[input.catalogKey]
    : undefined;
  if (serie42Variant) {
    return crearRecetaSerie42Proyectante({
      variant: serie42Variant,
      lineName: input.lineName,
      createId: input.createId,
    });
  }
  if (input.catalogKey === "ventora:l32") {
    return crearRecetaSerie32ProyectanteNormal({
      lineName: input.lineName,
      createId: input.createId,
    });
  }
  if (input.catalogKey === "ventora:serie-3200-puerta-abatible-1h") {
    const createId =
      input.createId ??
      (() =>
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
    return crearRecetaSerie3200({ lineName: input.lineName, createId });
  }
  const archetypeId = resolveArquetipoEstructuralId(input);
  if (!archetypeId) return null;

  return crearRecetaDesdeArquetipoEstructural({
    archetypeId,
    lineName: input.lineName,
    catalogKey: input.catalogKey,
    createId: input.createId,
  });
}
