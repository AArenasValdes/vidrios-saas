import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionTipologia,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";

export const WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY = "ventora:winhouse-new-s75-doble-riel";
export const WINHOUSE_NEW_S75_TRIPLE_CATALOG_KEY = "ventora:winhouse-new-s75-triple-riel";
export const WINHOUSE_NEW_S75_SOURCE_REVISION = "winhouse-new-s75-pauta-oficial-2026-09-26-v1";

export type WinHouseNewS75GlassBand = "mono_4_6" | "dvh_17_20" | "dvh_20_22";

export const WINHOUSE_NEW_S75_GLASS_BANDS: Record<
  WinHouseNewS75GlassBand,
  { label: string; minMm: number; maxMm: number }
> = {
  mono_4_6: { label: "Monolítico 3,7–6 mm", minMm: 3.7, maxMm: 6 },
  dvh_17_20: { label: "Termopanel 17–20 mm", minMm: 17, maxMm: 20 },
  dvh_20_22: { label: "Termopanel 20–22 mm", minMm: 20, maxMm: 22 },
};

type S75Geometry = {
  slug: string;
  label: string;
  typology: FabricacionTipologia;
  leaves: number;
  railCount: 2 | 3;
  blade: 80 | 98;
  arrangement: "simetrica" | "asimetrica" | "asimetrica_centro_ancho";
  horizontalAdjustment: number | null;
};

const GEOMETRIES: readonly S75Geometry[] = [
  { slug: "doble_riel_2h_simetrica_80", label: "Doble riel · 2 hojas simétricas · hoja 80", typology: "corredera", leaves: 2, railCount: 2, blade: 80, arrangement: "simetrica", horizontalAdjustment: 5 },
  { slug: "doble_riel_2h_simetrica_98", label: "Doble riel · 2 hojas simétricas · hoja 98", typology: "corredera", leaves: 2, railCount: 2, blade: 98, arrangement: "simetrica", horizontalAdjustment: 14 },
  { slug: "triple_riel_3h_simetrica_80", label: "Triple riel · 3 hojas simétricas · hoja 80", typology: "corredera", leaves: 3, railCount: 3, blade: 80, arrangement: "simetrica", horizontalAdjustment: 31.6333333333 },
  { slug: "triple_riel_3h_simetrica_98", label: "Triple riel · 3 hojas simétricas · hoja 98", typology: "corredera", leaves: 3, railCount: 3, blade: 98, arrangement: "simetrica", horizontalAdjustment: 43.6666666667 },
  { slug: "doble_riel_2h_asimetrica_80", label: "Doble riel · 2 hojas asimétricas · hoja 80", typology: "corredera", leaves: 2, railCount: 2, blade: 80, arrangement: "asimetrica", horizontalAdjustment: null },
  { slug: "doble_riel_2h_asimetrica_98", label: "Doble riel · 2 hojas asimétricas · hoja 98", typology: "corredera", leaves: 2, railCount: 2, blade: 98, arrangement: "asimetrica", horizontalAdjustment: null },
  { slug: "doble_riel_3h_simetrica_80", label: "Doble riel · 3 hojas simétricas · hoja 80", typology: "corredera", leaves: 3, railCount: 2, blade: 80, arrangement: "simetrica", horizontalAdjustment: 31.3333333333 },
  { slug: "doble_riel_3h_simetrica_98", label: "Doble riel · 3 hojas simétricas · hoja 98", typology: "corredera", leaves: 3, railCount: 2, blade: 98, arrangement: "simetrica", horizontalAdjustment: 43.3333333333 },
  { slug: "doble_riel_4h_80", label: "Doble riel · 4 hojas · hoja 80", typology: "corredera", leaves: 4, railCount: 2, blade: 80, arrangement: "simetrica", horizontalAdjustment: 23.5 },
  { slug: "doble_riel_4h_98", label: "Doble riel · 4 hojas · hoja 98", typology: "corredera", leaves: 4, railCount: 2, blade: 98, arrangement: "simetrica", horizontalAdjustment: 32.5 },
  { slug: "doble_riel_3h_asimetrica_centro_ancho_80", label: "Doble riel · 3 hojas asimétricas, centro ancho · hoja 80", typology: "corredera", leaves: 3, railCount: 2, blade: 80, arrangement: "asimetrica_centro_ancho", horizontalAdjustment: null },
  { slug: "doble_riel_3h_asimetrica_centro_ancho_98", label: "Doble riel · 3 hojas asimétricas, centro ancho · hoja 98", typology: "corredera", leaves: 3, railCount: 2, blade: 98, arrangement: "asimetrica_centro_ancho", horizontalAdjustment: null },
];

export type WinHouseNewS75Variant = {
  slug: string;
  geometrySlug: string;
  label: string;
  geometryLabel: string;
  typology: FabricacionTipologia;
  leaves: number;
  railCount: 2 | 3;
  blade: 80 | 98;
  glassBand: WinHouseNewS75GlassBand;
  complete: boolean;
};

export const WINHOUSE_NEW_S75_VARIANTS: readonly WinHouseNewS75Variant[] =
  GEOMETRIES.flatMap((geometry) =>
    (Object.keys(WINHOUSE_NEW_S75_GLASS_BANDS) as WinHouseNewS75GlassBand[]).map((glassBand) => ({
      slug: `${geometry.slug}_${glassBand}`,
      geometrySlug: geometry.slug,
      label: `${geometry.label} · ${WINHOUSE_NEW_S75_GLASS_BANDS[glassBand].label}`,
      geometryLabel: geometry.label,
      typology: geometry.typology,
      leaves: geometry.leaves,
      railCount: geometry.railCount,
      blade: geometry.blade,
      glassBand,
      complete: true,
    })),
  );

function makeProfile(input: {
  id: string;
  name: string;
  role: string;
  base: FabricacionComponentePerfil["reglaMedida"]["base"];
  adjustment: number;
  multiplier?: number;
  quantity: number;
  cut?: string;
  code?: string;
}): FabricacionComponentePerfil {
  return {
    id: input.id,
    codigoPerfil: input.code ?? "",
    nombrePerfil: input.name,
    funcion: input.role,
    largoComercialMm: 6000,
    reglaMedida: {
      base: input.base,
      ajusteMm: input.adjustment,
      ...(input.multiplier != null ? { multiplicador: input.multiplier } : {}),
    },
    reglaCantidad: { tipo: "fija", cantidad: input.quantity },
    requerido: true,
    ...(input.cut ? { corte: input.cut } : {}),
    observaciones: "Fórmula de la pauta oficial WinHouse New S75. Asignar el código exacto del perfil y color del taller antes de habilitar la prueba.",
  };
}

function buildGlass(variant: WinHouseNewS75Variant, createId: () => string): FabricacionVidrio {
  const geometry = GEOMETRIES.find((entry) => entry.slug === variant.geometrySlug)!;
  const horizontalBase = geometry.leaves === 4 ? "ancho_total" : "ancho_por_hoja";
  const horizontalMultiplier = geometry.leaves === 4 ? 0.25 : 1;
  const horizontalAdjustment = geometry.horizontalAdjustment ?? 0;
  const beadInset = geometry.blade === 80 ? 129 : 165;
  const paneAdjustment = horizontalAdjustment - beadInset - 8;
  const widthRule = {
    base: horizontalBase as FabricacionVidrio["reglaAncho"]["base"],
    multiplicador: horizontalMultiplier,
    ajusteMm: paneAdjustment,
  };

  return {
    id: createId(),
    nombre: `${WINHOUSE_NEW_S75_GLASS_BANDS[variant.glassBand].label} · vidrio según selección de cotización`,
    reglaAncho: widthRule,
    reglaAlto: { base: "alto_total", ajusteMm: -75 - beadInset - 8 },
    reglaCantidad: { tipo: "fija", cantidad: variant.leaves },
    requerido: false,
    observaciones: "La pauta descuenta 8 mm al largo de junquillo. La compatibilidad de espesor se enlaza al junquillo indicado por la pauta del proveedor.",
  };
}

function buildSymmetricProfiles(
  variant: WinHouseNewS75Variant,
  geometry: S75Geometry,
  createId: () => string,
): FabricacionComponentePerfil[] {
  const leaves = geometry.leaves;
  const rails = geometry.railCount;
  const horizontalBase = leaves === 4 ? "ancho_total" : "ancho_por_hoja";
  const horizontalMultiplier = leaves === 4 ? 0.25 : 1;
  const widthAdjustment = geometry.horizontalAdjustment!;
  const beadInset = geometry.blade === 80 ? 129 : 165;
  const reinforcementInset = geometry.blade === 80 ? 149 : 185;
  const frameCount = rails === 3 ? 4 : 2;
  const rows: FabricacionComponentePerfil[] = [];
  const add = (
    name: string,
    role: string,
    base: FabricacionComponentePerfil["reglaMedida"]["base"],
    adjustment: number,
    quantity: number,
    cut?: string,
    multiplier?: number,
  ) => {
    rows.push(makeProfile({ id: createId(), name, role, base, adjustment, quantity, cut, multiplier }));
  };

  add("Marco New S75", "Marco horizontal", "ancho_total", 5, 2, "45° / 45°");
  add("Marco New S75", "Marco vertical", "alto_total", 5, 2, "45° / 45°");
  add("Refuerzo de marco Box 1,2 mm", "Refuerzo marco horizontal", "ancho_total", -80, frameCount, "90° / 90°");
  add("Refuerzo de marco Box 1,2 mm", "Refuerzo marco vertical", "alto_total", -80, frameCount, "90° / 90°");
  add(`Hoja corredera ${geometry.blade} mm`, "Hoja horizontal", horizontalBase, widthAdjustment, 2 * leaves, "45° / 45°", horizontalMultiplier);
  add(`Hoja corredera ${geometry.blade} mm`, "Hoja vertical", "alto_total", -75, 2 * leaves, "45° / 45°");
  add(geometry.blade === 80 ? "Refuerzo múltiple hoja 1,2 mm" : "Refuerzo hoja 98 mm 2 mm", "Refuerzo hoja horizontal", horizontalBase, widthAdjustment - reinforcementInset, 2 * leaves, "90° / 90°", horizontalMultiplier);
  add(geometry.blade === 80 ? "Refuerzo múltiple hoja 1,2 mm" : "Refuerzo hoja 98 mm 2 mm", "Refuerzo hoja vertical", "alto_total", -75 - reinforcementInset, 2 * leaves, "90° / 90°");
  rows.push(
    makeProfile({
      id: createId(),
      name: `Junquillo hoja ${geometry.blade} mm · ${WINHOUSE_NEW_S75_GLASS_BANDS[variant.glassBand].label}`,
      role: "Junquillo horizontal",
      base: horizontalBase,
      adjustment: widthAdjustment - beadInset,
      quantity: 2 * leaves,
      cut: "45° / 45°",
      multiplier: horizontalMultiplier,
    }),
    makeProfile({
      id: createId(),
      name: `Junquillo hoja ${geometry.blade} mm · ${WINHOUSE_NEW_S75_GLASS_BANDS[variant.glassBand].label}`,
      role: "Junquillo vertical",
      base: "alto_total",
      adjustment: -75 - beadInset,
      quantity: 2 * leaves,
      cut: "45° / 45°",
    }),
  );
  add(`Traslapo hoja ${geometry.blade} mm`, "Traslapo", "alto_total", -82, leaves === 2 ? 2 : 4, "90° / 90°");
  add("Riel aluminio New S75", "Riel aluminio", "ancho_total", -97, rails, "90° / 90°");
  if (leaves === 4) add("Adaptador cuarta hoja New S75", "Adaptador cuarta hoja", "alto_total", -5, 2, "90° / 90°");
  return rows;
}

function buildAsymmetricProfiles(
  variant: WinHouseNewS75Variant,
  geometry: S75Geometry,
  createId: () => string,
): { perfiles: FabricacionComponentePerfil[]; vidrios: FabricacionVidrio[] } {
  const rows: FabricacionComponentePerfil[] = [];
  const glasses: FabricacionVidrio[] = [];
  const blade = geometry.blade;
  const glassBandLabel = WINHOUSE_NEW_S75_GLASS_BANDS[variant.glassBand].label;
  const isTwoLeafAsymmetric = geometry.leaves === 2;
  const sashBaseA: FabricacionComponentePerfil["reglaMedida"]["base"] =
    isTwoLeafAsymmetric ? "ancho_hoja_a" : "ancho_total";
  const sashBaseB: FabricacionComponentePerfil["reglaMedida"]["base"] =
    isTwoLeafAsymmetric ? "ancho_hoja_b" : "ancho_total";
  const sashMultiplierA = isTwoLeafAsymmetric ? 1 : 0.25;
  const sashMultiplierB = isTwoLeafAsymmetric ? 1 : 0.5;
  const sashCutAdjustmentA = blade === 80 ? (isTwoLeafAsymmetric ? 5 : 45) : isTwoLeafAsymmetric ? 11 : 63;
  const sashCutAdjustmentB = blade === 80 ? (isTwoLeafAsymmetric ? 5 : 5) : isTwoLeafAsymmetric ? 11 : 5;
  const beadInset = blade === 80 ? 129 : 165;
  const reinforcementInset = blade === 80 ? 149 : 185;
  const glassInset = isTwoLeafAsymmetric
    ? blade === 80 ? 135 : 175
    : blade === 80 ? 139 : 175;
  const sashVerticalAdjustment = -75;
  const glassHeightAdjustment = sashVerticalAdjustment - glassInset;
  const add = (
    name: string,
    role: string,
    base: FabricacionComponentePerfil["reglaMedida"]["base"],
    adjustment: number,
    quantity: number,
    cut?: string,
    multiplier?: number,
  ) => {
    rows.push(makeProfile({ id: createId(), name, role, base, adjustment, quantity, cut, multiplier }));
  };

  add("Marco New S75", "Marco horizontal", "ancho_total", 5, 2);
  add("Marco New S75", "Marco vertical", "alto_total", 5, 2);
  add("Refuerzo de marco Box 1,2 mm", "Refuerzo marco horizontal", "ancho_total", -80, 2);
  add("Refuerzo de marco Box 1,2 mm", "Refuerzo marco vertical", "alto_total", -80, 2);

  const addSashGroup = (label: "A" | "B" | "A/C", base: FabricacionComponentePerfil["reglaMedida"]["base"], multiplier: number, cutAdjustment: number, horizontalCount: number, verticalCount: number, glassCount: number) => {
    const sashName = `Hoja corredera ${blade} mm · ${label}`;
    const reinforcementName = blade === 80 ? "Refuerzo múltiple hoja 1,2 mm" : "Refuerzo hoja 98 mm 2 mm";
    const horizontalSash = cutAdjustment;
    add(sashName, `Hoja horizontal ${label}`, base, horizontalSash, horizontalCount, "45° / 45°", multiplier);
    add(`Hoja corredera ${blade} mm`, `Hoja vertical ${label}`, "alto_total", sashVerticalAdjustment, verticalCount, "45° / 45°");
    add(reinforcementName, `Refuerzo hoja horizontal ${label}`, base, horizontalSash - reinforcementInset, horizontalCount, "90° / 90°", multiplier);
    add(reinforcementName, `Refuerzo hoja vertical ${label}`, "alto_total", sashVerticalAdjustment - reinforcementInset, verticalCount, "90° / 90°");
    add(`Junquillo hoja ${blade} mm · ${glassBandLabel}`, `Junquillo horizontal ${label}`, base, horizontalSash - beadInset, horizontalCount, "45° / 45°", multiplier);
    add(`Junquillo hoja ${blade} mm · ${glassBandLabel}`, `Junquillo vertical ${label}`, "alto_total", sashVerticalAdjustment - beadInset, verticalCount, "45° / 45°");

    const glassWidthAdjustment = isTwoLeafAsymmetric
      ? blade === 80 ? -130 : -164
      : cutAdjustment - glassInset;
    glasses.push({
      id: createId(),
      nombre: `${glassBandLabel} · vidrio hoja ${label}`,
      reglaAncho: { base, ajusteMm: glassWidthAdjustment, multiplicador: multiplier },
      reglaAlto: { base: "alto_total", ajusteMm: glassHeightAdjustment },
      reglaCantidad: { tipo: "fija", cantidad: glassCount },
      requerido: false,
      observaciones: "Regla de vidrio transcrita desde la pestaña asimétrica correspondiente de la pauta oficial WinHouse New S75.",
    });
  };

  if (isTwoLeafAsymmetric) {
    addSashGroup("A", sashBaseA, sashMultiplierA, sashCutAdjustmentA, 2, 2, 1);
    addSashGroup("B", sashBaseB, sashMultiplierB, sashCutAdjustmentB, 2, 2, 1);
    add("Traslapo hoja 80/98 mm", "Traslapo", "alto_total", blade === 80 ? -80 : -82, 2, "90° / 90°");
  } else {
    addSashGroup("A/C", sashBaseA, sashMultiplierA, sashCutAdjustmentA, 4, 4, 2);
    addSashGroup("B", sashBaseB, sashMultiplierB, sashCutAdjustmentB, 2, 2, 1);
    add("Traslapo hoja 80/98 mm", "Traslapo", "alto_total", -82, 4, "90° / 90°");
  }
  add("Riel aluminio New S75", "Riel aluminio", "ancho_total", -97, 2, "90° / 90°");
  return { perfiles: rows, vidrios: glasses };
}

export function crearRecetaWinHouseNewS75(input: {
  lineName: string;
  variant: string;
  createId?: () => string;
}): FabricacionReceta {
  const variant = WINHOUSE_NEW_S75_VARIANTS.find((entry) => entry.slug === input.variant);
  if (!variant) throw new Error(`Variante WinHouse New S75 desconocida: ${input.variant}`);
  const geometry = GEOMETRIES.find((entry) => entry.slug === variant.geometrySlug)!;
  const createId = input.createId ?? (() => crypto.randomUUID());
  const lineName = input.lineName.trim() || "WinHouse New S75";
  const asymmetric = geometry.arrangement !== "simetrica";
  const asymmetricParts = asymmetric
    ? buildAsymmetricProfiles(variant, geometry, createId)
    : null;

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "requiere_revision",
    identidad: {
      recetaId: createId(),
      codigo: `WINHOUSE-NEW-S75-${variant.slug.toUpperCase()}-V1`,
      nombre: `${lineName} · ${variant.label}`,
      tipologia: variant.typology,
      hojas: variant.leaves,
      modulos: variant.leaves,
      apertura: "corredera",
      herraje: null,
      variante: variant.slug,
    },
    perfiles: asymmetric
      ? asymmetricParts!.perfiles
      : buildSymmetricProfiles(variant, geometry, createId),
    vidrios: asymmetric
      ? asymmetricParts!.vidrios
      : [buildGlass(variant, createId)],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: 6000,
    },
    datosPendientes: [],
    notasValidacion: [
      "Fuente primaria: pauta de corte Sliding S75 publicada por WinHouse y fichas técnicas oficiales consultadas el 2026-09-26.",
      "La pauta permite fórmulas de corte; códigos físicos de marco/hoja/riel/refuerzo dependen del perfil y color que configure cada taller.",
      "Barras comerciales de 6000 mm según WinHouse. No se importan merma, optimización, despunte ni kerf del calculador de terceros.",
      ...(geometry.leaves === 2 && geometry.arrangement === "asimetrica"
        ? ["Al cotizar, ingresar ancho A; el ancho B se calcula como ancho exterior menos A, igual que la pauta WinHouse."]
        : geometry.arrangement === "asimetrica_centro_ancho"
          ? ["Distribución oficial 3H: hojas A/C = X/4 y hoja central B = X/2."]
          : []),
      "Refuerzos adicionales condicionales por altura (contraflecha y Box inclinado) no se incorporan automáticamente; revisar las notas de fuente antes de usar sobre 2300 mm.",
      "Receta de proveedor en revisión. No equivale a validación de taller.",
    ],
  };
}
