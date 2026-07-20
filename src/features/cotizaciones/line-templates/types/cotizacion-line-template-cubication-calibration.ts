/**
 * Calibración V1 por ejemplos de taller (Fase 4).
 * Presets genéricos por sistema + sugerencia de descuentos desde vano/vidrio reales.
 * No son manuales de proveedor; solo puntos de partida editables.
 */

import type {
  CotizacionLineTemplateCubicationConfig,
  CotizacionLineTemplateCubicationStatus,
  CotizacionLineTemplateCubicationSystem,
  CotizacionLineTemplateCuttingMode,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

export type CubicationSystemCalibrationPreset = {
  system: CotizacionLineTemplateCubicationSystem;
  note: string;
  profileFrame: string;
  profileSash: string;
  profileMeeting: string | null;
  profileGlazingBead: string | null;
  profileSill: string | null;
  profileAccessory: string | null;
  deductionFrameHorizontalMm: number;
  deductionFrameVerticalMm: number;
  deductionSashHorizontalMm: number;
  deductionSashVerticalMm: number;
  deductionGlassWidthMm: number;
  deductionGlassHeightMm: number;
  suggestedCuttingMode: CotizacionLineTemplateCuttingMode;
  suggestedSashCount: number;
};

export type WorkshopCalibrationExampleInput = {
  system: CotizacionLineTemplateCubicationSystem;
  vanoWidthMm: number;
  vanoHeightMm: number;
  sashCount?: number;
  expectedGlassWidthMm: number;
  expectedGlassHeightMm: number;
  expectedFrameHorizontalMm?: number | null;
  expectedFrameVerticalMm?: number | null;
  expectedSashHorizontalMm?: number | null;
  expectedSashVerticalMm?: number | null;
};

export type WorkshopCalibrationSuggestion = {
  patch: Partial<CotizacionLineTemplateCubicationConfig>;
  glassWidthBasisMm: number;
  suggestedGlassWidthMm: number;
  suggestedGlassHeightMm: number;
  deltas: {
    glassWidthMm: number;
    glassHeightMm: number;
    frameHorizontalMm: number | null;
    frameVerticalMm: number | null;
  };
  canApply: boolean;
};

function clampDeduction(value: number, maxExclusive: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  const max = Math.max(0, Math.floor(maxExclusive) - 1);
  return Math.min(Math.round(value), max);
}

function positiveMm(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/**
 * Presets genéricos de partida (no marca). El taller ajusta con su ejemplo real.
 */
export function getCubicationSystemCalibrationPreset(
  system: CotizacionLineTemplateCubicationSystem
): CubicationSystemCalibrationPreset {
  if (system === "corredera_2_hojas") {
    return {
      system,
      note: "Partida típica corredera 2 hojas: rieles/jambas, encuentro y vidrio por hoja.",
      profileFrame: "Riel / jamba",
      profileSash: "Hoja",
      profileMeeting: "Encuentro",
      profileGlazingBead: "Junquillo",
      profileSill: null,
      profileAccessory: null,
      deductionFrameHorizontalMm: 0,
      deductionFrameVerticalMm: 0,
      deductionSashHorizontalMm: 6,
      deductionSashVerticalMm: 6,
      deductionGlassWidthMm: 24,
      deductionGlassHeightMm: 48,
      suggestedCuttingMode: "marco_hojas",
      suggestedSashCount: 2,
    };
  }

  if (system === "puerta_abatible_1_hoja") {
    return {
      system,
      note: "Partida típica puerta abatible 1 hoja: marco + hoja + junquillo.",
      profileFrame: "Marco",
      profileSash: "Hoja",
      profileMeeting: null,
      profileGlazingBead: "Junquillo",
      profileSill: "Zócalo",
      profileAccessory: null,
      deductionFrameHorizontalMm: 0,
      deductionFrameVerticalMm: 0,
      deductionSashHorizontalMm: 10,
      deductionSashVerticalMm: 10,
      deductionGlassWidthMm: 30,
      deductionGlassHeightMm: 40,
      suggestedCuttingMode: "marco_hojas",
      suggestedSashCount: 1,
    };
  }

  return {
    system: "pano_fijo",
    note: "Partida típica paño fijo: marco exterior y vidrio con descuento total.",
    profileFrame: "Marco",
    profileSash: "Hoja",
    profileMeeting: null,
    profileGlazingBead: "Junquillo",
    profileSill: null,
    profileAccessory: null,
    deductionFrameHorizontalMm: 0,
    deductionFrameVerticalMm: 0,
    deductionSashHorizontalMm: 0,
    deductionSashVerticalMm: 0,
    deductionGlassWidthMm: 20,
    deductionGlassHeightMm: 20,
    suggestedCuttingMode: "marco",
    suggestedSashCount: 1,
  };
}

export function resolveStatusAfterCalibrationEdit(
  current: CotizacionLineTemplateCubicationStatus
): CotizacionLineTemplateCubicationStatus {
  if (current === "validada" || current === "revisar_cambios") {
    return current;
  }
  return "en_calibracion";
}

/**
 * Infiere descuentos totales (mm) para que el cálculo coincida con un ejemplo de taller.
 * Usa la misma base que `buildLineTemplateCuttingPreview` (vano / hoja).
 */
export function suggestCubicationDeductionsFromWorkshopExample(
  input: WorkshopCalibrationExampleInput
): WorkshopCalibrationSuggestion {
  const vanoWidthMm = Math.max(1, Math.round(input.vanoWidthMm));
  const vanoHeightMm = Math.max(1, Math.round(input.vanoHeightMm));
  const sashCount = Math.max(1, Math.round(input.sashCount ?? 2));
  const expectedGlassWidthMm = positiveMm(input.expectedGlassWidthMm) ?? 0;
  const expectedGlassHeightMm = positiveMm(input.expectedGlassHeightMm) ?? 0;

  const glassWidthBasisMm =
    input.system === "corredera_2_hojas"
      ? Math.max(1, Math.round(vanoWidthMm / sashCount))
      : vanoWidthMm;

  const deductionGlassWidthMm = clampDeduction(
    glassWidthBasisMm - expectedGlassWidthMm,
    glassWidthBasisMm
  );
  const deductionGlassHeightMm = clampDeduction(
    vanoHeightMm - expectedGlassHeightMm,
    vanoHeightMm
  );

  const patch: Partial<CotizacionLineTemplateCubicationConfig> = {
    deductionGlassWidthMm,
    deductionGlassHeightMm,
  };

  const expectedFrameH = positiveMm(input.expectedFrameHorizontalMm);
  const expectedFrameV = positiveMm(input.expectedFrameVerticalMm);
  if (expectedFrameH != null) {
    patch.deductionFrameHorizontalMm = clampDeduction(
      vanoWidthMm - expectedFrameH,
      vanoWidthMm
    );
  }
  if (expectedFrameV != null) {
    patch.deductionFrameVerticalMm = clampDeduction(
      vanoHeightMm - expectedFrameV,
      vanoHeightMm
    );
  }

  const expectedSashH = positiveMm(input.expectedSashHorizontalMm);
  const expectedSashV = positiveMm(input.expectedSashVerticalMm);
  if (expectedSashH != null) {
    patch.deductionSashHorizontalMm = clampDeduction(
      glassWidthBasisMm - expectedSashH,
      glassWidthBasisMm
    );
  }
  if (expectedSashV != null) {
    patch.deductionSashVerticalMm = clampDeduction(
      vanoHeightMm - expectedSashV,
      vanoHeightMm
    );
  }

  const suggestedGlassWidthMm = Math.max(0, glassWidthBasisMm - deductionGlassWidthMm);
  const suggestedGlassHeightMm = Math.max(0, vanoHeightMm - deductionGlassHeightMm);

  return {
    patch,
    glassWidthBasisMm,
    suggestedGlassWidthMm,
    suggestedGlassHeightMm,
    deltas: {
      glassWidthMm: suggestedGlassWidthMm - expectedGlassWidthMm,
      glassHeightMm: suggestedGlassHeightMm - expectedGlassHeightMm,
      frameHorizontalMm:
        expectedFrameH == null
          ? null
          : vanoWidthMm - (patch.deductionFrameHorizontalMm ?? 0) - expectedFrameH,
      frameVerticalMm:
        expectedFrameV == null
          ? null
          : vanoHeightMm - (patch.deductionFrameVerticalMm ?? 0) - expectedFrameV,
    },
    canApply: expectedGlassWidthMm > 0 && expectedGlassHeightMm > 0,
  };
}

export function applyCalibrationPresetToCubicationPatch(
  preset: CubicationSystemCalibrationPreset
): Partial<CotizacionLineTemplateCubicationConfig> {
  return {
    system: preset.system,
    profileFrame: preset.profileFrame,
    profileSash: preset.profileSash,
    profileMeeting: preset.profileMeeting,
    profileGlazingBead: preset.profileGlazingBead,
    profileSill: preset.profileSill,
    profileAccessory: preset.profileAccessory,
    deductionFrameHorizontalMm: preset.deductionFrameHorizontalMm,
    deductionFrameVerticalMm: preset.deductionFrameVerticalMm,
    deductionSashHorizontalMm: preset.deductionSashHorizontalMm,
    deductionSashVerticalMm: preset.deductionSashVerticalMm,
    deductionGlassWidthMm: preset.deductionGlassWidthMm,
    deductionGlassHeightMm: preset.deductionGlassHeightMm,
  };
}
