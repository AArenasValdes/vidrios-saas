import { crearRecetaVeratec7400Corredera } from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { resolveVeratecWorkbookFallback } from "@/features/fabricacion/services/fabricacion-receta-veratec-fallback.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";

const veratec = { catalogKey: "ventora:veratec-7400-corredera", lineTemplateId: 7400, organizationId: 1, lineName: "Veratec 7400", variant: "monolitico_4mm", recipes: [] };
const universal = { catalogKey: "ventora:l20", lineTemplateId: 20, organizationId: 1, lineName: "L20", variant: "estandar", recipes: [] };

describe("identificadores de recetas fallback", () => {
  it("repite Veratec sin regenerar identidades ni fechas", () => {
    const first = resolveVeratecWorkbookFallback(veratec);
    const second = resolveVeratecWorkbookFallback(veratec);
    expect(first).toHaveLength(1);
    expect(second).toEqual(first);
  });
  it("repite la receta universal sin regenerar identidades", () => {
    const first = resolveUniversalPricedLineFallbacks(universal);
    const second = resolveUniversalPricedLineFallbacks(universal);
    expect(first).toHaveLength(1);
    expect(second).toEqual(first);
  });
  it.each([
    { catalogKey: "ventora:optima-s28-corredera-2h", lineTemplateId: 28, organizationId: 1, lineName: "S28", variant: null, recipes: [] },
    { catalogKey: "ventora:l42", lineTemplateId: 42, organizationId: 1, lineName: "Serie 42", variant: "arquetipo_sin_camara_monolitico", leavesCount: 1, typology: "proyectante", includeDocumentedVariants: true, recipes: [] },
  ])("estabiliza variantes documentales $catalogKey", (input) => {
    const first = resolveUniversalPricedLineFallbacks(input);
    expect(first.length).toBeGreaterThan(0);
    expect(resolveUniversalPricedLineFallbacks(input)).toEqual(first);
  });
  it("repite cálculo completo con iguales cortes, vidrios y cantidades", () => {
    const [first] = resolveVeratecWorkbookFallback(veratec);
    const [second] = resolveVeratecWorkbookFallback(veratec);
    const entrada = { anchoTotalMm: 1500, altoTotalMm: 1200, cantidad: 2, hojas: 2, modulos: 2, variante: "monolitico_4mm" };
    const calculate = (recipe: NonNullable<typeof first>) => construirSnapshotFabricacionCotizacion({ recipe, entrada, calculatedAt: "2026-01-01T00:00:00.000Z" });
    expect(calculate(first!)).toEqual(calculate(second!));
    expect(calculate(first!).result.perfiles.length).toBeGreaterThan(0);
    expect(calculate(first!).result.vidrios.length).toBeGreaterThan(0);
  });

  it("conserva medidas y cantidades de la receta original Veratec", () => {
    const [stable] = resolveVeratecWorkbookFallback(veratec);
    const original = { ...stable!, definition: crearRecetaVeratec7400Corredera({ lineName: veratec.lineName, variant: "monolitico_4mm" }) };
    const entrada = { anchoTotalMm: 1500, altoTotalMm: 1200, cantidad: 2, hojas: 2, modulos: 2, variante: "monolitico_4mm" };
    const calculate = (recipe: typeof original) => construirSnapshotFabricacionCotizacion({ recipe, entrada, calculatedAt: "2026-01-01T00:00:00.000Z" });
    const withoutIds = (value: unknown) => JSON.parse(JSON.stringify(value, (key, val: unknown) =>
      ["id", "recetaId", "componenteId", "vidrioId", "accesorioId", "recipeDefinitionId", "reglaId"].includes(key) ? undefined : val
    ));
    expect(withoutIds(calculate(stable!))).toEqual(withoutIds(calculate(original)));
  });
  it("separa identificadores de líneas y variantes", () => {
    const [first] = resolveVeratecWorkbookFallback(veratec);
    const [otherLine] = resolveVeratecWorkbookFallback({ ...veratec, lineTemplateId: 7401 });
    const [otherVariant] = resolveVeratecWorkbookFallback({ ...veratec, variant: "termopanel_20mm" });
    expect(first!.definition.perfiles[0]!.id).not.toBe(otherLine!.definition.perfiles[0]!.id);
    expect(first!.definition.perfiles[0]!.id).not.toBe(otherVariant!.definition.perfiles[0]!.id);
    const [universalLine] = resolveUniversalPricedLineFallbacks(universal);
    const [otherUniversalLine] = resolveUniversalPricedLineFallbacks({ ...universal, lineTemplateId: 21 });
    expect(universalLine!.definition.perfiles[0]!.id).not.toBe(otherUniversalLine!.definition.perfiles[0]!.id);
  });

  it("mantiene precedencia de recetas privadas universales por organización", () => {
    const [base] = resolveUniversalPricedLineFallbacks(universal);
    const privateRecipe = { ...base!, id: "private-l20", scope: "organization" as const, sourceReference: "taller:personalizada:l20" };
    expect(resolveUniversalPricedLineFallbacks({ ...universal, recipes: [privateRecipe] })).toEqual([]);
    const otherOrg = resolveUniversalPricedLineFallbacks({ ...universal, organizationId: 2, recipes: [privateRecipe] });
    expect(otherOrg).toHaveLength(1);
    expect(otherOrg[0]!.organizationId).toBe(2);
  });
  it("mantiene aisladas recetas y organizaciones", () => {
    const [first] = resolveVeratecWorkbookFallback(veratec);
    expect(first).toBeDefined();
    const privateRecipe = { ...first!, id: "private-1", scope: "organization" as const, sourceReference: "taller:personalizada:7400" };
    expect(resolveVeratecWorkbookFallback({ ...veratec, recipes: [privateRecipe] })).toEqual([]);
    const otherOrg = resolveVeratecWorkbookFallback({ ...veratec, organizationId: 2, recipes: [privateRecipe] });
    expect(otherOrg).toHaveLength(1);
    expect(otherOrg[0]!.organizationId).toBe(2);
  });
});