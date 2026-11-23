import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { shouldPreserveFrozenFabricationSnapshot } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { prepareFabricacionSnapshotsForQuoteSave, resolveFabricacionSnapshotsIndependently } from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

function scenario() {
  const base = resolveUniversalPricedLineFallbacks({ catalogKey: "ventora:l20", lineTemplateId: 20, organizationId: 1, lineName: "L20", variant: "estandar", recipes: [] })[0]!;
  const oldRecipe = { ...base, id: "private-r1", scope: "organization" as const, sourceReference: "taller:personalizada:l20", status: "validated" as const };
  const newRecipe = structuredClone(oldRecipe);
  newRecipe.version = 2;
  newRecipe.definition.perfiles[0]!.reglaMedida.ajusteMm -= 100;
  const metadata = (productId: string) => encodeCotizacionItemPresentationMeta({ lineTemplateId: "20", catalogLineKey: "ventora:l20", fabricacionTipologia: "corredera", fabricacionHojas: 2, fabricacionModulos: 2, fabricacionVariante: "estandar", fabricationRecipeId: oldRecipe.id, vidrioLineTemplateId: productId, sistema: "Corredera" });
  const item = { id: "1", codigo: "V1", tipo: "Ventana", lineaComercial: "L20", vidrio: "Float 4 mm", nombre: "Ventana", descripcion: "Ventana", ancho: 1200, alto: 1000, cantidad: 1, unidad: "unidad", observaciones: metadata("501"), fabricacionSnapshot: null } as CotizacionWorkflowItem;
  const resolve = (piece: CotizacionWorkflowItem, recipe = oldRecipe) => resolveFabricacionDespieceForQuoteItem({ item: piece, recipes: [recipe], organizationId: 1, lineTemplateId: 20, lineCatalogKey: "ventora:l20" }).formal!;
  const historical = resolveFabricacionSnapshotsIndependently({ items: [item], itemIdsToResolve: new Set([item.id]), resolveSnapshot: (piece) => resolve(piece) })[0]!;
  return { historical, newRecipe, metadata, resolve };
}

describe("reapertura histórica con vidrio de catálogo", () => {
  it("conserva el snapshot aunque la receta de referencia cambie", () => {
    const { historical, newRecipe, resolve } = scenario();
    const original = historical.fabricacionSnapshot!;
    expect(original.glassSelection?.productId).toBe("501");
    const live = resolve(historical, newRecipe);
    expect(live.result.perfiles[0]!.medidaMm).toBe(original.result.perfiles[0]!.medidaMm - 100);
    expect(shouldPreserveFrozenFabricationSnapshot(original, live)).toBe(true);
    const displayed = shouldPreserveFrozenFabricationSnapshot(original, live) ? historical : { ...historical, fabricacionSnapshot: live };
    const saved = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [historical], items: [displayed] });
    expect(saved.shouldRebuildTrabajoSnapshot).toBe(false);
    expect(saved.items[0]!.fabricacionSnapshot).toEqual(original);
  });

  it("identifica cambio explícito de vidrio aunque las medidas no cambien", () => {
    const { historical, metadata, resolve } = scenario();
    const changed = { ...historical, observaciones: metadata("502") };
    const live = resolve(changed);
    expect(live.glassSelection?.productId).toBe("502");
    expect(shouldPreserveFrozenFabricationSnapshot(historical.fabricacionSnapshot, live)).toBe(false);
    const saved = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [historical], items: [changed] });
    expect(saved.itemIdsToResolve).toEqual(new Set([historical.id]));
    const recalculated = resolveFabricacionSnapshotsIndependently({ items: saved.items, itemIdsToResolve: saved.itemIdsToResolve, resolveSnapshot: (piece) => resolve(piece) });
    expect(recalculated[0]!.fabricacionSnapshot?.glassSelection?.productId).toBe("502");
  });

  it("recalcula ancho y cantidad y conserva el resultado al reabrir", () => {
    const { historical, resolve } = scenario();
    const changed = { ...historical, ancho: 1400, cantidad: 2 };
    const prepared = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: [historical], items: [changed] });
    expect(prepared.itemIdsToResolve).toEqual(new Set([historical.id]));
    const saved = resolveFabricacionSnapshotsIndependently({ items: prepared.items, itemIdsToResolve: prepared.itemIdsToResolve, resolveSnapshot: (piece) => resolve(piece) });
    const snapshot = saved[0]!.fabricacionSnapshot!;
    expect(snapshot.input.anchoTotalMm).toBe(1400);
    expect(snapshot.input.cantidad).toBe(2);
    expect(snapshot.result.perfiles[0]!.medidaMm).toBe(historical.fabricacionSnapshot!.result.perfiles[0]!.medidaMm + 200);
    expect(snapshot.result.perfiles[0]!.cantidadPiezas).toBe(historical.fabricacionSnapshot!.result.perfiles[0]!.cantidadPiezas * 2);
    const reopened = JSON.parse(JSON.stringify(saved[0])) as CotizacionWorkflowItem;
    const unchanged = prepareFabricacionSnapshotsForQuoteSave({ existingId: "quote-1", existingItems: saved, items: [reopened] });
    expect(unchanged.itemIdsToResolve.size).toBe(0);
    expect(unchanged.items[0]!.fabricacionSnapshot).toEqual(snapshot);
  });
  it("no agrega identidad de vidrio al recalcular un snapshot histórico que no la guardó", () => {
    const { historical, newRecipe, resolve } = scenario();
    const snapshot = { ...historical.fabricacionSnapshot! };
    delete snapshot.glassSelection;
    const legacy = { ...historical, fabricacionSnapshot: snapshot };
    expect(shouldPreserveFrozenFabricationSnapshot(snapshot, resolve(legacy, newRecipe))).toBe(true);
  });
});