import {
  addGuidedDivision,
  createDefaultGuidedVisualConfig,
  parseGuidedVisualConfig,
  serializeGuidedVisualConfig,
  splitModule,
  listLeafModules,
  addPalillo,
  selectGuidedNode,
  updateModuleType,
  updateModuleOpeningSide,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  calculateGuidedVisualLayout,
  drawOuterAluminumFrame,
  getGuidedProfilePalette,
  getGuidedStrokeScale,
  renderGuidedVisualSvg,
  resolveModuleGlassRect,
  resolveModuleSashRect,
} from "../guided-visual-renderer.service";

describe("guided-visual-renderer V2", () => {
  it("renderiza un módulo y divisiones mixtas", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 1800 });
    const svgOne = renderGuidedVisualSvg(config, { maxW: 300, maxH: 220, variant: "editor" });
    expect(svgOne).toContain("<svg");
    expect(svgOne).toContain("1500");
    expect(svgOne).toContain("1800");

    const rootId = listLeafModules(config.root)[0].id;
    config = splitModule(config, rootId, "horizontal", 1 / 3);
    const bottom = listLeafModules(config.root)[1];
    config = splitModule(config, bottom.id, "vertical", 0.5);

    const layout = calculateGuidedVisualLayout(config, { maxW: 300, maxH: 220 });
    expect(layout.widthMm).toBe(1500);
    expect(layout.heightMm).toBe(1800);
    expect(layout.modules).toHaveLength(3);

    const svg = renderGuidedVisualSvg(config, { maxW: 300, maxH: 220, variant: "thumbnail" });
    expect(svg).toContain("<svg");
    expect(layout.modules[0].widthMm + layout.modules[1].widthMm).toBeCloseTo(
      layout.modules[0].widthMm + layout.modules[2].widthMm > 0
        ? layout.widthMm
        : layout.widthMm,
      -1
    );
  });

  it("serializa V2 y parsea V1 legacy", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1600, heightMm: 1200 });
    config = addGuidedDivision(config, "corredera");
    config = addGuidedDivision(config, "fijo");

    const encoded = serializeGuidedVisualConfig(config);
    expect(encoded.startsWith("2|")).toBe(true);
    const parsed = parseGuidedVisualConfig(encoded);
    expect(parsed?.widthMm).toBe(1600);

    const fromV1 = parseGuidedVisualConfig("1|v|1600|1200|fijo:1,corredera:1");
    expect(fromV1?.schemaVersion).toBe(2);
    expect(fromV1 && listLeafModules(fromV1.root)).toHaveLength(2);
  });

  it("incluye palillos y variantes pdf/thumbnail", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 2400, heightMm: 2100 });
    const moduleId = listLeafModules(config.root)[0].id;
    config = addPalillo(config, moduleId, "horizontal", 0.5);
    const pdf = renderGuidedVisualSvg(config, { maxW: 470, maxH: 260, variant: "pdf" });
    const thumb = renderGuidedVisualSvg(config, {
      maxW: 76,
      maxH: 58,
      variant: "thumbnail",
      showDimensions: false,
    });
    expect(pdf).toContain("<svg");
    expect(thumb).toContain("<svg");
    expect(thumb).not.toContain("#1E88FF");
    expect(pdf).not.toContain("rgba(30, 136, 255");
  });

  it("aprovecha el espacio del PDF y mantiene las cotas fuera del aluminio", () => {
    const config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1000 });
    const layout = calculateGuidedVisualLayout(config, {
      maxW: 470,
      maxH: 260,
      variant: "pdf",
    });
    const svg = renderGuidedVisualSvg(config, {
      maxW: 470,
      maxH: 260,
      variant: "pdf",
      showDimensions: true,
    });

    expect(layout.drawW).toBeGreaterThan(245);
    expect(layout.drawH).toBeGreaterThan(200);
    expect(layout.originY).toBeGreaterThanOrEqual(10);
    expect(svg).toContain('paint-order="stroke fill"');
    expect(svg).toContain('stroke-width="3.5"');
  });

  it("respeta widthMm/heightMm reales en layout (no el viewport)", () => {
    const config = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 1800 });
    const small = calculateGuidedVisualLayout(config, { maxW: 76, maxH: 58, variant: "thumbnail" });
    const large = calculateGuidedVisualLayout(config, { maxW: 420, maxH: 320, variant: "editor" });
    expect(small.widthMm).toBe(1500);
    expect(small.heightMm).toBe(1800);
    expect(large.widthMm).toBe(1500);
    expect(large.heightMm).toBe(1800);
    expect(small.drawW / small.drawH).toBeCloseTo(1500 / 1800, 2);
    expect(large.drawW / large.drawH).toBeCloseTo(1500 / 1800, 2);
  });

  it("aplica jerarquía de trazos y perfiles de aluminio", () => {
    const editor = getGuidedStrokeScale("editor");
    expect(editor.frame).toBeGreaterThan(editor.mullion);
    expect(editor.frame).toBeGreaterThan(editor.sash);
    expect(editor.meeting).toBeGreaterThan(editor.sash);
    expect(editor.mullion).toBeGreaterThan(editor.palillo);
    expect(editor.palillo).toBeGreaterThan(editor.cue);
    expect(editor.cue).toBeGreaterThan(editor.dim);

    const palette = getGuidedProfilePalette("#FFFFFF", "editor");
    expect(palette.frameOutline).toBeTruthy();
    const dark = getGuidedProfilePalette("#111111", "editor");
    expect(dark.frameInner).not.toBe(dark.frame);

    const frame = drawOuterAluminumFrame(10, 10, 100, 80, palette, editor.frame);
    expect(frame).toContain('stroke-linejoin="miter"');
    expect(frame).toContain('vector-effect="non-scaling-stroke"');
  });

  it("muestra selección clara solo en editor", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1600, heightMm: 1200 });
    const left = listLeafModules(config.root)[0].id;
    config = splitModule(config, left, "vertical", 0.5);
    const modules = listLeafModules(config.root);
    config = updateModuleType(config, modules[0].id, "corredera");
    config = updateModuleType(config, modules[1].id, "fijo");
    config = selectGuidedNode(config, modules[0].id);

    const editor = renderGuidedVisualSvg(config, {
      maxW: 420,
      maxH: 320,
      variant: "editor",
      showSelection: true,
      colorHex: "#8A96A6",
    });
    expect(editor).toContain("#1E88FF");
    expect(editor).toContain("rgba(30, 136, 255, 0.045)");
    expect(editor).toContain(">M1</text>");

    const thumb = renderGuidedVisualSvg(config, {
      maxW: 120,
      maxH: 90,
      variant: "thumbnail",
      showSelection: false,
    });
    expect(thumb).not.toContain("rgba(30, 136, 255");
  });

  it("dibuja una corredera con hojas de aluminio y encuentro central robusto", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1000 });
    const moduleId = listLeafModules(config.root)[0].id;
    config = updateModuleType(config, moduleId, "corredera");

    const svg = renderGuidedVisualSvg(config, {
      maxW: 720,
      maxH: 520,
      variant: "editor",
      colorHex: "#111827",
    });

    expect(svg).toContain('data-guided-profile="sliding-sash-left"');
    expect(svg).toContain('data-guided-profile="sliding-sash-right"');
    expect(svg).toContain('data-guided-profile="meeting-stile"');
    expect(svg).toContain('data-guided-opening="slide-left"');
    expect(svg).toContain('data-guided-opening="slide-right"');
    expect(svg).toContain("data-guided-hardware=");
  });

  it("dibuja puerta con manilla abatible (no punto)", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 900, heightMm: 2100 });
    const moduleId = listLeafModules(config.root)[0].id;
    config = updateModuleType(config, moduleId, "puerta");
    config = updateModuleOpeningSide(config, moduleId, "left");

    const svg = renderGuidedVisualSvg(config, {
      maxW: 420,
      maxH: 520,
      variant: "editor",
      colorHex: "#111827",
    });

    expect(svg).toContain('data-guided-hardware="manilla_abatible"');
    expect(svg).toContain('data-guided-opening="door-swing"');
    expect(svg).toContain('data-guided-profile="operable-sash"');
  });

  it("dibuja oscilobatiente, apertura derecha, gradientes y cotas separadas", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1400 });
    const moduleId = listLeafModules(config.root)[0].id;
    config = updateModuleType(config, moduleId, "oscilobatiente");
    config = updateModuleOpeningSide(config, moduleId, "right");

    const svg = renderGuidedVisualSvg(config, {
      maxW: 420,
      maxH: 320,
      variant: "editor",
      showDimensions: true,
      colorHex: "#111827",
    });

    expect(svg).toContain('id="gvc-glass-gradient-');
    expect(svg).toContain('id="gvc-profile-gradient-');
    expect(svg).toContain('stroke-dasharray="7 5"');
    expect(svg).toContain('data-guided-hardware="manilla_oscilobatiente"');
    expect(svg).toContain(">1200 mm</text>");
    expect(svg).toContain(">1400 mm</text>");
  });

  it("aisla los recursos SVG entre miniatura y editor de la misma composicion", () => {
    const config = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 1000 });
    const summarySvg = renderGuidedVisualSvg(config, {
      maxW: 420,
      maxH: 300,
      variant: "summary",
      resourceKey: "piece-v2",
    });
    const editorSvg = renderGuidedVisualSvg(config, {
      maxW: 720,
      maxH: 520,
      variant: "editor",
      resourceKey: "composer-v2",
    });

    expect(summarySvg).toContain("gvc-frame-clip-piece-v2");
    expect(editorSvg).toContain("gvc-frame-clip-composer-v2");
    expect(editorSvg).not.toContain("gvc-frame-clip-piece-v2");
  });

  it("el vidrio llena la celda y la hoja usa inset uniforme acotado", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1000 });
    const rootId = listLeafModules(config.root)[0].id;
    config = splitModule(config, rootId, "vertical", 0.45);
    const rightId = listLeafModules(config.root)[1].id;
    config = splitModule(config, rightId, "horizontal", 1 / 3);
    config = splitModule(config, listLeafModules(config.root)[2].id, "horizontal", 0.5);

    const layout = calculateGuidedVisualLayout(config, {
      maxW: 720,
      maxH: 520,
      variant: "editor",
    });
    const scale = getGuidedStrokeScale("editor");
    const thin = layout.modules.reduce((smallest, module) =>
      module.h < smallest.h ? module : smallest
    );
    const glass = resolveModuleGlassRect(thin);
    const sash = resolveModuleSashRect(thin, scale);

    expect(glass.x).toBe(thin.x);
    expect(glass.y).toBe(thin.y);
    expect(glass.w).toBe(thin.w);
    expect(glass.h).toBe(thin.h);

    expect(sash.x).toBeGreaterThan(thin.x);
    expect(sash.y).toBeGreaterThan(thin.y);
    expect(sash.w).toBeLessThan(thin.w);
    expect(sash.h).toBeLessThan(thin.h);
    expect(sash.x - thin.x).toBeCloseTo(thin.x + thin.w - (sash.x + sash.w), 5);
    expect(sash.y - thin.y).toBeCloseTo(thin.y + thin.h - (sash.y + sash.h), 5);
  });
});
