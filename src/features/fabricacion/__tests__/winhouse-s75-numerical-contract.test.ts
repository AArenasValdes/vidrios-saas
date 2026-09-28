import { crearRecetaWinHouseNewS75, WINHOUSE_NEW_S75_VARIANTS } from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";

/**
 * Independent numeric oracles, not calculated from the implementation's coefficients.
 * Source: docs/fabricacion/haciendoventanas/2026-09-26-winhouse-new-s75-fuentes-oficiales.md,
 * tables "Reglas que cambian entre las 12 pestañas" and asymmetric glass rules.
 * Ventora rounds each cut to whole mm. These are software contracts, not workshop approvals.
 * Each pair: 1200×1000 (A=700), 1800×1500 (A=1000).
 */
const CASES = [
  { geometry: "doble_riel_2h_simetrica_80", sash: [[605], [905]], glass: [[468], [768]], height: [788, 1288], counts: [2] },
  { geometry: "doble_riel_2h_simetrica_98", sash: [[614], [914]], glass: [[441], [741]], height: [752, 1252], counts: [2] },
  { geometry: "triple_riel_3h_simetrica_80", sash: [[432], [632]], glass: [[295], [495]], height: [788, 1288], counts: [3] },
  { geometry: "triple_riel_3h_simetrica_98", sash: [[444], [644]], glass: [[271], [471]], height: [752, 1252], counts: [3] },
  { geometry: "doble_riel_3h_simetrica_80", sash: [[431], [631]], glass: [[294], [494]], height: [788, 1288], counts: [3] },
  { geometry: "doble_riel_3h_simetrica_98", sash: [[443], [643]], glass: [[270], [470]], height: [752, 1252], counts: [3] },
  { geometry: "doble_riel_4h_80", sash: [[324], [474]], glass: [[187], [337]], height: [788, 1288], counts: [4] },
  { geometry: "doble_riel_4h_98", sash: [[333], [483]], glass: [[160], [310]], height: [752, 1252], counts: [4] },
  { geometry: "doble_riel_2h_asimetrica_80", sash: [[705, 505], [1005, 805]], glass: [[570, 370], [870, 670]], height: [790, 1290], counts: [1, 1] },
  { geometry: "doble_riel_2h_asimetrica_98", sash: [[711, 511], [1011, 811]], glass: [[536, 336], [836, 636]], height: [750, 1250], counts: [1, 1] },
  { geometry: "doble_riel_3h_asimetrica_centro_ancho_80", sash: [[345, 605], [495, 905]], glass: [[206, 466], [356, 766]], height: [786, 1286], counts: [2, 1] },
  { geometry: "doble_riel_3h_asimetrica_centro_ancho_98", sash: [[363, 605], [513, 905]], glass: [[188, 430], [338, 730]], height: [750, 1250], counts: [2, 1] },
] as const;

describe("contrato numérico S75 desde la pauta documental", () => {
  it("toda geometría registrada tiene un caso numérico independiente", () => {
    expect([...new Set(WINHOUSE_NEW_S75_VARIANTS.map((v) => v.geometrySlug))].sort())
      .toEqual(CASES.map((c) => c.geometry).sort());
  });

  describe.each(WINHOUSE_NEW_S75_VARIANTS)("$slug", (variant) => {
    it.each([0, 1] as const)("coincide con el caso %i, incluyendo cantidad de ventanas y ángulos", (index) => {
      const expected = CASES.find((c) => c.geometry === variant.geometrySlug)!;
      const recipe = crearRecetaWinHouseNewS75({ lineName: "WinHouse New S75", variant: variant.slug });
      const original = JSON.stringify(recipe);
      const input = {
        anchoTotalMm: index === 0 ? 1200 : 1800,
        altoTotalMm: index === 0 ? 1000 : 1500,
        ...(variant.geometrySlug.startsWith("doble_riel_2h_asimetrica")
          ? { anchoHojaAMm: index === 0 ? 700 : 1000 } : {}),
        cantidad: 2, hojas: variant.leaves, modulos: variant.leaves, variante: variant.slug,
      };
      const result = calcularCubicacionYPauta(recipe, input);
      expect(result.calculable).toBe(true);
      const sashes = result.perfiles.filter((row) => row.funcion.startsWith("Hoja horizontal"));
      expect(sashes.map((row) => row.medidaMm)).toEqual(expected.sash[index]);
      expect(sashes.map((row) => row.cantidadPiezas)).toEqual(expected.counts.map((count) => count * 4));
      expect(sashes.every((row) => row.corte === "45° / 45°")).toBe(true);
      expect(result.vidrios.map((row) => row.anchoMm)).toEqual(expected.glass[index]);
      expect(result.vidrios.map((row) => row.altoMm)).toEqual(expected.counts.map(() => expected.height[index]));
      expect(result.vidrios.map((row) => row.cantidadPiezas)).toEqual(expected.counts.map((count) => count * 2));
      expect(result.perfiles.find((row) => row.funcion === "Marco horizontal"))
        .toMatchObject({ medidaMm: input.anchoTotalMm + 5, cantidadPiezas: 4 });
      expect(result.perfiles.find((row) => row.funcion === "Riel aluminio"))
        .toMatchObject({ medidaMm: input.anchoTotalMm - 97, cantidadPiezas: variant.railCount * 2 });
      expect(JSON.stringify(recipe)).toBe(original);
    });
  });
});
