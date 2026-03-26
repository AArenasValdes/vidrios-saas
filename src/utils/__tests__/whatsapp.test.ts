import {
  buildCotizacionWhatsappMessage,
  buildCotizacionWhatsappUrl,
  normalizeWhatsappPhone,
} from "../whatsapp";

const record = {
  id: "cot-1",
  codigo: "COT-123456",
  clientId: 1,
  projectId: 1,
  clienteNombre: "Roberto Fuentes",
  clienteTelefono: "+56 9 8234 5678",
  obra: "Casa Coquimbo",
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

describe("whatsapp utils", () => {
  it("debe normalizar telefonos chilenos moviles", () => {
    expect(normalizeWhatsappPhone("+56 9 8234 5678")).toBe("56982345678");
    expect(normalizeWhatsappPhone("982345678")).toBe("56982345678");
    expect(normalizeWhatsappPhone("09 8234 5678")).toBe("56982345678");
  });

  it("debe generar el mensaje comercial de la cotizacion", () => {
    const message = buildCotizacionWhatsappMessage(record, {
      pdfUrl: "https://cdn.example.com/cotizacion.pdf",
    });

    expect(message).toContain("Hola Roberto Fuentes,");
    expect(message).toContain("Te enviamos tu cotizacion para Casa Coquimbo.");
    expect(message).toContain("Total: $119.000");
    expect(message).toContain("Vigencia: 15 dias");
    expect(message).toContain("Ver cotizacion:");
    expect(message).toContain("https://cdn.example.com/cotizacion.pdf");
    expect(message).toContain("Puedes aprobar o rechazar directamente desde el enlace.");
    expect(message).not.toContain("COT-123456");
  });

  it("debe usar el link publico al compartir con PDF adjunto", () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://vidrios-saas.vercel.app";

    try {
      const message = buildCotizacionWhatsappMessage(record, {
        deliveryMode: "attachment",
      });

      expect(message).toContain("Ver cotizacion:");
      expect(message).toContain("/presupuesto/");
      expect(message).toContain("https://vidrios-saas.vercel.app");
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  it("debe construir la url de WhatsApp lista para abrir", () => {
    const url = buildCotizacionWhatsappUrl(record);

    expect(url).toContain("https://wa.me/56982345678");
    expect(url).toContain("Hola%20Roberto%20Fuentes%2C");
  });
});
