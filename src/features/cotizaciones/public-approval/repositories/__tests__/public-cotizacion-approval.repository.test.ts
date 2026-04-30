jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicCotizacionApprovalRepository } from "../public-cotizacion-approval.repository";

const createAdminClientMock = jest.mocked(createAdminClient);

type QueryResponse = {
  data: unknown;
  error: unknown;
};

function createMaybeSingleQuery(response: QueryResponse) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    order: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(response),
    then: jest.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.then.mockImplementation((resolve, reject) =>
    Promise.resolve(response).then(resolve, reject)
  );

  return query;
}

describe("public-cotizacion-approval.repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe resolver el presupuesto publico aunque organization_profile no tenga margen_defecto", async () => {
    const cotizacionQuery = createMaybeSingleQuery({
      data: {
        id: 1,
        organization_id: 3,
        proyecto_id: 9,
        numero: "COT-1001",
        estado: "enviada",
        notas: null,
        valido_hasta: null,
        subtotal_neto: 100000,
        descuento_pct: 0,
        flete: 0,
        iva: 19000,
        total: 119000,
        approval_token: "abc123abc123abc123abc123abc123ab",
        approval_token_expires_at: null,
        cliente_vio_en: null,
        cliente_respondio_en: null,
        cliente_respuesta_canal: null,
        creado_en: "2026-04-27T12:00:00.000Z",
        actualizado_en: "2026-04-27T12:00:00.000Z",
        eliminado_en: null,
      },
      error: null,
    });
    const projectQuery = createMaybeSingleQuery({
      data: {
        id: 9,
        titulo: "Casa Serena",
        cliente_id: 4,
      },
      error: null,
    });
    const itemsQuery = createMaybeSingleQuery({
      data: [
        {
          id: 50,
          cotizacion_id: 1,
          codigo: "C1",
          tipo_componente: "Cierre terraza",
          cantidad: 1,
          precio_unitario: 119000,
          subtotal: 119000,
          ancho: 800,
          alto: 1500,
          vidrio: "Incoloro monolitico 10mm",
          nombre: "Cierre terraza/logia",
          descripcion: "Corredera",
          unidad: "unidad",
          observaciones: null,
          orden: 0,
          eliminado_en: null,
        },
      ],
      error: null,
    });
    const profilePrimaryQuery = createMaybeSingleQuery({
      data: null,
      error: {
        message: "column organization_profile.margen_defecto does not exist",
      },
    });
    const profileFallbackQuery = createMaybeSingleQuery({
      data: {
        organization_id: 3,
        empresa_nombre: "Ventora",
        empresa_logo_url: null,
        empresa_direccion: "La Serena",
        empresa_telefono: "+56 9 1111 1111",
        empresa_email: "hola@ventora.cl",
        brand_color: "#335EA9",
        forma_pago: "50% anticipo",
      },
      error: null,
    });
    const clientQuery = createMaybeSingleQuery({
      data: {
        id: 4,
        nombre: "Roberto Fuentes",
        telefono: "+56 9 2222 2222",
        direccion: "Los Pescadores 221",
      },
      error: null,
    });

    createAdminClientMock.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "cotizaciones") {
          return cotizacionQuery;
        }

        if (table === "projects") {
          return projectQuery;
        }

        if (table === "cotizacion_items") {
          return itemsQuery;
        }

        if (table === "organization_profile") {
          return profilePrimaryQuery.maybeSingle.mock.calls.length === 0
            ? profilePrimaryQuery
            : profileFallbackQuery;
        }

        if (table === "clients") {
          return clientQuery;
        }

        throw new Error(`Tabla inesperada en test: ${table}`);
      }),
    });

    const repository = createPublicCotizacionApprovalRepository();

    const payload = await repository.getByApprovalToken(
      "abc123abc123abc123abc123abc123ab"
    );

    expect(payload?.organizationProfile).toMatchObject({
      organization_id: 3,
      empresa_nombre: "Ventora",
      margen_defecto: null,
    });
    expect(payload?.client?.nombre).toBe("Roberto Fuentes");
    expect(payload?.items).toHaveLength(1);
  });
});
