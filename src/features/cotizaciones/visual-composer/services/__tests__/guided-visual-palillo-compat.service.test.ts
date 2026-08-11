import { applyCommercialPalilloToGuidedVisualConfig } from "../guided-visual-palillo-compat.service";
import {
  applyPalilloPresetToModule,
  createDefaultGuidedVisualConfig,
  listLeafModules,
  updateModuleType,
} from "../../types/guided-visual-config";

describe("guided visual palillo compatibility", () => {
  it("convierte palillo comercial horizontal para una puerta guiada", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 750, heightMm: 2100 });
    const moduleId = listLeafModules(config.root)[0].id;
    config = updateModuleType(config, moduleId, "puerta");

    const next = applyCommercialPalilloToGuidedVisualConfig({
      config,
      palilloEnabled: true,
      palilloType: "1 horizontal",
    });

    expect(listLeafModules(next.root)[0].palillos).toEqual([
      expect.objectContaining({ axis: "horizontal", position: 0.5 }),
    ]);
  });

  it("no pisa palillos creados a medida en constructor", () => {
    let config = createDefaultGuidedVisualConfig();
    const moduleId = listLeafModules(config.root)[0].id;
    config = applyPalilloPresetToModule(config, moduleId, "v1");

    const next = applyCommercialPalilloToGuidedVisualConfig({
      config,
      palilloEnabled: true,
      palilloType: "1 horizontal",
    });

    expect(listLeafModules(next.root)[0].palillos[0]?.axis).toBe("vertical");
  });
});
