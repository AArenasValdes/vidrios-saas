import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    lineTemplateId: 7,
    pautaBarras: {
      calculable: true,
      barras: [
        {
          materialKey: "perfil:riel-01",
          codigoPerfil: "R-01",
          nombrePerfil: "Riel",
          indice: 1,
          largoComercialMm: 5800,
          despunteInicialMm: 0,
          usadoMm: 2800,
          perdidaCortesMm: 0,
          sobranteMm: 3000,
          sobranteAprovechable: true,
          cortes: [{ componenteId: "riel", codigoPerfil: "R-01", funcion: "Riel superior", corte: null, largoMm: 2800 }],
        },
      ],
      advertencias: [],
      totalUsadoMm: 2800,
      totalPerdidaCortesMm: 0,
      totalSobranteMm: 3000,
    },
    ...overrides,
  } as unknown as FabricacionCotizacionSnapshot;
}

const item = (id: string, colorHex = "#ffffff", current = snapshot()) => ({
  id,
  codigo: id.toUpperCase(),
  nombre: `Ventana ${id}`,
  lineaComercial: "Veratec 7400",
  colorHex,
  catalogLineKey: "ventora:veratec-7400-corredera",
  snapshot: current,
});

describe("consolidación de pauta por trabajo", () => {
  it("empaqueta 2 cortes de 2800 mm en una barra de 5800 mm y conserva V1/V2", () => {
    const result = construirFabricacionTrabajoSnapshot({
      capturedAt: "2026-09-30T00:00:00.000Z",
      items: [item("v1"), item("v2")],
    });

    expect(result).toMatchObject({ totalBars: 1, itemCountWithPauta: 2, totalProfilesLinealMm: 5600, totalWasteMm: 200 });
    expect(result?.bars[0]).toMatchObject({ usadoMm: 5600, sobranteMm: 200 });
    expect(result?.bars[0].cortes.map((cut) => [cut.itemId, cut.codigoItem])).toEqual([["v1", "V1"], ["v2", "V2"]]);
  });

  it("expande cantidad 2 de un ítem y vuelve a empacar ambos cortes juntos", () => {
    const perItemSnapshot = snapshot({
      pautaBarras: {
        ...snapshot().pautaBarras,
        barras: [{
          ...snapshot().pautaBarras!.barras[0]!,
          usadoMm: 5600,
          sobranteMm: 200,
          cortes: [
            ...snapshot().pautaBarras!.barras[0]!.cortes,
            ...snapshot().pautaBarras!.barras[0]!.cortes,
          ],
        }],
        totalUsadoMm: 5600,
        totalSobranteMm: 200,
      },
    });
    const result = construirFabricacionTrabajoSnapshot({ items: [item("v1", "#ffffff", perItemSnapshot)] });

    expect(result).toMatchObject({ totalBars: 1, itemCountWithPauta: 1, totalProfilesLinealMm: 5600, totalWasteMm: 200 });
    expect(result?.bars[0]?.cortes.map((cut) => [cut.itemId, cut.codigoItem])).toEqual([["v1", "V1"], ["v1", "V1"]]);
  });

  it("no comparte una barra entre materialKey distintos", () => {
    const otherMaterial = snapshot({ pautaBarras: {
      ...snapshot().pautaBarras,
      barras: snapshot().pautaBarras!.barras.map((bar) => ({ ...bar, materialKey: "perfil:riel-02" })),
    } });
    const result = construirFabricacionTrabajoSnapshot({ items: [item("v1"), item("v2", "#ffffff", otherMaterial)] });

    expect(result?.totalBars).toBe(2);
    expect(new Set(result?.bars.map((bar) => bar.materialKey))).toEqual(new Set(["perfil:riel-01", "perfil:riel-02"]));
    expect(result?.bars.every((bar) => new Set(bar.cortes.map((cut) => cut.itemId)).size === 1)).toBe(true);
  });

  it("conserva varias asociaciones explícitas del mismo insumo aunque comparta barra", () => {
    const secondLineSnapshot = snapshot({ lineTemplateId: 8 });
    const result = construirFabricacionTrabajoSnapshot({
      items: [
        item("a", "#ffffff"),
        {
          ...item("b", "#ffffff", secondLineSnapshot),
          catalogLineKey: "ventora:otra-familia",
        },
      ],
    });

    expect(result?.totalBars).toBe(1);
    expect(result?.bars[0]?.lineaIds).toEqual(expect.arrayContaining([7, 8]));
    expect(result?.sourcePresentations).toHaveLength(2);
    expect(result?.sourcePresentations.map((source) => source.lineTemplateId)).toEqual([7, 8]);
    expect(result?.sourcePresentations.map((source) => source.catalogLineKey)).toEqual([
      "ventora:veratec-7400-corredera",
      "ventora:otra-familia",
    ]);
    expect(new Set(result?.sourcePresentations.map((source) => source.presentationKey)).size).toBe(1);
  });

  it("separa acabados y largos comerciales sin inferir un SKU", () => {
    const longBar = snapshot({ pautaBarras: {
      ...snapshot().pautaBarras,
      barras: snapshot().pautaBarras!.barras.map((bar) => ({ ...bar, largoComercialMm: 6000 })),
    } });
    const result = construirFabricacionTrabajoSnapshot({
      items: [item("a", "#ffffff"), item("b", "#000000"), item("c", "#ffffff", longBar)],
    });

    expect(result?.totalBars).toBe(3);
    expect(new Set(result?.bars.map((bar) => bar.acabadoKey))).toEqual(new Set(["#ffffff", "#000000"]));
    expect(new Set(result?.bars.map((bar) => bar.largoComercialMm))).toEqual(new Set([5800, 6000]));
    expect(new Set(result?.sourcePresentations.map((source) => source.technicalInputKey))).toEqual(new Set(["perfil:riel-01"]));
    expect(new Set(result?.sourcePresentations.map((source) => `${source.finishKey}:${source.commercialLengthMm}`))).toEqual(
      new Set(["#ffffff:5800", "#000000:5800", "#ffffff:6000"])
    );
  });

  it("usa el SKU de 5,8/6,8 m antes del packing y obtiene distinto número de barras", () => {
    const longCuts = snapshot({ pautaBarras: {
      ...snapshot().pautaBarras,
      barras: [{
        ...snapshot().pautaBarras!.barras[0]!,
        codigoPerfil: "67401VER",
        usadoMm: 3000,
        sobranteMm: 2800,
        cortes: [{ ...snapshot().pautaBarras!.barras[0]!.cortes[0]!, codigoPerfil: "67401VER", largoMm: 3000 }],
      }],
    } });
    const selectedItem = (id: string, sku: string, presentationId: string, commercialLengthMm: number) => ({
      ...item(id, "#ffffff", longCuts),
      supplierFamilyKey: "veratec:sliding-7400",
      requireSupplierPresentation: true,
      supplierPresentationSelections: [{
        technicalCode: "67401VER",
        status: "resolved" as const,
        presentationId,
        providerKey: "xelena",
        supplierSku: sku,
        finishCode: sku.endsWith("200") ? "200" : "000",
        finishName: sku.endsWith("200") ? "Negro" : "Blanco",
        commercialLengthMm,
      }],
    });

    const white = construirFabricacionTrabajoSnapshot({ items: [selectedItem("w1", "67401VER000", "p-white", 5800), selectedItem("w2", "67401VER000", "p-white", 5800)] });
    const black = construirFabricacionTrabajoSnapshot({ items: [selectedItem("b1", "67401VER200", "p-black", 6800), selectedItem("b2", "67401VER200", "p-black", 6800)] });

    expect(white).toMatchObject({ totalBars: 2, totalWasteMm: 5600 });
    expect(white?.bars.every((bar) => bar.supplierPresentationId === "p-white" && bar.supplierSku === "67401VER000" && bar.largoComercialMm === 5800)).toBe(true);
    expect(black).toMatchObject({ totalBars: 1, totalWasteMm: 800 });
    expect(black?.bars[0]).toMatchObject({ supplierPresentationId: "p-black", supplierSku: "67401VER200", largoComercialMm: 6800 });
    expect(black?.bars[0]?.cortes.map((cut) => cut.itemId)).toEqual(["b1", "b2"]);
  });

  it("no reutiliza el largo de receta cuando la presentación seleccionada carece de largo", () => {
    const longCuts = snapshot({ pautaBarras: {
      ...snapshot().pautaBarras,
      barras: snapshot().pautaBarras!.barras.map((bar) => ({
        ...bar,
        codigoPerfil: "67401VER",
        cortes: bar.cortes.map((cut) => ({ ...cut, codigoPerfil: "67401VER" })),
      })),
    } });
    const result = construirFabricacionTrabajoSnapshot({
      items: [{
        ...item("missing", "#ffffff", longCuts),
        requireSupplierPresentation: true,
        supplierPresentationSelections: [{
          technicalCode: "67401VER", status: "resolved", presentationId: "p-no-length", providerKey: "xelena",
          supplierSku: "67401VER000", finishCode: "000", finishName: "Blanco", commercialLengthMm: null,
          reason: "La presentación no tiene largo comercial configurado.",
        }],
      }],
    });

    expect(result?.bars).toEqual([]);
    expect(result?.missingPresentations).toEqual([expect.objectContaining({
      technicalCode: "67401VER", supplierSku: "67401VER000", reason: "La presentación no tiene largo comercial configurado.",
    })]);
  });

  it("no crea una pauta conjunta incompleta si un corte no cabe en su barra", () => {
    const tooShort = snapshot({ pautaBarras: {
      ...snapshot().pautaBarras,
      barras: snapshot().pautaBarras!.barras.map((bar) => ({ ...bar, largoComercialMm: 2500 })),
    } });

    expect(construirFabricacionTrabajoSnapshot({ items: [item("a", "#ffffff", tooShort)] })).toBeNull();
  });
});
