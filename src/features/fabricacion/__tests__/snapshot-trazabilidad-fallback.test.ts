import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { crearRecetaVeratec7400Corredera } from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import { resolveVeratecWorkbookFallback } from "@/features/fabricacion/services/fabricacion-receta-veratec-fallback.service";
import { buildFabricacionSnapshotSyncKey, construirSnapshotFabricacionCotizacion, fabricacionSnapshotMatchesCalculatedOutput } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";

function snapshots() {
  const [recipe] = resolveVeratecWorkbookFallback({ catalogKey: "ventora:veratec-7400-corredera", lineTemplateId: 7400, organizationId: 1, lineName: "Veratec 7400", variant: "monolitico_4mm", recipes: [] });
  const oldRecipe = { ...recipe!, definition: crearRecetaVeratec7400Corredera({ lineName: "Veratec 7400", variant: "monolitico_4mm" }) };
  const entrada = { anchoTotalMm: 1500, altoTotalMm: 1200, cantidad: 1, hojas: 2, modulos: 2, variante: "monolitico_4mm" };
  const make = (r: typeof oldRecipe) => construirSnapshotFabricacionCotizacion({ recipe: r, entrada, calculatedAt: "2026-01-01T00:00:00.000Z" });
  return { historical: make(oldRecipe), current: make(recipe!) };
}

describe("trazabilidad de vidrio en snapshots fallback", () => {
  it("iguala cálculo histórico real UUID y cálculo determinístico sin reescribir", () => {
    const { historical, current } = snapshots();
    expect(historical.result.vidrios.length).toBeGreaterThan(0);
    expect(fabricacionSnapshotMatchesCalculatedOutput(historical, current)).toBe(true);
    expect(buildFabricacionSnapshotSyncKey("item", historical)).toBe(buildFabricacionSnapshotSyncKey("item", current));
  });
  it("normaliza IDs temporales SODAL sin modificar fórmula ni medidas", () => {
    const args = { catalogKey: "ventora:optima-s28-corredera-2h", lineTemplateId: 28, organizationId: 1, lineName: "S28", variant: null, glassName: "Termopanel 20 mm", recipes: [] };
    const [a] = resolveUniversalPricedLineFallbacks(args);
    const [b] = resolveUniversalPricedLineFallbacks(args);
    expect(a).toBeDefined(); expect(b).toBeDefined();
    const entrada = { anchoTotalMm: 1500, altoTotalMm: 1200, cantidad: 1, hojas: 2, modulos: 2 };
    const make = (recipe: typeof a) => construirSnapshotFabricacionCotizacion({ recipe: recipe!, entrada, calculatedAt: "2026-01-01T00:00:00.000Z" });
    const previous = make(a); const next = make(b);
    expect(previous.result.vidrios.length).toBeGreaterThan(0);
    expect(fabricacionSnapshotMatchesCalculatedOutput(previous, next)).toBe(true);
    expect(buildFabricacionSnapshotSyncKey("item", previous)).toBe(buildFabricacionSnapshotSyncKey("item", next));
  });  it("detecta cambio de regla y no normaliza IDs técnicos privados", () => {
    const { historical, current } = snapshots();
    const changedRule = structuredClone(current);
    changedRule.result.vidrios[0]!.trazabilidad[0]!.formula += " + 1";
    expect(fabricacionSnapshotMatchesCalculatedOutput(historical, changedRule)).toBe(false);
    const a = structuredClone(current);
    const b = structuredClone(current);
    a.recipeScope = "organization"; b.recipeScope = "organization";
    b.result.vidrios[0]!.vidrioId = "veratec:workbook:other";
    expect(fabricacionSnapshotMatchesCalculatedOutput(a, b)).toBe(false);
  });
  it("detecta una regla de trazabilidad independiente y cambios de perfiles", () => {
    const { current } = snapshots();
    const rule = structuredClone(current);
    rule.result.vidrios[0]!.trazabilidad[0]!.reglaId += ":otra-regla";
    expect(fabricacionSnapshotMatchesCalculatedOutput(current, rule)).toBe(false);
    expect(buildFabricacionSnapshotSyncKey("item", current)).not.toBe(buildFabricacionSnapshotSyncKey("item", rule));
    const code = structuredClone(current);
    code.result.perfiles[0]!.codigoPerfil += "X";
    expect(fabricacionSnapshotMatchesCalculatedOutput(current, code)).toBe(false);
    const cut = structuredClone(current);
    cut.result.perfiles[0]!.medidaMm += 1;
    expect(fabricacionSnapshotMatchesCalculatedOutput(current, cut)).toBe(false);
  });  it("detecta diferencias reales de receta, vidrio, cantidad y medidas", () => {
    const { current } = snapshots();
    const changedRecipe = structuredClone(current); changedRecipe.recipeId = "veratec:workbook:otra";
    const changedGlass = structuredClone(current); changedGlass.result.vidrios[0]!.nombre += " diferente";
    const changedQuantity = structuredClone(current); changedQuantity.input.cantidad += 1;
    const changedWidth = structuredClone(current); changedWidth.input.anchoTotalMm += 1;
    for (const changed of [changedRecipe, changedGlass, changedQuantity, changedWidth]) {
      expect(fabricacionSnapshotMatchesCalculatedOutput(current, changed)).toBe(false);
    }
  });
});