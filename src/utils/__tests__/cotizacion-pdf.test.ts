/** @jest-environment jsdom */

import {
  buildCotizacionPdfFileName,
  canSharePdfFile,
  downloadPdfBlob,
  formatCotizacionPdfError,
  resolveCotizacionPdfCanvasScale,
  resolveCotizacionPdfPageImageBox,
  resolveCotizacionPdfRenderSize,
  requiresPdfOpenFallback,
} from "../cotizacion-pdf";

const record = {
  id: "cot-1",
  codigo: "COT-123456",
  clientId: 1,
  projectId: 1,
  clienteNombre: "Roberto Fuentes",
  clienteTelefono: "+56 9 8234 5678",
  obra: "Casa Los Pescadores, La Serena",
  direccion: "Los Pescadores 221",
  validez: "15 dias",
  descuentoPct: 0,
  observaciones: "",
  estado: "creada" as const,
  approvalToken: "abc123abc123abc123abc123abc123ab",
  approvalTokenExpiresAt: null,
  clienteVioEn: null,
  clienteRespondioEn: null,
  clienteRespuestaCanal: null,
  createdAt: "2026-03-14T10:00:00.000Z",
  updatedAt: "2026-03-14T10:00:00.000Z",
  items: [],
  subtotal: 100000,
  descuentoValor: 0,
  neto: 100000,
  iva: 19000,
  flete: 0,
  total: 119000,
};

describe("cotizacion-pdf utils", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("debe construir un nombre de archivo limpio para la cotizacion", () => {
    expect(buildCotizacionPdfFileName(record)).toBe(
      "cot-123456-casa-los-pescadores-la-serena.pdf"
    );
  });

  it("debe detectar cuando el navegador no puede compartir archivos", () => {
    Object.defineProperty(window.navigator, "share", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window.navigator, "canShare", {
      value: undefined,
      configurable: true,
    });

    const file = new File(["test"], "cotizacion.pdf", { type: "application/pdf" });

    expect(canSharePdfFile(file)).toBe(false);
  });

  it("debe limitar la escala del canvas en iPhone para evitar PDFs corruptos", () => {
    expect(
      resolveCotizacionPdfCanvasScale({
        width: 816,
        height: 1248,
        devicePixelRatio: 3,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1",
      })
    ).toBe(2.4);
  });

  it("debe mantener una escala alta en escritorio cuando el canvas lo permite", () => {
    expect(
      resolveCotizacionPdfCanvasScale({
        width: 816,
        height: 1248,
        devicePixelRatio: 2,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      })
    ).toBe(3.71);
  });

  it("debe exportar usando el tamano real de la hoja y no el rect escalado del preview", () => {
    expect(
      resolveCotizacionPdfRenderSize({
        rectWidth: 343,
        rectHeight: 526,
        scrollWidth: 816,
        scrollHeight: 1248,
        offsetWidth: 816,
        offsetHeight: 1248,
        computedWidth: "816px",
        computedHeight: "1248px",
      })
    ).toEqual({ width: 816, height: 1248 });
  });

  it("debe respetar la proporcion real del canvas al insertarlo en el PDF", () => {
    expect(
      resolveCotizacionPdfPageImageBox({
        canvasWidth: 816,
        canvasHeight: 1248,
        pageWidth: 215.9,
        pageHeight: 355.6,
      })
    ).toEqual({ width: 215.9, height: 330.2 });
  });

  it("debe detectar que iPhone necesita abrir el PDF en vez de descargar blob directo", () => {
    expect(
      requiresPdfOpenFallback(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1"
      )
    ).toBe(true);
  });

  it("debe abrir el PDF publico en iPhone cuando existe fallbackUrl", () => {
    const openSpy = jest.spyOn(window, "open").mockReturnValue(null);
    Object.defineProperty(window.URL, "createObjectURL", {
      value: jest.fn(() => "blob:test"),
      configurable: true,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      value: jest.fn(),
      configurable: true,
    });
    const createObjectUrlSpy = jest.spyOn(window.URL, "createObjectURL");
    const revokeObjectUrlSpy = jest.spyOn(window.URL, "revokeObjectURL");

    const result = downloadPdfBlob(new Blob(["pdf"], { type: "application/pdf" }), "cot.pdf", {
      fallbackUrl: "https://example.com/cot.pdf",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1",
    });

    expect(result).toBe("opened_fallback");
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/cot.pdf",
      "_blank",
      "noopener,noreferrer"
    );
    expect(createObjectUrlSpy).not.toHaveBeenCalled();
    expect(revokeObjectUrlSpy).not.toHaveBeenCalled();
  });

  it("debe reutilizar una ventana ya abierta en iPhone para mostrar el PDF", () => {
    const targetWindow = {
      closed: false,
      location: { href: "" },
    } as unknown as Window;

    const result = downloadPdfBlob(new Blob(["pdf"], { type: "application/pdf" }), "cot.pdf", {
      fallbackUrl: "https://example.com/cot.pdf",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1",
      targetWindow,
    });

    expect(result).toBe("opened_fallback");
    expect(targetWindow.location.href).toBe("https://example.com/cot.pdf");
  });

  it("debe convertir errores desconocidos en texto legible", () => {
    expect(formatCotizacionPdfError({ code: "canvas_failed" })).toBe(
      '{"code":"canvas_failed"}'
    );
  });
});
