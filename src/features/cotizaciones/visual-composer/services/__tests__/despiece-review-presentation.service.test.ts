import { VERATEC_7400_CATALOG_KEY } from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import type { FabricacionDespieceCotizacionResult } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";

import {
  groupMissingPresentations,
  resolveDespieceGlassSummaryMetrics,
  resolveDespieceReviewSelectionPrompt,
} from "../despiece-review-presentation.service";

const multipleRecipes: FabricacionDespieceCotizacionResult = {
  estado: "multiples_recetas",
  formal: null,
  cubication: null,
  recipe: null,
  barsAvailable: false,
  preliminary: false,
  message: "Hay varias recetas compatibles; elige variante o herraje.",
};

describe("resolveDespieceReviewSelectionPrompt", () => {
  it("pide vidrio 4 mm para resolver Veratec sin mostrar variantes bloqueadas como disponibles", () => {
    expect(
      resolveDespieceReviewSelectionPrompt({
        resolution: multipleRecipes,
        catalogKey: VERATEC_7400_CATALOG_KEY,
        glassName: "",
      })
    ).toEqual({
      label: "Elegir vidrio",
      message:
        "Vuelve a Componentes y elige vidrio monolítico de 4 mm para calcular Veratec 7400. Las variantes de termopanel siguen pendientes de validación.",
    });
  });

  it("conserva la instrucción genérica para varias recetas de otros catálogos", () => {
    expect(
      resolveDespieceReviewSelectionPrompt({
        resolution: multipleRecipes,
        catalogKey: "ventora:otra-linea",
        glassName: "",
      })
    ).toEqual({
      label: "Elegir variante",
      message: multipleRecipes.message,
    });
  });

  it("no presenta selección cuando no hay ambigüedad de recetas", () => {
    expect(
      resolveDespieceReviewSelectionPrompt({
        resolution: { ...multipleRecipes, estado: "sin_receta" },
        catalogKey: VERATEC_7400_CATALOG_KEY,
        glassName: "",
      })
    ).toBeNull();
  });
});

describe("groupMissingPresentations", () => {
  it("agrupa el mismo perfil pendiente repetido por cada corte y conserva otros faltantes", () => {
    const repeated = {
      itemId: "item-1",
      technicalCode: "7401",
      finishKey: "#ffffff",
      reason: "Hay más de una presentación confirmada; falta seleccionar proveedor/presentación.",
      supplierSku: null,
    };
    expect(groupMissingPresentations([
      repeated,
      repeated,
      repeated,
      { ...repeated, itemId: "item-2" },
      { ...repeated, technicalCode: "7402", reason: "No hay presentación confirmada." },
    ])).toEqual([
      { technicalCode: "7401", finishKey: "#ffffff", reason: repeated.reason, supplierSku: null, cutCount: 4 },
      { technicalCode: "7402", finishKey: "#ffffff", reason: "No hay presentación confirmada.", supplierSku: null, cutCount: 1 },
    ]);
  });
});

describe("resolveDespieceGlassSummaryMetrics", () => {
  it("mantiene vidrio calculado y aprovechamiento pendientes cuando vidrios está vacío", () => {
    expect(
      resolveDespieceGlassSummaryMetrics({
        previewGlassTotalM2: null,
        areaVidrioM2: 0,
        areaVanoM2: 1.68,
      })
    ).toEqual({
      areaVidrioCalculadaM2: null,
      areaComercialVanoM2: 1.68,
      aprovechamientoVidrioPct: null,
    });
  });

  it("calcula superficie técnica y aprovechamiento real cuando existen vidrios acreditados", () => {
    expect(
      resolveDespieceGlassSummaryMetrics({
        previewGlassTotalM2: 1.42,
        areaVidrioM2: null,
        areaVanoM2: 1.68,
      })
    ).toEqual({
      areaVidrioCalculadaM2: 1.42,
      areaComercialVanoM2: 1.68,
      aprovechamientoVidrioPct: 85,
    });
  });

  it("usa areaVidrioM2 de snapshot histórico cuando preview no está presente", () => {
    expect(
      resolveDespieceGlassSummaryMetrics({
        previewGlassTotalM2: null,
        areaVidrioM2: 1.44,
        areaVanoM2: 1.8,
      })
    ).toEqual({
      areaVidrioCalculadaM2: 1.44,
      areaComercialVanoM2: 1.8,
      aprovechamientoVidrioPct: 80,
    });
  });
});
