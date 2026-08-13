jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getOAuthAccountCompletionState,
  provisionOrganizationFromOAuthUser,
  resolveOAuthIdentity,
} from "../auth-oauth-completion.service";

function createMaybeSingleQuery(data: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
  };
}

function createCompletionAdmin(input: {
  userByAuth?: unknown;
  userByEmail?: unknown;
  organization?: unknown;
  profile?: unknown;
}) {
  let userLookup: "auth" | "email" = "auth";
  const usersQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn(function (field: string) {
      if (field === "auth_user_id") {
        userLookup = "auth";
      }
      return this;
    }),
    ilike: jest.fn(function () {
      userLookup = "email";
      return this;
    }),
    is: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
    maybeSingle: jest.fn(async () => ({
      data:
        userLookup === "auth"
          ? (input.userByAuth ?? null)
          : (input.userByEmail ?? null),
      error: null,
    })),
  };

  return {
    usersQuery,
    admin: {
      from: jest.fn((table: string) => {
        if (table === "users") return usersQuery;
        if (table === "organizations") {
          return createMaybeSingleQuery(input.organization ?? null);
        }
        if (table === "organization_profile") {
          return createMaybeSingleQuery(input.profile ?? null);
        }
        throw new Error(`tabla inesperada: ${table}`);
      }),
    },
  };
}

const completeUser = {
  id: 9,
  correo: "maestro@test.com",
  auth_user_id: "auth-1",
  organization_id: 77,
  eliminado_en: null,
  nombre: "Maestro Uno",
  whatsapp: "+56912345678",
  ciudad_comuna: "Puente Alto",
  data_sharing_accepted_at: "2026-07-28T10:00:00.000Z",
};

describe("auth-oauth-completion.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reconoce una cuenta Google completa y no repite el formulario", async () => {
    const { admin } = createCompletionAdmin({
      userByAuth: completeUser,
      organization: { nombre: "Vidrios Test" },
      profile: { empresa_nombre: "Vidrios Test" },
    });
    (createAdminClient as jest.Mock).mockReturnValue(admin);

    const result = await resolveOAuthIdentity({
      authUserId: "auth-1",
      email: "maestro@test.com",
    });

    expect(result).toMatchObject({
      status: "linked",
      organizationId: 77,
      accountComplete: true,
    });
  });

  it("considera completa una cuenta Google sin ciudad o comuna", async () => {
    const { admin } = createCompletionAdmin({
      userByAuth: { ...completeUser, ciudad_comuna: null },
      organization: { nombre: "Vidrios Test" },
      profile: { empresa_nombre: "Vidrios Test" },
    });
    (createAdminClient as jest.Mock).mockReturnValue(admin);

    const state = await getOAuthAccountCompletionState({
      authUserId: "auth-1",
      email: "maestro@test.com",
    });

    expect(state.isComplete).toBe(true);
    expect(state.values.ciudadComuna).toBe("");
  });

  it("detecta los datos pendientes de un usuario Google existente", async () => {
    const { admin } = createCompletionAdmin({
      userByAuth: {
        ...completeUser,
        whatsapp: null,
        data_sharing_accepted_at: null,
      },
      organization: { nombre: "Vidrios Test" },
      profile: { empresa_nombre: "Vidrios Test" },
    });
    (createAdminClient as jest.Mock).mockReturnValue(admin);

    const state = await getOAuthAccountCompletionState({
      authUserId: "auth-1",
      email: "maestro@test.com",
    });

    expect(state.isComplete).toBe(false);
    expect(state.values).toMatchObject({
      nombre: "Maestro Uno",
      empresaNombre: "Vidrios Test",
      whatsapp: "",
      consentimientoAceptado: false,
    });
  });

  it("rechaza un correo vinculado a otro auth_user_id", async () => {
    const { admin } = createCompletionAdmin({
      userByAuth: null,
      userByEmail: {
        ...completeUser,
        auth_user_id: "auth-other",
      },
    });
    (createAdminClient as jest.Mock).mockReturnValue(admin);

    await expect(
      getOAuthAccountCompletionState({
        authUserId: "auth-new",
        email: "maestro@test.com",
      }),
    ).rejects.toMatchObject({ code: "identity_conflict" });
  });

  it("normaliza datos y delega el alta atomica a la RPC", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          result_organization_id: 88,
          result_user_id: 12,
          result_trial_ends_at: "2026-08-04T00:00:00.000Z",
          result_already_provisioned: false,
          result_account_complete: true,
        },
      ],
      error: null,
    });
    (createAdminClient as jest.Mock).mockReturnValue({ rpc });

    const result = await provisionOrganizationFromOAuthUser({
      authUserId: " auth-new ",
      email: " NUEVO@Test.com ",
      nombre: "  Alessandro   Gonzalez ",
      empresaNombre: " Vidrios   Test ",
      whatsapp: "9 1234 5678",
      ciudadComuna: " Puente   Alto ",
      countryCode: "CL",
      consentimientoAceptado: true,
    });

    expect(rpc).toHaveBeenCalledWith("complete_google_oauth_account", {
      p_auth_user_id: "auth-new",
      p_email: "nuevo@test.com",
      p_nombre: "Alessandro Gonzalez",
      p_empresa_nombre: "Vidrios Test",
      p_whatsapp: "+56912345678",
      p_ciudad_comuna: "Puente Alto",
      p_consent: true,
      p_country_code: "CL",
    });
    expect(result).toMatchObject({
      organizationId: 88,
      userId: 12,
      alreadyProvisioned: false,
      accountComplete: true,
    });
  });

  it("permite dejar ciudad o comuna sin informar", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          result_organization_id: 88,
          result_user_id: 12,
          result_trial_ends_at: "2026-08-04T00:00:00.000Z",
          result_already_provisioned: false,
          result_account_complete: true,
        },
      ],
      error: null,
    });
    (createAdminClient as jest.Mock).mockReturnValue({ rpc });

    await expect(
      provisionOrganizationFromOAuthUser({
        authUserId: "auth-new",
        email: "nuevo@test.com",
        nombre: "Alessandro",
        empresaNombre: "Vidrios Test",
        whatsapp: "+56912345678",
        ciudadComuna: "",
        countryCode: "CL",
        consentimientoAceptado: true,
      }),
    ).resolves.toMatchObject({ accountComplete: true });

    expect(rpc).toHaveBeenCalledWith(
      "complete_google_oauth_account",
      expect.objectContaining({ p_ciudad_comuna: "" }),
    );
  });

  it.each([
    {
      label: "nombre vacio",
      patch: { nombre: "" },
      message: "Ingresa tu nombre.",
    },
    {
      label: "WhatsApp invalido",
      patch: { whatsapp: "123" },
      message: "Ingresa un WhatsApp valido con codigo de pais.",
    },
    {
      label: "sin consentimiento",
      patch: { consentimientoAceptado: false },
      message: "Debes aceptar",
    },
  ])("rechaza $label antes de llamar a la RPC", async ({ patch, message }) => {
    const rpc = jest.fn();
    (createAdminClient as jest.Mock).mockReturnValue({ rpc });

    await expect(
      provisionOrganizationFromOAuthUser({
        authUserId: "auth-new",
        email: "nuevo@test.com",
        nombre: "Alessandro",
        empresaNombre: "Vidrios Test",
        whatsapp: "+56912345678",
        ciudadComuna: "Santiago",
        countryCode: "CL",
        consentimientoAceptado: true,
        ...patch,
      }),
    ).rejects.toThrow(message);

    expect(rpc).not.toHaveBeenCalled();
  });
});
