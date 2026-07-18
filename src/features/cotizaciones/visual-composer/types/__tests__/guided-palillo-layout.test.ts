import {
  applyPalilloPresetToModule,
  calculatePalilloRects,
  countLeafModules,
  countPalilloCells,
  countPalilloSplits,
  createDefaultGuidedVisualConfig,
  createEmptyPalilloLayout,
  listLeafModules,
  migrateFlatPalillosToLayout,
  splitModulePalilloCell,
  splitPalilloCell,
  type GuidedPalilloNode,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

describe("guided palillo layout tree", () => {
  it("migra palillos planos a árbol sin perder orientación", () => {
    const layout = migrateFlatPalillosToLayout([
      { id: "a", axis: "vertical", position: 0.5 },
      { id: "b", axis: "horizontal", position: 0.5 },
    ]);
    expect(layout).toBeTruthy();
    expect(countPalilloSplits(layout)).toBeGreaterThanOrEqual(2);
    expect(countPalilloCells(layout)).toBe(4);
  });

  it("permite forma en T (superior dividida, inferior completa)", () => {
    let layout: GuidedPalilloNode | null = createEmptyPalilloLayout();
    layout = splitPalilloCell(layout, layout.id, "horizontal", 0.5);
    expect(layout).toBeTruthy();
    const rects = calculatePalilloRects(layout);
    const topCell = rects.find(
      (r) => r.kind === "cell" && r.yRatio < 0.2 && r.hRatio < 0.7
    );
    expect(topCell).toBeTruthy();
    layout = splitPalilloCell(layout, topCell!.id, "vertical", 0.5);
    const next = calculatePalilloRects(layout);
    const splits = next.filter((r) => r.kind === "split");
    const cells = next.filter((r) => r.kind === "cell");
    expect(cells).toHaveLength(3);
    expect(splits).toHaveLength(2);
    const verticalPartial = splits.find(
      (s) => s.direction === "vertical" && (s.hRatio ?? 1) < 0.7
    );
    expect(verticalPartial).toBeTruthy();
  });

  it("permite asimétrica (inferior dividida, superior completa)", () => {
    let layout: GuidedPalilloNode | null = createEmptyPalilloLayout();
    layout = splitPalilloCell(layout, layout.id, "horizontal", 0.45);
    const bottom = calculatePalilloRects(layout).find(
      (r) => r.kind === "cell" && r.yRatio > 0.3
    );
    expect(bottom).toBeTruthy();
    layout = splitPalilloCell(layout, bottom!.id, "vertical", 0.35);
    const splits = calculatePalilloRects(layout).filter((r) => r.kind === "split");
    const vertical = splits.find((s) => s.direction === "vertical");
    expect(vertical?.yRatio).toBeGreaterThan(0.3);
    expect(vertical?.hRatio).toBeLessThan(0.7);
  });

  it("presets generan el mismo palilloLayout y no crean módulos", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1000 });
    const moduleId = listLeafModules(config.root)[0].id;
    config = applyPalilloPresetToModule(config, moduleId, "grid2x2");
    expect(countLeafModules(config.root)).toBe(1);
    const leaf = listLeafModules(config.root)[0];
    expect(countPalilloCells(leaf.palilloLayout)).toBe(4);
    expect(countPalilloSplits(leaf.palilloLayout)).toBe(3);
  });

  it("splitModulePalilloCell desde vacío no crea módulos", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 1200 });
    const moduleId = listLeafModules(config.root)[0].id;
    config = splitModulePalilloCell(config, moduleId, "root", "horizontal", 0.5);
    expect(countLeafModules(config.root)).toBe(1);
    expect(countPalilloSplits(listLeafModules(config.root)[0].palilloLayout)).toBe(1);

    const top = calculatePalilloRects(
      listLeafModules(config.root)[0].palilloLayout
    ).find((r) => r.kind === "cell" && r.yRatio < 0.2);
    expect(top).toBeTruthy();
    config = splitModulePalilloCell(config, moduleId, top!.id, "vertical", 0.5);
    expect(countLeafModules(config.root)).toBe(1);
    expect(countPalilloCells(listLeafModules(config.root)[0].palilloLayout)).toBe(3);
  });
});
