import {
  buildProcedenciaPersistence,
  buildPlantillaVentoraSourceReference,
  buildPlantillaVerificadaSourceReference,
  isRecetaTecnicamenteValidada,
  resolveProcedenciaFromSource,
} from "@/features/fabricacion/types/fabricacion-receta-procedencia";

describe("procedencia de receta de fabricación", () => {
  it("persiste Base Ventora, plantilla Ventora, taller, IA y plantilla verificada sin mezclar validación técnica", () => {
    expect(
      buildProcedenciaPersistence("base_ventora", {
        tipologica: "corredera",
        hojas: 2,
      })
    ).toEqual({
      sourceType: "manual",
      sourceReference: "base-ventora:corredera:2",
    });

    expect(
      buildProcedenciaPersistence("plantilla_ventora", {
        plantillaId: "L5000",
      })
    ).toEqual({
      sourceType: "copied",
      sourceReference: buildPlantillaVentoraSourceReference("L5000"),
    });

    expect(buildProcedenciaPersistence("borrador_ia")).toEqual({
      sourceType: "imported_ai",
      sourceReference: "text-assistant",
    });

    expect(buildProcedenciaPersistence("receta_taller")).toEqual({
      sourceType: "manual",
      sourceReference: "blank-start",
    });

    expect(
      buildProcedenciaPersistence("plantilla_verificada", {
        plantillaId: "cuprum-serie-xx",
      })
    ).toEqual({
      sourceType: "copied",
      sourceReference: buildPlantillaVerificadaSourceReference("cuprum-serie-xx"),
    });
  });

  it("restaura procedencia desde sourceType/sourceReference, incluyendo legado tipológico", () => {
    expect(
      resolveProcedenciaFromSource({
        sourceType: "manual",
        sourceReference: "base-ventora:corredera:2",
      }).procedencia
    ).toBe("base_ventora");

    expect(
      resolveProcedenciaFromSource({
        sourceType: "manual",
        sourceReference: "base-tipologica:abatible",
      }).procedencia
    ).toBe("base_ventora");

    expect(
      resolveProcedenciaFromSource({
        sourceType: "imported_ai",
        sourceReference: "text-assistant",
      }).label
    ).toBe("Borrador con IA");

    expect(
      resolveProcedenciaFromSource({
        sourceType: "copied",
        sourceReference: "plantilla-ventora:L20",
      })
    ).toMatchObject({
      procedencia: "plantilla_ventora",
      label: "Plantilla Ventora",
      detail: "Validada en taller · L20",
      plantillaId: "L20",
    });

    expect(
      resolveProcedenciaFromSource({
        sourceType: "copied",
        sourceReference: "plantilla-verificada:cuprum-serie-xx",
      })
    ).toMatchObject({
      procedencia: "plantilla_verificada",
      plantillaId: "cuprum-serie-xx",
    });
  });

  it("solo considera validada una receta tras status validated del Paso 3", () => {
    expect(isRecetaTecnicamenteValidada("draft")).toBe(false);
    expect(isRecetaTecnicamenteValidada("testing")).toBe(false);
    expect(isRecetaTecnicamenteValidada("validated")).toBe(true);
  });
});
