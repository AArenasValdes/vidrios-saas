import {
  getLineTemplateGlassSheetConfig,
  mergeLineTemplateGlassSheetConfig,
} from "../cotizacion-line-template";

describe("cotizacion-line-template glass sheet metadata", () => {
  it("guarda y recupera la configuracion de optimizacion sin migracion de schema", () => {
    const metadata = mergeLineTemplateGlassSheetConfig(
      { espesor: "10 mm" },
      {
        enabled: true,
        widthMm: 3210,
        heightMm: 2250,
        costClp: 85000,
        billingRule: "quarter",
      }
    );

    expect(metadata.espesor).toBe("10 mm");
    expect(getLineTemplateGlassSheetConfig(metadata)).toEqual({
      enabled: true,
      widthMm: 3210,
      heightMm: 2250,
      costClp: 85000,
      billingRule: "quarter",
    });
  });

  it("elimina la configuracion cuando se desactiva", () => {
    const metadata = mergeLineTemplateGlassSheetConfig(
      {
        glassSheetOptimization: {
          version: 1,
          enabled: true,
          widthMm: 3210,
          heightMm: 2250,
          costClp: 85000,
          billingRule: "quarter",
        },
      },
      {
        enabled: false,
        widthMm: 0,
        heightMm: 0,
        costClp: 0,
        billingRule: "quarter",
      }
    );

    expect(metadata.glassSheetOptimization).toBeUndefined();
    expect(getLineTemplateGlassSheetConfig(metadata).enabled).toBe(false);
  });
});
