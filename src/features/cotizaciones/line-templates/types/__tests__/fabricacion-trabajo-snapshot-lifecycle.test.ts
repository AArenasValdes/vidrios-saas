import {
  resolveFabricacionTrabajoSnapshotForQuoteSave,
  shouldResolveFabricationRecipesForQuoteSave,
} from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";

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

  it("reabrir una cotización conserva el snapshot global aunque la receta haya cambiado", () => {
    const reopened = resolveFabricacionTrabajoSnapshotForQuoteSave({
      existingId: "cotizacion-historica",
      existingSnapshot: existingGlobalSnapshot,
      capturedAt: "2026-09-30T12:00:00.000Z",
      items: [{ ...carrier, snapshot: makeItemSnapshot(3000) }],
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
