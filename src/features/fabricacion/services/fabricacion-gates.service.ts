import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { fabricacionSnapshotToLegacyCubicationSnapshot } from "@/features/fabricacion/services/fabricacion-snapshot-adapter.service";
import { resolverRecetaFabricacionCompatible } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import type {
  FabricacionReceta,
  FabricacionResultadoCubicacion,
} from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeTestRecord,
} from "@/features/fabricacion/types/fabricacion-persistence";

export const FABRICACION_GATE_IDS = [
  "source_exact",
  "distinct_geometry",
  "role_invariants",
  "resolver_unique",
  "snapshot_despiece_pauta_e2e",
  "accessories_hardware_classified",
] as const;

export type FabricacionGateId = (typeof FABRICACION_GATE_IDS)[number];

export type FabricacionGateResult = {
  id: FabricacionGateId;
  passed: boolean;
  message: string;
};

export type FabricacionGatesEvaluation = {
  passed: boolean;
  gates: FabricacionGateResult[];
};

export type FabricacionGateInput = {
  recipe: FabricacionReceta;
  record?: FabricationRecipeRecord | null;
  tests: FabricationRecipeTestRecord[];
  candidateRecipes?: FabricationRecipeRecord[];
};

function gate(id: FabricacionGateId, passed: boolean, message: string): FabricacionGateResult {
  return { id, passed, message };
}

function outputForTest(test: FabricationRecipeTestRecord): FabricacionResultadoCubicacion {
  return test.actualOutput ?? test.expectedOutput;
}

function roleInvariantPasses(input: {
  recipe: FabricacionReceta;
  tests: FabricationRecipeTestRecord[];
}): boolean {
  const passed = input.tests.filter(
    (test) => test.isRequired !== false && test.passed && outputForTest(test).calculable
  );
  for (let leftIndex = 0; leftIndex < passed.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < passed.length; rightIndex += 1) {
      const left = passed[leftIndex]!;
      const right = passed[rightIndex]!;
      const widthChanged = left.input.anchoTotalMm !== right.input.anchoTotalMm;
      const heightChanged = left.input.altoTotalMm !== right.input.altoTotalMm;
      if (!widthChanged && !heightChanged) continue;

      const leftOutput = outputForTest(left);
      const rightOutput = outputForTest(right);

      if (widthChanged && left.input.altoTotalMm === right.input.altoTotalMm) {
        for (const profile of input.recipe.perfiles) {
          const role = profile.reglaMedida.base;
          const leftRow = leftOutput.perfiles.find((row) => row.componenteId === profile.id);
          const rightRow = rightOutput.perfiles.find((row) => row.componenteId === profile.id);
          if (!leftRow || !rightRow) return false;
          const shouldRemainEqual =
            role === "alto_total" || role === "alto_por_hoja" || role === "fijo_mm";
          if (shouldRemainEqual && leftRow.medidaMm !== rightRow.medidaMm) return false;
          if (!shouldRemainEqual && leftRow.medidaMm === rightRow.medidaMm) return false;
        }
        for (const glass of input.recipe.vidrios) {
          const leftPiece = leftOutput.vidrios.find((row) => row.vidrioId === glass.id);
          const rightPiece = rightOutput.vidrios.find((row) => row.vidrioId === glass.id);
          if (!leftPiece || !rightPiece) return false;
          if (leftPiece.altoMm !== rightPiece.altoMm) return false;
          const widthRole = glass.reglaAncho.base;
          const widthDependsOnWidth =
            widthRole === "ancho_total" ||
            widthRole === "ancho_modulo" ||
            widthRole === "ancho_por_hoja";
          if (widthDependsOnWidth && leftPiece.anchoMm === rightPiece.anchoMm) return false;
          if (!widthDependsOnWidth && leftPiece.anchoMm !== rightPiece.anchoMm) return false;
        }
      }

      if (heightChanged && left.input.anchoTotalMm === right.input.anchoTotalMm) {
        for (const profile of input.recipe.perfiles) {
          const role = profile.reglaMedida.base;
          const leftRow = leftOutput.perfiles.find((row) => row.componenteId === profile.id);
          const rightRow = rightOutput.perfiles.find((row) => row.componenteId === profile.id);
          if (!leftRow || !rightRow) return false;
          const shouldRemainEqual =
            role === "ancho_total" || role === "ancho_modulo" || role === "ancho_por_hoja" || role === "fijo_mm";
          if (shouldRemainEqual && leftRow.medidaMm !== rightRow.medidaMm) return false;
          if (!shouldRemainEqual && leftRow.medidaMm === rightRow.medidaMm) return false;
        }
        for (const glass of input.recipe.vidrios) {
          const leftPiece = leftOutput.vidrios.find((row) => row.vidrioId === glass.id);
          const rightPiece = rightOutput.vidrios.find((row) => row.vidrioId === glass.id);
          if (!leftPiece || !rightPiece) return false;
          if (leftPiece.anchoMm !== rightPiece.anchoMm) return false;
          const heightRole = glass.reglaAlto.base;
          const heightDependsOnHeight =
            heightRole === "alto_total" ||
            heightRole === "alto_modulo" ||
            heightRole === "alto_por_hoja";
          if (heightDependsOnHeight && leftPiece.altoMm === rightPiece.altoMm) return false;
          if (!heightDependsOnHeight && leftPiece.altoMm !== rightPiece.altoMm) return false;
        }
      }
      return true;
    }
  }
  return false;
}

function hasExactSource(input: FabricacionGateInput): boolean {
  const reference = input.record?.sourceReference?.trim() ?? "";
  const sourceType = input.record?.sourceType;
  return Boolean(reference) && sourceType != null && sourceType !== "unknown" && sourceType !== "manual";
}

function hasDeclaredContract(input: FabricacionGateInput): boolean {
  const contract = input.recipe.contratoTecnico;
  if (!contract || contract.discriminadoresObligatorios.length === 0) return false;
  const identity = input.recipe.identidad;
  const values: Record<string, unknown> = {
    lineTemplateId: input.record?.lineTemplateId,
    typology: identity.tipologia,
    topology: identity.topology ?? contract.topology,
    hardwareMode: identity.hardwareMode ?? contract.hardwareMode,
    leaves: identity.hojas,
    hojas: identity.hojas,
    modulos: identity.modulos,
    apertura: identity.apertura,
    herraje: identity.herraje,
    variante: identity.variante,
    glazing: identity.variante.includes("dvh") ? "dvh" : identity.variante.includes("monolithic") ? "monolithic" : null,
    leg: identity.variante.includes("open") ? "open" : identity.variante.includes("closed") ? "closed" : null,
    reinforcement: identity.variante.includes("reinforced") ? "reinforced" : identity.variante.includes("normal") ? "normal" : null,
  };
  return contract.discriminadoresObligatorios.every((key) => {
    const value = values[key];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
}

function resolveUnique(input: FabricacionGateInput): boolean {
  if (!input.record) return false;
  const candidates = [
    ...(input.candidateRecipes ?? []).filter((recipe) => recipe.id !== input.record!.id),
    { ...input.record, status: "validated" as const },
  ].filter((recipe) => recipe.status !== "archived" && recipe.eliminadoEn == null);
  if (input.record.lineTemplateId == null) return false;
  const identity = input.record.definition.identidad;
  const resolution = resolverRecetaFabricacionCompatible(candidates, {
    organizationId: input.record.organizationId,
    lineTemplateId: input.record.lineTemplateId,
    tipologia: identity.tipologia,
    hojas: identity.hojas,
    modulos: identity.modulos,
    apertura: identity.apertura,
    variante: identity.variante,
    topology: identity.topology,
    hardwareMode: identity.hardwareMode,
    allowPreliminaryNonValidated: false,
  });
  return resolution.estado === "receta_unica" && resolution.receta.id === input.record.id;
}

function endToEndPasses(input: FabricacionGateInput): boolean {
  if (!input.record) return false;
  const first = input.tests.find(
    (test) => test.isRequired !== false && test.passed && outputForTest(test).calculable
  );
  if (!first) return false;
  const snapshot = construirSnapshotFabricacionCotizacion({
    recipe: input.record,
    entrada: first.input,
  });
  const despiece = fabricacionSnapshotToLegacyCubicationSnapshot(snapshot);
  return (
    snapshot.result.calculable &&
    snapshot.pauta.length > 0 &&
    Boolean(snapshot.pautaBarras?.calculable) &&
    (snapshot.pautaBarras?.barras.length ?? 0) > 0 &&
    despiece.cuts.length > 0
  );
}

function accessoriesAreClassified(recipe: FabricacionReceta): boolean {
  return recipe.accesorios.every(
    (accessory) =>
      accessory.clasificacion != null && accessory.clasificacion.rol.length > 0 && accessory.clasificacion.impactos.length > 0
  );
}

export function evaluarGatesRecetaFabricacion(
  input: FabricacionGateInput
): FabricacionGatesEvaluation {
  const requiredTests = input.tests.filter((test) => test.isRequired !== false);
  const passedTests = requiredTests.filter((test) => test.passed);
  const dimensions = new Set(
    passedTests.map((test) => `${test.input.anchoTotalMm}x${test.input.altoTotalMm}`)
  );

  const gates = [
    gate(
      "source_exact",
      hasExactSource(input) && hasDeclaredContract(input),
      hasExactSource(input) && hasDeclaredContract(input)
        ? "Fuente exacta y discriminadores obligatorios declarados."
        : "Falta fuente exacta o contrato técnico con discriminadores obligatorios."
    ),
    gate(
      "distinct_geometry",
      dimensions.size >= 2,
      dimensions.size >= 2
        ? "Hay al menos dos geometrías distintas aprobadas."
        : "Se requieren al menos dos geometrías distintas aprobadas."
    ),
    gate(
      "role_invariants",
      roleInvariantPasses({ recipe: input.recipe, tests: input.tests }),
      roleInvariantPasses({ recipe: input.recipe, tests: input.tests })
        ? "Las invariantes de ancho y alto coinciden con el rol de cada regla."
        : "Las invariantes de ancho y alto no están demostradas para los roles observados."
    ),
    gate(
      "resolver_unique",
      resolveUnique(input),
      resolveUnique(input)
        ? "El resolver encuentra una sola receta para la identidad técnica."
        : "La identidad técnica es ambigua o no está disponible para comprobar unicidad."
    ),
    gate(
      "snapshot_despiece_pauta_e2e",
      endToEndPasses(input),
      endToEndPasses(input)
        ? "Snapshot, despiece y pauta generan salida calculable."
        : "La cadena snapshot–despiece–pauta no genera una salida calculable completa."
    ),
    gate(
      "accessories_hardware_classified",
      accessoriesAreClassified(input.recipe),
      accessoriesAreClassified(input.recipe)
        ? "Todos los accesorios tienen rol e impacto técnico explícitos."
        : "Hay accesorios o herrajes sin clasificación técnica explícita."
    ),
  ];

  return { passed: gates.every((entry) => entry.passed), gates };
}

export function getFailedFabricacionGates(evaluation: FabricacionGatesEvaluation) {
  return evaluation.gates.filter((entry) => !entry.passed);
}
