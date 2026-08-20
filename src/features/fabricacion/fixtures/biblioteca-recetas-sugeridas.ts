import {
  COMMERCIAL_SUGGESTED_TEMPLATES,
  createCommercialSuggestedRecipe,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe-commercial-templates";
import type {
  MeasureBase,
  QuantityRule,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionBaseMedida,
  type FabricacionReceta,
  type FabricacionReglaCantidad,
  type FabricacionTipologia,
} from "@/features/fabricacion/types/fabricacion-domain";

export type BibliotecaRecetaSugerida = {
  id: string;
  proveedor: string;
  linea: string;
  variante: string;
  tipologia: string;
  estado: "sugerida" | "reconocida";
  motivoPendiente: string | null;
  crearDefinicion: (() => FabricacionReceta) | null;
};

const BASE_MAP: Record<MeasureBase, FabricacionBaseMedida> = {
  vano_width: "ancho_total",
  vano_height: "alto_total",
  half_vano_width: "ancho_total",
  sash_width: "ancho_por_hoja",
  sash_height: "alto_por_hoja",
  module_width: "ancho_modulo",
  module_height: "alto_modulo",
  glass_width: "ancho_por_hoja",
  glass_height: "alto_total",
  fixed: "fijo_mm",
};

function quantityRule(rule: QuantityRule, value: number): FabricacionReglaCantidad {
  if (rule === "per_sash") return { tipo: "por_hoja", cantidad: value };
  if (rule === "two_per_sash") {
    return { tipo: "por_hoja", cantidad: value, multiplicador: 2 };
  }
  if (rule === "per_module") return { tipo: "por_modulo", cantidad: value };
  if (rule === "two_per_module") {
    return { tipo: "por_modulo", cantidad: value, multiplicador: 2 };
  }
  return { tipo: "fija", cantidad: value };
}

function createAlarDefinition(templateId: string, lineName: string) {
  const legacy = createCommercialSuggestedRecipe(templateId);
  if (!legacy) throw new Error(`Plantilla sugerida desconocida: ${templateId}`);
  const recipeId = crypto.randomUUID();

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "ejemplo_no_validado",
    identidad: {
      recetaId: recipeId,
      codigo: `ALAR-${lineName}-2H-V1`,
      nombre: `ALAR ${lineName} - corredera 2 hojas`,
      tipologia: "corredera" as FabricacionTipologia,
      hojas: 2,
      modulos: 2,
      apertura: "corredera",
      herraje: legacy.herrajeTipo,
      variante: legacy.variant,
    },
    perfiles: legacy.components
      .filter((component) => component.kind === "profile")
      .map((component) => ({
        id: crypto.randomUUID(),
        codigoPerfil: component.profileCode,
        nombrePerfil: component.profileName || component.functionLabel,
        funcion: component.functionLabel,
        largoComercialMm: component.barLengthMm || legacy.defaultBarLengthMm || null,
        reglaMedida: {
          base: BASE_MAP[component.measureBase],
          ...(component.measureBase === "half_vano_width"
            ? { multiplicador: 0.5 }
            : {}),
          ...(component.measureBase === "fixed"
            ? { valorFijoMm: component.fixedMeasureMm }
            : {}),
          ajusteMm:
            component.adjustMode === "subtract"
              ? -component.adjustMm
              : component.adjustMode === "add"
                ? component.adjustMm
                : 0,
        },
        reglaCantidad: quantityRule(component.quantityRule, component.quantityValue),
        requerido: component.required,
        observaciones: [
          "Regla inicial ya documentada en Ventora. Confirmar con pauta real del taller.",
          component.notes,
        ]
          .filter(Boolean)
          .join(" "),
        datosPendientes: [
          ...(component.profileCode ? [] : ["Confirmar codigo del perfil"]),
          "Validar regla con trabajo real",
        ],
      })),
    vidrios: [],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: legacy.defaultKerfMm,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
    },
    notasValidacion: [
      "Plantilla inicial sugerida. No es receta oficial del proveedor ni esta validada por taller.",
    ],
  } satisfies FabricacionReceta;
}

const ALAR_TEMPLATES: BibliotecaRecetaSugerida[] = COMMERCIAL_SUGGESTED_TEMPLATES.map(
  (template) => ({
    id: `ventora:${template.id}`,
    proveedor: "ALAR",
    linea: template.lineHint,
    variante: "Corredera 2 hojas",
    tipologia: "corredera",
    estado: "sugerida",
    motivoPendiente: null,
    crearDefinicion: () => createAlarDefinition(template.id, template.lineHint),
  })
);

const RECOGNIZED_WITHOUT_RULES: BibliotecaRecetaSugerida[] = [
  ["sodal-serie-20-2h", "Serie 20", "Corredera 2 hojas", "corredera"],
  ["sodal-serie-4800-2h", "Serie 4800", "Corredera 2 hojas", "corredera"],
  ["sodal-s33-3h-1f", "S-33", "3 hojas con una fija", "corredera"],
  ["sodal-serie-42-proyectante", "Serie 42", "Proyectante", "proyectante"],
  ["sodal-serie-3200-puerta", "Serie 3200", "Puerta abatible 1 hoja", "puerta_abatible"],
].map(([id, linea, variante, tipologia]) => ({
  id: `catalogo:${id}`,
  proveedor: "SODAL",
  linea,
  variante,
  tipologia,
  estado: "reconocida",
  motivoPendiente:
    "Catalogo identificado; faltan formulas y cantidades verificables para crear una receta.",
  crearDefinicion: null,
}));

export const BIBLIOTECA_RECETAS_PRIORIZADAS: BibliotecaRecetaSugerida[] = [
  ...ALAR_TEMPLATES,
  ...RECOGNIZED_WITHOUT_RULES,
];
