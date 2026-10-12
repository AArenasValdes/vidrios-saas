import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionReglaMedida,
} from "@/features/fabricacion/types/fabricacion-domain";
import {
  VERATEC_7400_INTERNAL_NODE_HEIGHT_ADJUSTMENT_MM,
  VERATEC_WORKBOOK_SOURCE_REVISION,
} from "@/features/fabricacion/fixtures/veratec-workbook-recipes";

export const VERATEC_7400_4H_CATALOG_KEY = "ventora:veratec-7400-corredera-4h-chica";
export const VERATEC_7400_4H_VARIANTS = [
  {
    slug: "7400_4h_chica_interpretacion_67415",
    label: "4 hojas chicas · hoja 67415",
    leafCode: "67415VER",
    sourceReference: "pauta-de-corte-veratec.xlsx#Sliding-4-hojas-chicas!C3:E12; Lista Junio 2026 p. 5; configuración operacional indicada por el taller el 2026-10-11",
  },
] as const;

export const VERATEC_7400_4H_INTERNAL_NODE_HEIGHT_ADJUSTMENT_MM =
  VERATEC_7400_INTERNAL_NODE_HEIGHT_ADJUSTMENT_MM;
export const VERATEC_7400_4H_CENTRAL_OVERLAP_MM = 26;
/** El intercepto +18,3 mm del Excel implica 2,4 mm efectivos en la fórmula de traslapo indicada. */
export const VERATEC_7400_4H_EFFECTIVE_JAMB_THICKNESS_MM = 2.4;

export const VERATEC_INOVA_VARIANTS = [
  {
    slug: "inova_2h_base_preliminar",
    label: "Corredera · 2 hojas · base editable",
    sourceReference: "Regla preliminar propuesta para base editable; pendiente contrastar con Veratec/taller.",
  },
] as const;

export const VERATEC_ELEVADORA_VARIANTS = [
  {
    slug: "elevadora_a_1fijo_1movil",
    catalogKey: "ventora:veratec-elevadora-2h-1fijo-1movil",
    label: "Esquema A · 1 paño fijo + 1 móvil",
    leaves: 2,
    sourceReference: "Xelena · Díptico de líneas PVC · Elevadora · Esquema A",
  },
  {
    slug: "elevadora_c_2fijos_2moviles",
    catalogKey: "ventora:veratec-elevadora-4h-2fijos-2moviles",
    label: "Esquema C · 2 paños fijos + 2 móviles",
    leaves: 4,
    sourceReference: "Xelena · Díptico de líneas PVC · Elevadora · Esquema C",
  },
] as const;

type IdFactory = () => string;

function measure(base: FabricacionReglaMedida["base"], ajusteMm: number, multiplicador?: number): FabricacionReglaMedida {
  return { base, ajusteMm, ...(multiplicador === undefined ? {} : { multiplicador }) };
}

function pendingProfile(input: {
  id: string;
  code: string;
  name: string;
  role: string;
  rule: FabricacionReglaMedida;
  quantity: number;
  cut: string;
  sourceReference: string;
  commercialLengthMm?: number;
  pending?: string[];
}): FabricacionComponentePerfil {
  return {
    id: input.id,
    codigoPerfil: input.code,
    nombrePerfil: input.name,
    funcion: input.role,
    largoComercialMm: input.commercialLengthMm ?? 6000,
    largoComercialPendiente: false,
    reglaMedida: input.rule,
    reglaCantidad: { tipo: "fija", cantidad: input.quantity },
    requerido: true,
    corte: input.cut,
    observaciones: `Regla preliminar de ${input.sourceReference}. El largo de 6.000 mm es una referencia editable, no un dato confirmado del proveedor; la presentación seleccionada debe prevalecer.`,
    datosPendientes: [
      "Asociar la presentación comercial del taller y verificar su largo antes de confirmar la compra.",
      ...(input.code ? [] : ["Código/SKU del perfil pendiente de completar por el taller."]),
      ...(input.pending ?? []),
    ],
  };
}

function baseRecipe(input: {
  id: string;
  code: string;
  name: string;
  variant: string;
  leaves: number;
  modules: number;
  profiles: FabricacionComponentePerfil[];
  pending: string[];
  sourceReference: string;
  allowPartialCalculation: boolean;
}): FabricacionReceta {
  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    permitirCalculoPreliminarConPendientes: input.allowPartialCalculation,
    identidad: {
      recetaId: input.id,
      codigo: input.code,
      nombre: input.name,
      tipologia: "corredera",
      hojas: input.leaves,
      modulos: input.modules,
      apertura: "corredera",
      herraje: null,
      variante: input.variant,
    },
    perfiles: input.profiles,
    vidrios: [],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: 6000,
    },
    datosPendientes: input.pending,
    notasValidacion: [
      `Procedencia: ${input.sourceReference}.`,
      `Revisión documental relacionada: ${VERATEC_WORKBOOK_SOURCE_REVISION}.`,
      "Base preliminar editable. Estado: Listo para probar; no es una receta certificada por Veratec ni validada físicamente por el taller.",
      "Configuración operacional de taller: hoja chica 67415; 67414 queda reservado a hoja grande/reforzada. El Excel aún muestra 67414 en la pestaña de hoja chica.",
      "El largo 6.000 mm es una referencia editable. El largo de la presentación/SKU seleccionado prevalece al cubicar y hacer packing.",
    ],
  };
}

export function crearRecetaVeratec7400CuatroHojasChicas(input: {
  lineName: string;
  variant: (typeof VERATEC_7400_4H_VARIANTS)[number]["slug"];
  createId?: IdFactory;
}): FabricacionReceta {
  const variant = VERATEC_7400_4H_VARIANTS.find((item) => item.slug === input.variant);
  if (!variant) throw new Error(`Variante Sliding 7400 4H desconocida: ${input.variant}`);
  const id = input.createId ?? (() => crypto.randomUUID());
  const profile = (code: string, name: string, role: string, base: FabricacionReglaMedida["base"], adjustment: number, qty: number, cut: string) =>
    pendingProfile({ id: id(), code, name, role, rule: measure(base, adjustment), quantity: qty, cut, sourceReference: variant.sourceReference });
  const leafWidthAdjustmentMm =
    (3 * VERATEC_7400_4H_CENTRAL_OVERLAP_MM -
      2 * VERATEC_7400_4H_EFFECTIVE_JAMB_THICKNESS_MM) /
    4;
  const leafWidth = measure("ancho_total", leafWidthAdjustmentMm, 0.25);
  const reinforcementLeafWidth = measure("ancho_total", -127.7, 0.25);
  const glassLeafWidth = measure("ancho_total", leafWidthAdjustmentMm - 86, 0.25);
  const profiles = [
    profile("67401VER", "Marco Sliding 7400", "Marco", "ancho_total", 6, 2, "45° / 45°"),
    profile("67401VER", "Marco Sliding 7400", "Marco", "alto_total", 6, 2, "45° / 45°"),
    profile("69014STL001", "Refuerzo de marco", "Refuerzo de marco", "ancho_total", -70, 2, "90° / 90°"),
    profile("69014STL001", "Refuerzo de marco", "Refuerzo de marco", "alto_total", -70, 2, "90° / 90°"),
    pendingProfile({ id: id(), code: variant.leafCode, name: "Hoja chica monolítica", role: "Hoja", rule: leafWidth, quantity: 8, cut: "45° / 45°", sourceReference: variant.sourceReference, pending: ["La asignación de 67415 a esta base sigue la configuración operacional indicada por el taller; no constituye validación física."] }),
    profile(variant.leafCode, "Hoja chica monolítica", "Hoja", "alto_total", VERATEC_7400_4H_INTERNAL_NODE_HEIGHT_ADJUSTMENT_MM, 8, "45° / 45°"),
    profile("69071STL000", "Refuerzo de hoja chica según hoja", "Refuerzo de hoja", "ancho_total", -273.7, 8, "90° / 90°"),
    profile("69071STL000", "Refuerzo de hoja chica según hoja", "Refuerzo de hoja", "alto_total", -234, 8, "90° / 90°"),
    profile("67419VER", "Traslapo Sliding 7400", "Traslapo", "alto_total", -6, 4, "90° / 90°"),
    profile("61016VER001", "Riel Sliding 7400", "Riel", "ancho_total", -114, 2, "45° / 45°"),
  ];
  const recipe = baseRecipe({
    id: id(),
    code: `VERATEC-7400-4H-${variant.slug.toUpperCase()}-V1`,
    name: `${input.lineName.trim() || "Sliding 7400"} · ${variant.label}`,
    variant: variant.slug,
    leaves: 4,
    modules: 4,
    profiles,
    sourceReference: variant.sourceReference,
    allowPartialCalculation: true,
    pending: [
      "La fórmula aplica traslapo 26 mm y espesor efectivo de jamba 2,4 mm, inferido algebraicamente del +18,3 mm del Excel; no es una medida publicada por el fabricante.",
      "La base no distingue hojas móviles de fijas porque la fuente no define sus perfiles por separado. En configuraciones mixtas 2 fijas + 2 móviles, revisa y ajusta el despiece en esta cotización.",
      "El Excel registra el junquillo como ‘todos’; se propone goma cuña/cordón directo, pero faltan código, consumo y compatibilidad confirmados.",
      "El vidrio 4 mm es la base operativa solicitada; 5 mm requiere confirmar compatibilidad antes de habilitarlo.",
      "Los consumos de quincallería son cantidades operativas sugeridas; faltan SKU y precios para valorizar esos accesorios.",
    ],
  });
  // Mantiene visible el ancho de hoja documentado en vez de normalizarlo como un descuento del vano.
  recipe.perfiles[4].reglaMedida = leafWidth;
  recipe.perfiles[6].reglaMedida = reinforcementLeafWidth;
  recipe.perfiles[8].reglaMedida = measure("alto_total", -6);
  recipe.vidrios.push({
    id: id(),
    nombre: "Vidrio monolítico 4 mm · base operativa",
    reglaAncho: glassLeafWidth,
    reglaAlto: measure("alto_total", VERATEC_7400_4H_INTERNAL_NODE_HEIGHT_ADJUSTMENT_MM - 86),
    reglaCantidad: { tipo: "fija", cantidad: 4 },
    requerido: true,
    observaciones: `Regla de vidrio solicitada por el taller, sobre hoja 67415. Fuente dimensional del bastidor: ${variant.sourceReference}.`,
    datosPendientes: ["Confirmar si corresponde 4 mm o 5 mm; el cálculo base usa 4 mm y no habilita 5 mm sin confirmación."],
  });
  recipe.accesorios.push(
    {
      id: id(), codigo: "", nombre: "Rodamiento corredera Serie 7400",
      reglaCantidad: { tipo: "fija", cantidad: 8 }, requerido: true,
      unidad: "unidad", observaciones: "Dos unidades por cada una de las cuatro hojas; cantidad operativa solicitada por el taller.",
      datosPendientes: ["Completar SKU y precio de compra del taller."],
    },
    {
      id: id(), codigo: "", nombre: "Cierre embutido / multipunto para hoja extrema",
      reglaCantidad: { tipo: "fija", cantidad: 2 }, requerido: true,
      unidad: "unidad", observaciones: "Una unidad por cada hoja extrema; cantidad operativa solicitada por el taller.",
      datosPendientes: ["Completar SKU y precio de compra del taller."],
    },
    {
      id: id(), codigo: "", nombre: "Juego de cierre central / kit de encuentro 7400",
      reglaCantidad: { tipo: "fija", cantidad: 1 }, requerido: true,
      unidad: "juego", observaciones: "Cantidad operativa solicitada por el taller.",
      datosPendientes: ["Completar SKU y precio de compra del taller."],
    },
    {
      id: id(), codigo: "", nombre: "Felpa de hermeticidad para hojas 67415",
      reglaCantidad: { tipo: "fija", cantidad: 1 }, requerido: true,
      formulaCantidad: "perimetro_perfiles_hoja_m", unidad: "m",
      observaciones: "Perímetro lineal de las cuatro hojas 67415, a partir de sus cortes calculados.",
      datosPendientes: ["Completar presentación y precio por metro o rollo del taller."],
    },
    {
      id: id(), codigo: "", nombre: "Goma cuña / cordón de acristalamiento directo",
      reglaCantidad: { tipo: "fija", cantidad: 1 }, requerido: true,
      formulaCantidad: "perimetro_vidrios_m", unidad: "m",
      observaciones: "No se incorpora junquillo rígido de PVC a esta base; el consumo lineal sigue el perímetro de los vidrios.",
      datosPendientes: ["Completar SKU, precio y compatibilidad de la goma con el vidrio elegido."],
    },
  );
  return recipe;
}

export function crearRecetaVeratecInova(input: {
  lineName: string;
  variant?: string;
  createId?: IdFactory;
}): FabricacionReceta {
  const id = input.createId ?? (() => crypto.randomUUID());
  const source = VERATEC_INOVA_VARIANTS[0];
  const profiles = [
    pendingProfile({ id: id(), code: "", name: "Marco perimetral Inova", role: "Marco", rule: measure("ancho_total", 0), quantity: 2, cut: "45° / 45°", sourceReference: source.sourceReference }),
    pendingProfile({ id: id(), code: "", name: "Marco perimetral Inova", role: "Marco", rule: measure("alto_total", 0), quantity: 2, cut: "45° / 45°", sourceReference: source.sourceReference }),
    pendingProfile({ id: id(), code: "", name: "Hoja corredera Inova", role: "Hoja", rule: measure("ancho_total", 12, 0.5), quantity: 4, cut: "45° / 45°", sourceReference: source.sourceReference, pending: ["La fórmula de altura de hoja no está definida y se deja sin calcular."] }),
  ];
  return baseRecipe({
    id: id(), code: `VERATEC-INOVA-${source.slug.toUpperCase()}-V1`, name: `${input.lineName.trim() || "Inova"} · ${source.label}`,
    variant: input.variant ?? source.slug, leaves: 2, modules: 2, profiles, sourceReference: source.sourceReference,
    allowPartialCalculation: true,
    pending: ["Las reglas de marco y ancho de hoja son preliminares y requieren confirmación del taller.", "Falta altura de hoja, vidrio, junquillo, códigos, presentaciones y accesorios."],
  });
}

export function crearRecetaVeratecElevadora(input: {
  lineName: string;
  variant: (typeof VERATEC_ELEVADORA_VARIANTS)[number]["slug"];
  createId?: IdFactory;
}): FabricacionReceta {
  const variant = VERATEC_ELEVADORA_VARIANTS.find((item) => item.slug === input.variant);
  if (!variant) throw new Error(`Variante Elevadora desconocida: ${input.variant}`);
  const id = input.createId ?? (() => crypto.randomUUID());
  return baseRecipe({
    id: id(), code: `VERATEC-ELEVADORA-${variant.slug.toUpperCase()}-V1`,
    name: `${input.lineName.trim() || "Elevadora"} · ${variant.label}`, variant: variant.slug,
    leaves: variant.leaves, modules: variant.leaves, profiles: [], sourceReference: variant.sourceReference,
    allowPartialCalculation: false,
    pending: ["El díptico permite identificar el esquema, pero no entrega códigos de perfiles ni fórmulas de corte suficientes.", "Agregar perfiles y reglas del taller desde la configuración antes de calcular fabricación."],
  });
}
