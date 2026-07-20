import {
  applyCalibrationPresetToCubicationPatch,
  getCubicationSystemCalibrationPreset,
  resolveStatusAfterCalibrationEdit,
  suggestCubicationDeductionsFromWorkshopExample,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-calibration";
import {
  buildLineTemplateCuttingPreview,
  getLineTemplateCubicationConfig,
  mergeLineTemplateCubicationConfig,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

describe("cubication calibration presets", () => {
  it("entrega partida distinta por sistema", () => {
    const fijo = getCubicationSystemCalibrationPreset("pano_fijo");
    const corredera = getCubicationSystemCalibrationPreset("corredera_2_hojas");

    expect(fijo.suggestedCuttingMode).toBe("marco");
    expect(corredera.suggestedCuttingMode).toBe("marco_hojas");
    expect(corredera.deductionGlassWidthMm).toBeGreaterThan(0);
    expect(applyCalibrationPresetToCubicationPatch(corredera).profileMeeting).toBe(
      "Encuentro"
    );
  });

  it("al calibrar pasa a en_calibracion salvo validada/revisar", () => {
    expect(resolveStatusAfterCalibrationEdit("lista_para_probar")).toBe("en_calibracion");
    expect(resolveStatusAfterCalibrationEdit("sin_configurar")).toBe("en_calibracion");
    expect(resolveStatusAfterCalibrationEdit("validada")).toBe("validada");
    expect(resolveStatusAfterCalibrationEdit("revisar_cambios")).toBe("revisar_cambios");
  });
});

describe("suggestCubicationDeductionsFromWorkshopExample", () => {
  it("infiere descuentos de vidrio para paño fijo y alinea el preview", () => {
    const suggestion = suggestCubicationDeductionsFromWorkshopExample({
      system: "pano_fijo",
      vanoWidthMm: 1200,
      vanoHeightMm: 1000,
      expectedGlassWidthMm: 1180,
      expectedGlassHeightMm: 980,
    });

    expect(suggestion.canApply).toBe(true);
    expect(suggestion.patch.deductionGlassWidthMm).toBe(20);
    expect(suggestion.patch.deductionGlassHeightMm).toBe(20);

    const metadata = mergeLineTemplateCubicationConfig(
      {
        cuttingEnabled: true,
        cuttingMode: "marco",
        cubicationSystem: "pano_fijo",
        cubicationStatus: "en_calibracion",
        profileFrame: "Marco",
        profileSash: "Hoja",
      },
      suggestion.patch
    );
    const config = getLineTemplateCubicationConfig(metadata);
    const preview = buildLineTemplateCuttingPreview(
      {
        enabled: true,
        mode: "marco",
        barLengthMm: 6000,
        sawKerfMm: 3,
        sashCount: 1,
      },
      { widthMm: 1200, heightMm: 1000, quantity: 1 },
      config
    );

    expect(preview.glass?.widthMm).toBe(1180);
    expect(preview.glass?.heightMm).toBe(980);
  });

  it("usa ancho de hoja como base en corredera 2 hojas", () => {
    const suggestion = suggestCubicationDeductionsFromWorkshopExample({
      system: "corredera_2_hojas",
      vanoWidthMm: 1200,
      vanoHeightMm: 1000,
      sashCount: 2,
      expectedGlassWidthMm: 576,
      expectedGlassHeightMm: 952,
      expectedFrameHorizontalMm: 1200,
      expectedFrameVerticalMm: 1000,
    });

    expect(suggestion.glassWidthBasisMm).toBe(600);
    expect(suggestion.patch.deductionGlassWidthMm).toBe(24);
    expect(suggestion.patch.deductionGlassHeightMm).toBe(48);
    expect(suggestion.patch.deductionFrameHorizontalMm).toBe(0);
    expect(suggestion.patch.deductionFrameVerticalMm).toBe(0);
  });
});
