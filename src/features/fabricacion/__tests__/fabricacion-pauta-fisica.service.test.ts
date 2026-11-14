import { construirFabricacionTrabajoSnapshot } from "../services/fabricacion-trabajo-snapshot.service";
import { evaluarPautaFisicaTrabajo } from "../services/fabricacion-pauta-fisica.service";
import type { FabricacionCotizacionSnapshot, FabricacionParametrosFisicos } from "../types/fabricacion-snapshot";

const confirmed = (kerf: number, trim = 0): FabricacionParametrosFisicos => ({
  estado: "confirmado", perdidaCorteMm: kerf, despunteInicialMm: trim,
  procedimiento: "por_pieza", fuente: "Prueba de taller", largosComercialesConfirmados: true,
});
function item(id: string, kerf: number, params?: FabricacionParametrosFisicos, length = 1500, barLength = 6000) {
  const cuts = [0, 1].map(() => ({ componenteId: "jamba", codigoPerfil: "2503", funcion: "Jamba", corte: null, largoMm: length }));
  const trim = params?.despunteInicialMm ?? 0;
  const used = trim + cuts.length * (length + kerf);
  const snapshot = {
    lineTemplateId: 207, pautaBarras: { calculable: true, parametrosFisicos: params, barras: [{
      materialKey: "l25:2503", codigoPerfil: "2503", nombrePerfil: "Jamba", indice: 1,
      largoComercialMm: barLength, despunteInicialMm: trim, usadoMm: used,
      perdidaCortesMm: kerf * cuts.length, sobranteMm: barLength - used, sobranteAprovechable: true, cortes: cuts,
    }] },
  } as unknown as FabricacionCotizacionSnapshot;
  return { id, codigo: id.toUpperCase(), nombre: `Ventana ${id}`, lineaComercial: "L25", colorHex: "#fff", snapshot };
}

describe("pauta física de barras compartida", () => {
  it("1388: conserva 4 piezas en una barra teórica y en dos con kerf confirmado", () => {
    const items = [item("v1", 0), item("v3", 0)];
    const before = JSON.stringify(items);
    const theoretical = construirFabricacionTrabajoSnapshot({ items })!;
    expect(theoretical.bars).toHaveLength(1);
    expect(theoretical.bars[0]).toMatchObject({ usadoMm: 6000, sobranteMm: 0 });
    expect(theoretical.bars[0]!.cortes.map((cut) => cut.itemId)).toEqual(["v1", "v1", "v3", "v3"]);
    expect(evaluarPautaFisicaTrabajo(theoretical)).toBe("teorica");
    expect(JSON.stringify(items)).toBe(before);

    const physical = construirFabricacionTrabajoSnapshot({ items: [item("v1", 3, confirmed(3)), item("v3", 3, confirmed(3))] })!;
    expect(physical.bars).toHaveLength(2);
    expect(physical.bars.flatMap((bar) => bar.cortes)).toHaveLength(4);
    expect(evaluarPautaFisicaTrabajo(physical)).toBe("confirmada");
    for (const bar of physical.bars) {
      expect(bar.usadoMm + bar.sobranteMm).toBe(bar.largoComercialMm);
      expect(bar.usadoMm).toBe(bar.despunteInicialMm + bar.cortes.reduce((sum, cut) => sum + cut.largoMm, 0) + bar.cortes.length * bar.perdidaCorteMm);
    }
  });

  it("detecta exceso, pérdida de cortes y separa reglas físicas y largos", () => {
    const a = item("a", 0, confirmed(0), 1500, 5800);
    const b = item("b", 0, confirmed(0), 1500, 6800);
    const c = item("c", 3, confirmed(3, 10), 1500, 5800);
    const result = construirFabricacionTrabajoSnapshot({ items: [a, b, c] })!;
    expect(result.bars).toHaveLength(3);
    expect(new Set(result.bars.map((bar) => bar.largoComercialMm))).toEqual(new Set([5800, 6800]));
    expect(result.bars.flatMap((bar) => bar.cortes)).toHaveLength(6);
    expect(evaluarPautaFisicaTrabajo(result)).toBe("confirmada");
    const corrupt = structuredClone(result);
    corrupt.bars[0]!.usadoMm = corrupt.bars[0]!.largoComercialMm + 1;
    expect(evaluarPautaFisicaTrabajo(corrupt)).toBe("incompatible");
    expect(construirFabricacionTrabajoSnapshot({ items: [item("exceso", 0, confirmed(0), 6001)] })).toBeNull();
  });
});
