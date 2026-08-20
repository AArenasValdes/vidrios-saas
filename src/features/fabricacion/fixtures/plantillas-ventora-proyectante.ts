import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionBaseMedida,
  type FabricacionReceta,
  type FabricacionReglaCantidadTipo,
} from "@/features/fabricacion/types/fabricacion-domain";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

/**
 * Plantillas Ventora documentadas · Proyectante (L32 / L42).
 * Perfiles y códigos habituales precargados; sin descuentos ni fórmulas de taller.
 */

export type PlantillaVentoraProyectanteId = "L32" | "L42";

export type PlantillaVentoraProyectanteCatalogEntry = {
  id: PlantillaVentoraProyectanteId;
  label: string;
  title: string;
  sourceReferenceId: string;
  pendingShopNote: string;
};

export const PLANTILLAS_VENTORA_PROYECTANTE: Record<
  PlantillaVentoraProyectanteId,
  PlantillaVentoraProyectanteCatalogEntry
> = {
  L32: {
    id: "L32",
    label: "L32",
    title: "L32 · Proyectante",
    sourceReferenceId: "l32:chile",
    pendingShopNote:
      "Pendiente validar medidas de taller. Referencia documentada hoja -2,1 sin implementar.",
  },
  L42: {
    id: "L42",
    label: "L42",
    title: "L42 · Proyectante",
    sourceReferenceId: "l42:chile",
    pendingShopNote:
      "Pendiente validar medidas de taller. Referencia documentada hoja -1,7 sin implementar.",
  },
};

type PerfilPlantillaSeed = {
  codigo: string;
  funcion: string;
  nombre: string;
  grupo: "marco" | "hoja" | "vidrio" | "composicion";
  medida: FabricacionBaseMedida;
  cantidadTipo: FabricacionReglaCantidadTipo;
  cantidad: number;
  requerido: boolean;
  observacionesExtra?: string;
};

const PENDING_DISCOUNT_L32 =
  "Pendiente validar descuento hoja -2,1 (unidad y aplicación). No usar para calcular.";
const PENDING_DISCOUNT_L42 =
  "Pendiente validar descuento hoja -1,7 (confirmar mm, dimensión y orden). No usar para calcular.";

const L32_PERFILES: PerfilPlantillaSeed[] = [
  {
    codigo: "3201",
    funcion: "Marco simple",
    nombre: "Marco simple",
    grupo: "marco",
    medida: "ancho_total",
    cantidadTipo: "fija",
    cantidad: 1,
    requerido: true,
    observacionesExtra:
      "Marco perimetral habitual L32. Ancho y alto sin descuento documentado pendiente de validar en taller.",
  },
  {
    codigo: "3202",
    funcion: "Hoja proyectante",
    nombre: "Hoja proyectante",
    grupo: "hoja",
    medida: "ancho_por_hoja",
    cantidadTipo: "por_hoja",
    cantidad: 1,
    requerido: true,
    observacionesExtra: PENDING_DISCOUNT_L32,
  },
  {
    codigo: "3208",
    funcion: "Junquillo",
    nombre: "Junquillo",
    grupo: "vidrio",
    medida: "ancho_por_hoja",
    cantidadTipo: "por_hoja",
    cantidad: 1,
    requerido: true,
  },
  {
    codigo: "3204",
    funcion: "Palillo / Pilar T",
    nombre: "Palillo / Pilar T",
    grupo: "composicion",
    medida: "alto_total",
    cantidadTipo: "fija",
    cantidad: 1,
    requerido: false,
    observacionesExtra: "Opcional según composición del vano.",
  },
  {
    codigo: "3205",
    funcion: "Marco cámara de agua",
    nombre: "Marco cámara de agua",
    grupo: "composicion",
    medida: "ancho_total",
    cantidadTipo: "fija",
    cantidad: 1,
    requerido: false,
    observacionesExtra: "Opcional según composición del vano.",
  },
];

const L42_PERFILES: PerfilPlantillaSeed[] = [
  {
    codigo: "4209",
    funcion: "Marco fijo",
    nombre: "Marco fijo",
    grupo: "marco",
    medida: "ancho_total",
    cantidadTipo: "fija",
    cantidad: 1,
    requerido: true,
    observacionesExtra:
      "Marco perimetral habitual L42. Ancho y alto sin descuento documentado pendiente de validar en taller.",
  },
  {
    codigo: "4202",
    funcion: "Hoja proyectante",
    nombre: "Hoja proyectante",
    grupo: "hoja",
    medida: "ancho_por_hoja",
    cantidadTipo: "por_hoja",
    cantidad: 1,
    requerido: true,
    observacionesExtra: PENDING_DISCOUNT_L42,
  },
  {
    codigo: "4229",
    funcion: "Junquillo monolítico",
    nombre: "Junquillo monolítico",
    grupo: "vidrio",
    medida: "ancho_por_hoja",
    cantidadTipo: "por_hoja",
    cantidad: 1,
    requerido: true,
    observacionesExtra:
      "Predeterminado para vidrio monolítico. Si usas termopanel, revisa 4206 y desactiva el que no aplique.",
  },
  {
    codigo: "4206",
    funcion: "Junquillo termopanel",
    nombre: "Junquillo termopanel",
    grupo: "vidrio",
    medida: "ancho_por_hoja",
    cantidadTipo: "por_hoja",
    cantidad: 1,
    requerido: false,
    observacionesExtra:
      "Usar si el vidrio es DVH/termopanel. No activar junquillo monolítico simultáneamente.",
  },
  {
    codigo: "4204",
    funcion: "Palillo / Pilar T",
    nombre: "Palillo / Pilar T",
    grupo: "composicion",
    medida: "alto_total",
    cantidadTipo: "fija",
    cantidad: 1,
    requerido: false,
    observacionesExtra: "Opcional según composición del vano.",
  },
];

const PERFILES_BY_PLANTILLA: Record<
  PlantillaVentoraProyectanteId,
  PerfilPlantillaSeed[]
> = {
  L32: L32_PERFILES,
  L42: L42_PERFILES,
};

function mapPerfilSeed(
  seed: PerfilPlantillaSeed,
  createId: () => string
): FabricacionReceta["perfiles"][number] {
  return {
    id: createId(),
    codigoPerfil: seed.codigo,
    nombrePerfil: seed.nombre,
    funcion: seed.funcion,
    largoComercialMm: null,
    reglaMedida: {
      base: seed.medida,
      multiplicador: 1,
    },
    reglaCantidad: {
      tipo: seed.cantidadTipo,
      cantidad: seed.cantidad,
      multiplicador: 1,
    },
    requerido: seed.requerido,
    observaciones: [
      `Grupo: ${seed.grupo}.`,
      "Perfil habitual documentado Ventora. Confirmar medidas de corte en taller.",
      seed.observacionesExtra,
    ]
      .filter(Boolean)
      .join(" "),
    datosPendientes: seed.requerido
      ? [
          "Confirmar ajuste o descuento en mm",
          "Validar regla con trabajo real",
          ...(seed.codigo ? [] : ["Confirmar codigo del perfil"]),
        ]
      : [
          "Confirmar si aplica en esta composición",
          "Confirmar ajuste o descuento en mm",
        ],
  };
}

export function crearRecetaPlantillaVentoraProyectante(
  plantillaId: PlantillaVentoraProyectanteId,
  input?: { createId?: () => string; lineName?: string }
): FabricacionReceta {
  const createId = input?.createId ?? (() => crypto.randomUUID());
  const meta = PLANTILLAS_VENTORA_PROYECTANTE[plantillaId];
  const seeds = PERFILES_BY_PLANTILLA[plantillaId];
  const lineName = input?.lineName?.trim() || meta.label;

  const accesorios: FabricacionReceta["accesorios"] =
    plantillaId === "L42"
      ? [
          {
            id: createId(),
            codigo: "4212",
            nombre: "Cuña de armado a presión",
            reglaCantidad: { tipo: "por_hoja", cantidad: 1, multiplicador: 1 },
            requerido: false,
            observaciones:
              "Accesorio habitual L42. Confirmar modelo y cantidad real en taller.",
            datosPendientes: [
              "Confirmar accesorio usado por el taller",
              "Confirmar codigo y cantidad",
            ],
          },
        ]
      : [
          {
            id: createId(),
            codigo: "",
            nombre: "Brazos proyectantes",
            reglaCantidad: { tipo: "por_hoja", cantidad: 1, multiplicador: 1 },
            requerido: false,
            observaciones:
              "Accesorio estructural sugerido. Confirmar modelo y cantidad en el Paso 2.",
            datosPendientes: [
              "Confirmar accesorio usado por el taller",
              "Confirmar codigo y cantidad",
            ],
          },
        ];

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: createId(),
      codigo: `${plantillaId}-PROY-V1`,
      nombre: `${lineName} · proyectante`,
      tipologia: "proyectante",
      hojas: 1,
      modulos: 1,
      apertura: "proyectante",
      herraje: null,
      variante: "estandar",
    },
    perfiles: seeds.map((seed) => mapPerfilSeed(seed, createId)),
    vidrios: [
      {
        id: createId(),
        nombre: "Vidrio principal",
        reglaAncho: { base: "ancho_por_hoja", ajusteMm: 0, multiplicador: 1 },
        reglaAlto: { base: "alto_por_hoja", ajusteMm: 0, multiplicador: 1 },
        reglaCantidad: { tipo: "por_hoja", cantidad: 1, multiplicador: 1 },
        requerido: false,
        observaciones:
          "Vidrio opcional sugerido. Confirmar descuentos y composición en el Paso 2.",
        datosPendientes: [
          "Confirmar descuento de ancho y alto",
          "Confirmar cantidad con el taller",
          "Confirmar composicion del vidrio",
        ],
      },
    ],
    accesorios,
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: [
      `Plantilla ${meta.title}. Perfiles habituales precargados.`,
      meta.pendingShopNote,
      "Ventora prepara los perfiles habituales. Revisa las medidas de fabricación antes de activar.",
      "No está técnicamente validada. Probar medida real antes de activar en el Paso 3.",
    ],
  };
}
