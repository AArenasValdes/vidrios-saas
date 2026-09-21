import { resolveCotizacionItemDrawingSvg } from "@/features/cotizaciones/visual-composer/services/resolve-item-drawing-svg";
import { createDefaultGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

describe("resolveCotizacionItemDrawingSvg", () => {
  it("reutiliza el dibujo 25/50/25 en PDF solo para la variante de fijo central", () => {
    const base = {
      tipo: "Ventana",
      sistema: "Corredera",
      sheetScheme: "3 hojas",
      ancho: 2000,
      alto: 1200,
      colorHex: "#a8a8a8",
      maxW: 470,
      maxH: 260,
      variant: "pdf" as const,
    };
    const centerFixed = resolveCotizacionItemDrawingSvg({
      ...base,
      sheetVariant: "2 móviles + 1 fija",
    });
    const sideFixed = resolveCotizacionItemDrawingSvg({
      ...base,
      sheetVariant: "1 móvil + 2 fijas",
    });
    const paneWidths = [...centerFixed.matchAll(/data-window-glass="true"[^>]*\swidth="([\d.]+)"/g)]
      .map((match) => Number(match[1]));

    expect(centerFixed).toContain('data-window-fixed-label="true"');
    expect(centerFixed).toContain(">FIJO</text>");
    expect(centerFixed).toContain(">2000 mm</text>");
    expect(centerFixed).toContain(">1200 mm</text>");
    expect(paneWidths).toHaveLength(3);
    expect(paneWidths[1] / paneWidths[0]).toBeCloseTo(2, 1);
    expect(paneWidths[2] / paneWidths[0]).toBeCloseTo(1, 1);
    expect(centerFixed).toContain('data-window-slide-direction="right"');
    expect(centerFixed).toContain('data-window-slide-direction="left"');
    expect(sideFixed).not.toContain('data-window-fixed-label="true"');
  });

  it("mantiene la composición 25/50/25 en PDF aunque el item tenga configuración guiada", () => {
    const svg = resolveCotizacionItemDrawingSvg({
      tipo: "Ventana",
      sistema: "Corredera",
      sheetScheme: "3 hojas",
      sheetVariant: "2 móviles + 1 fija",
      ancho: 2000,
      alto: 1200,
      colorHex: "#a8a8a8",
      variant: "pdf",
      guidedVisualConfig: createDefaultGuidedVisualConfig({ widthMm: 2000, heightMm: 1200 }),
    });

    expect(svg).toContain('aria-label="Ventana corredera de 3 hojas, centro fijo"');
    expect(svg).toContain('data-window-fixed-label="true"');
    expect(svg).toContain('data-window-slide-direction="right"');
    expect(svg).toContain('data-window-slide-direction="left"');
    expect([...svg.matchAll(/data-window-glass="true"[^>]*\swidth="([\d.]+)"/g)]).toHaveLength(3);
  });

  it("fuerza el croquis correcto por el nombre del ítem si faltan los metadatos de paños", () => {
    const svg = resolveCotizacionItemDrawingSvg({
      tipo: "Ventana",
      sistema: "Corredera",
      itemLabel: "Ventana corredera 3 hojas, 2 móviles + 1 fija",
      hojasBase: 2,
      ancho: 1222,
      alto: 1222,
      colorHex: "#a8a8a8",
      variant: "pdf",
    });

    expect(svg).toContain('aria-label="Ventana corredera de 3 hojas, centro fijo"');
    expect(svg).toContain('data-window-fixed-label="true"');
    expect([...svg.matchAll(/data-window-glass="true"[^>]*\swidth="([\d.]+)"/g)]).toHaveLength(3);
  });

  it("usa la variante nombrada aunque tipo, sistema y metadata guardada estén incompletos", () => {
    const svg = resolveCotizacionItemDrawingSvg({
      tipo: "Ventana corredera",
      itemLabel: "Ventana corredera 3 hojas, 2 móviles + 1 fija",
      hojasBase: 2,
      customSchemeDescription: "Composición antigua",
      isCustomScheme: true,
      ancho: 1222,
      alto: 1222,
      colorHex: "#a8a8a8",
      variant: "pdf",
    });

    expect(svg).toContain('aria-label="Ventana corredera de 3 hojas, centro fijo"');
    expect(svg).toContain('data-window-fixed-label="true"');
    expect([...svg.matchAll(/data-window-glass="true"[^>]*\swidth="([\d.]+)"/g)]).toHaveLength(3);
  });

  it("limita el SVG de 3 paños al tamaño de exportación y no agrega margen inline", () => {
    const svg = resolveCotizacionItemDrawingSvg({
      tipo: "Ventana",
      sistema: "Corredera",
      sheetScheme: "3 hojas",
      sheetVariant: "2 móviles + 1 fija",
      ancho: 1222,
      alto: 1222,
      colorHex: "#a8a8a8",
      maxW: 470,
      maxH: 260,
      variant: "pdf",
    });
    const dimensions = svg.match(/<svg[^>]*\swidth="([\d.]+)"\sheight="([\d.]+)"/);

    expect(dimensions).not.toBeNull();
    expect(Number(dimensions?.[1])).toBeLessThanOrEqual(470);
    expect(Number(dimensions?.[2])).toBeLessThanOrEqual(248);
    expect(svg).not.toContain("margin-inline:auto");
  });
});
