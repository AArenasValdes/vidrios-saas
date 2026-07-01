jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  provisionOrganizationFromOAuthUser,
  resolveOAuthIdentity,
} from "../auth-oauth-completion.service";

function createUsersTableMock(options: {
  authRow?: unknown;
  emailRow?: unknown;
}) {
  let lookup: "auth" | "email" = "auth";

  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn(function (field: string) {
      if (field === "auth_user_id") {
        lookup = "auth";
      }
      return this;
    }),
    ilike: jest.fn(function () {
      lookup = "email";
      return this;
    }),
    is: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 12 },
          error: null,
        }),
      }),
    }),
    maybeSingle: jest.fn(async () => ({
      data: lookup === "auth" ? options.authRow ?? null : options.emailRow ?? null,
      error: null,
    })),
  };
}

describe("auth-oauth-completion.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("vincula auth_user_id solo cuando esta null", async () => {
    const usersTable = createUsersTableMock({
      authRow: null,
      emailRow: {
        id: 9,
        correo: "maestro@test.com",
        auth_user_id: null,
        organization_id: 77,
        eliminado_en: null,
      },
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "users") {
          return usersTable;
        }

        throw new Error(`tabla inesperada: ${table}`);
      }),
    });

    const result = await resolveOAuthIdentity({
      authUserId: "auth-new",
      email: "maestro@test.com",
    });

    expect(result).toEqual({
      status: "linked",
      organizationId: 77,
      userId: 9,
      syncedAuthUserId: true,
    });
    expect(usersTable.update).toHaveBeenCalledWith({ auth_user_id: "auth-new" });
  });

  it("devuelve identity_conflict si auth_user_id ya apunta a otro usuario", async () => {
    const usersTable = createUsersTableMock({
      authRow: null,
      emailRow: {
        id: 9,
        correo: "maestro@test.com",
        auth_user_id: "auth-existing",
        organization_id: 77,
        eliminado_en: null,
      },
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => usersTable),
    });

    const result = await resolveOAuthIdentity({
      authUserId: "auth-new",
      email: "maestro@test.com",
    });

    expect(result).toEqual({ status: "identity_conflict" });
  });

  it("provisiona organizacion nueva para usuario OAuth sin perfil", async () => {
    const usersTable = createUsersTableMock({
      authRow: null,
      emailRow: null,
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "users") {
          return usersTable;
        }

        if (table === "organizations") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 88 },
                  error: null,
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        if (table === "organization_profile") {
          const upsert = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { plan_code: "trial", trial_ends_at: "2026-07-01" },
                error: null,
              }),
            }),
          });

          return {
            upsert,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { plan_code: "trial", trial_ends_at: "2026-07-01" },
                  error: null,
                }),
              }),
            }),
          };
        }

        throw new Error(`tabla inesperada: ${table}`);
      }),
    });

    const result = await provisionOrganizationFromOAuthUser({
      authUserId: "auth-new",
      email: "nuevo@test.com",
      empresaNombre: "Vidrios Test",
    });

    expect(result.organizationId).toBe(88);
    expect(result.alreadyProvisioned).toBe(false);
    expect(result.trialEndsAt).toBe("2026-07-01");
  });

  it("no crea organizacion si el correo ya existe con otro auth_user_id", async () => {
    const usersTable = createUsersTableMock({
      authRow: null,
      emailRow: {
        id: 3,
        correo: "nuevo@test.com",
        auth_user_id: "auth-other",
        organization_id: 5,
        eliminado_en: null,
      },
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => usersTable),
    });

    await expect(
      provisionOrganizationFromOAuthUser({
        authUserId: "auth-new",
        email: "nuevo@test.com",
        empresaNombre: "Vidrios Test",
      })
    ).rejects.toMatchObject({
      code: "identity_conflict",
    });
  });
});
