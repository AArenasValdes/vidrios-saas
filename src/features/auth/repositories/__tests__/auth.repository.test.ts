/** @jest-environment jsdom */

import { createAuthRepository } from "../auth.repository";

function createQueryBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
}

describe("authRepository", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("usa el fallback server-side cuando la lectura directa falla por get_org_id", async () => {
    const usersQuery = createQueryBuilder({
      data: null,
      error: new Error("42501 permission denied for function get_org_id"),
    });

    const supabaseMock = {
      from: jest.fn().mockReturnValue(usersQuery),
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "token-123",
            },
          },
        }),
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          organizacionId: 3,
          rol: "admin",
        },
      }),
    }) as typeof fetch;

    const repository = createAuthRepository({
      browserClientFactory: () => supabaseMock as never,
    });

    const profile = await repository.getUserProfile({
      authUserId: "user-1",
      email: "admin@test.com",
    });

    expect(profile).toEqual({
      organizacionId: 3,
      rol: "admin",
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/profile", {
      method: "GET",
      headers: {
        Authorization: "Bearer token-123",
      },
    });
  });
});
