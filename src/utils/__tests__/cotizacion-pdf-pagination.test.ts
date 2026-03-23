import { planPdfPageSlices } from "../cotizacion-pdf";

describe("cotizacion-pdf paginacion", () => {
  it("debe cortar antes de un bloque protegido para no partirlo", () => {
    const slices = planPdfPageSlices({
      canvasHeight: 3000,
      pageHeight: 1000,
      protectedBlocks: [{ top: 920, bottom: 1220 }],
    });

    expect(slices[0]).toEqual({ start: 0, end: 920 });
    expect(slices[1]).toEqual({ start: 920, end: 1920 });
  });

  it("debe seguir usando el alto completo cuando no hay bloques protegidos", () => {
    const slices = planPdfPageSlices({
      canvasHeight: 2500,
      pageHeight: 1000,
      protectedBlocks: [],
    });

    expect(slices).toEqual([
      { start: 0, end: 1000 },
      { start: 1000, end: 2000 },
      { start: 2000, end: 2500 },
    ]);
  });

  it("debe adelantar el salto si un bloque queda demasiado pegado al borde inferior", () => {
    const slices = planPdfPageSlices({
      canvasHeight: 2600,
      pageHeight: 1000,
      protectedBlocks: [{ top: 680, bottom: 955 }],
    });

    expect(slices[0]).toEqual({ start: 0, end: 680 });
    expect(slices[1]).toEqual({ start: 680, end: 1680 });
  });
});
