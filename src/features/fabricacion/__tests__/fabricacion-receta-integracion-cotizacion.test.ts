import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { serializeCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";
import {
  construirSnapshotFabricacionCotizacion,
  fabricacionSnapshotMatchesCalculatedOutput,
} from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { fabricacionSnapshotToLegacyCubicationSnapshot } from "@/features/fabricacion/services/fabricacion-snapshot-adapter.service";
import { resolverRecetaFabricacionCompatible } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function validatedDefinition(
  overrides: Partial<FabricacionReceta["identidad"]> = {}
): FabricacionReceta {
  return {
    ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
    estado: "validada",
    identidad: {
      ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.identidad,
      ...overrides,
    },
  };
}

function recipeRecord(
  overrides: Partial<FabricationRecipeRecord> = {}
): FabricationRecipeRecord {
  const definition = overrides.definition ?? validatedDefinition();
  return {
    id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
    organizationId: overrides.organizationId ?? 1,
    lineTemplateId: overrides.lineTemplateId ?? 10,
    scope: overrides.scope ?? "organization",
    providerName: overrides.providerName ?? "Proveedor",
    lineName: overrides.lineName ?? "L5000",
    typology: overrides.typology ?? definition.identidad.tipologia,
    leavesCount: overrides.leavesCount ?? definition.identidad.hojas,
    variant: overrides.variant ?? definition.identidad.variante,
    version: overrides.version ?? 1,
    status: overrides.status ?? "validated",
    definition,
    sourceType: overrides.sourceType ?? "manual",
    sourceReference: overrides.sourceReference ?? null,
    parentRecipeId: overrides.parentRecipeId ?? null,
    validatedAt: overrides.validatedAt ?? "2026-07-29T00:00:00.000Z",
    validatedBy: overrides.validatedBy ?? null,
    createdAt: overrides.createdAt ?? "2026-07-29T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-07-29T00:00:00.000Z",
    eliminadoEn: overrides.eliminadoEn ?? null,
  };
}

describe("integracion receta fabricacion -> cotizacion", () => {
  it("selecciona automaticamente una receta validada compatible", () => {
    const result = resolverRecetaFabricacionCompatible([recipeRecord()], {
      organizationId: 1,
      lineTemplateId: 10,
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
    });

    expect(result.estado).toBe("receta_unica");
    expect(result.receta?.definition.identidad.codigo).toBe("COR-2H-EJEMPLO");
  });

  it("exige variante cuando hay varias recetas validadas compatibles", () => {
    const result = resolverRecetaFabricacionCompatible(
      [
        recipeRecord({ id: "11111111-1111-4111-8111-111111111111" }),
        recipeRecord({
          id: "22222222-2222-4222-8222-222222222222",
          definition: validatedDefinition({ recetaId: "termopanel", variante: "termopanel" }),
          variant: "termopanel",
        }),
      ],
      {
        organizationId: 1,
        lineTemplateId: 10,
        tipologia: "corredera",
        hojas: 2,
        modulos: 2,
      }
    );

    expect(result.estado).toBe("multiples_recetas");
    expect(result.candidatas).toHaveLength(2);
  });

  it("respeta la receta elegida y conserva solo la version validada mas nueva", () => {
    const oldVersion = recipeRecord({ id: "old", version: 1 });
    const newVersion = recipeRecord({ id: "new", version: 2 });
    const termopanel = recipeRecord({
      id: "termopanel",
      definition: validatedDefinition({
        recetaId: "termopanel",
        variante: "termopanel",
      }),
      variant: "termopanel",
    });

    const automatic = resolverRecetaFabricacionCompatible(
      [oldVersion, newVersion],
      {
        organizationId: 1,
        lineTemplateId: 10,
        tipologia: "corredera",
        hojas: 2,
        modulos: 2,
      }
    );
    const selected = resolverRecetaFabricacionCompatible(
      [newVersion, termopanel],
      {
        organizationId: 1,
        lineTemplateId: 10,
        tipologia: "corredera",
        hojas: 2,
        modulos: 2,
        preferredRecipeId: "termopanel",
      }
    );

    expect(automatic.estado).toBe("receta_unica");
    expect(automatic.receta?.id).toBe("new");
    expect(selected.estado).toBe("receta_unica");
    expect(selected.receta?.id).toBe("termopanel");
  });

  it("nunca usa una receta incompatible como fallback silencioso", () => {
    const result = resolverRecetaFabricacionCompatible([recipeRecord()], {
      organizationId: 1,
      lineTemplateId: 10,
      tipologia: "abatible",
      hojas: 1,
      modulos: 1,
    });

    expect(result.estado).toBe("sin_receta");
    expect(result.descartadas[0]?.motivo).toBe("La tipologia no coincide.");
  });

  it("solo permite receta no validada con accion explicita", () => {
    const draft = recipeRecord({
      status: "testing",
      definition: {
        ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
        estado: "lista_para_validar",
      },
    });
    const blocked = resolverRecetaFabricacionCompatible([draft], {
      organizationId: 1,
      lineTemplateId: 10,
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
    });
    const explicit = resolverRecetaFabricacionCompatible([draft], {
      organizationId: 1,
      lineTemplateId: 10,
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      allowNonValidatedRecipeId: draft.id,
    });

    expect(blocked.estado).toBe("sin_receta");
    expect(blocked.advertencias[0]).toContain("ninguna esta validada");
    expect(explicit.estado).toBe("receta_no_validada");
    expect(explicit.advertencias[0]).toContain("Receta en prueba");
  });

  it("construye snapshot estable con version e identidad de receta", () => {
    const recipe = recipeRecord({ version: 3 });
    const snapshot = construirSnapshotFabricacionCotizacion({
      recipe,
      entrada: {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 2,
        hojas: 2,
        modulos: 2,
        variante: "estandar",
      },
      calculatedAt: "2026-07-29T12:00:00.000Z",
    });

    recipe.definition.identidad.nombre = "Nombre modificado despues";

    expect(snapshot.recipeVersion).toBe(3);
    expect(snapshot.recipeIdentity.nombre).toBe("Corredera 2 hojas ejemplo no validado");
    expect(snapshot.pauta.find((row) => row.funcion === "Riel superior")?.cantidadPiezas).toBe(2);
    expect(snapshot.result.totalLinealMm).toBeGreaterThan(0);
  });

  it("el resumen interno prefiere snapshot formal y mantiene fallback legacy", () => {
    const formal = construirSnapshotFabricacionCotizacion({
      recipe: recipeRecord(),
      entrada: {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: "estandar",
      },
      calculatedAt: "2026-07-29T12:00:00.000Z",
    });
    const legacy = fabricacionSnapshotToLegacyCubicationSnapshot(formal);

    const summary = buildFabricationQuoteSummary([
      {
        id: "formal",
        codigo: "V1",
        nombre: "Ventana formal",
        observaciones: "",
        fabricacionSnapshot: formal,
      },
      {
        id: "legacy",
        codigo: "V2",
        nombre: "Ventana legacy",
        observaciones: `[cub:${serializeCubicationSnapshot(legacy)}]`,
      },
    ]);

    expect(summary.items).toHaveLength(2);
    expect(summary.items[0]?.codigo).toBe("V1");
    expect(summary.totalProfilesMl).toBeGreaterThan(0);
    expect(legacy.bars.every((bar) => bar.profileCode)).toBe(true);
    expect(legacy.bars.some((bar) => bar.profileCode === "EJ-RS")).toBe(true);
    expect(legacy.cuts[0]).toMatchObject({
      profileCode: "EJ-RS",
      profileName: "Riel superior ejemplo",
    });
  });

  it("propaga un código propio y detecta su cambio aunque las medidas no cambien", () => {
    const definition = validatedDefinition();
    definition.perfiles = definition.perfiles.map((profile) =>
      profile.funcion === "Riel superior"
        ? {
            ...profile,
            tallerPerfilId: "taller-profile-1",
            codigoPerfil: "AL-20-01",
            nombrePerfil: "Riel superior aluminio 20",
          }
        : profile
    );
    const original = construirSnapshotFabricacionCotizacion({
      recipe: recipeRecord({ definition }),
      entrada: {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: "estandar",
      },
    });
    const changedDefinition = {
      ...definition,
      perfiles: definition.perfiles.map((profile) =>
        profile.funcion === "Riel superior"
          ? { ...profile, codigoPerfil: "RS01" }
          : profile
      ),
    };
    const changed = construirSnapshotFabricacionCotizacion({
      recipe: recipeRecord({ definition: changedDefinition }),
      entrada: original.input,
    });
    const legacy = fabricacionSnapshotToLegacyCubicationSnapshot(changed);

    expect(original.pauta.find((row) => row.funcion === "Riel superior")?.codigoPerfil).toBe(
      "AL-20-01"
    );
    expect(changed.pautaBarras?.barras.find((bar) => bar.codigoPerfil === "RS01")).toMatchObject({
      materialKey: "taller-profile-1",
      nombrePerfil: "Riel superior aluminio 20",
    });
    expect(legacy.cuts.find((cut) => cut.profileCode === "RS01")).toMatchObject({
      profileName: "Riel superior aluminio 20",
    });
    expect(fabricacionSnapshotMatchesCalculatedOutput(original, changed)).toBe(false);
    expect(fabricacionSnapshotMatchesCalculatedOutput(changed, changed)).toBe(true);
  });
});
