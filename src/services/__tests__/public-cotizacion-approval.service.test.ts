import {
  createPublicCotizacionApprovalService,
} from "../public-cotizacion-approval.service";
import type { PublicCotizacionApprovalRepository } from "@/repositories/public-cotizacion-approval.repository";

function createRepositoryMock(): jest.Mocked<PublicCotizacionApprovalRepository> {
  let currentStatus = "creada";
  let respondedAt: string | null = null;

  const getByApprovalToken = jest.fn().mockImplementation(async () => ({
    cotizacion: {
      id: 1,
      organization_id: 77,
      proyecto_id: 12,
      numero: "COT-100001",
      estado: currentStatus,
      notas: "Pago 50% al inicio.",
      valido_hasta: "2026-03-30",
      subtotal_neto: 100000,
      descuento_pct: 0,
      flete: 0,
      iva: 19000,
      total: 119000,
      approval_token: "abc123abc123abc123abc123abc123ab",
      approval_token_expires_at: null,
      cliente_vio_en: respondedAt ? "2026-03-11T09:00:00.000Z" : null,
      cliente_respondio_en: respondedAt,
      cliente_respuesta_canal: respondedAt ? "link_publico" : null,
      creado_en: "2026-03-10T10:00:00.000Z",
      actualizado_en: respondedAt ?? "2026-03-10T10:00:00.000Z",
      eliminado_en: null,
    },
    project: {
      id: 12,
      titulo: "Casa Coquimbo",
      cliente_id: 8,
    },
    client: {
      id: 8,
      nombre: "Roberto Fuentes",
      telefono: "+56 9 8234 5678",
      direccion: "Los Pescadores 221",
    },
    organizationProfile: {
      organization_id: 77,
      empresa_nombre: "San Marco Vidrios y Aluminios",
      empresa_logo_url: null,
      empresa_direccion: "La Serena",
      empresa_telefono: "+56 9 7733 8906",
      empresa_email: "sanmarco@gmail.com",
      brand_color: "#1a2744",
      forma_pago: "50% al inicio",
    },
    items: [
      {
        id: 200,
        cotizacion_id: 1,
        codigo: "V1",
        tipo_componente: "Ventana",
        cantidad: 1,
        precio_unitario: 119000,
        subtotal: 119000,
        ancho: 1200,
        alto: 1000,
        vidrio: "Incoloro monolitico 5mm",
        nombre: "Ventana living",
        descripcion: "Ventana corredera",
        unidad: "unidad",
        observaciones: null,
        orden: 0,
        eliminado_en: null,
      },
    ],
  }));

  const respond = jest.fn().mockImplementation(async (_token, estado) => {
    currentStatus = estado;
    respondedAt = "2026-03-11T09:10:00.000Z";

    return {
      id: 1,
      organization_id: 77,
      proyecto_id: 12,
      numero: "COT-100001",
      estado,
      notas: "Pago 50% al inicio.",
      valido_hasta: "2026-03-30",
      subtotal_neto: 100000,
      descuento_pct: 0,
      flete: 0,
      iva: 19000,
      total: 119000,
      approval_token: "abc123abc123abc123abc123abc123ab",
      approval_token_expires_at: null,
      cliente_vio_en: "2026-03-11T09:00:00.000Z",
      cliente_respondio_en: respondedAt,
      cliente_respuesta_canal: "link_publico",
      creado_en: "2026-03-10T10:00:00.000Z",
      actualizado_en: respondedAt,
      eliminado_en: null,
    };
  });

  return {
    getByApprovalToken,
    markViewed: jest.fn().mockResolvedValue("2026-03-11T09:00:00.000Z"),
    respond,
  };
}

describe("public-cotizacion-approval.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe resolver un presupuesto publico por token", async () => {
    const repository = createRepositoryMock();
    const service = createPublicCotizacionApprovalService({ repository });

    const quote = await service.resolveByToken("abc123abc123abc123abc123abc123ab");

    expect(repository.getByApprovalToken).toHaveBeenCalled();
    expect(quote?.clienteNombre).toBe("Roberto Fuentes");
    expect(quote?.subtotal).toBe(119000);
    expect(quote?.items).toHaveLength(1);
    expect(quote?.canRespond).toBe(true);
  });

  it("debe registrar la vista publica antes de responder", async () => {
    const repository = createRepositoryMock();
    const service = createPublicCotizacionApprovalService({ repository });

    await service.registerView("abc123abc123abc123abc123abc123ab");

    expect(repository.markViewed).toHaveBeenCalledWith("abc123abc123abc123abc123abc123ab");
  });

  it("debe aceptar un presupuesto una sola vez", async () => {
    const repository = createRepositoryMock();
    const service = createPublicCotizacionApprovalService({ repository });

    const quote = await service.accept("abc123abc123abc123abc123abc123ab");

    expect(repository.respond).toHaveBeenCalledWith(
      "abc123abc123abc123abc123abc123ab",
      "aprobada"
    );
    expect(quote?.estado).toBe("aprobada");
  });
});
