import { calcularCubicacionYPauta } from "@/features/fabricacion";
import {
  SERIE_4800_CATALOG_KEY,
  SERIE_4800_FIXTURE_1200X1000,
  SERIE_4800_SOURCE_REFERENCE_NORMAL,
  SERIE_4800_VARIANT_REFORZADA,
  crearRecetaSerie4800Corredera,
  crearRecetasSerie4800Corredera,
  isCurrentSerie4800CorrederaRecipe,
} from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";
import { getLineVariantSlots } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { buildFabricationRecipeSummary } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

describe("receta Serie 4800 corredera 2 hojas", () => {
  it("calcula destajes Diamond normal en 1200×1000", () => {
    const recipe = crearRecetaSerie4800Corredera({
      lineName: "Serie 4800 — Corredera 2 hojas",
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: SERIE_4800_FIXTURE_1200X1000.anchoTotalMm,
      altoTotalMm: SERIE_4800_FIXTURE_1200X1000.altoTotalMm,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      ...SERIE_4800_FIXTURE_1200X1000.codesNormal,
    ]);
    expect(result.perfiles.map((profile) => profile.cantidadPiezas)).toEqual([
      ...SERIE_4800_FIXTURE_1200X1000.quantities,
    ]);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual([
      ...SERIE_4800_FIXTURE_1200X1000.lengthsMm,
    ]);
    expect(result.vidrios[0]).toMatchObject({
      anchoMm: SERIE_4800_FIXTURE_1200X1000.glass.widthMm,
      altoMm: SERIE_4800_FIXTURE_1200X1000.glass.heightMm,
      cantidadPiezas: SERIE_4800_FIXTURE_1200X1000.glass.quantity,
    });
  });

  it("usa 4810/4811 en la variante reforzada y no mezcla 4806/4808", () => {
    const recipe = crearRecetaSerie4800Corredera({
      lineName: "Serie 4800 — Corredera 2 hojas",
      variant: SERIE_4800_VARIANT_REFORZADA,
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
    });

    expect(result.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      ...SERIE_4800_FIXTURE_1200X1000.codesReforzada,
    ]);
    expect(result.perfiles.some((profile) => profile.codigoPerfil === "4806")).toBe(false);
    expect(result.perfiles.some((profile) => profile.codigoPerfil === "4808")).toBe(false);
    expect(isCurrentSerie4800CorrederaRecipe(recipe, SERIE_4800_VARIANT_REFORZADA)).toBe(
      true
    );
  });

  it("expone las dos variantes listas para probar", () => {
    const recipes = crearRecetasSerie4800Corredera({
      lineName: "Serie 4800 — Corredera 2 hojas",
    });
    expect(recipes).toHaveLength(2);
    for (const recipe of recipes) {
      expect(evaluarRecetaListaParaProbar(recipe).listaParaProbar).toBe(true);
      expect(buildFabricationRecipeSummary(recipe).compositionComplete).toBe(true);
    }
  });

  it("expone variantes Normal y Reforzada para cotización", () => {
    const slots = getLineVariantSlots(SERIE_4800_CATALOG_KEY);
    expect(slots.map((slot) => slot.variantSlug)).toEqual(["normal", "reforzada"]);
    expect(slots.every((slot) => slot.complete)).toBe(true);
  });

  it("usa destajes Diamond en una medida no observada por Zeta", () => {
    const definition = crearRecetaSerie4800Corredera({
      lineName: "Serie 4800 — Corredera 2 hojas",
    });
    const record: FabricationRecipeRecord = {
      id: "diamond-4800",
      organizationId: 1,
      lineTemplateId: 99,
      scope: "organization",
      providerName: "SODAL",
      lineName: "Serie 4800",
      typology: "corredera",
      leavesCount: 2,
      variant: "normal",
      version: 1,
      status: "draft",
      definition,
      sourceType: "manufacturer",
      sourceReference: SERIE_4800_SOURCE_REFERENCE_NORMAL,
      sourceName: "SODAL",
      sourceRevision: "Diamond",
      parentRecipeId: null,
      validatedAt: null,
      validatedBy: null,
      createdAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
      eliminadoEn: null,
    };

    const resolution = resolveFabricationRecipe([record], {
      organizationId: 1,
      lineTemplateId: 99,
      catalogKey: SERIE_4800_CATALOG_KEY,
      tipologia: "corredera",
      hojas: 2,
      modulos: 2,
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      previewListaParaProbar: true,
    });

    expect(resolution.estado).toBe("receta_no_validada");
    expect(resolution.receta?.id).toBe("diamond-4800");
  });
});
