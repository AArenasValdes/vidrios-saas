import type { FabricacionConfiguracionCorte } from "@/features/fabricacion/types/fabricacion-domain";

export type FabricacionParametrosCorteConfirmados = {
  perdidaCorteMm: number;
  despunteInicialMm: number;
  procedimiento: "por_pieza";
  fuente: string;
  largosComercialesConfirmados: boolean;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  organizationId?: number | null;
};

export type FabricacionParametrosCorteAplicados = {
  perdidaCorteMm: number | null;
  despunteInicialMm: number | null;
  sobranteMinimoAprovechableMm: number | null;
  procedure: "por_pieza" | null;
  source: "job_override" | "organization" | "recipe" | "unknown";
  sourceLabel: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  organizationId: number | null;
  /** Solo el largo comercial documentado por receta/perfil puede confirmar esta condición. */
  largosComercialesConfirmados: boolean;
};

/**
 * Resolves a quote item's material without treating the presentation decoder's
 * legacy Aluminio default as explicit evidence for a private line.
 */
export function resolveFabricationMaterialForQuoteItem(input: {
  catalogMaterial?: string | null;
  observations?: string | null;
}): string | null {
  if (input.catalogMaterial?.trim()) return input.catalogMaterial.trim();

  const explicitMaterial = input.observations?.match(/\[m:(Aluminio|PVC|Cristal)\]/)?.[1];
  return explicitMaterial ?? null;
}

export function filtrarParametrosCortePorOrganizacion(
  settings: FabricacionParametrosCorteConfirmados | null | undefined,
  organizationId: number | null | undefined
): FabricacionParametrosCorteConfirmados | null {
  if (!settings || typeof organizationId !== "number" || !Number.isSafeInteger(organizationId) || organizationId <= 0 ||
      settings.organizationId !== organizationId) return null;
  return settings;
}

export function debeAplicarParametrosDeTaller(input: {
  isNewQuote: boolean;
  catalogMaterial?: string | null;
}): boolean {
  return input.isNewQuote && input.catalogMaterial === "Aluminio";
}

function isCompleteRecipeConfiguration(
  value: FabricacionConfiguracionCorte | null | undefined
): value is FabricacionConfiguracionCorte & {
  perdidaCorteMm: number;
  despunteInicialMm: number;
} {
  return Number.isFinite(value?.perdidaCorteMm) &&
    Number.isFinite(value?.despunteInicialMm);
}

function fromConfirmed(input: {
  parameters: FabricacionParametrosCorteConfirmados;
  source: "job_override" | "organization";
  recipeConfiguration?: FabricacionConfiguracionCorte | null;
}): FabricacionParametrosCorteAplicados {
  return {
    perdidaCorteMm: input.parameters.perdidaCorteMm,
    despunteInicialMm: input.parameters.despunteInicialMm,
    sobranteMinimoAprovechableMm:
      input.recipeConfiguration?.sobranteMinimoAprovechableMm ?? null,
    procedure: input.parameters.procedimiento,
    source: input.source,
    sourceLabel: input.parameters.fuente,
    confirmedBy: input.parameters.confirmedBy ?? null,
    confirmedAt: input.parameters.confirmedAt ?? null,
    organizationId: input.parameters.organizationId ?? null,
    largosComercialesConfirmados:
      input.recipeConfiguration?.confirmacionFisica?.largosComercialesConfirmados === true,
  };
}

/** Resuelve precedencia sin alterar ni persistir la definición de receta. */
export function resolveFabricacionParametrosCorte(input: {
  recipeConfiguration?: FabricacionConfiguracionCorte | null;
  organizationSettings?: FabricacionParametrosCorteConfirmados | null;
  jobOverride?: FabricacionParametrosCorteConfirmados | null;
}): FabricacionParametrosCorteAplicados {
  const recipeConfiguration = input.recipeConfiguration ?? null;

  if (input.jobOverride) {
    return fromConfirmed({
      parameters: input.jobOverride,
      source: "job_override",
      recipeConfiguration,
    });
  }

  // Las preferencias confirmadas del taller aplican a trabajos compatibles
  // antes que los valores documentados por una receta. No cambian su largo
  // comercial ni convierten ese largo en un dato confirmado.
  if (input.organizationSettings) {
    return fromConfirmed({
      parameters: input.organizationSettings,
      source: "organization",
      recipeConfiguration,
    });
  }

  if (isCompleteRecipeConfiguration(recipeConfiguration)) {
    const confirmation = recipeConfiguration.confirmacionFisica;
    return {
      perdidaCorteMm: recipeConfiguration.perdidaCorteMm,
      despunteInicialMm: recipeConfiguration.despunteInicialMm,
      sobranteMinimoAprovechableMm:
        recipeConfiguration.sobranteMinimoAprovechableMm ?? null,
      procedure: confirmation?.procedimiento ?? null,
      source: "recipe",
      sourceLabel: confirmation?.fuente ?? null,
      confirmedBy: null,
      confirmedAt: null,
      organizationId: null,
      largosComercialesConfirmados:
        confirmation?.largosComercialesConfirmados === true,
    };
  }

  return {
    perdidaCorteMm: null,
    despunteInicialMm: null,
    sobranteMinimoAprovechableMm:
      recipeConfiguration?.sobranteMinimoAprovechableMm ?? null,
    procedure: null,
    source: "unknown",
    sourceLabel: null,
    confirmedBy: null,
    confirmedAt: null,
    organizationId: null,
    largosComercialesConfirmados: false,
  };
}
