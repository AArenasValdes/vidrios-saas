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
  it("debe leer el perfil aunque margen_defecto no exista todavia en la base", async () => {
    const primaryQuery = createSingleQuery({
      data: null,
      error: {
        message: 'column organization_profile.margen_defecto does not exist',
      },
    });
    const fallbackQuery = createSingleQuery({
      data: {
        organization_id: 3,
        empresa_nombre: "Ventora",
        empresa_logo_url: null,
        empresa_direccion: "La Serena",
        empresa_telefono: "+56 9 1111 1111",
        empresa_email: "hola@ventora.cl",
        brand_color: "#335EA9",
        forma_pago: "50% anticipo",
        proveedor_preferido: "Indalum",
        modo_precio_preferido: "margen",
        creado_en: "2026-04-27T12:00:00.000Z",
        actualizado_en: "2026-04-27T12:00:00.000Z",
      },
      error: null,
    });

    const firstSelect = jest.fn().mockReturnValue(primaryQuery);
    const secondSelect = jest.fn().mockReturnValue(fallbackQuery);
    const client = {
      from: jest
        .fn()
        .mockReturnValueOnce({ select: firstSelect })
        .mockReturnValueOnce({ select: secondSelect }),
    } as never;

    const repository = createOrganizationProfileRepository({
      clientFactory: client,
    });

    const profile = await repository.getByOrganizationId(3);

    expect(firstSelect).toHaveBeenCalled();
    expect(secondSelect).toHaveBeenCalled();
    expect(profile).toMatchObject({
      organizationId: 3,
      empresaNombre: "Ventora",
      modoPrecioPreferido: "margen",
      margenDefecto: 100,
    });
  });
});
