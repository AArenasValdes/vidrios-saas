jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            is: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    }),
  })),
}));

import {
  createPublicCotizacionApprovalService,
} from "../public-cotizacion-approval.service";
import type { PublicCotizacionApprovalRepository } from "../../repositories/public-cotizacion-approval.repository";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function createRepositoryMock(): jest.Mocked<PublicCotizacionApprovalRepository> {
  return {
    getByApprovalToken: jest.fn(),
    markViewed: jest.fn(),
    respond: jest.fn(),
  };
}

function createPayload() {
  return {
    cotizacion: {
      id: "cot-1",
      organization_id: "org-1",
      proyecto_id: "pro-1",
      numero: "COT-001",
      estado: "enviada",
      notas: "Observaciones",
      valido_hasta: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      subtotal_neto: 100000,
      descuento_pct: 0,
      flete: 0,
      iva: 19000,
      total: 119000,
      approval_token: "a".repeat(24),
      approval_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      cliente_vio_en: null,
      cliente_respondio_en: null,
      cliente_respuesta_canal: null,
      creado_en: "2026-05-08T10:00:00.000Z",
      actualizado_en: "2026-05-08T10:00:00.000Z",
      eliminado_en: null,
    },
    project: {
      id: "pro-1",
      titulo: "Cierre terraza",
      cliente_id: "cli-1",
    },
    client: {
      id: "cli-1",
      nombre: "Ana Soto",
      telefono: "+56912345678",
      direccion: "Santiago",
    },
    organizationProfile: {
      organization_id: "org-1",
      empresa_nombre: "Ventora Norte",
      empresa_logo_url: null,
      empresa_direccion: "Santiago",
      empresa_telefono: "+56999999999",
      empresa_email: "hola@ventora.cl",
      brand_color: "#335ea9",
      forma_pago: "Transferencia",
      margen_defecto: 100,
    },
    items: [
      {
        id: "item-1",
        cotizacion_id: "cot-1",
        codigo: "I1",
        tipo_componente: "Ventana",
        cantidad: 1,
        precio_unitario: 100000,
        subtotal: 100000,
        ancho: 1200,
        alto: 1000,
        vidrio: "Termopanel",
        nombre: "Ventana termopanel",
        descripcion: "Ventana termopanel",
        unidad: "unidad",
        observaciones: null,
        orden: 1,
        eliminado_en: null,
      },
    ],
  };
}

describe("public-cotizacion-approval.service", () => {
  it("no consulta el repositorio si el token es invalido", async () => {
    const repository = createRepositoryMock();
    const service = createPublicCotizacionApprovalService({ repository });

    const result = await service.resolveByToken("token-invalido");

    expect(result).toBeNull();
    expect(repository.getByApprovalToken).not.toHaveBeenCalled();
  });

  it("marca la cotizacion como no respondible cuando el link esta expirado", async () => {
    const repository = createRepositoryMock();
    repository.getByApprovalToken.mockResolvedValue({
      ...createPayload(),
      cotizacion: {
        ...createPayload().cotizacion,
        approval_token_expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
      },
    });
    const service = createPublicCotizacionApprovalService({ repository });

    const result = await service.resolveByToken("a".repeat(24));

    expect(result).not.toBeNull();
    expect(result?.isExpired).toBe(true);
    expect(result?.canRespond).toBe(false);
  });

  it("rechaza aprobar un token con formato invalido", async () => {
    const repository = createRepositoryMock();
    const service = createPublicCotizacionApprovalService({ repository });

    await expect(service.accept("foo")).rejects.toThrow(
      "El link de aprobacion no es valido."
    );
    expect(repository.respond).not.toHaveBeenCalled();
  });

  it("no expone metadata tecnica ni financiera en la vista publica", async () => {
    const repository = createRepositoryMock();
    const payload = createPayload();
    payload.items[0].observaciones = encodeCotizacionItemPresentationMeta({
      colorHex: "#2a2a2a",
      material: "Aluminio",
      referencia: "Serie 25",
      sistema: "Corredera",
      lineTemplateId: "77",
      precioPorM2: 145000,
      margenPct: 42,
      fabricacionTipologia: "corredera",
      fabricacionHerraje: "caracol",
      fabricationRecipeId: "11111111-1111-4111-8111-111111111111",
      raw: "Instalacion incluida",
    });
    repository.getByApprovalToken.mockResolvedValue(payload);
    const service = createPublicCotizacionApprovalService({ repository });

    const result = await service.resolveByToken("a".repeat(24));
    const publicObservaciones = result?.items[0]?.observaciones ?? "";

    expect(publicObservaciones).toContain("[r:Serie 25]");
    expect(publicObservaciones).toContain("Instalacion incluida");
    expect(publicObservaciones).not.toMatch(
      /\[(?:lti|pm2|mp|ft|fhe|frid|cub):/i
    );
  });
});
