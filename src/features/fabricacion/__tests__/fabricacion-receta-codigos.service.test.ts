import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";
import {
  enriquecerCodigosPerfilRecetaFabricacion,
  resolvePlantillaVentoraIdForRecipe,
} from "@/features/fabricacion/services/fabricacion-receta-codigos.service";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { fabricacionSnapshotToLegacyCubicationSnapshot } from "@/features/fabricacion/services/fabricacion-snapshot-adapter.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function recipeWithoutCodes(
  overrides: Partial<FabricacionReceta> = {}
): FabricacionReceta {
  return {
    ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
    perfiles: RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.perfiles.map((profile) => ({
      ...profile,
      codigoPerfil: "",
      nombrePerfil: "",
      observaciones: "Ajuste documentado en Ventora (referencia L5000).",
    })),
    ...overrides,
  };
}

describe("fabricacion-receta-codigos.service", () => {
  it("resuelve L5000 desde nombre de línea o referencia en observaciones", () => {
    expect(
      resolvePlantillaVentoraIdForRecipe({
        sourceReference: "plantilla-ventora:L5000",
      })
    ).toBe("L5000");

    expect(
      resolvePlantillaVentoraIdForRecipe({
        lineName: "L5000 3",
      })
    ).toBe("L5000");

    expect(
      resolvePlantillaVentoraIdForRecipe({
        receta: recipeWithoutCodes(),
      })
    ).toBe("L5000");
  });

  it("rellena códigos documentados de la plantilla cuando la receta los trae vacíos", () => {
    const enriched = enriquecerCodigosPerfilRecetaFabricacion({
      receta: recipeWithoutCodes(),
      lineName: "L5000 3",
      sourceReference: "177e70b6-00ac-4b82-8a0d-bbf91efe488f",
      sourceType: "copied",
    });

    expect(enriched.perfiles.find((row) => row.funcion === "Riel superior")?.codigoPerfil).toBe(
      "5001"
    );
    expect(enriched.perfiles.find((row) => row.funcion === "Zócalo")?.codigoPerfil).toBe("5005");
  });

  it("propaga los códigos al snapshot y al despiece legacy", () => {
    const definition = recipeWithoutCodes();
    const record: FabricationRecipeRecord = {
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: 3,
      lineTemplateId: 137,
      scope: "organization",
      providerName: "",
      lineName: "L5000 3",
      typology: definition.identidad.tipologia,
      leavesCount: definition.identidad.hojas,
      variant: definition.identidad.variante,
      version: 1,
      status: "validated",
      definition,
      sourceType: "copied",
      sourceReference: "177e70b6-00ac-4b82-8a0d-bbf91efe488f",
      parentRecipeId: null,
      validatedAt: "2026-08-19T00:00:00.000Z",
      validatedBy: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
      eliminadoEn: null,
    };

    const formal = construirSnapshotFabricacionCotizacion({
      recipe: record,
      entrada: {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: definition.identidad.variante,
      },
    });
    const legacy = fabricacionSnapshotToLegacyCubicationSnapshot(formal);

    expect(formal.pauta.find((row) => row.funcion === "Riel superior")?.codigoPerfil).toBe(
      "5001"
    );
    expect(legacy.cuts.find((cut) => cut.functionLabel === "Riel superior")?.profileCode).toBe(
      "5001"
    );
  });
});
