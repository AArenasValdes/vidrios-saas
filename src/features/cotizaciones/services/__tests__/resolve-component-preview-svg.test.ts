import { COMPONENT_TYPE_GROUPS } from "@/features/cotizaciones/services/component-catalog.service";
import {
  buildSubtypePreviewInput,
  resolveComponentPreviewSvg,
  shouldRenderComponentPreview,
} from "@/features/cotizaciones/services/resolve-component-preview-svg";

describe("resolveComponentPreviewSvg", () => {
  it("genera SVG para los tipos guiados del catalogo", () => {
    const guidedTypes = COMPONENT_TYPE_GROUPS.filter(
      (group) => group.title !== "Proyecto libre y Mantencion"
    ).flatMap((group) => group.items);

    guidedTypes.forEach((type) => {
      const svg = resolveComponentPreviewSvg(buildSubtypePreviewInput(type));

      expect(svg.trim().startsWith("<svg")).toBe(true);
    });
  });

  it("cubre variantes clave de ventanas y puertas", () => {
    const cases = [
      { type: "Ventana", system: "Corredera", sheetScheme: "2 hojas", sheetVariant: "2 móviles" },
      { type: "Ventana", system: "Corredera", sheetScheme: "3 hojas", sheetVariant: "2 móviles + 1 fija" },
      { type: "Ventana", system: "Corredera", sheetScheme: "4 hojas", sheetVariant: "4 móviles" },
      { type: "Ventana", system: "Abatible", configuration: "2 hojas" },
      { type: "Ventana", system: "Oscilobatiente", configuration: "1 hoja" },
      { type: "Ventana", system: "Proyectante", configuration: "Proyectante + fijo" },
      { type: "Puerta", system: "Abatible", configuration: "1 hoja" },
      { type: "Puerta", system: "Corredera", configuration: "2 moviles" },
      { type: "Puerta", system: "Pivotante", configuration: "1 hoja pivotante" },
      { type: "Paño fijo", system: "Fijo", sheetScheme: "2 paños" },
      { type: "Shower door", system: "Corredera", configuration: "Frontal", sheetScheme: "2 hojas correderas" },
      { type: "Cierre terraza/logia", system: "Corredera" },
      { type: "Baranda", system: "Botones" },
      { type: "Espejo", system: "Muro", mirrorFormat: "divided" as const, mirrorPaneCount: 3 },
      { type: "Cubierta de mesa", system: "Recta" },
    ];

    cases.forEach((input) => {
      const svg = resolveComponentPreviewSvg({
        ...input,
        width: 1200,
        height: 1500,
        colorHex: "#a8a8a8",
        maxW: 120,
        maxH: 90,
      });

      expect(svg.trim().startsWith("<svg")).toBe(true);
    });
  });

  it("actualiza el preview al cambiar medidas y color", () => {
    const base = resolveComponentPreviewSvg({
      type: "Ventana",
      system: "Abatible",
      configuration: "1 hoja",
      width: 1000,
      height: 1200,
      colorHex: "#a8a8a8",
      maxW: 120,
      maxH: 90,
    });
    const resized = resolveComponentPreviewSvg({
      type: "Ventana",
      system: "Abatible",
      configuration: "1 hoja",
      width: 1800,
      height: 900,
      colorHex: "#2a2a2a",
      maxW: 120,
      maxH: 90,
    });

    expect(base).not.toEqual(resized);
    expect(base).toContain("1000 mm");
    expect(resized).toContain("1800 mm");
  });

  it("activa el dibujo 25/50/25 solo con la presentación de la cotización móvil", () => {
    const input = {
      type: "Ventana",
      system: "Corredera",
      sheetScheme: "3 hojas",
      sheetVariant: "2 móviles + 1 fija",
      width: 2000,
      height: 1200,
      colorHex: "#a8a8a8",
      maxW: 240,
      maxH: 164,
    };
    const mobileGuided = resolveComponentPreviewSvg({
      ...input,
      presentation: "mobile-guided",
    });
    const generic = resolveComponentPreviewSvg(input);

    expect(mobileGuided).toContain('data-window-fixed-label="true"');
    expect(mobileGuided).toContain('aria-label="Ventana corredera de 3 hojas, centro fijo"');
    expect(generic).not.toContain('data-window-fixed-label="true"');
  });

  it("no renderiza items libres con valor", () => {
    expect(shouldRenderComponentPreview("Trabajo libre / Mantencion")).toBe(false);
    expect(resolveComponentPreviewSvg({ type: "Trabajo libre / Mantencion" })).toBe("");
  });
});
