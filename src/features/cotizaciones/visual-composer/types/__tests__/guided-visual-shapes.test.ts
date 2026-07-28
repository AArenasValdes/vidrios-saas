import {
  createDefaultGuidedVisualConfig,
  describeGuidedVisualConfig,
  listLeafModules,
  normalizeGuidedVisualConfig,
  parseGuidedVisualConfig,
  serializeGuidedVisualConfig,
  setGuidedFrameShape,
  splitModule,
  updateModuleGlassShape,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import {
  buildGuidedFramePath,
  buildGuidedGlassPathPx,
} from "@/features/cotizaciones/visual-composer/services/guided-visual-shape-paths";

describe("guided visual shapes V1", () => {
  it("normaliza configs antiguas sin frameShape/glassShape a rectángulo", () => {
    const base = createDefaultGuidedVisualConfig({ widthMm: 1400, heightMm: 2100 });
    const legacy = {
      ...base,
      frameShape: undefined,
      root: {
        ...base.root,
        glassShape: undefined,
      },
    };

    const normalized = normalizeGuidedVisualConfig(legacy as typeof base);
    expect(normalized.frameShape).toEqual({ kind: "rect" });
    expect(listLeafModules(normalized.root)[0]?.glassShape).toEqual({ kind: "rect" });
  });

  it("persiste arco y vidrio redondeado en serialize/parse", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1600, heightMm: 2200 });
    config = setGuidedFrameShape(config, { kind: "arch_top", archRiseMm: 280 });
    const leafId = listLeafModules(config.root)[0]!.id;
    config = updateModuleGlassShape(config, leafId, {
      kind: "rounded",
      radiusMm: 48,
      corners: "top",
    });

    const encoded = serializeGuidedVisualConfig(config);
    const parsed = parseGuidedVisualConfig(encoded);
    expect(parsed?.frameShape).toEqual({ kind: "arch_top", archRiseMm: 280 });
    expect(listLeafModules(parsed!.root)[0]?.glassShape).toEqual({
      kind: "rounded",
      radiusMm: 48,
      corners: "top",
    });
    expect(describeGuidedVisualConfig(parsed!)).toContain("Arco 280 mm");
  });

  it("persiste marco redondeado con radio y esquinas", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1000 });
    config = setGuidedFrameShape(config, {
      kind: "rounded",
      radiusMm: 90,
      corners: "all",
    });

    const encoded = serializeGuidedVisualConfig(config);
    const parsed = parseGuidedVisualConfig(encoded);
    expect(parsed?.frameShape).toEqual({
      kind: "rounded",
      radiusMm: 90,
      corners: "all",
    });
    expect(describeGuidedVisualConfig(parsed!)).toContain("Marco redondeado 90 mm");
    expect(
      buildGuidedFramePath(
        0,
        0,
        100,
        80,
        { kind: "rounded", radiusMm: 20, corners: "all" },
        1
      )
    ).toContain("Q ");
  });

  it("renderiza path de arco y clip en el SVG", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 2100 });
    config = splitModule(config, listLeafModules(config.root)[0]!.id, "vertical", 0.5);
    config = setGuidedFrameShape(config, { kind: "arch_top", archRiseMm: 220 });

    const svg = renderGuidedVisualSvg(config, {
      variant: "pdf",
      maxW: 320,
      maxH: 280,
      showLabels: false,
    });

    expect(svg).toContain("clipPath");
    expect(svg).toContain("A ");
    expect(buildGuidedFramePath(0, 0, 100, 140, { kind: "arch_top", archRiseMm: 40 }, 1)).toContain(
      "A "
    );
    expect(
      buildGuidedGlassPathPx(0, 0, 80, 100, { kind: "rounded", radiusMm: 20, corners: "all" }, 1)
    ).toContain("Q ");
  });

  it("la selección del editor sigue el path redondeado (no un rectángulo)", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1400, heightMm: 2000 });
    const leafId = listLeafModules(config.root)[0]!.id;
    config = updateModuleGlassShape(config, leafId, {
      kind: "rounded",
      radiusMm: 90,
      corners: "all",
    });
    config = { ...config, selectedNodeId: leafId };

    const svg = renderGuidedVisualSvg(config, {
      variant: "editor",
      maxW: 400,
      maxH: 360,
      showSelection: true,
    });

    const selectionFillCount = (svg.match(/rgba\(30, 136, 255, 0\.045\)/g) ?? []).length;
    expect(selectionFillCount).toBeGreaterThan(0);
    expect(svg).not.toMatch(
      /rgba\(30, 136, 255, 0\.045\)[^<]*<\/rect>/
    );
    expect(svg).toContain('fill="rgba(30, 136, 255, 0.045)"');
    expect(svg).toMatch(/<path d="[^"]*Q [^"]*" fill="rgba\(30, 136, 255, 0\.045\)"/);
  });
});
