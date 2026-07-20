import {
  buildLineTemplateCuttingPreview,
  getLineTemplateCubicationConfig,
  getLineTemplateCuttingRules,
  getLineTemplateEstimationRules,
  getLineTemplateSystemMetadata,
  mergeLineTemplateCubicationConfig,
  mergeLineTemplateCuttingRules,
  mergeLineTemplateEstimationRules,
  mergeLineTemplateSystemMetadata,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

describe("cotizacion line template estimation metadata", () => {
  it("normaliza reglas faltantes con valores V1 seguros", () => {
    expect(getLineTemplateEstimationRules({})).toEqual({
      enabled: false,
      mode: "marco_simple",
      frameFactor: 1,
      sashFactor: 0,
      accessoryUnits: 0,
    });
  });

  it("guarda reglas planas en catalog_metadata", () => {
    expect(
      mergeLineTemplateEstimationRules(
        { espesor: "6mm" },
        {
          enabled: true,
          mode: "marco_hojas",
          frameFactor: 1.25,
          sashFactor: 1.1,
          accessoryUnits: 2,
        }
      )
    ).toEqual({
      espesor: "6mm",
      estimationEnabled: true,
      estimationMode: "marco_hojas",
      estimationFrameFactor: 1.25,
      estimationSashFactor: 1.1,
      estimationAccessoryUnits: 2,
    });
  });

  it("limpia factores cuando se desactiva la estimacion", () => {
    expect(
      mergeLineTemplateEstimationRules(
        {
          estimationEnabled: true,
          estimationMode: "marco_hojas",
          estimationFrameFactor: 1.25,
          estimationSashFactor: 1.1,
          estimationAccessoryUnits: 2,
        },
        {
          enabled: false,
          mode: "marco_simple",
          frameFactor: 1,
          sashFactor: 0,
          accessoryUnits: 0,
        }
      )
    ).toEqual({
      estimationEnabled: false,
    });
  });
});

describe("cotizacion line template system metadata", () => {
  it("lee y limpia el sistema comercial de la linea", () => {
    expect(getLineTemplateSystemMetadata({ lineSystem: " Corredera " })).toEqual({
      lineSystem: "Corredera",
    });

    expect(
      mergeLineTemplateSystemMetadata(
        { lineSystem: "Corredera", estimationEnabled: true },
        { lineSystem: "" }
      )
    ).toEqual({
      estimationEnabled: true,
    });
  });
});

describe("cotizacion line template cubication metadata", () => {
  it("normaliza sistema, estado y perfiles por rol con valores seguros", () => {
    expect(getLineTemplateCubicationConfig({ lineSystem: "Corredera" })).toMatchObject({
      system: "corredera_2_hojas",
      status: "sin_configurar",
      profileFrame: "Marco",
      profileSash: "Hoja",
      profileMeeting: "Encuentro",
      profileGlazingBead: "Junquillo",
    });
  });

  it("guarda configuracion guiada plana en catalog_metadata", () => {
    expect(
      mergeLineTemplateCubicationConfig(
        { lineSystem: "Corredera" },
        {
          system: "corredera_2_hojas",
          status: "lista_para_probar",
          profileFrame: "L20 marco",
          profileSash: "L20 hoja",
          profileMeeting: "L20 traslapo",
          deductionSashVerticalMm: 25,
        }
      )
    ).toMatchObject({
      lineSystem: "Corredera",
      cubicationSystem: "corredera_2_hojas",
      cubicationStatus: "lista_para_probar",
      profileFrame: "L20 marco",
      profileSash: "L20 hoja",
      profileMeeting: "L20 traslapo",
      deductionSashVerticalMm: 25,
    });
  });

  it("pasa a revisar cambios si se edita una configuracion validada", () => {
    expect(
      mergeLineTemplateCubicationConfig(
        {
          cubicationSystem: "pano_fijo",
          cubicationStatus: "validada",
          profileFrame: "Marco antiguo",
        },
        { profileFrame: "Marco nuevo" }
      )
    ).toMatchObject({
      cubicationStatus: "revisar_cambios",
      profileFrame: "Marco nuevo",
    });
  });
});

describe("cotizacion line template cutting metadata", () => {
  it("normaliza receta de corte faltante con valores seguros", () => {
    expect(getLineTemplateCuttingRules({})).toEqual({
      enabled: false,
      mode: "marco_hojas",
      barLengthMm: 6000,
      sawKerfMm: 3,
      sashCount: 2,
    });
  });

  it("guarda pauta de corte plana en catalog_metadata", () => {
    expect(
      mergeLineTemplateCuttingRules(
        { estimationEnabled: true },
        {
          enabled: true,
          mode: "marco_hojas",
          barLengthMm: 6000,
          sawKerfMm: 3,
          sashCount: 2,
        }
      )
    ).toEqual({
      estimationEnabled: true,
      cuttingEnabled: true,
      cuttingMode: "marco_hojas",
      cuttingBarLengthMm: 6000,
      cuttingSawKerfMm: 3,
      cuttingSashCount: 2,
    });
  });

  it("limpia pauta cuando se desactiva", () => {
    expect(
      mergeLineTemplateCuttingRules(
        {
          cuttingEnabled: true,
          cuttingMode: "marco_hojas",
          cuttingBarLengthMm: 6000,
          cuttingSawKerfMm: 3,
          cuttingSashCount: 2,
        },
        {
          enabled: false,
          mode: "marco_hojas",
          barLengthMm: 6000,
          sawKerfMm: 3,
          sashCount: 2,
        }
      )
    ).toEqual({
      cuttingEnabled: false,
    });
  });

  it("calcula pauta sugerida sin precio para una ventana de muestra", () => {
    const preview = buildLineTemplateCuttingPreview({
      enabled: true,
      mode: "marco_hojas",
      barLengthMm: 6000,
      sawKerfMm: 3,
      sashCount: 2,
    });

    expect(preview.cuts).toEqual(
      expect.arrayContaining([
        {
          label: "Marco",
          functionLabel: "Riel superior",
          quantity: 1,
          lengthMm: 1200,
          totalLinealMm: 1200,
        },
        {
          label: "Marco",
          functionLabel: "Jamba",
          quantity: 2,
          lengthMm: 1000,
          totalLinealMm: 2000,
        },
        {
          label: "Hoja",
          functionLabel: "Hoja vertical",
          quantity: 4,
          lengthMm: 1000,
          totalLinealMm: 4000,
        },
      ])
    );
    expect(preview.glass).toMatchObject({
      widthMm: 600,
      heightMm: 1000,
      quantity: 2,
      totalM2: 1.2,
    });
    expect(preview.totalProfilesLinealMm).toBeGreaterThan(0);
    expect(preview.bars.length).toBeGreaterThan(0);
    expect(preview.totalWasteMm).toBeGreaterThanOrEqual(0);
  });

  it("multiplica la pauta por la cantidad de piezas", () => {
    const preview = buildLineTemplateCuttingPreview(
      {
        enabled: true,
        mode: "marco_hojas",
        barLengthMm: 6000,
        sawKerfMm: 3,
        sashCount: 2,
      },
      { widthMm: 2000, heightMm: 1000, quantity: 5 }
    );

    expect(preview.cuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          functionLabel: "Riel superior",
          quantity: 5,
          lengthMm: 2000,
        }),
        expect.objectContaining({
          functionLabel: "Hoja horizontal",
          quantity: 20,
          lengthMm: 1000,
        }),
      ])
    );
    expect(preview.glass?.quantity).toBe(10);
    expect(preview.bars.length).toBeGreaterThan(1);
  });
});
