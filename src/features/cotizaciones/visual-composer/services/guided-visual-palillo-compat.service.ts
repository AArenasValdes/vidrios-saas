import {
  applyPalilloPresetToModule,
  calculatePalilloRects,
  countPalilloSplits,
  ensureGuidedVisualConfig,
  listLeafModules,
  updateModulePalilloSplitRatio,
  type GuidedPalilloPresetId,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

const DOOR_HORIZONTAL_PALILLO_RATIO = 0.6;

function resolveCommercialPalilloPreset(
  palilloType: string | null | undefined
): GuidedPalilloPresetId | null {
  const normalized = (palilloType ?? "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "1 vertical") return "v1";
  if (normalized === "1 horizontal") return "h1";
  if (normalized === "cruzado") return "cross";
  if (normalized === "cuadricula / colonial" || normalized === "cuadricula") {
    return "grid3x2";
  }
  return null;
}

/**
 * Puente para items que guardaron palillo comercial antes que su equivalente
 * dentro de GuidedVisualConfig. No pisa composiciones ya editadas a medida.
 */
export function applyCommercialPalilloToGuidedVisualConfig(input: {
  config: GuidedVisualConfig;
  palilloEnabled?: boolean;
  palilloType?: string | null;
}): GuidedVisualConfig {
  const config = ensureGuidedVisualConfig(input.config);
  if (!input.palilloEnabled) return config;

  const preset = resolveCommercialPalilloPreset(input.palilloType);
  if (!preset) return config;

  return listLeafModules(config.root).reduce((current, module) => {
    if (countPalilloSplits(module.palilloLayout) > 0) {
      return current;
    }
    const withPreset = applyPalilloPresetToModule(current, module.id, preset);
    const isDoor = module.type === "puerta" || module.type === "puerta_corredera";
    if (preset !== "h1" || !isDoor) {
      return withPreset;
    }

    const appliedModule = listLeafModules(withPreset.root).find(
      (currentModule) => currentModule.id === module.id
    );
    const horizontalSplit = calculatePalilloRects(
      appliedModule?.palilloLayout ?? null
    ).find((node) => node.kind === "split" && node.direction === "horizontal");

    return horizontalSplit
      ? updateModulePalilloSplitRatio(
          withPreset,
          module.id,
          horizontalSplit.id,
          DOOR_HORIZONTAL_PALILLO_RATIO
        )
      : withPreset;
  }, config);
}
