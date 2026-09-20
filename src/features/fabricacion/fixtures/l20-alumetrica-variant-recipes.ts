import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionComponentePerfil,
  type FabricacionReceta,
  type FabricacionReglaMedida,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";

export const L20_ALUMETRICA_VARIANT_SLUGS = [
  "pierna_abierta_jamba_2009",
  "pierna_abierta",
  "pierna_cerrada_jamba_2009",
  "pierna_cerrada",
  "tp_15mm",
] as const;

export type L20AlumetricaVariantSlug = (typeof L20_ALUMETRICA_VARIANT_SLUGS)[number];

export const L20_ALUMETRICA_VARIANT_LABELS: Record<L20AlumetricaVariantSlug, string> = {
  pierna_abierta_jamba_2009: "Pierna abierta · Jamba 2009",
  pierna_abierta: "Pierna abierta",
  pierna_cerrada_jamba_2009: "Pierna cerrada · Jamba 2009",
  pierna_cerrada: "Pierna cerrada",
  tp_15mm: "TP 15 mm",
};

/** Apertura comercial Alumétrica (no confundir con tipología `pano_fijo`). */
export type L20AperturaCategoria = "corredera" | "fija";

const L20_APERTURA_BY_VARIANT: Record<L20AlumetricaVariantSlug, L20AperturaCategoria> = {
  pierna_abierta_jamba_2009: "corredera",
  pierna_abierta: "fija",
  pierna_cerrada_jamba_2009: "fija",
  pierna_cerrada: "fija",
  tp_15mm: "fija",
};

export const L20_CATALOG_KEY = "ventora:l20";
export const L20_FIJOS_CATALOG_KEY = "ventora:l20-fijos";

export const L20_CORREDERA_VARIANT_SLUGS = [
  "pierna_abierta_jamba_2009",
] as const satisfies readonly L20AlumetricaVariantSlug[];

export const L20_FIJOS_VARIANT_SLUGS = [
  "pierna_abierta",
  "pierna_cerrada_jamba_2009",
  "pierna_cerrada",
  "tp_15mm",
] as const satisfies readonly L20AlumetricaVariantSlug[];

export function isL20CatalogKey(catalogKey: string | null | undefined): boolean {
  return catalogKey === L20_CATALOG_KEY || catalogKey === L20_FIJOS_CATALOG_KEY;
}

export function resolveL20CatalogKeyForVariant(
  variant: L20AlumetricaVariantSlug | string | null | undefined,
): typeof L20_CATALOG_KEY | typeof L20_FIJOS_CATALOG_KEY {
  return resolveL20AperturaFromVariant(variant) === "corredera"
    ? L20_CATALOG_KEY
    : L20_FIJOS_CATALOG_KEY;
}

export function resolveL20AperturaForCatalogKey(
  catalogKey: string | null | undefined,
  variant?: string | null,
): L20AperturaCategoria | null {
  if (!isL20CatalogKey(catalogKey)) return null;
  if (catalogKey === L20_FIJOS_CATALOG_KEY) return "fija";
  return resolveL20AperturaFromVariant(variant) ?? "corredera";
}

export function resolveL20AperturaFromVariant(
  variant: string | null | undefined,
): L20AperturaCategoria | null {
  if (!variant) return null;
  const normalized = variant.trim().toLowerCase();
  if (normalized in L20_APERTURA_BY_VARIANT) {
    return L20_APERTURA_BY_VARIANT[normalized as L20AlumetricaVariantSlug];
  }
  if (normalized === "estandar" || normalized === "caracol" || normalized === "normal") {
    return "fija";
  }
  if (normalized.includes("pierna_abierta") && normalized.includes("2009")) {
    return "corredera";
  }
  if (
    normalized.includes("pierna_abierta") ||
    normalized.includes("pierna_cerrada") ||
    normalized.includes("tp_15")
  ) {
    return "fija";
  }
  return null;
}

export function isL20FijoVariant(variant: string | null | undefined): boolean {
  return resolveL20AperturaFromVariant(variant) === "fija";
}

export function formatL20VariantTreeGroupLabel(input: {
  apertura: L20AperturaCategoria;
  leavesCount: number;
}): string {
  const hojas = `${input.leavesCount} ${input.leavesCount === 1 ? "hoja" : "hojas"}`;
  return input.apertura === "corredera" ? `Corredera · ${hojas}` : `Fijos · ${hojas}`;
}

type ProfileSpec = {
  code: string;
  name: string;
  reglaMedida: FabricacionReglaMedida;
  quantity: number;
};

function profile(
  id: string,
  spec: ProfileSpec,
): FabricacionComponentePerfil {
  return {
    id,
    codigoPerfil: spec.code,
    nombrePerfil: spec.name,
    funcion: spec.name,
    largoComercialMm: 6000,
    reglaMedida: spec.reglaMedida,
    reglaCantidad: { tipo: "fija", cantidad: spec.quantity },
    requerido: true,
    corte: "90° / 90°",
    observaciones: "Fórmula observada en documentación Serie 20.",
  };
}

function rielSuperior(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2001",
    name: "Riel Superior",
    reglaMedida: { base: "ancho_total", ajusteMm: -12 },
    quantity: 1,
  });
}

function rielInferior(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2002",
    name: "Riel Inferior",
    reglaMedida: { base: "ancho_total", ajusteMm: -12 },
    quantity: 1,
  });
}

function jamba2009(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2009",
    name: "Jamba",
    reglaMedida: { base: "alto_total", ajusteMm: 0 },
    quantity: 2,
  });
}

function jamba2003(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2003",
    name: "Jamba pierna abierta",
    reglaMedida: { base: "alto_total", ajusteMm: 0 },
    quantity: 2,
  });
}

function cabezalHoja(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2004",
    name: "Cabezal hoja",
    reglaMedida: { base: "ancho_por_hoja", ajusteMm: -4 },
    quantity: 2,
  });
}

function zocaloHoja(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2005",
    name: "Zócalo hoja",
    reglaMedida: { base: "ancho_por_hoja", ajusteMm: -4 },
    quantity: 2,
  });
}

function piernaAbierta2006(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2006",
    name: "Pierna abierta",
    reglaMedida: { base: "alto_total", ajusteMm: -28 },
    quantity: 2,
  });
}

function piernaCerrada2010(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2010",
    name: "Pierna",
    reglaMedida: { base: "alto_total", ajusteMm: -28 },
    quantity: 2,
  });
}

function traslapo2019(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2019",
    name: "Traslapo",
    reglaMedida: { base: "alto_total", ajusteMm: -28 },
    quantity: 2,
  });
}

function zocaloTp2018(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2018",
    name: "Zócalo / Cabezal TP",
    reglaMedida: { base: "ancho_por_hoja", ajusteMm: -4 },
    quantity: 4,
  });
}

function piernaTp2020(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2020",
    name: "Pierna abierta TP",
    reglaMedida: { base: "ancho_por_hoja", ajusteMm: -28 },
    quantity: 2,
  });
}

function traslapoTp2016(id: string): FabricacionComponentePerfil {
  return profile(id, {
    code: "2016",
    name: "Traslapo TP",
    reglaMedida: { base: "ancho_por_hoja", ajusteMm: -28 },
    quantity: 2,
  });
}

function buildCommonGlass(id: string): FabricacionVidrio {
  return {
    id,
    nombre: "Vidrio",
    reglaAncho: { base: "ancho_por_hoja", ajusteMm: -57 },
    reglaAlto: { base: "alto_total", ajusteMm: -101 },
    reglaCantidad: { tipo: "fija", cantidad: 2 },
    requerido: false,
    observaciones: "Fórmula común Serie 20: ancho X/2−57, alto Y−101; mono y termopanel.",
  };
}

function buildProfilesForVariant(
  variant: L20AlumetricaVariantSlug,
  createId: () => string,
): FabricacionComponentePerfil[] {
  const next = () => createId();
  switch (variant) {
    case "pierna_abierta_jamba_2009":
      return [
        rielSuperior(next()),
        rielInferior(next()),
        jamba2009(next()),
        cabezalHoja(next()),
        zocaloHoja(next()),
        piernaAbierta2006(next()),
        traslapo2019(next()),
      ];
    case "pierna_abierta":
      return [
        rielSuperior(next()),
        rielInferior(next()),
        jamba2003(next()),
        cabezalHoja(next()),
        zocaloHoja(next()),
        piernaAbierta2006(next()),
        traslapo2019(next()),
      ];
    case "pierna_cerrada_jamba_2009":
    case "pierna_cerrada":
      return [
        rielSuperior(next()),
        rielInferior(next()),
        jamba2009(next()),
        cabezalHoja(next()),
        zocaloHoja(next()),
        piernaCerrada2010(next()),
        traslapo2019(next()),
      ];
    case "tp_15mm":
      return [
        rielSuperior(next()),
        rielInferior(next()),
        jamba2009(next()),
        cabezalHoja(next()),
        zocaloTp2018(next()),
        piernaTp2020(next()),
        traslapoTp2016(next()),
      ];
    default:
      return [];
  }
}

export function crearRecetaL20AlumetricaVariant(input: {
  variant: L20AlumetricaVariantSlug;
  lineName: string;
  createId?: () => string;
}): FabricacionReceta {
  const createId = input.createId ?? (() => crypto.randomUUID());
  const label = L20_ALUMETRICA_VARIANT_LABELS[input.variant];
  const lineName = input.lineName.trim() || "Serie 20";
  const recipeId = createId();
  const apertura = L20_APERTURA_BY_VARIANT[input.variant];
  const categoryLabel = apertura === "corredera" ? "Corredera" : "Fijos";

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    identidad: {
      recetaId: recipeId,
      codigo: `L20-2H-${input.variant.toUpperCase()}-V1`,
      nombre: `${lineName} · ${categoryLabel} 2 hojas · ${label}`,
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      apertura,
      herraje: null,
      variante: input.variant,
    },
    perfiles: buildProfilesForVariant(input.variant, createId),
    vidrios: [buildCommonGlass(createId())],
    accesorios: [],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
    },
    datosPendientes:
      input.variant === "pierna_cerrada_jamba_2009"
        ? ["Confirmar evidencia física completa en taller"]
        : ["Confirmar evidencia física completa en taller", "Confirmar accesorios"],
    notasValidacion: [
      `Construcción ${label}.`,
      "Fórmulas de corte según documentación 2026-09-20; validar con fabricación real del taller.",
    ],
  };
}

export function isL20AlumetricaVariantSlug(
  value: string | null | undefined,
): value is L20AlumetricaVariantSlug {
  return L20_ALUMETRICA_VARIANT_SLUGS.includes(value as L20AlumetricaVariantSlug);
}
