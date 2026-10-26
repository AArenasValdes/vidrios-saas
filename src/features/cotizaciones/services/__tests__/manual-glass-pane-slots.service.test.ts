import { resolveManualGlassPaneSlots } from "../manual-glass-pane-slots.service";
import {
  applyPalilloPresetToModule,
  createDefaultGuidedVisualConfig,
  listLeafModules,
  setGuidedFrameShape,
  splitModule,
  updateModuleGlassShape,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

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
    for (const count of [2, 3, 4]) {
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

  it.each([
    ["Paño fijo", "Fijo"],
    ["Proyectante", "Proyectante"],
    ["Oscilobatiente", "Oscilobatiente"],
    ["Abatible", "Abatible"],
    ["Puerta abatible", "Abatible"],
  ])("reconoce un paño para una configuración simple %s sin depender de receta de perfiles", (componentType, label) => {
    expect(resolveManualGlassPaneSlots({ componentType }).slots.map((slot) => slot.label))
      .toEqual([`Paño 1 · ${label}`]);
  });

  it.each([
    ["Puerta corredera", "4 hojas", 4],
    ["Corredera", "2 hojas", 2],
  ])("reconoce cantidad explícita en %s (%s)", (componentType, sheetScheme, count) => {
    expect(resolveManualGlassPaneSlots({ componentType, sheetScheme }).slots).toHaveLength(count);
  });

  it("prioriza módulos estructurales del Constructor sobre el tipo comercial simple", () => {
    let visual = createDefaultGuidedVisualConfig({ widthMm: 1800, heightMm: 1400 });
    visual = splitModule(visual, listLeafModules(visual.root)[0]!.id, "vertical", 0.34);
    visual = splitModule(visual, listLeafModules(visual.root)[1]!.id, "vertical", 0.5);

    const result = resolveManualGlassPaneSlots({ componentType: "Paño fijo", guidedVisualConfig: visual });

    expect(result.slots).toHaveLength(3);
    expect(result.slots.map(({ id }) => id)).toEqual(listLeafModules(visual.root).map(({ id }) => id));
  });

  it("no infiere cuántos paños hay a partir de divisiones visuales internas y cambia la huella", () => {
    let visual = createDefaultGuidedVisualConfig({ widthMm: 1800, heightMm: 1400 });
    const moduleId = listLeafModules(visual.root)[0]!.id;
    const before = resolveManualGlassPaneSlots({ componentType: "Paño fijo", guidedVisualConfig: visual });
    visual = applyPalilloPresetToModule(visual, moduleId, "v1");
    const after = resolveManualGlassPaneSlots({ componentType: "Paño fijo", guidedVisualConfig: visual });

    expect(before).toMatchObject({ countIsKnown: true, slots: [{ rectangular: true }] });
    expect(after).toMatchObject({ countIsKnown: false, slots: [] });
    expect(after.configurationFingerprint).not.toBe(before.configurationFingerprint);
  });

  it("marca las geometrías no rectangulares y cambios de forma alteran la huella", () => {
    let visual = createDefaultGuidedVisualConfig({ widthMm: 1800, heightMm: 1400 });
    const before = resolveManualGlassPaneSlots({ componentType: "Proyectante", guidedVisualConfig: visual });
    visual = setGuidedFrameShape(visual, { kind: "arch_top", archRiseMm: 180 });
    visual = updateModuleGlassShape(visual, listLeafModules(visual.root)[0]!.id, {
      kind: "rounded", radiusMm: 40, corners: "top",
    });
    const after = resolveManualGlassPaneSlots({ componentType: "Proyectante", guidedVisualConfig: visual });

    expect(after.slots[0]?.rectangular).toBe(false);
    expect(after.configurationFingerprint).not.toBe(before.configurationFingerprint);
  });

  it("no convierte una cantidad de hojas en cantidad de paños para una configuración desconocida", () => {
    expect(resolveManualGlassPaneSlots({ componentType: "Ventana especial", fabricacionHojas: 4 }))
      .toMatchObject({ countIsKnown: false, slots: [] });
  });
});
