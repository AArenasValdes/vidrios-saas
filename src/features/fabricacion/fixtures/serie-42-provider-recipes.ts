import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionBaseMedida,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

type ProviderRecipeInput = {
  lineName: string;
  createId?: () => string;
};

const ALAR_VARIANT = "alar_marco_4201";
const ALAR_WATER_CHAMBER_VARIANT = "alar_camara_agua_4204";
const SODAL_VARIANT = "sodal_sin_camara_monolitico";
const SODAL_SERIE_4200_URL =
  "https://alumetrica.comunaclic.cl/Catalogo/Lineas/Detalle/f0fbde7f-5752-455c-85dd-a753cffe64ee";

function createId() {
  return crypto.randomUUID();
}

function profile(input: {
  createId: () => string;
  code: string;
  name: string;
  functionName: string;
  base: FabricacionBaseMedida;
  adjustmentMm: number;
  quantity: number;
  cut: string;
  note: string;
}): FabricacionComponentePerfil {
  return {
    id: input.createId(),
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.functionName,
    largoComercialMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    reglaMedida: { base: input.base, ajusteMm: input.adjustmentMm },
    reglaCantidad: { tipo: "fija", cantidad: input.quantity },
    requerido: true,
    corte: input.cut,
    observaciones: input.note,
  };
}

function baseRecipe(input: {
  createId: () => string;
  lineName: string;
  variant: string;
  label: string;
  profiles: FabricacionComponentePerfil[];
  pendingFields?: string[];
  notes: string[];
  glasses?: FabricacionReceta["vidrios"];
}): FabricacionReceta {
  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: input.createId(),
      codigo: `SERIE42-${input.variant.toUpperCase()}-1H-V1`,
      nombre: `${input.lineName.trim() || "Serie 42"} · ${input.label}`,
      tipologia: "proyectante",
      hojas: 1,
      modulos: 1,
      apertura: "proyectante",
      herraje: null,
      variante: input.variant,
    },
    perfiles: input.profiles,
    vidrios: input.glasses ?? [],
    accesorios: [],
    ...(input.pendingFields?.length ? { datosPendientes: input.pendingFields } : {}),
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: input.notes,
  };
}

/** Pauta recibida para ALAR; no incluye aún fórmula de luz interior ni vidrio. */
export function crearRecetaSerie42Alar(
  input: ProviderRecipeInput & { waterChamber?: boolean }
): FabricacionReceta {
  const id = input.createId ?? createId;
  const waterChamber = input.waterChamber ?? false;
  const variant = waterChamber ? ALAR_WATER_CHAMBER_VARIANT : ALAR_VARIANT;
  const sourceNote =
    "Pauta aportada para proveedor ALAR. Esta variante representa el marco fijo 4201; 4209 doble contacto requiere su propia configuración.";

  return baseRecipe({
    createId: id,
    lineName: input.lineName,
    variant,
    label: waterChamber
      ? "ALAR · Cámara de agua 4204"
      : "ALAR · Marco fijo 4201",
    profiles: [
      profile({
        createId: id,
        code: "4201",
        name: "Marco 4201 horizontal",
        functionName: "Marco",
        base: "ancho_total",
        adjustmentMm: 0,
        quantity: waterChamber ? 1 : 2,
        cut: "45°/45°",
        note: waterChamber
          ? `${sourceNote} Dintel: 1 pieza, largo A.`
          : `${sourceNote} Dintel y umbral: 1 pieza cada uno, largo A.`,
      }),
      ...(waterChamber
        ? [
            profile({
              createId: id,
              code: "4204",
              name: "Cámara de agua 4204 horizontal",
              functionName: "Umbral con cámara de agua",
              base: "ancho_total",
              adjustmentMm: 0,
              quantity: 1,
              cut: "45° o 90° según ensamble",
              note: `${sourceNote} Umbral inferior: 1 pieza, largo A; corte según ensamble.`,
            }),
          ]
        : []),
      profile({
        createId: id,
        code: "4201",
        name: "Marco 4201 vertical",
        functionName: "Marco",
        base: "alto_total",
        adjustmentMm: 0,
        quantity: 2,
        cut: "45°/45°",
        note: `${sourceNote} Jambas: 2 piezas, largo H.`,
      }),
      profile({
        createId: id,
        code: "4202",
        name: "Hoja 4202 horizontal",
        functionName: "Hoja",
        base: "ancho_total",
        adjustmentMm: -11,
        quantity: 2,
        cut: "45°/45°",
        note: "Pauta ALAR aportada: 2 piezas A − 11 mm.",
      }),
      profile({
        createId: id,
        code: "4202",
        name: "Hoja 4202 vertical",
        functionName: "Hoja",
        base: "alto_total",
        adjustmentMm: waterChamber ? -35 : -11,
        quantity: 2,
        cut: "45°/45°",
        note: waterChamber
          ? "Pauta ALAR aportada: con cámara de agua 4204, 2 piezas H − 35 mm."
          : "Pauta ALAR aportada: 2 piezas H − 11 mm.",
      }),
    ],
    pendingFields: [
      "Definir la medida numérica del junquillo 4229/4206 desde la luz interior de la hoja armada.",
      "Confirmar la medida de vidrio para la variante ALAR.",
    ],
    notes: [
      "Fuente: pauta ALAR proporcionada por el usuario el 2026-09-21.",
      "La pauta describe 4229/4206 a la luz interior de la hoja, pero no entrega una fórmula numérica; no se inventó un descuento.",
      waterChamber
        ? "La pauta ALAR no fija el ángulo del perfil 4204: indica 45° o 90° según ensamble; se conserva literalmente para confirmar en taller."
        : "La variante con umbral de cámara de agua 4204 y hoja H − 35 mm está separada como otra opción ALAR.",
      "Los perfiles 4201 y 4202 tienen medidas cargadas; la receta sigue incompleta y no genera una pauta final hasta resolver los datos pendientes.",
    ],
  });
}

/** Ficha SODAL Serie 4200: proyectante sin cámara, monolítico, 1 hoja. */
export function crearRecetaSerie42Sodal(input: ProviderRecipeInput): FabricacionReceta {
  const id = input.createId ?? createId;
  const source = `Ficha SODAL Serie 4200: ${SODAL_SERIE_4200_URL}`;
  const sourceNote = `${source}. Variante Fijo/Proyectante sin Cámara, monolítico.`;
  const profiles = [
    profile({
      createId: id,
      code: "4209",
      name: "Marco 4209 horizontal",
      functionName: "Marco",
      base: "ancho_total",
      adjustmentMm: 0,
      quantity: 2,
      cut: "45°/45°",
      note: `${sourceNote} Largo X.`,
    }),
    profile({
      createId: id,
      code: "4209",
      name: "Marco 4209 vertical",
      functionName: "Marco",
      base: "alto_total",
      adjustmentMm: 0,
      quantity: 2,
      cut: "45°/45°",
      note: `${sourceNote} Largo Y.`,
    }),
    profile({
      createId: id,
      code: "4202",
      name: "Hoja 4202 horizontal",
      functionName: "Hoja",
      base: "ancho_total",
      adjustmentMm: -14,
      quantity: 2,
      cut: "45°/45°",
      note: `${sourceNote} Largo X − 14 mm.`,
    }),
    profile({
      createId: id,
      code: "4202",
      name: "Hoja 4202 vertical",
      functionName: "Hoja",
      base: "alto_total",
      adjustmentMm: -14,
      quantity: 2,
      cut: "45°/45°",
      note: `${sourceNote} Largo Y − 14 mm.`,
    }),
    profile({
      createId: id,
      code: "4229",
      name: "Junquillo monolítico 4229 horizontal",
      functionName: "Junquillo",
      base: "ancho_total",
      adjustmentMm: -86,
      quantity: 2,
      cut: "34°/34°",
      note: `${sourceNote} Largo X − 86 mm.`,
    }),
    profile({
      createId: id,
      code: "4229",
      name: "Junquillo monolítico 4229 vertical",
      functionName: "Junquillo",
      base: "alto_total",
      adjustmentMm: -86,
      quantity: 2,
      cut: "90°/90°",
      note: `${sourceNote} Largo Y − 86 mm.`,
    }),
  ];

  return baseRecipe({
    createId: id,
    lineName: input.lineName,
    variant: SODAL_VARIANT,
    label: "SODAL · Sin cámara · Monolítico",
    profiles,
    glasses: [
      {
        id: id(),
        nombre: "Vidrio monolítico SODAL Serie 4200",
        reglaAncho: { base: "ancho_total", ajusteMm: -93 },
        reglaAlto: { base: "alto_total", ajusteMm: -93 },
        reglaCantidad: { tipo: "fija", cantidad: 1 },
        requerido: false,
        observaciones: `${sourceNote} Fórmula publicada: X − 93 mm por Y − 93 mm.`,
      },
    ],
    notes: [
      `Fuente primaria consultada el 2026-09-21: ${SODAL_SERIE_4200_URL}`,
      "La receta se limita a Fijo/Proyectante sin Cámara, monolítico y 1 hoja. No incorpora las variantes con cámara, termopanel, abatible ni sus herrajes.",
      "La ficha declara cubicación ((X+Y)×2/100) × 1.00 + merma: 4202 +8%, 4209 +5%, 4229 +8%. Ventora calcula largos exactos de corte y distribución de barras; estos porcentajes quedan documentados, pero no se aplican como alargue de piezas ni como tiras adicionales.",
      "Receta documentada, no validada en taller.",
    ],
  });
}

export const SERIE_42_PROVIDER_VARIANTS = {
  alar: ALAR_VARIANT,
  alarWaterChamber: ALAR_WATER_CHAMBER_VARIANT,
  sodal: SODAL_VARIANT,
} as const;
