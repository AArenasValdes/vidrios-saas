import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { generateComponentSVG } from "@/utils/window-drawings";
import { buildQuickCompositionBaseConfig, equalizeQuickLeafWidths, quickCompositionEquals, resolveQuickCompositionCapabilities, setQuickFixedDimension, setQuickLeafWidths, setQuickPaneCount, setQuickPaneDecoration, setQuickPaneType } from "../quick-composition-adjustment.service";
import { createEmptyQuickCompositionAdjustment } from "../../types/quick-composition-adjustment";
import { hasQuickCompositionStructuralChanges } from "../../types/quick-composition-adjustment";

const selection = (overrides: Partial<Parameters<typeof buildQuickCompositionBaseConfig>[0]> = {}) => ({
  tipo: "Ventana", sistema: "Corredera", configuracion: "", sheetScheme: "2 hojas", sheetVariant: "2 móviles", ancho: 1200, alto: 1500, ...overrides,
});

describe("quick commercial composition adjustments", () => {
  it.each([["2 hojas", 2], ["3 hojas", 3], ["4 hojas", 4]] as const)("supports %s without building a GuidedVisualConfig", (sheetScheme, leafCount) => {
    const base = buildQuickCompositionBaseConfig(selection({ sheetScheme }));
    expect(base).toMatchObject({ supported: true, leafCount });
    if (base.supported) expect(base).not.toHaveProperty("config");
  });

  it("keeps a supported default composition when the system is selected before the sheet scheme", () => {
    expect(buildQuickCompositionBaseConfig(selection({ sheetScheme: "", sheetVariant: "" }))).toMatchObject({ supported: true, leafCount: 2 });
  });

  it("supports custom commercial components with a generic editable module and rejects invalid dimensions", () => {
    expect(buildQuickCompositionBaseConfig(selection({ sheetScheme: "Personalizado" }))).toMatchObject({ supported: true, leafCount: 1 });
    expect(buildQuickCompositionBaseConfig(selection({ tipo: "Espejo", sistema: "Muro", sheetScheme: "", sheetVariant: "" }))).toMatchObject({ supported: true, leafCount: 1 });
    expect(buildQuickCompositionBaseConfig(selection({ tipo: "Baranda", sistema: "Postes", sheetScheme: "", sheetVariant: "" }))).toMatchObject({ supported: true, leafCount: 1 });
    expect(buildQuickCompositionBaseConfig(selection({ ancho: 0 })).supported).toBe(false);
  });

  it("exposes only real numeric sheet schemes and variants from the commercial helpers", () => {
    const capabilities = resolveQuickCompositionCapabilities(selection());
    expect(capabilities.sheetSchemes.map(({ value, leafCount }) => [value, leafCount])).toEqual([
      ["2 hojas", 2],
      ["3 hojas", 3],
      ["4 hojas", 4],
    ]);
    expect(capabilities.sheetSchemes.find(({ value }) => value === "3 hojas")?.variants.length).toBeGreaterThan(0);
    expect(capabilities.sheetSchemes.some(({ value }) => value === "Personalizado" || value === "Otro")).toBe(false);
  });

  it("keeps the mobile two-proyectante selection adjustable", () => {
    expect(buildQuickCompositionBaseConfig(selection({ sistema: "Proyectante", sheetScheme: "2 proyectantes", sheetVariant: "", hojasBase: 2 }))).toMatchObject({ supported: true, leafCount: 2 });
  });

  it("validates fixed dimensions and keeps the base opening available", () => {
    const base = createEmptyQuickCompositionAdjustment();
    expect(setQuickFixedDimension(base, "right", 300, 1200)?.fixedRightMm).toBe(300);
    expect(setQuickFixedDimension(base, "right", 900, 1200)).toBeNull();
    expect(setQuickFixedDimension(base, "top", 0, 1500)).toBeNull();
  });

  it("keeps leaf widths exact and equalizes the available space", () => {
    expect(equalizeQuickLeafWidths(2, 900)).toEqual([450, 450]);
    expect(equalizeQuickLeafWidths(3, 900)).toEqual([300, 300, 300]);
    expect(setQuickLeafWidths(createEmptyQuickCompositionAdjustment(), [400, 500], 900)?.leafWidths).toEqual([400, 500]);
    expect(setQuickLeafWidths(createEmptyQuickCompositionAdjustment(), [400, 500], 1000)).toBeNull();
    expect(setQuickLeafWidths(createEmptyQuickCompositionAdjustment(), [400, 400, 400], 1200)?.leafWidths).toEqual([400, 400, 400]);
  });

  it("changes the generic module count and retains the equal-width distribution", () => {
    const split = setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 3, 1200);
    expect(split).toMatchObject({ paneCount: 3, leafWidths: [400, 400, 400] });
    expect(setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 1, 1200)).toMatchObject({ paneCount: 1, leafWidths: null });
    expect(setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 6, 900)).toBeNull();
  });

  it("marks module structure for snapshot invalidation but leaves visual-only adjustments alone", () => {
    expect(hasQuickCompositionStructuralChanges(setQuickPaneDecoration(createEmptyQuickCompositionAdjustment(), 0, "vertical"))).toBe(false);
    expect(hasQuickCompositionStructuralChanges(setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 2, 1200))).toBe(true);
  });

  it("decorates only the selected commercial leaf", () => {
    const next = setQuickPaneDecoration(createEmptyQuickCompositionAdjustment(), 0, "vertical");
    expect(next.paneDecorations).toEqual({ "leaf-1": "vertical" });
    const removed = setQuickPaneDecoration(next, 0, "none");
    expect(removed.paneDecorations).toEqual({});
  });

  it("sets, clears, and structurally tracks the operation type of each individual leaf", () => {
    const base = setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 3, 1200)!;
    const mixed = setQuickPaneType(setQuickPaneType(base, 0, "sliding"), 1, "fixed");
    expect(mixed.paneTypes).toEqual({ "leaf-1": "sliding", "leaf-2": "fixed" });
    expect(hasQuickCompositionStructuralChanges(mixed)).toBe(true);
    expect(setQuickPaneType(mixed, 1, null).paneTypes).toEqual({ "leaf-1": "sliding" });
    expect(setQuickPaneCount(mixed, 1, 1200)?.paneTypes).toEqual({ "leaf-1": "sliding" });
  });

  it("preserves the standard renderer exactly when no adjustment is present", () => {
    const base = generateComponentSVG({ tipo: "Ventana", sistema: "Corredera", sheetScheme: "2 hojas", sheetVariant: "2 móviles", ancho: 1200, alto: 1500, colorHex: "#a8a8a8", maxW: 430, maxH: 245 });
    const empty = generateComponentSVG({ tipo: "Ventana", sistema: "Corredera", sheetScheme: "2 hojas", sheetVariant: "2 móviles", ancho: 1200, alto: 1500, colorHex: "#a8a8a8", maxW: 430, maxH: 245, quickCompositionAdjustment: createEmptyQuickCompositionAdjustment() });
    expect(empty).toBe(base);
  });

  it("adds one palillo to one leaf and preserves standard sliding features", () => {
    const adjustment = setQuickPaneDecoration(createEmptyQuickCompositionAdjustment(), 0, "vertical");
    const svg = generateComponentSVG({ tipo: "Ventana", sistema: "Corredera", sheetScheme: "2 hojas", sheetVariant: "2 móviles", ancho: 1200, alto: 1500, colorHex: "#a8a8a8", quickCompositionAdjustment: adjustment });
    expect(svg.match(/data-quick-palillo="vertical"/g)).toHaveLength(1);
    expect(svg).toContain('data-quick-palillo-profile="aluminum"');
    expect(svg).toContain("data-window-handle=\"recessed\"");
    expect(svg).toContain("data-window-sliding-arrow=\"true\"");
    expect(svg).toContain("data-window-frame=\"outer\"");
  });

  it.each(["Espejo", "Ventana", "Puerta", "Shower Door"]) ("lets any component leaf render an explicit opening type (%s)", (tipo) => {
    const adjustment = setQuickPaneType(setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 2, 1200)!, 0, "casement");
    const svg = generateComponentSVG({ tipo, sistema: tipo === "Ventana" ? "Corredera" : "Muro", ancho: 1200, alto: 1500, colorHex: "#a8a8a8", quickCompositionAdjustment: adjustment });

    expect(svg).toContain('data-quick-pane-type="casement"');
    expect(svg).toContain('data-window-swing-arc="true"');
    if (tipo === "Ventana") expect(svg).toContain("data-window-sash=\"true\"");
    else expect(svg.match(/data-quick-module-divider="true"/g)).toHaveLength(1);
  });

  it.each([
    ["sliding", 'data-window-sliding-sash="true"'],
    ["fixed", "data-window-fixed-panel=\"true\""],
    ["casement", 'data-window-swing-arc="true"'],
    ["projecting", 'data-window-projection-indicator="true"'],
  ] as const)("renders the selected %s operation on a generic component", (paneType, marker) => {
    const adjustment = setQuickPaneType(createEmptyQuickCompositionAdjustment(), 0, paneType);
    const svg = generateComponentSVG({ tipo: "Espejo", sistema: "Muro", ancho: 1200, alto: 1500, colorHex: "#a8a8a8", quickCompositionAdjustment: adjustment });

    expect(svg).toContain(`data-quick-pane-type="${paneType}"`);
    expect(svg).toContain(marker);
  });

  it("shows mixed fixed and sliding leaf types and keeps quick types on the legacy 3H layout", () => {
    const mixed = setQuickPaneType(setQuickPaneType(createEmptyQuickCompositionAdjustment(), 0, "fixed"), 1, "sliding");
    const svg = generateComponentSVG({ tipo: "Ventana", sistema: "Corredera", sheetScheme: "3 hojas", sheetVariant: "2 móviles + 1 fija", ancho: 1800, alto: 1500, colorHex: "#a8a8a8", presentation: "mobile-guided", quickCompositionAdjustment: mixed });

    expect(svg).toContain('data-quick-pane-type="fixed"');
    expect(svg).toContain('data-quick-pane-type="sliding"');
  });

  it.each([["Espejo", "Muro"], ["Baranda", "Postes"], ["Vitrina", "Frontal"], ["Puerta", "Abatible"], ["Shower Door", "Corredera"], ["Paño fijo", "Fijo"], ["Cristal", "Muro"]])("renders quick module edits for %s / %s", (tipo, sistema) => {
    const adjustment = setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 2, 1200)!;
    adjustment.paneDecorations = { "leaf-2": "vertical" };
    adjustment.fixedRightMm = 250;
    const svg = generateComponentSVG({ tipo, sistema, ancho: 1200, alto: 1500, colorHex: "#a8a8a8", quickCompositionAdjustment: adjustment, quickSelectedPaneIndex: 1 });
    expect(svg).toContain('data-quick-selected-pane="true"');
    expect(svg).toContain('data-quick-module-divider="true"');
    expect(svg).toContain('data-quick-palillo="vertical"');
    expect(svg).toContain('data-window-fixed-panel="true"');
  });

  it("keeps generic sheet divisions visible after applying a split without selection or palillos", () => {
    const adjustment = setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 3, 1200)!;
    const svg = generateComponentSVG({ tipo: "Espejo", sistema: "Muro", ancho: 1200, alto: 1500, colorHex: "#a8a8a8", quickCompositionAdjustment: adjustment });

    expect(svg.match(/data-quick-module-divider="true"/g)).toHaveLength(2);
    expect(svg).not.toContain('data-quick-selected-pane="true"');
  });

  it("renders equal widths for a three-leaf fixed-center slider when equalized", () => {
    const widths = setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 3, 1200)!.leafWidths;
    const svg = generateComponentSVG({ tipo: "Ventana", sistema: "Corredera", sheetScheme: "3 hojas", sheetVariant: "2 móviles + 1 fija", presentation: "mobile-guided", ancho: 1800, alto: 1500, colorHex: "#a8a8a8", quickCompositionAdjustment: { ...createEmptyQuickCompositionAdjustment(), paneCount: null, leafWidths: widths } });
    const paneWidths = [...svg.matchAll(/data-window-glass="true"[^>]*\swidth="([\d.]+)"/g)].map((match) => Number(match[1]));

    expect(paneWidths).toHaveLength(3);
    expect(Math.max(...paneWidths) - Math.min(...paneWidths)).toBeLessThan(0.2);
  });

  it.each(["top", "bottom", "left", "right"] as const)("renders a peripheral fixed pane at %s around the unchanged standard composition", (side) => {
    const adjustment = setQuickFixedDimension(createEmptyQuickCompositionAdjustment(), side, 300, side === "top" || side === "bottom" ? 1500 : 1200)!;
    const svg = generateComponentSVG({ tipo: "Ventana", sistema: "Corredera", sheetScheme: "2 hojas", sheetVariant: "2 móviles", ancho: 1200, alto: 1500, colorHex: "#a8a8a8", quickCompositionAdjustment: adjustment });
    expect(svg).toContain("data-window-sliding-arrow=\"true\"");
    expect(svg).toContain("data-window-fixed-panel=\"true\"");
    expect(svg).toContain("1200 mm");
  });

  it("retains the commercial three-leaf fixed-center drawing when a palillo is added", () => {
    const adjustment = setQuickPaneDecoration(createEmptyQuickCompositionAdjustment(), 0, "vertical");
    const svg = generateComponentSVG({ tipo: "Ventana", sistema: "Corredera", sheetScheme: "3 hojas", sheetVariant: "2 móviles + 1 fija", ancho: 1800, alto: 1500, colorHex: "#a8a8a8", presentation: "mobile-guided", quickCompositionAdjustment: adjustment });
    expect(svg).toContain("Ventana corredera de 3 hojas, centro fijo");
    expect(svg).toContain("data-window-fixed-label=\"true\"");
    expect(svg.match(/data-quick-palillo="vertical"/g)).toHaveLength(1);
  });

  it("round-trips adjustment metadata and compares content without generated ids", () => {
    const adjustment = setQuickPaneType(setQuickPaneDecoration(setQuickPaneCount(createEmptyQuickCompositionAdjustment(), 2, 1200)!, 1, "cross"), 0, "casement");
    const encoded = encodeCotizacionItemPresentationMeta({ colorHex: "#a8a8a8", material: "Aluminio", quickCompositionAdjustment: adjustment });
    const decoded = decodeCotizacionItemPresentationMeta(encoded);
    expect(decoded.quickCompositionAdjustment).toEqual(adjustment);
    expect(quickCompositionEquals(decoded.quickCompositionAdjustment, adjustment)).toBe(true);
    expect(decodeCotizacionItemPresentationMeta("[c:#a8a8a8]").quickCompositionAdjustment).toBeNull();
  });
});
