import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionAccesorio,
  type FabricacionComponentePerfil,
  type FabricacionEvidencia,
  type FabricacionReceta,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";
import {
  SODAL_L25_CONTRATO_TECNICO,
  resolveSodalL25IdentityFromRecipeId,
  SODAL_L25_CANONICAL_RECIPE_IDS,
  SODAL_L25_FAMILIES,
  type SodalL25Identity,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { formatSodalL25FullRecipeName } from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import {
  isTraceabilityComplete,
  resolveSidecarDatosPendientes,
} from "@/features/fabricacion/zeta/zeta-trace-enrichment";
import { deriveFormulasFromConfirmedFamily } from "@/features/fabricacion/zeta/zeta-formula-derivation";
import {
  buildZetaSourceReference,
  loadConfirmedRecipesById,
  type ConfirmedRecipeId,
} from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import type { ConfirmedRecipe } from "@/features/fabricacion/zeta/zeta-types";

export {
  buildSodalL25VariantSlug,
  SODAL_L25_CATALOG_KEY,
  SODAL_L25_CANONICAL_RECIPE_IDS,
  SODAL_L25_EXTRA_GEOMETRY_TEST_IDS,
  SODAL_L25_GATE_TEST_IDS,
  SODAL_L25_FAMILIES,
  parseSodalL25VariantSlug,
  resolveCanonicalRecipeIdForIdentity,
  resolveSodalL25IdentityFromRecipeId,
  isValidSodalL25Combination,
  type SodalL25GlazingSlug,
  type SodalL25LegSlug,
  type SodalL25ReinforcementSlug,
  type SodalL25Identity,
  type SodalL25FamilyConfig,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";

export type SodalL25RecipeBundle = {
  recipeId: ConfirmedRecipeId;
  sourceReference: string;
  identity: SodalL25Identity;
  confirmed: ConfirmedRecipe;
  definition: FabricacionReceta;
};

const DEFAULT_BAR_LENGTH_MM = 6000;
let idCounter = 0;

function fallbackId(): string {
  idCounter += 1;
  return `sodal-l25-${idCounter}`;
}

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
    reglaCantidad: { tipo: "fija", cantidad: Math.max(1, Math.round(item.quantity)) },
    requerido: item.quantity > 0,
    unidad: normalizedUnit,
    clasificacion: (() => {
      const haystack = `${item.code} ${item.name}`.toLowerCase();
      const rol = haystack.includes("burlete") || haystack.includes("felpa")
        ? "seal"
        : unit === "M" || unit === "TUBO"
          ? "consumable"
          : "hardware";
      return { rol, impactos: ["accessories"] };
    })(),
  };
}

function buildDefinitionFromConfirmed(input: {
  confirmed: ConfirmedRecipe;
  identity: SodalL25Identity;
  evidenceRecipeIds: ConfirmedRecipeId[];
  createId?: () => string;
  lineName?: string;
}): FabricacionReceta {
  const createId = input.createId ?? fallbackId;
  const confirmedById = loadConfirmedRecipesById();
  const { profileRules, glassRules } = deriveFormulasFromConfirmedFamily({
    canonicalRecipeId: input.confirmed.id,
    evidenceRecipeIds: input.evidenceRecipeIds,
    confirmedById,
  });

  const perfiles: FabricacionComponentePerfil[] = input.confirmed.profiles.map(
    (profile, index) => ({
      id: createId(),
      codigoPerfil: profile.code,
      nombrePerfil: profile.name,
      funcion: inferProfileFunction(profile.name, profile.code),
      reglaMedida: profileRules[index]!,
      reglaCantidad: { tipo: "fija", cantidad: profile.quantity },
      requerido: true,
      corte: formatCut(profile.cut1Deg, profile.cut2Deg),
      observaciones: `Evidencia Zeta ${input.confirmed.id}`,
    })
  );

  const vidrios: FabricacionVidrio[] = input.confirmed.glass.map((piece, index) => ({
    id: createId(),
    nombre: piece.name,
    reglaAncho: glassRules[index]!.width,
    reglaAlto: glassRules[index]!.height,
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
      codigo: `SODAL-L25-${input.identity.leaves}H-${input.identity.variantSlug.toUpperCase()}-ZETA-V1`,
      nombre: formatSodalL25FullRecipeName({
        leaves: input.identity.leaves,
        glazing: input.identity.glazing,
        leg: input.identity.leg,
        reinforcement: input.identity.reinforcement,
      }),
      tipologia: "corredera",
      hojas: input.identity.leaves,
      modulos: 1,
      apertura: "corredera",
      herraje: null,
      variante: input.identity.variantSlug,
      topology: "corredera",
      hardwareMode: null,
    },
    perfiles,
    vidrios,
    accesorios,
    contratoTecnico: SODAL_L25_CONTRATO_TECNICO,
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: DEFAULT_BAR_LENGTH_MM,
    },
    evidencia,
    datosPendientes,
    notasValidacion: [
      "Documentación SODAL L25 confirmada contra Sistema Zeta; no equivale a validación de taller.",
      "La receta permanece en prueba hasta completar evidencia 1:1 y validación explícita del taller.",
      `Fuente: ${buildZetaSourceReference(input.confirmed.id)}`,
      input.confirmed.sourceEvidence.planId
        ? `Plan Zeta: ${input.confirmed.sourceEvidence.planId}`
        : "Plan Zeta confirmado.",
      `Fórmulas: ${SODAL_L25_FORMULA_VERSION}`,
    ],
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

  const valores = [
    "identidad.linea",
    "identidad.hojas",
    "identidad.variante",
    "identidad.modulos",
    ...confirmed.profiles.flatMap((_, index) => [
      `perfiles[${index}].codigoPerfil`,
      `perfiles[${index}].nombrePerfil`,
      `perfiles[${index}].reglaMedida`,
      `perfiles[${index}].reglaCantidad`,
      `perfiles[${index}].funcion`,
    ]),
    ...confirmed.glass.flatMap((_, index) => [
      `vidrios[${index}].reglaAncho`,
      `vidrios[${index}].reglaAlto`,
      `vidrios[${index}].reglaCantidad`,
    ]),
    ...confirmed.hardware.map((_, index) => `accesorios[${index}].reglaCantidad`),
  ].map((fieldPath) => ({
    fieldPath,
    origen: /funcion|reglaMedida|reglaAncho|reglaAlto/.test(fieldPath)
      ? "derivado" as const
      : fieldPath === "identidad.modulos"
        ? "asumido" as const
        : "observado" as const,
    sourceFragmentId:
      fieldPath.startsWith("perfiles[")
        ? `perfil-${fieldPath.match(/^perfiles\[(\d+)\]/)?.[1] ?? "0"}`
        : fieldPath.startsWith("vidrios[")
          ? `vidrio-${fieldPath.match(/^vidrios\[(\d+)\]/)?.[1] ?? "0"}`
          : fieldPath.startsWith("accesorios[")
            ? `accesorio-${fieldPath.match(/^accesorios\[(\d+)\]/)?.[1] ?? "0"}`
            : "identidad",
  }));

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
    valores,
  };
}

export function buildSodalL25Recipe(
  recipeId: ConfirmedRecipeId,
  options?: { createId?: () => string; lineName?: string }
): SodalL25RecipeBundle {
  const confirmedById = loadConfirmedRecipesById();
  const confirmed = confirmedById.get(recipeId);
  if (!confirmed) {
    throw new Error(`Receta confirmada no encontrada: ${recipeId}`);
  }

  const identity = resolveSodalL25IdentityFromRecipeId(recipeId);
  if (!identity) {
    throw new Error(`Receta ${recipeId} no es canónica SODAL L25.`);
  }

  const family = SODAL_L25_FAMILIES.find((entry) =>
    Object.values(entry.canonicalByLeaves).includes(recipeId)
  );
  if (!family) {
    throw new Error(`Familia no encontrada para ${recipeId}.`);
  }

  const evidenceRecipeIds = [
    recipeId,
    ...(family.extraEvidenceByLeaves[identity.leaves] ?? []),
  ];

  return {
    recipeId,
    sourceReference: buildZetaSourceReference(recipeId),
    identity,
    confirmed,
    definition: buildDefinitionFromConfirmed({
      confirmed,
      identity,
      evidenceRecipeIds,
      createId: options?.createId,
      lineName: options?.lineName,
    }),
  };
}

let cachedBundles: SodalL25RecipeBundle[] | null = null;

/** Invalida cache en tests o tras cambios de trazabilidad. */
export function resetSodalL25RecipeCacheForTests(): void {
  cachedBundles = null;
}

export function buildAllSodalL25Recipes(options?: {
  createId?: () => string;
  lineName?: string;
}): SodalL25RecipeBundle[] {
  if (cachedBundles && !options?.createId && !options?.lineName) {
    return cachedBundles;
  }
  const bundles = SODAL_L25_CANONICAL_RECIPE_IDS.map((recipeId) =>
    buildSodalL25Recipe(recipeId, options)
  );
  if (!options?.createId && !options?.lineName) {
    cachedBundles = bundles;
  }
  return bundles;
}

export function findSodalL25BundleForTestEvidence(
  evidenceRecipeId: ConfirmedRecipeId
): SodalL25RecipeBundle | null {
  for (const family of SODAL_L25_FAMILIES) {
    const canonicalMatch = Object.values(family.canonicalByLeaves).find(
      (canonicalId) => canonicalId === evidenceRecipeId
    );
    if (canonicalMatch) {
      return buildSodalL25Recipe(canonicalMatch);
    }

    for (const [leavesRaw, extraIds] of Object.entries(family.extraEvidenceByLeaves)) {
      if (!extraIds?.includes(evidenceRecipeId)) continue;
      const leaves = Number(leavesRaw) as 2 | 3 | 4;
      const canonicalId = family.canonicalByLeaves[leaves];
      if (canonicalId) {
        return buildSodalL25Recipe(canonicalId);
      }
    }
  }
  return null;
}
