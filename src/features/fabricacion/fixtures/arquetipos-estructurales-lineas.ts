import {
  aplicarAjustesPlantillaVentora,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
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
    tipologia: "puerta_corredera",
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
  pvc_s60: {
    id: "pvc_s60",
    label: "PVC S60",
    tipologia: "corredera",
    hojas: 2,
    modulos: 2,
    perfiles: pvcCorrederaPerfiles(2),
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
  "ventora:l32": "corredera_2h",
  "ventora:l42": "corredera_2h",
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
  "ventora:winhouse-andes-monorriel": "pvc_corredera_2h",
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
  const fromMetadata = input.structuralArchetypeId?.trim();
  if (fromMetadata && fromMetadata in ARQUETIPOS_ESTRUCTURALES) {
    return fromMetadata as ArquetipoEstructuralId;
  }

  const key = input.catalogKey?.trim();
  if (!key) return null;
  return CATALOG_KEY_TO_ARQUETIPO[key] ?? null;
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
  const archetypeId = resolveArquetipoEstructuralId(input);
  if (!archetypeId) return null;

  return crearRecetaDesdeArquetipoEstructural({
    archetypeId,
    lineName: input.lineName,
    catalogKey: input.catalogKey,
    createId: input.createId,
  });
}
