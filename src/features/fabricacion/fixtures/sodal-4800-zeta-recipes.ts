import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionAccesorio,
  type FabricacionComponentePerfil,
  type FabricacionEvidencia,
  type FabricacionReceta,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";
import {
  SODAL_4800_CONFIRMED_RECIPE_IDS,
  type Sodal4800ConfirmedRecipeId,
} from "@/features/fabricacion/fixtures/sodal-4800-zeta-catalog";
import { normalizeConfirmedRecipe } from "@/features/fabricacion/zeta/zeta-normalize";
import {
  isTraceabilityComplete,
  resolveSidecarDatosPendientes,
} from "@/features/fabricacion/zeta/zeta-trace-enrichment";
import type { ConfirmedRecipe } from "@/features/fabricacion/zeta/zeta-types";

import monolitico_2h_1800x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/4800/monolitico_2h_1800x1500.json";
import monolitico_3h_3000x1500 from "../../../../docs/fabricacion/zeta/confirmed/sodal/4800/monolitico_3h_3000x1500.json";

export {
  SODAL_4800_CATALOG_KEY,
  SODAL_4800_CONFIRMED_RECIPE_IDS,
  isObservedSodal4800Measure,
} from "@/features/fabricacion/fixtures/sodal-4800-zeta-catalog";

export type Sodal4800RecipeBundle = {
  recipeId: Sodal4800ConfirmedRecipeId;
  sourceReference: string;
  confirmed: ConfirmedRecipe;
  definition: FabricacionReceta;
};

const CONFIRMED_RAW_BY_ID = {
  monolitico_2h_1800x1500,
  monolitico_3h_3000x1500,
} as const;

const DEFAULT_BAR_LENGTH_MM = 6000;
let idCounter = 0;

function fallbackId(): string {
  idCounter += 1;
  return `sodal-4800-${idCounter}`;
}

export function buildZeta4800SourceReference(recipeId: string): string {
  return `zeta:confirmed:sodal/4800/${recipeId}`;
}

export { isZeta4800SourceReference } from "@/features/fabricacion/fixtures/sodal-4800-zeta-catalog";

function inferProfileFunction(name: string, code: string): string {
  const haystack = `${name} ${code}`.toLowerCase();
  if (haystack.includes("riel superior")) return "Riel superior";
  if (haystack.includes("riel inferior")) return "Riel inferior";
  if (haystack.includes("jamba")) return "Jamba";
  if (haystack.includes("cabezal")) return "Cabezal de hoja";
  if (haystack.includes("zócalo") || haystack.includes("zocalo")) return "Zócalo de hoja";
  if (haystack.includes("pierna")) return "Pierna de hoja";
  if (haystack.includes("traslapo") || haystack.includes("tráslapo")) return "Traslapo de hoja";
  return name.trim() || code;
}

function formatCut(cut1: number | null, cut2: number | null): string {
  if (cut1 == null && cut2 == null) return "—";
  return `${cut1 ?? 90}°/${cut2 ?? 90}°`;
}

function mapAccessory(
  createId: () => string,
  item: ConfirmedRecipe["hardware"][number]
): FabricacionAccesorio {
  const unit = item.unit.toUpperCase();
  const normalizedUnit =
    unit === "PZA" ? "Pz" : unit === "M" ? "Mt" : unit === "TUBO" ? "Tubo" : item.unit;
  return {
    id: createId(),
    codigo: item.code,
    nombre: item.name,
    reglaCantidad: { tipo: "fija", cantidad: item.quantity },
    requerido: item.quantity > 0,
    unidad: normalizedUnit,
    clasificacion: {
      rol: unit === "M" || unit === "TUBO" ? "consumable" : "hardware",
      impactos: ["accessories"],
    },
  };
}

function buildZetaEvidence(confirmed: ConfirmedRecipe): FabricacionEvidencia | undefined {
  const source = confirmed.sourceEvidence;
  const hashes = source.artifactHashes;
  if (
    !source.runId ||
    !source.projectId ||
    !source.planId ||
    !source.rawPath ||
    !source.htmlPath ||
    !source.textPath ||
    !source.capturedAt ||
    !source.extractorVersion ||
    !hashes?.html ||
    !hashes.text ||
    !hashes.screenshots ||
    Object.keys(hashes.screenshots).length === 0 ||
    source.screenshotPaths.length === 0 ||
    !source.sourceFragments?.length
  ) {
    return undefined;
  }

  return {
    fuente: "sistema_zeta",
    runId: source.runId,
    projectId: source.projectId,
    planId: source.planId,
    rawPath: source.rawPath,
    htmlPath: source.htmlPath,
    textPath: source.textPath,
    screenshotPaths: source.screenshotPaths,
    fecha: source.capturedAt,
    extractorVersion: source.extractorVersion,
    hashes: {
      html: hashes.html,
      text: hashes.text,
      screenshots: hashes.screenshots,
    },
    sourceFragments: source.sourceFragments,
    medidasObservadas: [
      {
        anchoMm: confirmed.testDimensions.widthMm,
        altoMm: confirmed.testDimensions.heightMm,
      },
    ],
    valores: confirmed.profiles.flatMap((_, index) => [
      `perfiles[${index}].codigoPerfil`,
      `perfiles[${index}].reglaMedida`,
      `perfiles[${index}].reglaCantidad`,
    ]).map((fieldPath) => ({
      fieldPath,
      origen: fieldPath.includes("regla") ? ("observado" as const) : ("observado" as const),
      sourceFragmentId: fieldPath.startsWith("perfiles")
        ? `perfil-${fieldPath.match(/\[(\d+)\]/)?.[1] ?? "0"}`
        : null,
    })),
  };
}

function buildDefinitionFromConfirmed(input: {
  confirmed: ConfirmedRecipe;
  createId?: () => string;
  lineName?: string;
}): FabricacionReceta {
  const createId = input.createId ?? fallbackId;

  const perfiles: FabricacionComponentePerfil[] = input.confirmed.profiles.map((profile) => ({
    id: createId(),
    codigoPerfil: profile.code,
    nombrePerfil: profile.name,
    funcion: inferProfileFunction(profile.name, profile.code),
    reglaMedida: {
      base: "fijo_mm",
      valorFijoMm: profile.lengthMm,
      ajusteMm: 0,
    },
    reglaCantidad: { tipo: "fija", cantidad: profile.quantity },
    requerido: true,
    corte: formatCut(profile.cut1Deg, profile.cut2Deg),
    observaciones: `Evidencia Zeta ${input.confirmed.id} · medida observada única`,
  }));

  const vidrios: FabricacionVidrio[] = input.confirmed.glass.map((piece) => ({
    id: createId(),
    nombre: piece.name,
    reglaAncho: { base: "fijo_mm", valorFijoMm: piece.widthMm, ajusteMm: 0 },
    reglaAlto: { base: "fijo_mm", valorFijoMm: piece.heightMm, ajusteMm: 0 },
    reglaCantidad: { tipo: "fija", cantidad: piece.quantity },
    requerido: true,
    observaciones: `${piece.code} · evidencia ${input.confirmed.id}`,
  }));

  const accesorios = input.confirmed.hardware.map((item) => mapAccessory(createId, item));
  const evidencia = buildZetaEvidence(input.confirmed);
  const sidecarPending = resolveSidecarDatosPendientes(input.confirmed.id);
  const datosPendientes =
    evidencia && isTraceabilityComplete(input.confirmed.id)
      ? undefined
      : sidecarPending.length > 0
        ? sidecarPending
        : [
            "Evidencia Zeta 1:1 incompleta: run, proyecto, Plan, raw, hashes y fragmentos son obligatorios antes de activar.",
          ];

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    identidad: {
      recetaId: createId(),
      codigo: `SODAL-4800-${input.confirmed.leaves}H-MONOLITICO-ZETA-V1`,
      nombre: `L-4800 Monolítico · ${input.confirmed.leaves}H · Zeta`,
      tipologia: "corredera",
      hojas: input.confirmed.leaves,
      modulos: 1,
      apertura: "corredera",
      herraje: null,
      variante: "monolitico",
      topology: input.confirmed.topology ?? "corredera",
      hardwareMode: null,
    },
    perfiles,
    vidrios,
    accesorios,
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: DEFAULT_BAR_LENGTH_MM,
    },
    evidencia,
    datosPendientes,
    notasValidacion: [
      "Receta L-4800 derivada exclusivamente de Plan Zeta confirmado; estado testing.",
      "Solo medidas observadas: 2H 1800×1500 (PA-56) y 3H 3000×1500 (PA-54).",
      "No usar receta genérica P2A como fallback.",
      `Fuente: ${buildZeta4800SourceReference(input.confirmed.id)}`,
      input.confirmed.sourceEvidence.planId
        ? `Plan Zeta: ${input.confirmed.sourceEvidence.planId}`
        : "Plan Zeta confirmado.",
    ],
  };
}

let cachedConfirmed: Map<string, ConfirmedRecipe> | null = null;

export function loadSodal4800ConfirmedById(): Map<string, ConfirmedRecipe> {
  if (cachedConfirmed) return cachedConfirmed;
  cachedConfirmed = new Map(
    SODAL_4800_CONFIRMED_RECIPE_IDS.map((recipeId) => [
      recipeId,
      normalizeConfirmedRecipe(CONFIRMED_RAW_BY_ID[recipeId], recipeId),
    ])
  );
  return cachedConfirmed;
}

export function loadSodal4800ConfirmedRecipeById(recipeId: string): ConfirmedRecipe | null {
  return loadSodal4800ConfirmedById().get(recipeId) ?? null;
}

export function buildSodal4800Recipe(
  recipeId: Sodal4800ConfirmedRecipeId,
  options?: { createId?: () => string; lineName?: string }
): Sodal4800RecipeBundle {
  const confirmed = loadSodal4800ConfirmedRecipeById(recipeId);
  if (!confirmed) {
    throw new Error(`Receta confirmada L-4800 no encontrada: ${recipeId}`);
  }

  return {
    recipeId,
    sourceReference: buildZeta4800SourceReference(recipeId),
    confirmed,
    definition: buildDefinitionFromConfirmed({
      confirmed,
      createId: options?.createId,
      lineName: options?.lineName,
    }),
  };
}

export function buildAllSodal4800Recipes(options?: {
  createId?: () => string;
  lineName?: string;
}): Sodal4800RecipeBundle[] {
  return SODAL_4800_CONFIRMED_RECIPE_IDS.map((recipeId) =>
    buildSodal4800Recipe(recipeId, options)
  );
}
