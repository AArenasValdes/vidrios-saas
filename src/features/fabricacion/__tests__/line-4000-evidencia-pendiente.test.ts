import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { prepareFabricacionSnapshotsForQuoteSave } from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import { LINE_4000_CATALOG_KEY } from "@/features/fabricacion/fixtures/line-4000-corredera-recipe";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolveUniversalPricedLineFallback } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const templateId = 45;
const meta = {
  catalogLineKey: LINE_4000_CATALOG_KEY, lineTemplateId: String(templateId),
  sistema: "Corredera", fabricacionTipologia: "corredera", fabricacionHojas: 2,
  fabricacionModulos: 2, fabricacionVariante: "2h",
};
const item: CotizacionWorkflowItem = {
  id: "ventana", tipoItem: "componente", tipo: "Ventana", codigo: "V1", nombre: "Ventana",
  lineaComercial: "Línea 4000", descripcion: "", unidad: "unidad", cantidad: 1,
  ancho: 1200, alto: 1000, vidrio: "Monolítico 4 mm", precioUnitario: 75000, subtotal: 75000,
  observaciones: encodeCotizacionItemPresentationMeta(meta), fabricacionSnapshot: null,
};
const base = resolveUniversalPricedLineFallback({
  catalogKey: LINE_4000_CATALOG_KEY, lineTemplateId: templateId, organizationId: 1,
  lineName: "Línea 4000", variant: "2h", leavesCount: 2, recipes: [],
})!;
const own: FabricationRecipeRecord = {
  ...base, id: "taller", scope: "organization", organizationId: 1, status: "validated",
  sourceType: "manual", sourceReference: "blank-start",
  definition: { ...base.definition, perfiles: base.definition.perfiles.map((p, i) =>
    i === 0 ? { ...p, reglaMedida: { ...p.reglaMedida, ajusteMm: -12 } } : p) },
};
const resolve = (piece: CotizacionWorkflowItem, recipes: FabricationRecipeRecord[] = []) =>
  resolveFabricacionDespieceForQuoteItem({ item: piece, recipes, organizationId: 1 });
const pending = { estado: "receta_incompleta", formal: null, cubication: null, barsAvailable: false };

it.each([[1200, 1000], [1400, 1100]])("L4000 documental queda pendiente a %i × %i", (ancho, alto) => {
  const result = resolve({ ...item, ancho, alto });
  expect(result.estado).toBe("receta_incompleta");
  expect(result).toMatchObject(pending);
});

it.each([
  { sourceReference: base.id }, { sourceReference: base.sourceReference },
  { sourceReference: "blank-start", parentRecipeId: base.id },
  { sourceReference: "taller:personalizada:" + encodeURIComponent(base.id) },
  { sourceReference: "origen-desconocido" }, { sourceReference: "blank-start" },
])("bloquea copia o procedencia ambigua %j", (origin) => {
  const copy: FabricationRecipeRecord = { ...own, id: "copia", sourceType: "copied", ...origin };
  expect(resolve(item, [copy])).toMatchObject(pending);
});

it("reconoce el registro documental legacy aun sin clave de catálogo", () => {
  const legacy = { ...item, observaciones: encodeCotizacionItemPresentationMeta({
    ...meta, catalogLineKey: undefined, fabricationRecipeId: "semilla",
  }) };
  expect(resolve(legacy, [{ ...own, id: "semilla", sourceReference: base.sourceReference }])).toMatchObject(pending);
});

it.each([[3, "3h_3rieles"], [4, "4h_2rieles"], [4, "4h_4rieles"]] as const)(
  "conserva el pendiente preexistente de %i hojas, variante %s", (leaves, variant) => {
    const other = { ...item, observaciones: encodeCotizacionItemPresentationMeta({
      ...meta, fabricacionHojas: leaves, fabricacionModulos: leaves, fabricacionVariante: variant,
    }) };
    const result = resolve(other);
    expect(result.estado).toBe("receta_incompleta");
    expect(result.recipe?.definition.identidad.hojas).toBe(leaves);
    expect(result.recipe?.variant).toBe(variant);
    expect(result.message).toMatch(/vidrio/i);
  }
);

it("conserva los cortes independientes y exige procedencia dentro de la organización y línea", () => {
  const copy = { ...own, id: "mi-copia", sourceType: "copied" as const, sourceReference: own.id };
  const selected = { ...item, observaciones: encodeCotizacionItemPresentationMeta({ ...meta, fabricationRecipeId: copy.id }) };
  const actual = resolve(selected, [own, copy]);
  expect(actual.estado).toBe("calculado");
  expect(actual.formal?.recipeId).toBe(copy.id);
  expect(actual.formal?.result.perfiles[0]?.medidaMm).toBe(1188);
  expect(resolve(selected, [{ ...own, organizationId: 2 }, copy])).toMatchObject(pending);
  expect(resolve(selected, [{ ...own, lineTemplateId: 999 }, copy])).toMatchObject(pending);
  expect(resolve(item, [{ ...own, organizationId: 2 }])).toMatchObject(pending);
  const alias = { ...item, observaciones: encodeCotizacionItemPresentationMeta({
    ...meta, catalogLineKey: "ventora:arquetipo-l4000-corredera-2h",
  }) };
  const unknown = { ...own, sourceReference: null, definition: { ...own.definition,
    identidad: { ...own.definition.identidad, codigo: "codigo-privado" } } };
  expect(resolve(alias, [unknown])).toMatchObject(pending);
});

it("preserva el histórico y su precio al reabrir; descarta cortes con nuevas medidas o vidrio", () => {
  const frozen = construirSnapshotFabricacionCotizacion({ recipe: base, entrada: {
    anchoTotalMm: 1200, altoTotalMm: 1000, hojas: 2, modulos: 2, variante: "2h", cantidad: 1,
  } });
  frozen.glassSelection = { productId: "cristal-A", displayName: item.vidrio, technicalSpec: null };
  const original = { ...item, fabricacionSnapshot: frozen,
    observaciones: encodeCotizacionItemPresentationMeta({ ...meta, vidrioLineTemplateId: "cristal-A" }) };
  const reopened = { ...original, precioUnitario: 82000, subtotal: 82000 };
  expect(resolve(reopened).formal).toEqual(frozen);
  const prepare = (next: CotizacionWorkflowItem) => prepareFabricacionSnapshotsForQuoteSave({
    existingId: "cotizacion", existingItems: [original], items: [next],
  });
  expect(prepare(reopened).items[0]).toMatchObject({ precioUnitario: 82000, fabricacionSnapshot: frozen });
  for (const edit of [{ ancho: 1400 }, { alto: 1100 }, { vidrio: "Termopanel 15 mm" },
    { observaciones: encodeCotizacionItemPresentationMeta({ ...meta, vidrioLineTemplateId: "cristal-B" }) }]) {
    const changed = { ...original, ...edit };
    expect(resolve(changed)).toMatchObject(pending);
    expect(prepare(changed).items[0].fabricacionSnapshot).toBeNull();
  }
});
