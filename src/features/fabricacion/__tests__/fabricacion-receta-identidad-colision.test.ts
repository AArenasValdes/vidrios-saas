import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { prepareFabricacionSnapshotsForQuoteSave, resolveFabricacionSnapshotsIndependently } from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { resolverRecetaFabricacionCompatible } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const input = { organizationId: 1, lineTemplateId: 20, tipologia: "corredera", hojas: 2, modulos: 2, variante: "estandar" };
function recipes(): [FabricationRecipeRecord, FabricationRecipeRecord] {
  const base = resolveUniversalPricedLineFallbacks({ catalogKey: "ventora:l20", lineTemplateId: 20, organizationId: 1, lineName: "L20", variant: "estandar", recipes: [] })[0]!;
  const a: FabricationRecipeRecord = { ...base, id: "recipe-A", scope: "organization", sourceReference: "taller:personalizada:l20", status: "validated" };
  const b = structuredClone(a);
  b.id = "recipe-B";
  b.definition.perfiles[0]!.reglaMedida.ajusteMm -= 100;
  return [a, b];
}

describe("colisión de identidad interna en recetas privadas", () => {
  it("respeta receta B seleccionada y calcula su descuento, no el de A", () => {
    const [a, b] = recipes();
    const result = resolverRecetaFabricacionCompatible([a,b], { ...input, preferredRecipeId: b.id });
    expect(result.estado).toBe("receta_unica");
    expect(result.receta?.id).toBe("recipe-B");
    const entrada = { anchoTotalMm: 1200, altoTotalMm: 1000, cantidad: 1, hojas: 2, modulos: 2, variante: "estandar" };
    expect(calcularCubicacionYPauta(result.receta!.definition, entrada).perfiles[0]!.medidaMm).toBe(
      calcularCubicacionYPauta(a.definition, entrada).perfiles[0]!.medidaMm - 100
    );
  });
  it("sin elección explícita no elige arbitrariamente fórmulas distintas de la misma versión", () => {
    const result = resolverRecetaFabricacionCompatible(recipes(), input);
    expect(result.estado).toBe("multiples_recetas");
    expect(result.candidatas.map((recipe) => recipe.id)).toEqual(["recipe-A", "recipe-B"]);
  });
  it("conserva selección explícita de duplicado idéntico", () => {
    const [a] = recipes();
    const b = { ...structuredClone(a), id: "recipe-B" };
    const result = resolverRecetaFabricacionCompatible([a,b], { ...input, preferredRecipeId: b.id });
    expect(result.receta?.id).toBe("recipe-B");
  });
  it("guarda y reabre los cortes de la receta privada seleccionada con igual geometría", () => {
    const [a, b] = recipes();
    const metadata = (recipeId: string) => encodeCotizacionItemPresentationMeta({
      lineTemplateId: "20", catalogLineKey: "ventora:l20", sistema: "Corredera",
      fabricacionTipologia: "corredera", fabricacionHojas: 2, fabricacionModulos: 2,
      fabricacionVariante: "estandar", fabricationRecipeId: recipeId,
    });
    const item: CotizacionWorkflowItem = {
      id: "item-1", codigo: "V1", tipo: "Ventana", lineaComercial: "L20", vidrio: "Monolítico 4 mm",
      nombre: "Ventana", descripcion: "Ventana", ancho: 1200, alto: 1000, cantidad: 1,
      unidad: "unidad", precioUnitario: 0, subtotal: 0, observaciones: metadata(a.id), tipoItem: "componente",
      fabricacionSnapshot: null,
    };
    const resolve = (piece: CotizacionWorkflowItem) => resolveFabricacionDespieceForQuoteItem({
      item: piece, recipes: [a, b], organizationId: 1, lineTemplateId: 20, lineCatalogKey: "ventora:l20",
    }).formal;
    const previous = { ...item, fabricacionSnapshot: resolve(item) };
    expect(previous.fabricacionSnapshot?.recipeId).toBe(a.id);
    const selected = { ...previous, observaciones: metadata(b.id), fabricacionSnapshot: null };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [previous], items: [selected] });
    const saved = resolveFabricacionSnapshotsIndependently({ items: prepared.items, itemIdsToResolve: prepared.itemIdsToResolve, resolveSnapshot: resolve });
    expect(saved[0]?.fabricacionSnapshot?.recipeId).toBe(b.id);
    expect(saved[0]?.fabricacionSnapshot?.result.perfiles[0]?.medidaMm).toBe(
      previous.fabricacionSnapshot!.result.perfiles[0]!.medidaMm - 100
    );
    const reopened = structuredClone(saved[0]!);
    const unchanged = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: saved, items: [reopened] });
    expect(unchanged.itemIdsToResolve.size).toBe(0);
    expect(unchanged.items[0]?.fabricacionSnapshot).toEqual(saved[0]?.fabricacionSnapshot);
  });
  it("conserva prioridad de versión mayor y aislamiento por organización", () => {
    const [a, b] = recipes();
    b.version = 2;
    expect(resolverRecetaFabricacionCompatible([a,b], input).receta?.id).toBe("recipe-B");
    b.organizationId = 2;
    expect(resolverRecetaFabricacionCompatible([a,b], { ...input, preferredRecipeId: b.id }).receta?.id).toBe("recipe-A");
  });
});