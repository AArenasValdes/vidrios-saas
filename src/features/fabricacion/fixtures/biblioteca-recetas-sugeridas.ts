import {
  crearRecetaPlantillaVentoraProyectante,
  crearRecetaSerie42Proyectante,
  PLANTILLAS_VENTORA_PROYECTANTE,
} from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
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
import {
  crearRecetaVeratecCompactSliding,
  crearRecetaVeratec7400Workbook3H,
  crearRecetaVeratec7400Monorriel,
  VERATEC_7400_MONORAIL_VARIANTS,
  VERATEC_COMPACT_SLIDING_VARIANTS,
  VERATEC_7400_WORKBOOK_3H_VARIANTS,
  VERATEC_WORKBOOK_SOURCE_REVISION,
} from "@/features/fabricacion/fixtures/veratec-workbook-recipes";
import {
  crearRecetaVeratecBahar5200,
  VERATEC_BAHAR_5200_VARIANTS,
  VERATEC_BAHAR_5200_PLEGABLE_VARIANTS,
} from "@/features/fabricacion/fixtures/veratec-bahar-5200-recipes";
import {
  crearRecetaVeratec7400CuatroHojasChicas,
  crearRecetaVeratecElevadora,
  crearRecetaVeratecInova,
  VERATEC_7400_4H_VARIANTS,
  VERATEC_ELEVADORA_VARIANTS,
  VERATEC_INOVA_VARIANTS,
} from "@/features/fabricacion/fixtures/veratec-preliminary-recipes";

export type BibliotecaRecetaSugerida = {
  id: string;
  catalogKey?: string;
  sourceType?: "workshop" | "supplier";
  sourceName?: string;
  sourceReference?: string;
  sourceRevision?: string;
  proveedor: string;
  linea: string;
  variante: string;
  tipologia: string;
  estado: "sugerida" | "reconocida";
  motivoPendiente: string | null;
  crearDefinicion: (() => FabricacionReceta) | null;
};

const VERATEC_DOCUMENTED_TEMPLATES: BibliotecaRecetaSugerida[] = [
  ...VERATEC_COMPACT_SLIDING_VARIANTS.map((variant) => ({
    id: `supplier:veratec:${variant.slug}`,
    catalogKey: `ventora:veratec-compact-sliding-${variant.leaves}h`,
    proveedor: "VERATEC",
    linea: `Compact Sliding · ${variant.leaves} hojas`,
    variante: variant.label,
    tipologia: "corredera",
    estado: "sugerida" as const,
    motivoPendiente: "Base de la pauta facilitada por Veratec. Falta elegir junquillo según vidrio, configurar accesorios y parámetros de sierra del taller.",
    sourceType: "supplier" as const,
    sourceName: "Veratec · pauta de corte facilitada",
    sourceReference: variant.sourceReference,
    sourceRevision: VERATEC_WORKBOOK_SOURCE_REVISION,
    crearDefinicion: () => crearRecetaVeratecCompactSliding({ lineName: `Compact Sliding · ${variant.leaves} hojas`, variant: variant.slug }),
  })),
  ...VERATEC_7400_WORKBOOK_3H_VARIANTS.map((variant) => ({
    id: `supplier:veratec:${variant.slug}`,
    catalogKey: "ventora:veratec-7400-corredera-3h",
    proveedor: "VERATEC",
    linea: "Veratec 7400 — Corredera 3 hojas",
    variante: variant.label,
    tipologia: "corredera",
    estado: "sugerida" as const,
    motivoPendiente: "Base de la pauta facilitada por Veratec. Faltan junquillo, largo por acabado y accesorios; no es una pauta de compra completa.",
    sourceType: "supplier" as const,
    sourceName: "Veratec · pauta de corte facilitada",
    sourceReference: variant.sourceReference,
    sourceRevision: VERATEC_WORKBOOK_SOURCE_REVISION,
    crearDefinicion: () => crearRecetaVeratec7400Workbook3H({ lineName: "Veratec 7400 — Corredera 3 hojas", variant: variant.slug }),
  })),
  ...VERATEC_7400_MONORAIL_VARIANTS.map((variant) => ({
    id: `supplier:veratec:${variant.slug}`,
    catalogKey: "ventora:veratec-7400-monorriel",
    proveedor: "VERATEC",
    linea: "Sliding 7400 · Monorriel",
    variante: variant.label,
    tipologia: "corredera",
    estado: "sugerida" as const,
    motivoPendiente: "Base documental calculable. Junquillos, largos comerciales, accesorios y vidrio por definir; la pauta de tiras será parcial.",
    sourceType: "supplier" as const,
    sourceName: "Veratec · pauta de corte facilitada",
    sourceReference: variant.sourceReference,
    sourceRevision: VERATEC_WORKBOOK_SOURCE_REVISION,
    crearDefinicion: () => crearRecetaVeratec7400Monorriel({ lineName: "Sliding 7400 · Monorriel", variant: variant.slug }),
  })),
  ...VERATEC_BAHAR_5200_VARIANTS.map((variant) => ({
    id: `supplier:veratec:${variant.slug}`,
    catalogKey: variant.catalogKey,
    proveedor: "VERATEC",
    linea: `Bahar 5200 · ${variant.label}`,
    variante: variant.label,
    tipologia: variant.typology,
    estado: "sugerida" as const,
    motivoPendiente: "Base documental lista para probar. Falta junquillo, asociar refuerzos y configurar sierra.",
    sourceType: "supplier" as const,
    sourceName: "VERATEC · pauta de corte Bahar",
    sourceReference: variant.sourceReference,
    sourceRevision: "pauta-de-corte-veratec.xlsx + MATERIALES PRECIO VERATEC.xlsx#BAHAR",
    crearDefinicion: () => crearRecetaVeratecBahar5200({ lineName: `Bahar 5200 · ${variant.label}`, variant: variant.slug }),
  })),
  ...VERATEC_BAHAR_5200_PLEGABLE_VARIANTS.map((variant) => ({
    id: `supplier:veratec:${variant.slug}`,
    catalogKey: variant.catalogKey,
    proveedor: "VERATEC",
    linea: `Bahar 5200 · ${variant.label}`,
    variante: variant.label,
    tipologia: "puerta_abatible",
    estado: "sugerida" as const,
    motivoPendiente: "Pauta documental calculable. Elige espesor de vidrio y junquillo; configura la sierra del taller.",
    sourceType: "supplier" as const,
    sourceName: "VERATEC · pauta de corte Bahar 5200",
    sourceReference: variant.sourceReference,
    sourceRevision: "pauta-de-corte-veratec.xlsx + MATERIALES PRECIO VERATEC.xlsx#BAHAR",
    crearDefinicion: () => crearRecetaVeratecBahar5200({ lineName: `Bahar 5200 · ${variant.label}`, variant: variant.slug }),
  })),
  ...VERATEC_7400_4H_VARIANTS.map((variant) => ({
    id: `supplier:veratec:${variant.slug}`,
    catalogKey: "ventora:veratec-7400-corredera-4h-chica",
    proveedor: "VERATEC",
    linea: "Sliding 7400",
    variante: variant.label,
    tipologia: "corredera",
    estado: "sugerida" as const,
    motivoPendiente: "Base operativa para 67415 solicitada por el taller; perfiles y vidrio calculables. Completa los precios de herrajes y valida la muestra antes de producción.",
    sourceType: "supplier" as const,
    sourceName: "Veratec · pauta de corte + configuración operacional del taller",
    sourceReference: variant.sourceReference,
    sourceRevision: VERATEC_WORKBOOK_SOURCE_REVISION,
    crearDefinicion: () => crearRecetaVeratec7400CuatroHojasChicas({ lineName: "Sliding 7400", variant: variant.slug }),
  })),
  ...VERATEC_INOVA_VARIANTS.map((variant) => ({
    id: `workshop:veratec:${variant.slug}`,
    catalogKey: "ventora:veratec-inova-corredera-2h",
    proveedor: "VERATEC",
    linea: "Inova",
    variante: variant.label,
    tipologia: "corredera",
    estado: "sugerida" as const,
    motivoPendiente: "Base preliminar editable. Completa los perfiles y la altura de hoja; no es una fórmula oficial de Veratec.",
    sourceType: "workshop" as const,
    sourceName: "Ventora · base editable preliminar",
    sourceReference: variant.sourceReference,
    crearDefinicion: () => crearRecetaVeratecInova({ lineName: "Inova", variant: variant.slug }),
  })),
  ...VERATEC_ELEVADORA_VARIANTS.map((variant) => ({
    id: `supplier:veratec:${variant.slug}`,
    catalogKey: variant.catalogKey,
    proveedor: "VERATEC",
    linea: "Elevadora",
    variante: variant.label,
    tipologia: "corredera",
    estado: "sugerida" as const,
    motivoPendiente: "El díptico identifica esta configuración. Agrega los perfiles y reglas del taller para generar una pauta.",
    sourceType: "supplier" as const,
    sourceName: "Xelena · Díptico de líneas PVC · Elevadora",
    sourceReference: variant.sourceReference,
    crearDefinicion: () => crearRecetaVeratecElevadora({ lineName: "Elevadora", variant: variant.slug }),
  })),
];

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

const VENTORA_PROYECTANTE_TEMPLATES: BibliotecaRecetaSugerida[] = (
  Object.keys(PLANTILLAS_VENTORA_PROYECTANTE) as Array<
    keyof typeof PLANTILLAS_VENTORA_PROYECTANTE
  >
).map((plantillaId) => ({
  id: `ventora:plantilla-verificada-${plantillaId.toLowerCase()}`,
  proveedor: "Ventora",
  linea: plantillaId,
  variante: "Proyectante",
  tipologia: "proyectante",
  estado: "sugerida",
  motivoPendiente: null,
  crearDefinicion: () =>
    plantillaId === "L42"
      ? crearRecetaSerie42Proyectante({
          variant: "normal",
          lineName: plantillaId,
        })
      : crearRecetaPlantillaVentoraProyectante(plantillaId),
}));

export const BIBLIOTECA_RECETAS_PRIORIZADAS: BibliotecaRecetaSugerida[] = [
  ...VERATEC_DOCUMENTED_TEMPLATES,
  ...ALAR_TEMPLATES,
  ...VENTORA_PROYECTANTE_TEMPLATES,
  ...RECOGNIZED_WITHOUT_RULES,
];

export function getSuggestedRecipesForLine(input: {
  catalogKey: string | null | undefined;
  lineName: string | null | undefined;
  providerName: string | null | undefined;
}): BibliotecaRecetaSugerida[] {
  const normalizedLine = input.lineName?.trim().toLocaleLowerCase("es-CL");
  const normalizedProvider = input.providerName?.trim().toLocaleLowerCase("es-CL");
  if (!normalizedLine) return [];
  return BIBLIOTECA_RECETAS_PRIORIZADAS.filter((entry) =>
    entry.crearDefinicion &&
    (entry.catalogKey ? entry.catalogKey === input.catalogKey : entry.linea.trim().toLocaleLowerCase("es-CL") === normalizedLine) &&
    (!normalizedProvider || entry.proveedor.trim().toLocaleLowerCase("es-CL") === normalizedProvider)
  );
}
