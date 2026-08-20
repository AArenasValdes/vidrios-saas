import { matchSuggestedTemplateIdByLineName } from "@/features/cotizaciones/line-templates/types/fabrication-recipe-commercial-templates";
import {
  COMMERCIAL_TEMPLATE_PROFILE_CATALOG,
  type CommercialProfileFunction,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe-commercial-templates";
import type { PlantillaVentoraCorrederaId } from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  createTallerPerfilRef,
  type TallerPerfilRef,
} from "@/features/fabricacion/services/taller-perfiles.service";
import { resolveProcedenciaFromSource } from "@/features/fabricacion/types/fabricacion-receta-procedencia";
import type {
  FabricacionComponentePerfil,
  FabricacionReceta,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeSourceType } from "@/features/fabricacion/types/fabricacion-persistence";

const FUNCTION_KEY_BY_LABEL: Record<string, CommercialProfileFunction> = {
  "riel superior": "riel_superior",
  "riel inferior": "riel_inferior",
  jamba: "jamba",
  cabezal: "cabezal",
  zocalo: "zocalo",
  pierna: "pierna",
  traslapo: "traslapo",
};

function normalizeFunctionLabel(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function isPlantillaVentoraId(value: string): value is PlantillaVentoraCorrederaId {
  return value === "L5000" || value === "L20" || value === "L25";
}

function plantillaIdFromSuggestedTemplateId(
  templateId: string | null
): PlantillaVentoraCorrederaId | null {
  if (!templateId) return null;
  const normalized = templateId.toLocaleLowerCase("es");
  if (normalized.includes("l5000") || normalized.includes("5000")) return "L5000";
  if (/\bl20\b/.test(normalized)) return "L20";
  if (/\bl25\b/.test(normalized)) return "L25";
  return null;
}

function plantillaIdFromRecipeText(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const match = value.match(/referencia\s+(L5000|L20|L25)\b/i);
  if (match?.[1] && isPlantillaVentoraId(match[1].toUpperCase())) {
    return match[1].toUpperCase() as PlantillaVentoraCorrederaId;
  }
  return plantillaIdFromSuggestedTemplateId(matchSuggestedTemplateIdByLineName(value));
}

export function resolvePlantillaVentoraIdForRecipe(input: {
  sourceType?: FabricationRecipeSourceType;
  sourceReference?: string | null;
  lineName?: string | null;
  receta?: FabricacionReceta;
}): PlantillaVentoraCorrederaId | null {
  const procedencia = resolveProcedenciaFromSource({
    sourceType: input.sourceType ?? "manual",
    sourceReference: input.sourceReference,
  });
  if (procedencia.plantillaId && isPlantillaVentoraId(procedencia.plantillaId)) {
    // #region agent log
    fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "b7371a",
      },
      body: JSON.stringify({
        sessionId: "b7371a",
        runId: "pre-fix",
        hypothesisId: "A",
        location: "fabricacion-receta-codigos.service.ts:resolvePlantilla",
        message: "plantilla resuelta por procedencia",
        data: {
          plantillaId: procedencia.plantillaId,
          sourceType: input.sourceType ?? "manual",
          sourceReference: input.sourceReference ?? null,
          lineName: input.lineName ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return procedencia.plantillaId;
  }

  const fromLine = plantillaIdFromRecipeText(input.lineName);
  if (fromLine) {
    // #region agent log
    fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "b7371a",
      },
      body: JSON.stringify({
        sessionId: "b7371a",
        runId: "pre-fix",
        hypothesisId: "A",
        location: "fabricacion-receta-codigos.service.ts:resolvePlantilla",
        message: "plantilla resuelta por lineName",
        data: { plantillaId: fromLine, lineName: input.lineName ?? null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return fromLine;
  }

  if (input.receta) {
    const fromIdentity = plantillaIdFromRecipeText(input.receta.identidad.nombre);
    if (fromIdentity) return fromIdentity;

    for (const profile of input.receta.perfiles) {
      const fromObservations = plantillaIdFromRecipeText(profile.observaciones);
      if (fromObservations) return fromObservations;
    }

    for (const note of input.receta.notasValidacion ?? []) {
      const fromNote = plantillaIdFromRecipeText(note);
      if (fromNote) return fromNote;
    }
  }

  // #region agent log
  fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "b7371a",
    },
    body: JSON.stringify({
      sessionId: "b7371a",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "fabricacion-receta-codigos.service.ts:resolvePlantilla",
      message: "plantilla NO resuelta",
      data: {
        sourceType: input.sourceType ?? "manual",
        sourceReference: input.sourceReference ?? null,
        lineName: input.lineName ?? null,
        profileCount: input.receta?.perfiles.length ?? 0,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return null;
}

export function enriquecerCodigosPerfilPlantillaVentora(
  receta: FabricacionReceta,
  plantillaId: PlantillaVentoraCorrederaId
): FabricacionReceta {
  const catalog = COMMERCIAL_TEMPLATE_PROFILE_CATALOG[plantillaId];
  if (!catalog) return receta;

  let changed = false;
  const perfiles = receta.perfiles.map((profile) => {
    if (profile.codigoPerfil.trim()) return profile;

    const functionKey =
      FUNCTION_KEY_BY_LABEL[normalizeFunctionLabel(profile.funcion)] ?? null;
    const defaultOption = functionKey ? catalog.defaults[functionKey] : undefined;
    if (!defaultOption?.code) return profile;

    changed = true;
    return {
      ...profile,
      codigoPerfil: defaultOption.code,
      nombrePerfil: profile.nombrePerfil.trim() || defaultOption.label || profile.funcion,
      datosPendientes: (profile.datosPendientes ?? []).filter(
        (detail) => !/confirmar codigo/i.test(detail)
      ),
    };
  });

  return changed ? { ...receta, perfiles } : receta;
}

export function profileManufacturerCodeLabel(
  profile: Pick<FabricacionComponentePerfil, "codigoPerfil">
): string {
  return profile.codigoPerfil.trim();
}

export function recipeProfileCodesComplete(receta: FabricacionReceta) {
  return receta.perfiles.every((profile) => profile.codigoPerfil.trim());
}

export function buildPlantillaSuggestedPerfilRefs(
  plantillaId: PlantillaVentoraCorrederaId
): TallerPerfilRef[] {
  const catalog = COMMERCIAL_TEMPLATE_PROFILE_CATALOG[plantillaId];
  return Object.values(catalog.defaults).map((option) =>
    createTallerPerfilRef({
      id: `plantilla-${plantillaId.toLowerCase()}-${option.code}`,
      nombre: option.label,
      codigoComercial: option.code,
    })
  );
}

export function enriquecerCodigosPerfilRecetaFabricacion(input: {
  receta: FabricacionReceta;
  sourceType?: FabricationRecipeSourceType;
  sourceReference?: string | null;
  lineName?: string | null;
}): FabricacionReceta {
  const plantillaId = resolvePlantillaVentoraIdForRecipe({
    sourceType: input.sourceType,
    sourceReference: input.sourceReference,
    lineName: input.lineName,
    receta: input.receta,
  });
  if (!plantillaId) return input.receta;
  const enriched = enriquecerCodigosPerfilPlantillaVentora(input.receta, plantillaId);
  // #region agent log
  fetch("http://127.0.0.1:7423/ingest/e8861e2e-aed2-43f9-92a4-d0c0e41b1a08", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "b7371a",
    },
    body: JSON.stringify({
      sessionId: "b7371a",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "fabricacion-receta-codigos.service.ts:enriquecerReceta",
      message: "enriquecimiento receta",
      data: {
        plantillaId,
        lineName: input.lineName ?? null,
        beforeCodes: input.receta.perfiles.map((p) => ({
          funcion: p.funcion,
          codigo: p.codigoPerfil,
        })),
        afterCodes: enriched.perfiles.map((p) => ({
          funcion: p.funcion,
          codigo: p.codigoPerfil,
        })),
        changed: enriched !== input.receta,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return enriched;
}
