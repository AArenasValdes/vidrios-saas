import { resolveGlassCutLineGeometry } from "@/features/fabricacion/services/glass-sheet-cut-geometry.service";

describe("resolveGlassCutLineGeometry", () => {
  it("convierte un corte vertical secundario desplazado en coordenadas absolutas", () => {
    expect(resolveGlassCutLineGeometry({
      ordinal: 2,
      nodeId: "cut-child-x",
      parentNodeId: "block-child",
      axis: "x",
      localOffsetMm: 125,
      absolutePositionMm: 725,
      fromMm: 310,
      toMm: 1810,
      operation: "rayado_y_quiebre",
      separationMm: 0,
    })).toEqual({ x1Mm: 725, y1Mm: 310, x2Mm: 725, y2Mm: 1810 });
  });

  it("convierte un corte horizontal en un segmento absoluto sin alterar el desplazamiento local", () => {
    expect(resolveGlassCutLineGeometry({
      ordinal: 3,
      nodeId: "cut-child-y",
      parentNodeId: "block-offset",
      axis: "y",
      localOffsetMm: 240,
      absolutePositionMm: 960,
      fromMm: 450,
      toMm: 2240,
      operation: "rayado_y_quiebre",
      separationMm: 0,
    })).toEqual({ x1Mm: 450, y1Mm: 960, x2Mm: 2240, y2Mm: 960 });
  });
});
