import {
  applyFormalGuidedConfigsToItems,
} from "@/features/cotizaciones/visual-composer/services/cotizacion-item-visual-configs.service";
import {
  createDefaultGuidedVisualConfig,
  serializeGuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
  mergeFormalGuidedVisualConfigIntoObservaciones,
} from "@/utils/cotizacion-item-presentation";

describe("hydrate formal guided visual configs", () => {
  it("prioriza config formal sobre bridge [gvc:] distinto", () => {
    const bridge = createDefaultGuidedVisualConfig({
      widthMm: 1000,
      heightMm: 1000,
    });
    const formal = createDefaultGuidedVisualConfig({
      widthMm: 1800,
      heightMm: 1400,
    });
    const observaciones = encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      sheetScheme: "Personalizado",
      isCustomScheme: true,
      guidedVisualConfig: bridge,
      raw: "pieza",
    });

    const merged = mergeFormalGuidedVisualConfigIntoObservaciones(
      observaciones,
      formal
    );
    const meta = decodeCotizacionItemPresentationMeta(merged);

    expect(meta.guidedVisualConfig?.widthMm).toBe(1800);
    expect(meta.guidedVisualConfig?.heightMm).toBe(1400);
    expect(meta.raw).toBe("pieza");
    expect(observaciones).toContain(serializeGuidedVisualConfig(bridge).replace(/\]/g, ""));
  });

  it("inyecta formal cuando el bridge no existe", () => {
    const formal = createDefaultGuidedVisualConfig({
      widthMm: 1600,
      heightMm: 1200,
    });
    const observaciones = encodeCotizacionItemPresentationMeta({
      colorHex: "#2a2a2a",
      material: "PVC",
      raw: "sin gvc",
    });

    const items = applyFormalGuidedConfigsToItems(
      [{ id: "11", observaciones }],
      new Map([["11", formal]])
    );
    const meta = decodeCotizacionItemPresentationMeta(items[0]?.observaciones);

    expect(meta.guidedVisualConfig?.widthMm).toBe(1600);
    expect(meta.raw).toBe("sin gvc");
  });

  it("deja el item intacto si no hay formal para ese id", () => {
    const observaciones = encodeCotizacionItemPresentationMeta({
      colorHex: "#a8a8a8",
      material: "Aluminio",
      raw: "legacy",
    });
    const items = applyFormalGuidedConfigsToItems(
      [{ id: "22", observaciones }],
      new Map()
    );

    expect(items[0]?.observaciones).toBe(observaciones);
  });
});
