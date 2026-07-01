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
        responsable_comercial: "Juan Perez",
        empresa_direccion: "La Serena",
        empresa_telefono: "+56 9 1111 1111",
        empresa_email: "hola@ventora.cl",
        brand_color: "#335EA9",
        forma_pago: "50% anticipo",
        solicitud_publica_slug: "ventora-serena",
        solicitud_publica_descripcion_corta:
          "Especialistas en vidrios y aluminio.",
        solicitud_publica_valor: "Recibe una orientacion comercial inicial.",
        solicitud_publica_mensaje_confianza:
          "Tu solicitud queda registrada al instante.",
        solicitud_publica_privacidad:
          "Tus datos se usan solo para este contacto.",
        solicitud_publica_horario_desde: "08:30",
        solicitud_publica_horario_hasta: "18:30",
        solicitud_publica_dias_atencion: "1,2,3,4,5",
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
      responsableComercial: "Juan Perez",
      solicitudPublicaSlug: "ventora-serena",
      solicitudPublicaDescripcionCorta: "Especialistas en vidrios y aluminio.",
      solicitudPublicaValor: "Recibe una orientacion comercial inicial.",
      solicitudPublicaMensajeConfianza:
        "Tu solicitud queda registrada al instante.",
      solicitudPublicaPrivacidad: "Tus datos se usan solo para este contacto.",
      solicitudPublicaHorarioDesde: "08:30",
      solicitudPublicaHorarioHasta: "18:30",
      solicitudPublicaDiasAtencion: ["1", "2", "3", "4", "5"],
      modoPrecioPreferido: "margen",
      margenDefecto: 100,
    });
  });

  it("repara localmente el estado de trial si la organizacion es nueva", async () => {
    const profileQuery = createSingleQuery({
      data: {
        organization_id: 3,
        empresa_nombre: "Ventora",
        brand_color: "#335EA9",
        modo_precio_preferido: "margen",
        subscription_status: "trial_expired",
        trial_started_at: "2026-06-30T12:00:00.000Z",
        trial_ends_at: "2026-06-30T12:00:00.000Z",
        plan_type: "trial",
        plan_code: "trial",
        billing_period: "none",
        payment_method: "none",
        founder_price_locked: false,
      },
      error: null,
    });
    const organizationQuery = createSingleQuery({
      data: { creado_en: "2026-06-30T12:00:00.000Z" },
      error: null,
    });
    const update = jest.fn();
    const client = {
      from: jest.fn((table: string) => {
        if (table === "organization_profile") {
          return {
            select: jest.fn().mockReturnValue(profileQuery),
            update,
          };
        }

        if (table === "organizations") {
          return {
            select: jest.fn().mockReturnValue(organizationQuery),
          };
        }

        throw new Error(`tabla inesperada: ${table}`);
      }),
    } as never;

    const repository = createOrganizationProfileRepository({
      clientFactory: client,
    });

    const profile = await repository.getByOrganizationId(3);

    expect(profile).toMatchObject({
      subscriptionStatus: "trial_active",
      trialEndsAt: "2026-07-07T12:00:00.000Z",
      planType: "trial",
      planCode: "trial",
    });
    expect(update).not.toHaveBeenCalled();
  });
});
