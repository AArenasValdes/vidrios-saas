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
  it("reempaca dos ítems compatibles en una barra y conserva trazabilidad por ítem", () => {
    const result = construirFabricacionTrabajoSnapshot({
      capturedAt: "2026-09-30T00:00:00.000Z",
      items: [item("a"), item("b")],
    });

    expect(result).toMatchObject({ totalBars: 1, itemCountWithPauta: 2, totalProfilesLinealMm: 5600 });
    expect(result?.bars[0].cortes.map((cut) => cut.codigoItem)).toEqual(["A", "B"]);
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

  it("no crea una pauta conjunta incompleta si un corte no cabe en su barra", () => {
    const tooShort = snapshot({ pautaBarras: {
      ...snapshot().pautaBarras,
      barras: snapshot().pautaBarras!.barras.map((bar) => ({ ...bar, largoComercialMm: 2500 })),
    } });

    expect(construirFabricacionTrabajoSnapshot({ items: [item("a", "#ffffff", tooShort)] })).toBeNull();
  });
});
