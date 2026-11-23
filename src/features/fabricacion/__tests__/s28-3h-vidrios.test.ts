import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function resolveS28Recipe(
  catalogKey: "ventora:optima-s28-corredera-2h" | "ventora:optima-s28-corredera-3h",
  leavesCount: 2 | 3,
  lineTemplateId: number,
): FabricationRecipeRecord {
  const candidates = resolveUniversalPricedLineFallbacks({
    catalogKey,
    lineTemplateId,
    organizationId: 1,
    lineName: "Óptima S-28",
    variant: null,
    leavesCount,
    typology: "corredera",
    glassName: "Termopanel 4+12+4 de 20 mm",
    includeDocumentedVariants: true,
    recipes: [],
  });
  const recipe = candidates[0];
  if (!recipe) {
    throw new Error(`Missing universal fallback recipe for ${catalogKey}`);
  }
  return recipe;
}

function buildS28QuoteItem(input: {
  id: string;
  catalogKey: "ventora:optima-s28-corredera-2h" | "ventora:optima-s28-corredera-3h";
  recipe: FabricationRecipeRecord;
  ancho: number;
  alto: number;
  cantidad: number;
}): CotizacionWorkflowItem {
  const leaves = input.recipe.definition.identidad.hojas;
  return {
    id: input.id,
    codigo: input.id.toUpperCase(),
    tipo: "Ventana",
    lineaComercial: "Óptima S-28",
    vidrio: "Termopanel 4+12+4 de 20 mm",
    nombre: "Óptima S-28",
    descripcion: input.recipe.definition.identidad.nombre,
    ancho: input.ancho,
    alto: input.alto,
    cantidad: input.cantidad,
    unidad: "unidad",
    precioUnitario: 0,
    subtotal: 0,
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: String(input.recipe.lineTemplateId),
      catalogLineKey: input.catalogKey,
      fabricacionTipologia: "corredera",
      fabricacionHojas: leaves,
      fabricacionModulos: input.recipe.definition.identidad.modulos,
      fabricacionVariante: input.recipe.definition.identidad.variante,
    }),
    tipoItem: "componente",
    fabricacionSnapshot: null,
  };
}

describe("Óptima S-28 3H — cantidad física de vidrios y preservación 2H", () => {
  const recipe3H = resolveS28Recipe("ventora:optima-s28-corredera-3h", 3, 301);
  const recipe2H = resolveS28Recipe("ventora:optima-s28-corredera-2h", 2, 302);

  it("define 3 vidrios físicos en la receta S-28 3H manteniendo fórmulas de p. 23", () => {
    const def = recipe3H.definition;
    expect(def.identidad.hojas).toBe(3);
    expect(def.vidrios).toHaveLength(1);
    expect(def.vidrios[0]).toMatchObject({
      nombre: "Termopanel 20 mm S-28",
      reglaAncho: { base: "ancho_por_hoja", ajusteMm: -86 },
      reglaAlto: { base: "alto_total", ajusteMm: -171 },
      reglaCantidad: { tipo: "fija", cantidad: 3 },
    });
  });

  it.each([
    { ancho: 1800, alto: 1200, expectedGlassW: 514, expectedGlassH: 1029, expectedS282W: 624, expectedS282H: 1139 },
    { ancho: 2400, alto: 1500, expectedGlassW: 714, expectedGlassH: 1329, expectedS282W: 824, expectedS282H: 1439 },
    { ancho: 1500, alto: 2100, expectedGlassW: 414, expectedGlassH: 1929, expectedS282W: 524, expectedS282H: 2039 },
  ])(
    "calcula geometría 3H con 3 vidrios y perfiles exactos para $ancho x $alto (ancho != alto)",
    ({ ancho, alto, expectedGlassW, expectedGlassH, expectedS282W, expectedS282H }) => {
      const item = buildS28QuoteItem({
        id: `s28-3h-${ancho}x${alto}`,
        catalogKey: "ventora:optima-s28-corredera-3h",
        recipe: recipe3H,
        ancho,
        alto,
        cantidad: 1,
      });

      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [recipe3H],
        organizationId: 1,
      });

      expect(resolved.estado).toBe("calculado");
      expect(resolved.formal?.result.calculable).toBe(true);

      const vidrios = resolved.formal?.result.vidrios ?? [];
      expect(vidrios).toHaveLength(1);
      expect(vidrios[0]).toMatchObject({
        cantidadPiezas: 3,
        anchoMm: expectedGlassW,
        altoMm: expectedGlassH,
      });

      const perfiles = resolved.formal?.result.perfiles ?? [];
      expect(perfiles.find((p) => p.codigoPerfil === "S285" && p.funcion === "Riel horizontal")).toMatchObject({
        cantidadPiezas: 2,
        medidaMm: ancho,
      });
      expect(perfiles.find((p) => p.codigoPerfil === "S285" && p.funcion === "Riel vertical")).toMatchObject({
        cantidadPiezas: 2,
        medidaMm: alto,
      });
      expect(perfiles.find((p) => p.codigoPerfil === "S282" && p.funcion === "Cabezal y zócalo de hoja")).toMatchObject({
        cantidadPiezas: 6,
        medidaMm: expectedS282W,
      });
      expect(perfiles.find((p) => p.codigoPerfil === "S282" && p.funcion === "Piernas de hoja")).toMatchObject({
        cantidadPiezas: 6,
        medidaMm: expectedS282H,
      });
      expect(perfiles.find((p) => p.codigoPerfil === "S283")).toMatchObject({
        cantidadPiezas: 4,
        medidaMm: expectedS282H,
      });
      expect(perfiles.find((p) => p.codigoPerfil === "S286")).toMatchObject({
        cantidadPiezas: 1,
        medidaMm: ancho,
      });
    },
  );

  it("escala vidrios y cortes proporcionalmente cuando cantidad > 1", () => {
    const item = buildS28QuoteItem({
      id: "s28-3h-qty-3",
      catalogKey: "ventora:optima-s28-corredera-3h",
      recipe: recipe3H,
      ancho: 2100,
      alto: 1500,
      cantidad: 3,
    });

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe3H],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    const vidrios = resolved.formal?.result.vidrios ?? [];
    expect(vidrios).toHaveLength(1);
    expect(vidrios[0]).toMatchObject({
      cantidadPiezas: 9,
      anchoMm: 614,
      altoMm: 1329,
    });

    const perfiles = resolved.formal?.result.perfiles ?? [];
    expect(perfiles.find((p) => p.codigoPerfil === "S285" && p.funcion === "Riel horizontal")?.cantidadPiezas).toBe(6);
    expect(perfiles.find((p) => p.codigoPerfil === "S282" && p.funcion === "Cabezal y zócalo de hoja")?.cantidadPiezas).toBe(18);
    expect(perfiles.find((p) => p.codigoPerfil === "S283")?.cantidadPiezas).toBe(12);
    expect(perfiles.find((p) => p.codigoPerfil === "S286")?.cantidadPiezas).toBe(3);
  });

  it("genera pautaBarras y consolida pauta conjunta en construirFabricacionTrabajoSnapshot", () => {
    const itemA = buildS28QuoteItem({
      id: "s28-3h-a",
      catalogKey: "ventora:optima-s28-corredera-3h",
      recipe: recipe3H,
      ancho: 2100,
      alto: 1500,
      cantidad: 2,
    });
    const itemB = buildS28QuoteItem({
      id: "s28-3h-b",
      catalogKey: "ventora:optima-s28-corredera-3h",
      recipe: recipe3H,
      ancho: 1800,
      alto: 1200,
      cantidad: 1,
    });

    const resolvedA = resolveFabricacionDespieceForQuoteItem({
      item: itemA,
      recipes: [recipe3H],
      organizationId: 1,
    });
    const resolvedB = resolveFabricacionDespieceForQuoteItem({
      item: itemB,
      recipes: [recipe3H],
      organizationId: 1,
    });

    expect(resolvedA.formal?.pautaBarras?.calculable).toBe(true);
    expect(resolvedA.formal?.pautaBarras?.barras.length ?? 0).toBeGreaterThan(0);
    expect(resolvedB.formal?.pautaBarras?.calculable).toBe(true);
    expect(resolvedB.formal?.pautaBarras?.barras.length ?? 0).toBeGreaterThan(0);

    const trabajo = construirFabricacionTrabajoSnapshot({
      items: [
        { id: itemA.id, codigo: itemA.codigo, nombre: itemA.nombre, snapshot: resolvedA.formal! },
        { id: itemB.id, codigo: itemB.codigo, nombre: itemB.nombre, snapshot: resolvedB.formal! },
      ],
      capturedAt: "2026-11-22T00:00:00.000Z",
    });

    expect(trabajo).not.toBeNull();
    expect(trabajo?.itemCountWithPauta).toBe(2);
    expect(trabajo?.totalBars ?? 0).toBeGreaterThan(0);
    expect(trabajo?.bars.length).toBe(trabajo?.totalBars);
    const totalCortesTrabajo = trabajo?.bars.reduce((sum, bar) => sum + bar.cortes.length, 0) ?? 0;
    expect(totalCortesTrabajo).toBe(
      (resolvedA.formal?.result.perfiles.reduce((sum, p) => sum + p.cantidadPiezas, 0) ?? 0) +
        (resolvedB.formal?.result.perfiles.reduce((sum, p) => sum + p.cantidadPiezas, 0) ?? 0),
    );
  });

  it("preserva S-28 2H intacta con quantity: 2 y sus fórmulas originales", () => {
    const def2H = recipe2H.definition;
    expect(def2H.identidad.hojas).toBe(2);
    expect(def2H.vidrios[0]).toMatchObject({
      reglaAncho: { base: "ancho_por_hoja", ajusteMm: -107 },
      reglaAlto: { base: "alto_total", ajusteMm: -171 },
      reglaCantidad: { tipo: "fija", cantidad: 2 },
    });

    const item2H = buildS28QuoteItem({
      id: "s28-2h-base",
      catalogKey: "ventora:optima-s28-corredera-2h",
      recipe: recipe2H,
      ancho: 1800,
      alto: 1200,
      cantidad: 1,
    });

    const resolved2H = resolveFabricacionDespieceForQuoteItem({
      item: item2H,
      recipes: [recipe2H],
      organizationId: 1,
    });

    expect(resolved2H.estado).toBe("calculado");
    expect(resolved2H.formal?.result.vidrios[0]).toMatchObject({
      cantidadPiezas: 2,
      anchoMm: 793,
      altoMm: 1029,
    });
    const perfiles2H = resolved2H.formal?.result.perfiles ?? [];
    expect(perfiles2H.find((p) => p.codigoPerfil === "S281" && p.funcion === "Riel horizontal")).toMatchObject({
      cantidadPiezas: 2,
      medidaMm: 1800,
    });
    expect(perfiles2H.find((p) => p.codigoPerfil === "S282" && p.funcion === "Cabezal y zócalo de hoja")).toMatchObject({
      cantidadPiezas: 4,
      medidaMm: 903,
    });
    expect(perfiles2H.find((p) => p.codigoPerfil === "S283")).toMatchObject({
      cantidadPiezas: 2,
      medidaMm: 1139,
    });
  });
});
