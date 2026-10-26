import { resolveManualGlassPaneSlots } from "../manual-glass-pane-slots.service";

describe("resolveManualGlassPaneSlots", () => {
  it("identifica una composición mixta de tres paños", () => {
    const result = resolveManualGlassPaneSlots({
      sheetScheme: "3 hojas",
      quickCompositionAdjustment: {
        version: 1, fixedTopMm: null, fixedBottomMm: null, fixedLeftMm: null, fixedRightMm: null,
        leafWidths: null, paneCount: 3, paneDecorations: {}, paneTypes: {
          "leaf-1": "fixed", "leaf-2": "sliding", "leaf-3": "sliding",
        }, mirrored: false,
      },
    });
    expect(result.slots.map((slot) => slot.label)).toEqual([
      "Paño 1 · Fijo", "Paño 2 · Corredero", "Paño 3 · Corredero",
    ]);
  });

  it("admite tres y cuatro hojas correderas sin calcular dimensiones", () => {
    for (const count of [3, 4]) {
      const result = resolveManualGlassPaneSlots({ componentType: "Corredera", sheetScheme: `${count} hojas` });
      expect(result.slots).toHaveLength(count);
      expect(result.slots.every((slot) => slot.label.endsWith("· Corredero"))).toBe(true);
      expect(result.slots.map(({ id }) => id)).toEqual(Array.from({ length: count }, (_, index) => `pane-${index + 1}`));
    }
  });

  it("reconoce un oscilobatiente simple como un paño", () => {
    expect(resolveManualGlassPaneSlots({ componentType: "Oscilobatiente" }).slots.map(({ label }) => label))
      .toEqual(["Paño 1 · Oscilobatiente"]);
  });

  it("deja el conteo sin confirmar cuando la configuración no lo identifica", () => {
    expect(resolveManualGlassPaneSlots({ componentType: "Corredera" })).toMatchObject({ countIsKnown: false, slots: [] });
  });
});
