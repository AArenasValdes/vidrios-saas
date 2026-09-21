import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionAccesorio,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionTipologia,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";

export const VERATEC_7400_CATALOG_KEY = "ventora:veratec-7400-corredera";
export const VERATEC_7400_VARIANT_MONOLITICO_4MM = "monolitico_4mm";
export const VERATEC_7400_VARIANT_TERMOPANEL_20MM = "termopanel_20mm";
export const VERATEC_7400_VARIANT_TERMOPANEL_24MM = "termopanel_24mm";

export const VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM =
  "alumetrica:veratec-7400:2h:monolitico-4mm:v1";
export const VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_20MM =
  "alumetrica:veratec-7400:2h:termopanel-20mm:v1";
export const VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_24MM =
  "alumetrica:veratec-7400:2h:termopanel-24mm:v1";

export const VERATEC_7400_SOURCE_REVISION =
  "alumetrica-veratec-7400-2026-09-21-v1";

type Veratec7400Variant =
  | typeof VERATEC_7400_VARIANT_MONOLITICO_4MM
  | typeof VERATEC_7400_VARIANT_TERMOPANEL_20MM
  | typeof VERATEC_7400_VARIANT_TERMOPANEL_24MM;

type ProfileRule = {
  code: string;
  name: string;
  role: string;
  base: FabricacionComponentePerfil["reglaMedida"]["base"];
  adjustmentMm: number;
  quantity: number;
  cut: string;
};

function buildProfiles(
  createId: () => string,
  variant: Veratec7400Variant
): FabricacionComponentePerfil[] {
  const junquilloCode =
    variant === VERATEC_7400_VARIANT_MONOLITICO_4MM ? "6306" : "6307";
  const junquilloName =
    variant === VERATEC_7400_VARIANT_MONOLITICO_4MM
      ? "Junquillo para vidrio 4 mm"
      : "Junquillo para vidrio 20 mm";
  const rules: ProfileRule[] = [
    { code: "7401", name: "Marco corredera 2 hojas", role: "Marco", base: "ancho_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" },
    { code: "7401", name: "Marco corredera 2 hojas", role: "Marco", base: "alto_total", adjustmentMm: 6, quantity: 2, cut: "45° / 45°" },
    { code: "AB01016-E", name: "Riel Anodizado Nat. p/ Mar…", role: "Riel", base: "ancho_total", adjustmentMm: -112, quantity: 2, cut: "90° / 90°" },
    { code: "7414", name: "Hoja corredera grande", role: "Hoja", base: "ancho_por_hoja", adjustmentMm: 4, quantity: 4, cut: "45° / 45°" },
    { code: "7414", name: "Hoja corredera grande", role: "Hoja", base: "alto_total", adjustmentMm: -88, quantity: 4, cut: "45° / 45°" },
    { code: "7418", name: "Traslapo hoja corredera grande", role: "Traslapo", base: "alto_total", adjustmentMm: -94, quantity: 2, cut: "90° / 90°" },
    { code: junquilloCode, name: junquilloName, role: "Junquillo", base: "ancho_por_hoja", adjustmentMm: -148, quantity: 4, cut: "45° / 45°" },
    { code: junquilloCode, name: junquilloName, role: "Junquillo", base: "alto_total", adjustmentMm: -167, quantity: 4, cut: "45° / 45°" },
    { code: "69014STL001", name: "ref_marco corredera", role: "Refuerzo de marco", base: "ancho_por_hoja", adjustmentMm: -70, quantity: 4, cut: "90° / 90°" },
    { code: "69014STL001", name: "ref_marco corredera", role: "Refuerzo de marco", base: "alto_total", adjustmentMm: -70, quantity: 4, cut: "90° / 90°" },
    { code: "69069STL000", name: "ref_hoja corredera grande", role: "Refuerzo de hoja", base: "ancho_por_hoja", adjustmentMm: -80, quantity: 4, cut: "90° / 90°" },
    { code: "69069STL000", name: "ref_hoja corredera grande", role: "Refuerzo de hoja", base: "alto_total", adjustmentMm: -80, quantity: 4, cut: "90° / 90°" },
  ];

  return rules.map((rule) => ({
    id: createId(),
    codigoPerfil: rule.code,
    nombrePerfil: rule.name,
    funcion: rule.role,
    largoComercialMm: 5800,
    reglaMedida: { base: rule.base, ajusteMm: rule.adjustmentMm },
    reglaCantidad: { tipo: "fija", cantidad: rule.quantity },
    requerido: true,
    corte: rule.cut,
    observaciones: "Fórmula visible en la ficha Alumétrica Veratec 7400.",
  }));
}

function buildGlass(
  createId: () => string,
  variant: Veratec7400Variant
): FabricacionVidrio {
  const label =
    variant === VERATEC_7400_VARIANT_MONOLITICO_4MM
      ? "Vidrio monolítico 4 mm"
      : variant === VERATEC_7400_VARIANT_TERMOPANEL_20MM
        ? "Termopanel · ficha 20 mm (tipo por confirmar)"
        : "Termopanel · ficha 24 mm (junquillo por confirmar)";

  return {
    id: createId(),
    nombre: label,
    reglaAncho: { base: "ancho_por_hoja", ajusteMm: -158 },
    reglaAlto: { base: "alto_total", ajusteMm: -177 },
    reglaCantidad: { tipo: "fija", cantidad: 2 },
    requerido: false,
    observaciones: "2 paños: ancho X/2 − 158 mm y alto Y − 177 mm.",
  };
}

function buildAccessories(createId: () => string): FabricacionAccesorio[] {
  const sourceItems: Array<{ code?: string; name: string; quantity: number }> = [
    { name: "Cremona Corredera E7.5 800mm", quantity: 2 },
    { name: "Anti-falsa maniobra", quantity: 1 },
    { name: "Burlete Traslapo Sliding74", quantity: 1 },
    { name: "Calzo de 5mm para taqueado", quantity: 16 },
    { name: "Cerradero Corrediza (Todas…)", quantity: 4 },
    { name: "Goma Tope Corredera", quantity: 2 },
    { name: "Kit T3 ACCES 68-77 L.100x8", quantity: 2 },
    { name: "MAN.TIRAD PLACA L C/ACC IN", quantity: 2 },
    { name: "RUEDA SIMPLE 12/21 50 KG I", quantity: 4 },
    { code: "SA01005", name: "SA01005 - Cepillo / Felpa", quantity: 1 },
    { name: "Sell Acrílico x 330 grs", quantity: 2 },
    { name: "Tope Corredera", quantity: 2 },
    { name: "Tornillo fijación refuerzo", quantity: 17 },
  ];

  return sourceItems.map((item) => ({
    id: createId(),
    codigo: item.code ?? "",
    nombre: item.name,
    reglaCantidad: { tipo: "fija", cantidad: item.quantity },
    // Alumétrica muestra nombre y consumo, pero no publica SKU de proveedor en la ficha.
    requerido: false,
    unidad: "unidad",
    observaciones: item.code
      ? "Código, nombre y cantidad documentados en Alumétrica."
      : "Nombre y cantidad documentados en Alumétrica; código/SKU no visible.",
    clasificacion: {
      rol: item.name.toLowerCase().includes("burlete") || item.name.toLowerCase().includes("felpa") || item.name.toLowerCase().includes("goma")
        ? "seal"
        : item.name.toLowerCase().includes("sellador")
          ? "consumable"
          : item.name.toLowerCase().includes("tornillo")
            ? "fastener"
            : "hardware",
      impactos: ["accessories"],
    },
  }));
}

export function crearRecetaVeratec7400Corredera(input: {
  lineName: string;
  variant: Veratec7400Variant;
  createId?: () => string;
}): FabricacionReceta {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const variant = input.variant;
  const variantLabels: Record<Veratec7400Variant, string> = {
    [VERATEC_7400_VARIANT_MONOLITICO_4MM]: "Monolítico 4 mm",
    [VERATEC_7400_VARIANT_TERMOPANEL_20MM]: "Ficha 20 mm · tipo TP por confirmar",
    [VERATEC_7400_VARIANT_TERMOPANEL_24MM]: "Termopanel · ficha 24 mm (revisar junquillo)",
  };
  const isTermopanel20 = variant === VERATEC_7400_VARIANT_TERMOPANEL_20MM;
  const isTermopanel24 = variant === VERATEC_7400_VARIANT_TERMOPANEL_24MM;
  const pending = [
    ...(isTermopanel20
      ? ["La ficha titula esta variante ‘Monolítico 20 mm’, pero su categoría y admisión indican solo termopanel; confirmar tipo de vidrio con VERATEC."]
      : []),
    ...(isTermopanel24
      ? ["La ficha lista el perfil 7063 para 24 mm, pero las fórmulas visibles usan el código 6307 de 20 mm; confirmar junquillo antes de probar o cotizar."]
      : []),
  ];

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    identidad: {
      recetaId: createId(),
      codigo: `VERATEC-7400-2H-${variant.toUpperCase()}-V1`,
      nombre: `${input.lineName.trim() || "Veratec 7400"} · ${variantLabels[variant]}`,
      tipologia: "corredera" satisfies FabricacionTipologia,
      hojas: 2,
      modulos: 2,
      apertura: null,
      herraje: null,
      variante: variant,
    },
    perfiles: buildProfiles(createId, variant),
    vidrios: [buildGlass(createId, variant)],
    accesorios: buildAccessories(createId),
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: 5800,
    },
    datosPendientes: pending,
    notasValidacion: [
      "Fuente: Alumétrica, ficha VERATEC 7400 Corredera. X = ancho total; Y = alto total; 2 hojas.",
      "La ficha muestra 12 reglas de perfiles y 13 herrajes; los SKU de herrajes no están visibles.",
      "El catálogo lista consumo perimetral con 10% de merma. Ese factor no se aplica a los destajes publicados.",
      "Las fórmulas de proveedor requieren prueba física en taller antes de validar o usarse en un snapshot de cotización.",
      ...pending,
    ],
  };
}

export type Veratec7400SourceVariant = {
  slug: Veratec7400Variant;
  label: string;
  sourceReference: string;
};

export const VERATEC_7400_SOURCE_VARIANTS: Veratec7400SourceVariant[] = [
  {
    slug: VERATEC_7400_VARIANT_MONOLITICO_4MM,
    label: "Monolítico 4 mm",
    sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
  },
  {
    slug: VERATEC_7400_VARIANT_TERMOPANEL_20MM,
    label: "Ficha 20 mm · tipo TP por confirmar",
    sourceReference: VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_20MM,
  },
  {
    slug: VERATEC_7400_VARIANT_TERMOPANEL_24MM,
    label: "Termopanel · ficha 24 mm",
    sourceReference: VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_24MM,
  },
];
