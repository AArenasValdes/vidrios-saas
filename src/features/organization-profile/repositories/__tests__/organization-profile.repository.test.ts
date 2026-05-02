import { createOrganizationProfileRepository } from "../organization-profile.repository";

function createSingleQuery(response: { data: unknown; error: unknown }) {
  const query = {
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(response),
  };

  query.eq.mockReturnValue(query);

  return query;
}

describe("organization-profile.repository", () => {
  it("debe mapear el perfil completo con campos publicos de solicitud", async () => {
    const query = createSingleQuery({
      data: {
        organization_id: 3,
        empresa_nombre: "Ventora",
        empresa_logo_url: null,
        empresa_direccion: "La Serena",
        empresa_telefono: "+56 9 1111 1111",
        empresa_email: "hola@ventora.cl",
        brand_color: "#335EA9",
        forma_pago: "50% anticipo",
        solicitud_publica_slug: "ventora-serena",
        solicitud_publica_valor: "Recibe una orientación comercial inicial.",
        solicitud_publica_privacidad: "Tus datos se usan solo para este contacto.",
        proveedor_preferido: "Indalum",
        modo_precio_preferido: "margen",
        margen_defecto: 100,
        creado_en: "2026-04-27T12:00:00.000Z",
        actualizado_en: "2026-04-27T12:00:00.000Z",
      },
      error: null,
    });

    const select = jest.fn().mockReturnValue(query);
    const client = {
      from: jest.fn().mockReturnValue({ select }),
    } as never;

    const repository = createOrganizationProfileRepository({
      clientFactory: client,
    });

    const profile = await repository.getByOrganizationId(3);

    expect(select).toHaveBeenCalledWith("*");
    expect(profile).toMatchObject({
      organizationId: 3,
      empresaNombre: "Ventora",
      solicitudPublicaSlug: "ventora-serena",
      solicitudPublicaValor: "Recibe una orientación comercial inicial.",
      solicitudPublicaPrivacidad: "Tus datos se usan solo para este contacto.",
      modoPrecioPreferido: "margen",
      margenDefecto: 100,
    });
  });
});
