import {
  resolveFabricacionTrabajoSnapshotForQuoteSave,
  shouldResolveFabricationRecipesForQuoteSave,
} from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import { buildConsolidatedCubicationPautaFromSnapshots } from "@/features/cotizaciones/line-templates/types/cotizacion-cubication-consolidated";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";

function makeItemSnapshot(lengthMm = 2800) {
  return {
    lineTemplateId: 7400,
    pautaBarras: {
      calculable: true,
      barras: [{
        materialKey: "perfil:riel-01",
        codigoPerfil: "R-01",
        nombrePerfil: "Riel",
        indice: 1,
        largoComercialMm: 5800,
        despunteInicialMm: 0,
        usadoMm: lengthMm,
        perdidaCortesMm: 0,
        sobranteMm: 5800 - lengthMm,
        sobranteAprovechable: true,
        cortes: [{ componenteId: "riel", codigoPerfil: "R-01", funcion: "Riel superior", corte: null, largoMm: lengthMm }],
      }],
      advertencias: [],
      totalUsadoMm: lengthMm,
      totalPerdidaCortesMm: 0,
      totalSobranteMm: 5800 - lengthMm,
    },
  } as unknown as FabricacionCotizacionSnapshot;
}

const itemSnapshot = makeItemSnapshot();
const qaDraftSnapshot = {
  ...itemSnapshot,
  recipeId: "veratec-7400-draft",
  recipeVersion: 3,
  recipeStatus: "draft" as const,
  selectedVariant: "monolitico_4mm",
  qaPreliminary: {
    mode: "supplier_catalog_v1_qa_preliminary" as const,
    readiness: "lista_para_validar" as const,
    provenance: { sourceType: "manufacturer", sourceReference: "veratec:7400" },
  },
};
const existingGlobalSnapshot = construirFabricacionTrabajoSnapshot({
  capturedAt: "2026-09-01T12:00:00.000Z",
  items: [{
    id: "item-1",
    codigo: "V1",
    nombre: "Ventana",
    lineaComercial: "Veratec Sliding 7400",
    snapshot: itemSnapshot,
  }],
})!;

const carrier = {
  id: "item-1",
  codigo: "V1",
  nombre: "Ventana",
  lineaComercial: "Veratec Sliding 7400",
  snapshot: itemSnapshot,
};

describe("fabricacion-trabajo-snapshot lifecycle", () => {
  it("cotización histórica sin snapshots + editar notas conserva NULL y no resuelve recetas", () => {
    const existingId = "cotizacion-historica";

    expect(shouldResolveFabricationRecipesForQuoteSave(existingId)).toBe(false);
    expect(
      resolveFabricacionTrabajoSnapshotForQuoteSave({
        existingId,
        existingSnapshot: null,
        capturedAt: "2026-09-30T12:00:00.000Z",
        items: [carrier],
      })
    ).toBeNull();
  });

  it("abrir el resumen interno de una cotización histórica no consulta recetas actuales", () => {
    // El resumen de una cotización persistida solo recibe snapshots congelados; no se habilita el resolver vivo.
    expect(shouldResolveFabricationRecipesForQuoteSave("cotizacion-historica")).toBe(false);
  });

  it("histórica con snapshot por ítem y global NULL no crea un snapshot global al guardar", () => {
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      existingId: "cotizacion-historica",
      existingSnapshot: null,
      capturedAt: "2026-09-30T12:00:00.000Z",
      items: [carrier],
    });

    expect(result).toBeNull();
  });

  it("cotización nueva con receta sí captura un snapshot global", () => {
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      capturedAt: "2026-09-30T12:00:00.000Z",
      items: [carrier],
    });

    expect(result).not.toBeNull();
    expect(result?.bars).toHaveLength(1);
    expect(result?.bars[0].cortes[0]?.codigoItem).toBe("V1");
  });

  it("cotización nueva empaqueta antes con el SKU/largo comercial explícito", () => {
    const profileSnapshot = makeItemSnapshot(3000);
    profileSnapshot.pautaBarras!.barras[0]!.codigoPerfil = "67401VER";
    profileSnapshot.pautaBarras!.barras[0]!.cortes[0]!.codigoPerfil = "67401VER";
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      capturedAt: "2026-10-04T12:00:00.000Z",
      items: [{
        ...carrier,
        snapshot: profileSnapshot,
        supplierFamilyKey: "veratec:sliding-7400",
        requireSupplierPresentation: true,
        supplierPresentationSelections: [{
          technicalCode: "67401VER", status: "resolved", presentationId: "presentacion-negra",
          providerKey: "xelena", supplierSku: "67401VER200", finishCode: "200", finishName: "Negro",
          commercialLengthMm: 6800,
        }],
      }],
    });

    expect(result?.bars[0]).toMatchObject({
      supplierPresentationId: "presentacion-negra",
      supplierSku: "67401VER200",
      largoComercialMm: 6800,
    });
  });

  it("la revisión conjunta usa el largo de la presentación resuelta antes del packing", () => {
    const technicalSnapshot = makeItemSnapshot(3000);
    technicalSnapshot.pautaBarras!.barras[0]!.codigoPerfil = "67401VER";
    technicalSnapshot.pautaBarras!.barras[0]!.cortes[0]!.codigoPerfil = "67401VER";
    const reviewed = buildConsolidatedCubicationPautaFromSnapshots([{
      itemId: "item-1",
      codigo: "V1",
      lineaComercial: "Veratec Sliding 7400",
      snapshot: ({
          v: 2, source: "auto", lineTemplateId: "7400", system: "corredera_2_hojas",
          status: "lista_para_validar", widthMm: 1200, heightMm: 1500, quantity: 1,
          capturedAt: "2026-10-05T12:00:00.000Z", cuts: [], bars: [], totalUsedMm: 0,
          totalWasteMm: 0, wastePct: 0, totalProfilesLinealMm: 3000, glass: null,
          accessoryUnits: 0, estimationKind: "recipe",
      } as unknown) as CotizacionItemCubicationSnapshot,
      catalogLineKey: "ventora:veratec-7400-corredera",
      fabricacionSnapshot: {
        ...technicalSnapshot,
        supplierFamilyKey: "veratec:sliding-7400",
      } as unknown as FabricacionCotizacionSnapshot,
      colorHex: "#f0eeeb",
    }], null, {
      supplierPresentationResolutionEnabled: true,
      supplierPresentationSelections: {
        "item-1": [{
          technicalCode: "67401VER", status: "resolved", presentationId: "private-6000",
          providerKey: "taller:3", supplierSku: "QA-ORG3-7401-BLANCO-6000-20261005",
          finishCode: null, finishName: "Blanco", commercialLengthMm: 6000,
        }],
      },
    });

    expect(reviewed.trabajoSnapshot?.bars[0]).toMatchObject({
      supplierPresentationId: "private-6000",
      supplierSku: "QA-ORG3-7401-BLANCO-6000-20261005",
      largoComercialMm: 6000,
    });
  });

  it("la pauta global nueva conserva procedencia de la receta draft preliminar QA", () => {
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      capturedAt: "2026-10-01T12:00:00.000Z",
      items: [{ ...carrier, snapshot: qaDraftSnapshot }],
    });

    expect(result?.qaPreliminary).toEqual({
      mode: "supplier_catalog_v1_qa_preliminary",
      items: [{
        itemId: "item-1",
        recipeId: "veratec-7400-draft",
        recipeVersion: 3,
        variantKey: "monolitico_4mm",
        recipeStatus: "draft",
        readiness: "lista_para_validar",
        sourceType: "manufacturer",
        sourceReference: "veratec:7400",
      }],
    });
  });

  it("reabrir una cotización conserva el snapshot global aunque la receta haya cambiado", () => {
    const reopened = resolveFabricacionTrabajoSnapshotForQuoteSave({
      existingId: "cotizacion-historica",
      existingSnapshot: existingGlobalSnapshot,
      capturedAt: "2026-09-30T12:00:00.000Z",
      items: [{
        ...carrier,
        snapshot: makeItemSnapshot(3000),
        requireSupplierPresentation: true,
        supplierPresentationSelections: [{
          technicalCode: "R-01", status: "resolved", presentationId: "new-sku",
          providerKey: "xelena", supplierSku: "NEW-6800", finishCode: "200", finishName: "Negro",
          commercialLengthMm: 6800,
        }],
      }],
    });

    expect(reopened).toBe(existingGlobalSnapshot);
  });

  it("una cotización sin fabricación sigue siendo guardable sin snapshot", () => {
    const result = resolveFabricacionTrabajoSnapshotForQuoteSave({
      capturedAt: "2026-09-30T12:00:00.000Z",
      items: [],
    });

    expect(result).toBeNull();
    expect(shouldResolveFabricationRecipesForQuoteSave()).toBe(true);
  });
});
