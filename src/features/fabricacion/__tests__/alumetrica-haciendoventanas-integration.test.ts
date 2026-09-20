import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import {
  resolveFabricationRecipe,
  resolverRecetaFabricacionCompatibleForControlledTest,
} from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import {
  buildAlumetricaHaciendoTestingBundles,
  buildMergedL4800ZetaTestingBundles,
} from "@/features/fabricacion/fixtures/alumetrica-haciendoventanas-testing";
import { seedAlumetricaHaciendoVentanasRecipes } from "@/features/fabricacion/services/seed-alumetrica-haciendoventanas-recipes";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function recordFromBundle(
  bundle: ReturnType<typeof buildAlumetricaHaciendoTestingBundles>[number],
  lineTemplateId = 10,
): FabricationRecipeRecord {
  return {
    id: `record:${bundle.sourceReference}`,
    organizationId: 1,
    lineTemplateId,
    scope: "organization",
    providerName: bundle.providerName,
    lineName: bundle.lineName,
    typology: bundle.definition.identidad.tipologia,
    leavesCount: bundle.definition.identidad.hojas,
    variant: bundle.definition.identidad.variante,
    version: 1,
    status: "testing",
    definition: bundle.definition,
    sourceType: "manufacturer",
    sourceReference: bundle.sourceReference,
    sourceName: "Alumétrica + Haciendo Ventanas + Zeta",
    sourceRevision: bundle.sourceRevision,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("integración documental Alumétrica + Haciendo Ventanas", () => {
  it("conserva orden, códigos, cantidades y largos observados", () => {
    for (const bundle of buildAlumetricaHaciendoTestingBundles()) {
      const result = calcularCubicacionYPauta(bundle.definition, bundle.fixtureInput);
      expect(result.perfiles.map((profile) => profile.codigoPerfil)).toEqual(
        bundle.definition.perfiles.map((profile) => profile.codigoPerfil),
      );
      expect(result.perfiles.map((profile) => profile.cantidadPiezas)).toEqual(
        bundle.definition.perfiles.map((profile) => profile.reglaCantidad.cantidad),
      );
      if (bundle.definition.alcanceCalculo?.modo === "observed_fixture_only") {
        expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual(
          bundle.definition.perfiles.map((profile) => profile.reglaMedida.valorFijoMm),
        );
      } else {
        expect(result.calculable).toBe(true);
        expect(result.perfiles.every((profile) => (profile.medidaMm ?? 0) > 0)).toBe(true);
      }
    }
  });

  it("calcula la variante L20 pierna cerrada · Jamba 2009 igual al fixture Haciendo", () => {
    const bundle = buildAlumetricaHaciendoTestingBundles().find(
      (entry) =>
        entry.sourceReference ===
        "merge:alumetrica+haciendoventanas:serie-20:2h:pierna_cerrada_jamba_2009:1200x1000",
    );
    expect(bundle).toBeDefined();
    const result = calcularCubicacionYPauta(bundle!.definition, bundle!.fixtureInput);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual([
      1188, 1188, 596, 596, 1000, 972, 972,
    ]);
    expect(result.vidrios[0]).toMatchObject({ anchoMm: 543, altoMm: 899, cantidadPiezas: 2 });
  });

  it("expone cinco bundles L20 repartidos entre corredera y fijos", () => {
    const bundles = buildAlumetricaHaciendoTestingBundles();
    const l20Corredera = bundles.filter((entry) => entry.catalogKey === "ventora:l20");
    const l20Fijos = bundles.filter((entry) => entry.catalogKey === "ventora:l20-fijos");
    expect(l20Corredera).toHaveLength(1);
    expect(l20Fijos).toHaveLength(4);
    expect(l20Corredera.length + l20Fijos.length).toBe(5);
  });

  it("acepta alcanceCalculo formula_general sin medidas observadas", () => {
    const bundle = buildAlumetricaHaciendoTestingBundles().find(
      (entry) => entry.sourceReference.includes("pierna_abierta:1200x1000"),
    );
    expect(bundle).toBeDefined();
    expect(bundle!.definition.alcanceCalculo).toBeUndefined();
  });

  it("repite exactamente tres veces el fixture y conserva vidrio cuando fue observado", () => {
    for (const bundle of buildAlumetricaHaciendoTestingBundles()) {
      const outputs = Array.from({ length: 3 }, () =>
        calcularCubicacionYPauta(bundle.definition, bundle.fixtureInput),
      );
      expect(outputs[1]).toEqual(outputs[0]);
      expect(outputs[2]).toEqual(outputs[0]);
      if (bundle.definition.vidrios.length > 0) {
        expect(outputs[0]?.vidrios.length).toBe(1);
      }
    }
  });

  it("devuelve sin cálculo fuera del fixture observado", () => {
    const bundle = buildAlumetricaHaciendoTestingBundles().find(
      (entry) => entry.catalogKey === "ventora:s33-corredera-2h",
    );
    expect(bundle).toBeDefined();
    const result = calcularCubicacionYPauta(bundle!.definition, {
      ...bundle!.fixtureInput,
      anchoTotalMm: 1400,
    });
    expect(result.calculable).toBe(false);
    expect(result.advertencias.some((warning) => warning.codigo === "MEDIDA_NO_OBSERVADA")).toBe(
      true,
    );
  });

  it("no activa testing desde el resolver público, pero sí desde prueba controlada", () => {
    const bundle = buildAlumetricaHaciendoTestingBundles().find(
      (entry) => entry.catalogKey === "ventora:s33-corredera-2h",
    )!;
    const record = recordFromBundle(bundle);
    const publicResult = resolveFabricationRecipe([record], {
      organizationId: 1,
      lineTemplateId: 10,
      catalogKey: bundle.catalogKey,
      tipologia: "corredera",
      hojas: 2,
      modulos: 1,
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      variante: "Normal",
      allowPreliminaryNonValidated: true,
    });
    expect(publicResult.estado).toBe("sin_receta");

    const controlledResult = resolverRecetaFabricacionCompatibleForControlledTest(
      [record],
      {
        organizationId: 1,
        lineTemplateId: 10,
        tipologia: "corredera",
        hojas: 2,
        modulos: 1,
        variante: "Normal",
        controlledTest: {
          mode: "controlled_test",
          recipeId: record.id,
          organizationId: 1,
        },
      },
    );
    expect(controlledResult.estado).toBe("receta_no_validada");
    expect(controlledResult.receta?.id).toBe(record.id);
  });

  it("rechaza un intento runtime de allowNonValidatedRecipeId en el resolver público", () => {
    const bundle = buildAlumetricaHaciendoTestingBundles()[0]!;
    const record = recordFromBundle(bundle);
    const result = resolveFabricationRecipe([record], {
      organizationId: 1,
      lineTemplateId: 10,
      catalogKey: bundle.catalogKey,
      tipologia: bundle.definition.identidad.tipologia,
      hojas: bundle.definition.identidad.hojas,
      modulos: 1,
      ...( {
        allowNonValidatedRecipeId: record.id,
      } as Record<string, unknown>),
    } as never);
    expect(result.estado).toBe("sin_receta");
  });

  it("mantiene bloqueado L-4800 4H", () => {
    const twoH = buildMergedL4800ZetaTestingBundles()[0]!;
    const record = recordFromBundle(twoH, 318);
    const result = resolveFabricationRecipe([record], {
      organizationId: 1,
      lineTemplateId: 318,
      catalogKey: "ventora:serie-4800-corredera-2h",
      tipologia: "corredera",
      hojas: 4,
      modulos: 1,
      anchoTotalMm: 3000,
      altoTotalMm: 1500,
    });
    expect(result.estado).toBe("sin_receta");
  });

  it("preserva accesorios, despiece y pauta de los fixtures L-4800 Zeta", () => {
    for (const bundle of buildMergedL4800ZetaTestingBundles()) {
      const result = calcularCubicacionYPauta(bundle.definition, bundle.fixtureInput);
      expect(result.accesorios.length).toBeGreaterThan(0);
      expect(result.perfiles.length).toBeGreaterThan(0);
      const pauta = construirPautaBarrasFabricacion({
        resultado: result,
        receta: bundle.definition,
      });
      expect(pauta.barras.length).toBeGreaterThan(0);
      expect(pauta.barras.some((bar) => bar.cortes.length > 0)).toBe(true);
    }
  });

  it("hace el seed explícito, idempotente y solo organization-scoped", async () => {
    const templates = buildAlumetricaHaciendoTestingBundles().map((bundle, index) => ({
      id: index + 1,
      catalog_key: bundle.catalogKey,
      nombre: bundle.lineName,
      proveedor: bundle.providerName,
    }));
    const inserted: Array<Record<string, unknown>> = [];
    const deps = {
      listVentoraLineTemplates: async () => templates,
      listRecipesForOrganization: async () =>
        inserted.map((payload, index) => ({
          id: `inserted:${index}`,
          organizationId: 39,
          lineTemplateId: Number(payload.line_template_id),
          scope: payload.scope as "organization",
          providerName: String(payload.provider_name),
          lineName: String(payload.line_name),
          typology: String(payload.typology),
          leavesCount: Number(payload.leaves_count),
          variant: String(payload.variant),
          version: Number(payload.version),
          status: "testing" as const,
          definition: payload.definition as never,
          sourceType: "manufacturer" as const,
          sourceReference: String(payload.source_reference),
          sourceName: String(payload.source_name),
          sourceRevision: String(payload.source_revision),
          parentRecipeId: null,
          validatedAt: null,
          validatedBy: null,
          createdAt: "2026-09-19T00:00:00.000Z",
          updatedAt: "2026-09-19T00:00:00.000Z",
          eliminadoEn: null,
        })),
      insertRecipe: async (payload: Record<string, unknown>) => {
        expect(payload.organization_id).toBe(39);
        expect(payload.scope).toBe("organization");
        expect(payload.status).toBe("testing");
        inserted.push(payload);
      },
    };

    await expect(
      seedAlumetricaHaciendoVentanasRecipes(
        { organizationId: 0 },
        deps,
      ),
    ).rejects.toThrow("organizationId");

    const first = await seedAlumetricaHaciendoVentanasRecipes(
      { organizationId: 39, lineAllowlist: ["ventora:s33-corredera-2h"] },
      deps,
    );
    const second = await seedAlumetricaHaciendoVentanasRecipes(
      { organizationId: 39, lineAllowlist: ["ventora:s33-corredera-2h"] },
      deps,
    );
    expect(first.seeded).toHaveLength(1);
    expect(second.seeded).toHaveLength(0);
    expect(second.skipped).toHaveLength(1);
    expect(inserted.every((payload) => payload.scope === "organization")).toBe(true);
    expect(inserted.every((payload) => payload.organization_id === 39)).toBe(true);
  });
});
