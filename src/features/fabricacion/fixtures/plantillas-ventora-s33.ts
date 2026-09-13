import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionCondicion,
  type FabricacionReceta,
  type FabricacionBaseMedida,
} from "@/features/fabricacion/types/fabricacion-domain";

export type SerieS33VariantId = "normal" | "rpt";

const STANDARD_VARIANTS = ["S-33 Normal", "S-33 Reforzada", "S-33 TP"];

function profile(input: {
  createId: () => string;
  code: string;
  name: string;
  measure: FabricacionBaseMedida;
  quantity: number;
  adjustmentMm?: number;
  multiplier?: number;
  condition: FabricacionCondicion;
  note: string;
}): FabricacionReceta["perfiles"][number] {
  return {
    id: input.createId(),
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.code === "3301" || input.code === "3324" ? "Riel / marco" : "Perfil de hoja",
    largoComercialMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    reglaMedida: {
      base: input.measure,
      ajusteMm: input.adjustmentMm,
      multiplicador: input.multiplier ?? 1,
      condicion: input.condition,
    },
    reglaCantidad: {
      tipo: "fija",
      cantidad: input.quantity,
      multiplicador: 1,
      condicion: input.condition,
    },
    requerido: true,
    observaciones: [
      `S-33. Código ${input.code}.`,
      input.note,
      "Pauta de corredera 2 hojas aportada por el usuario; confirmar con fabricación real antes de validar.",
    ].join(" "),
    datosPendientes: [
      "Confirmar corte y cantidad con una fabricación real",
      "Validar la receta con el taller",
    ],
  };
}

function accessory(
  createId: () => string,
  name: string,
  code: string,
  condition: FabricacionCondicion,
  required = false
): FabricacionReceta["accesorios"][number] {
  return {
    id: createId(),
    codigo: code,
    nombre: name,
    reglaCantidad: { tipo: "fija", cantidad: 1, multiplicador: 1, condicion: condition },
    requerido: required,
    condicion: condition,
    observaciones: "Cantidad y compatibilidad a confirmar con el taller.",
    datosPendientes: ["Confirmar modelo y cantidad con el taller"],
  };
}

function glass(
  createId: () => string,
  name: string,
  condition: FabricacionCondicion
): FabricacionReceta["vidrios"][number] {
  return {
    id: createId(),
    nombre: name,
    reglaAncho: { base: "ancho_total", ajusteMm: 0, multiplicador: 1, condicion: condition },
    reglaAlto: { base: "alto_total", ajusteMm: 0, multiplicador: 1, condicion: condition },
    reglaCantidad: { tipo: "fija", cantidad: 1, multiplicador: 1, condicion: condition },
    requerido: false,
    condicion: condition,
    observaciones: "Tipo de vidrio sugerido por variante; confirmar galce y descuento en el taller.",
    datosPendientes: ["Confirmar composición y descuento del vidrio"],
  };
}

function standardProfiles(createId: () => string): FabricacionReceta["perfiles"] {
  const normal = { variante: ["S-33 Normal", "S-33 Reforzada"] };
  const tp = { variante: ["S-33 TP"] };
  return [
    profile({ createId, code: "3301", name: "Riel superior", measure: "ancho_total", quantity: 2, condition: { variante: STANDARD_VARIANTS }, note: "Largo X directo, corte 45°/45°." }),
    profile({ createId, code: "3301", name: "Riel inferior", measure: "ancho_total", quantity: 2, condition: { variante: STANDARD_VARIANTS }, note: "Largo X directo, corte 45°/45°." }),
    profile({ createId, code: "3301", name: "Jamba", measure: "alto_total", quantity: 2, condition: { variante: STANDARD_VARIANTS }, note: "Largo Y directo, corte 45°/45°." }),
    profile({ createId, code: "3304", name: "Cortagotera", measure: "ancho_total", quantity: 1, condition: { variante: STANDARD_VARIANTS }, note: "Largo X directo, corte 90°/90°." }),
    profile({ createId, code: "3302", name: "Cabezal hoja", measure: "ancho_total", multiplier: 0.5, adjustmentMm: 2, quantity: 4, condition: normal, note: "Largo X/2 + 2 mm, corte 45°/45°. Normal y reforzada." }),
    profile({ createId, code: "3302", name: "Zócalo hoja", measure: "ancho_total", multiplier: 0.5, adjustmentMm: 2, quantity: 4, condition: normal, note: "Largo X/2 + 2 mm, corte 45°/45°. Normal y reforzada." }),
    profile({ createId, code: "3302", name: "Pierna hoja", measure: "alto_total", adjustmentMm: -60, quantity: 4, condition: normal, note: "Largo Y − 60 mm, corte 45°/45°. La reforzada mantiene el código aportado y cambia la sección." }),
    profile({ createId, code: "3308", name: "Cabezal hoja TP", measure: "ancho_total", multiplier: 0.5, adjustmentMm: 2, quantity: 4, condition: tp, note: "Largo X/2 + 2 mm, corte 45°/45°. Hoja con galce DVH." }),
    profile({ createId, code: "3308", name: "Zócalo hoja TP", measure: "ancho_total", multiplier: 0.5, adjustmentMm: 2, quantity: 4, condition: tp, note: "Largo X/2 + 2 mm, corte 45°/45°. Hoja con galce DVH." }),
    profile({ createId, code: "3308", name: "Pierna hoja TP", measure: "alto_total", adjustmentMm: -60, quantity: 4, condition: tp, note: "Largo Y − 60 mm, corte 45°/45°. Hoja termopanel." }),
    profile({ createId, code: "3303", name: "Traslapo hoja", measure: "alto_total", adjustmentMm: -60, quantity: 2, condition: { variante: STANDARD_VARIANTS }, note: "Largo Y − 60 mm, corte 90°/90°." }),
  ];
}

function rptProfiles(createId: () => string): FabricacionReceta["perfiles"] {
  const rpt = { variante: "S-33 RPT" };
  return [
    profile({ createId, code: "3324", name: "Riel superior cámara", measure: "ancho_total", quantity: 2, condition: rpt, note: "Largo X directo, corte 45°/45°. Riel cámara RPT." }),
    profile({ createId, code: "3324", name: "Riel inferior cámara", measure: "ancho_total", quantity: 2, condition: rpt, note: "Largo X directo, corte 45°/45°. Riel cámara RPT." }),
    profile({ createId, code: "3324", name: "Jamba cámara", measure: "alto_total", quantity: 2, condition: rpt, note: "Largo Y directo, corte 45°/45°. Riel cámara RPT." }),
    profile({ createId, code: "3304", name: "Cortagotera", measure: "ancho_total", quantity: 1, condition: rpt, note: "Largo X directo, corte 90°/90°. Confirmar aplicación en RPT." }),
    profile({ createId, code: "3308", name: "Cabezal hoja TP RPT", measure: "ancho_total", multiplier: 0.5, adjustmentMm: 2, quantity: 4, condition: rpt, note: "Largo X/2 + 2 mm, corte 45°/45°. Hoja TP RPT." }),
    profile({ createId, code: "3308", name: "Zócalo hoja TP RPT", measure: "ancho_total", multiplier: 0.5, adjustmentMm: 2, quantity: 4, condition: rpt, note: "Largo X/2 + 2 mm, corte 45°/45°. Hoja TP RPT." }),
    profile({ createId, code: "3308", name: "Pierna hoja TP RPT", measure: "alto_total", adjustmentMm: -60, quantity: 4, condition: rpt, note: "Largo Y − 60 mm, corte 45°/45°. Hoja TP RPT." }),
    profile({ createId, code: "3303", name: "Traslapo hoja RPT", measure: "alto_total", adjustmentMm: -60, quantity: 2, condition: rpt, note: "Largo Y − 60 mm, corte 90°/90°. Confirmar en RPT." }),
  ];
}

/** Receta S-33 2H con alternativas Normal/Reforzada/TP y base RPT separada. */
export function crearRecetaSerieS33(input: {
  variant: SerieS33VariantId;
  lineName: string;
  createId?: () => string;
}): FabricacionReceta {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const isRpt = input.variant === "rpt";
  const variantLabel = isRpt ? "S-33 RPT" : "S-33 Normal / Reforzada / TP";
  const condition = { variante: isRpt ? "S-33 RPT" : STANDARD_VARIANTS };

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: createId(),
      codigo: `S-33-2H-${input.variant.toUpperCase()}-V1`,
      nombre: `${input.lineName} — ${variantLabel}`,
      tipologia: "corredera",
      hojas: 2,
      modulos: 1,
      apertura: "corredera",
      herraje: null,
      variante: isRpt ? "S-33 RPT" : "S-33 Normal",
    },
    perfiles: isRpt ? rptProfiles(createId) : standardProfiles(createId),
    vidrios: isRpt
      ? [glass(createId, "Termopanel DVH 22 mm (4-12-4)", condition), glass(createId, "Termopanel DVH 22 mm (5-12-5)", condition)]
      : [
          glass(createId, "Monolítico 4 mm", { variante: ["S-33 Normal", "S-33 Reforzada"] }),
          glass(createId, "Monolítico 5 mm", { variante: ["S-33 Normal", "S-33 Reforzada"] }),
          glass(createId, "Termopanel DVH 22 mm (4-12-4)", { variante: "S-33 TP" }),
          glass(createId, "Termopanel DVH 22 mm (5-12-5)", { variante: "S-33 TP" }),
        ],
    accesorios: [
      accessory(createId, "Carro regulable doble aguja", "3517", condition),
      accessory(createId, "Cierre embutido Star 257i", "SKU 257N", condition),
      accessory(createId, "Manilla cremona Vita", "SKU 1120", condition),
      accessory(createId, "Felpa / burlete", "Felpa 7×8", condition),
      ...(isRpt ? [accessory(createId, "Escuadra bloqueo anudal", "3470", condition, true)] : []),
    ],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    notasValidacion: [
      `${variantLabel}. Pauta completa S-33 corredera 2 hojas aportada por el usuario.`,
      "3302 se usa en Normal/Reforzada; 3308 reemplaza la hoja en TP y RPT.",
      "3324 reemplaza el riel 3301 en RPT y requiere escuadra de bloqueo 3470.",
      "Base técnica no validada: probar con medida real y confirmar con proveedor/taller.",
    ],
  };
}
