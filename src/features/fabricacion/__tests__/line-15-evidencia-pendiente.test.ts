import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolveUniversalPricedLineFallback } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { prepareFabricacionSnapshotsForQuoteSave } from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";

const catalogKey = "ventora:serie-15-corredera-2h";
const source = "ventora:line-15-corredera:2h:v1";
function itemFor(ancho: number, alto: number, vidrio = "Monolítico 4 mm"): CotizacionWorkflowItem {
  return { id:"l15", codigo:"V1", tipo:"Ventana", lineaComercial:"Línea 15", vidrio, nombre:"Ventana", descripcion:"", ancho, alto, cantidad:2, unidad:"unidad", precioUnitario:50000, subtotal:100000, tipoItem:"componente", fabricacionSnapshot:null, observaciones:encodeCotizacionItemPresentationMeta({lineTemplateId:"101",catalogLineKey:catalogKey,sistema:"Corredera",fabricacionTipologia:"corredera",fabricacionHojas:2,fabricacionModulos:2,fabricacionVariante:"2h"}) } as CotizacionWorkflowItem;
}
const fallback = () => resolveUniversalPricedLineFallback({catalogKey,lineTemplateId:101,organizationId:1,lineName:"Línea 15",variant:"2h",leavesCount:2,recipes:[]})!;
const resolve = (item: CotizacionWorkflowItem, recipes: ReturnType<typeof fallback>[] = []) => resolveFabricacionDespieceForQuoteItem({item,recipes,organizationId:1,lineTemplateId:101,lineCatalogKey:catalogKey});

describe("L15 2H con fuente de pauta sin resolver", () => {
  it.each([[1200,1000,"Monolítico 4 mm"],[1600,1200,"Monolítico 4 mm"],[1200,1000,"DVH 6 mm"]])("mantiene pendiente la pauta documental para %i×%i, %s", (ancho,alto,vidrio) => {
    const result = resolve(itemFor(ancho,alto,vidrio));
    expect(result.estado).toBe("receta_incompleta");
    expect(result.formal).toBeNull();
    expect(result.cubication).toBeNull();
    expect(result.barsAvailable).toBe(false);
  });
  it("también bloquea la copia documental persistida y mantiene la receta del taller", () => {
    const base = fallback();
    expect(base.sourceReference).toBe(source);
    const seeded = {...base,id:"seed",scope:"organization" as const,organizationId:1};
    expect(resolve(itemFor(1200,1000),[seeded]).estado).toBe("receta_incompleta");
    const own = {...seeded,id:"own",sourceType:"manual" as const,sourceReference:"blank-start",status:"validated" as const,definition:JSON.parse(JSON.stringify(seeded.definition)) as typeof seeded.definition};
    own.definition.perfiles[0]!.reglaMedida.ajusteMm += 5;
    const result = resolve(itemFor(1200,1000),[own]);
    expect(result.estado).toBe("calculado");
    expect(result.formal?.recipeId).toBe("own");
    expect(result.formal?.input.cantidad).toBe(2);
    expect(result.formal?.result.perfiles[0]?.medidaMm).toBe(1205);
  });
  it.each(["canonical-id", "persisted-id", "parent-id", "literal-manual", "ambiguous-copy", "ambiguous-manual", "saved-document-copy"])("mantiene pendiente la copia reconocible o ambigua %s", (kind) => {
    const base = fallback();
    const original = {...base,id:"original-guardada",scope:"organization" as const,organizationId:1};
    const reference = kind === "canonical-id" ? base.id : kind === "persisted-id" ? original.id : kind === "literal-manual" ? source : kind === "saved-document-copy" ? `taller:personalizada:${encodeURIComponent(source)}` : "referencia-desconocida";
    const copy = {...original,id:"copia",sourceReference:reference,sourceType:(kind === "literal-manual" || kind === "saved-document-copy" || kind === "ambiguous-manual" ? "manual" : "copied") as "manual" | "copied",parentRecipeId:kind === "parent-id" ? original.id : null,status:"validated" as const};
    const item = itemFor(1200,1000);
    item.observaciones = encodeCotizacionItemPresentationMeta({...decodeCotizacionItemPresentationMeta(item.observaciones), fabricationRecipeId: copy.id});
    const result = resolve(item, kind === "persisted-id" || kind === "parent-id" ? [original,copy] : [copy]);
    expect(result.estado).toBe("receta_incompleta");
    expect(result.formal).toBeNull();
  });
  it("respeta una copia con procedencia independiente verificable del taller", () => {
    const base = fallback();
    const own = {...base,id:"propia-original",scope:"organization" as const,organizationId:1,sourceType:"manual" as const,sourceReference:"blank-start",status:"validated" as const};
    const copy = {...own,id:"propia-copia",sourceType:"copied" as const,sourceReference:own.id,parentRecipeId:own.id};
    const item = itemFor(1200,1000);
    item.observaciones = encodeCotizacionItemPresentationMeta({...decodeCotizacionItemPresentationMeta(item.observaciones),fabricationRecipeId:copy.id});
    const result = resolve(item,[own,copy]);
    expect(result.estado).toBe("calculado");
    expect(result.formal?.recipeId).toBe(copy.id);
  });
  it("conserva un snapshot histórico al reabrir cuando la pauta base queda pendiente", () => {
    const base = fallback();
    const own = {...base,id:"historica",scope:"organization" as const,organizationId:1,sourceType:"manual" as const,sourceReference:"blank-start",status:"validated" as const};
    const item = itemFor(1200,1000);
    const snapshot = resolve(item,[own]).formal;
    expect(snapshot).toBeTruthy();
    const reopened = resolve({...item,fabricacionSnapshot:snapshot},[]);
    expect(reopened.formal).toEqual(snapshot);
    for (const edit of [{ancho:1600}, {alto:1200}, {cantidad:3}]) {
      const stale = resolve({...item,...edit,fabricacionSnapshot:snapshot},[]);
      expect(stale.formal).toBeNull();
      expect(stale.cubication).toBeNull();
    }
    const glassSnapshot = {...snapshot!,glassSelection:{productId:null,displayName:item.vidrio,technicalSpec:null}};
    expect(resolve({...item,vidrio:"Monolítico 5 mm",fabricacionSnapshot:glassSnapshot},[]).formal).toBeNull();
    const newSelection = {...item,observaciones:encodeCotizacionItemPresentationMeta({...decodeCotizacionItemPresentationMeta(item.observaciones),fabricationRecipeId:"otra-receta"}),fabricacionSnapshot:snapshot};
    expect(resolve(newSelection,[]).formal).toBeNull();
    const previous = {...item,fabricacionSnapshot:snapshot};
    const prepared = prepareFabricacionSnapshotsForQuoteSave({existingId:"quote-1",existingItems:[previous],items:[{...previous,ancho:1600}]});
    expect(prepared.itemIdsToResolve.has(item.id)).toBe(true);
    expect(prepared.items[0]?.fabricacionSnapshot).toBeNull();
    const changed = resolve(prepared.items[0]!,[]);
    expect(changed.estado).toBe("receta_incompleta");
    expect(changed.formal).toBeNull();
  });
  it("no utiliza la receta privada de otra organización", () => {
    const foreign = {...fallback(),id:"ajena",scope:"organization" as const,organizationId:2,sourceType:"manual" as const,sourceReference:"taller:personalizada:ajena",status:"validated" as const};
    const result = resolve(itemFor(1200,1000),[foreign]);
    expect(result.estado).toBe("receta_incompleta");
    expect(result.formal).toBeNull();
  });
});
