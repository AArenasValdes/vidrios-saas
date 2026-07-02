jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("@/features/auth/services/auth-oauth-completion.service", () => ({
  resolveOAuthIdentity: jest.fn(),
}));

import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { resolveOAuthIdentity } from "@/features/auth/services/auth-oauth-completion.service";

describe("GET /auth/callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("preserva cookies de sesion Supabase en el redirect final", async () => {
    (createServerClient as jest.Mock).mockImplementation(
      (_url: string, _key: string, options: {
        cookies: {
          setAll: (
            cookies: Array<{
              name: string;
              value: string;
              options: Record<string, unknown>;
            }>
          ) => void;
        };
      }) => {
        options.cookies.setAll([
          {
            name: "sb-test-auth-token",
            value: "session-value",
            options: {
              path: "/",
              sameSite: "lax",
              secure: true,
            },
          },
        ]);

        return {
          auth: {
            exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
            getUser: jest.fn().mockResolvedValue({
              data: {
                user: {
                  id: "auth-1",
                  email: "maestro@test.com",
                  app_metadata: {},
                  user_metadata: {},
                  aud: "authenticated",
                  created_at: "2026-01-01T00:00:00.000Z",
                },
              },
              error: null,
            }),
          },
        };
      }
    );
    (resolveOAuthIdentity as jest.Mock).mockResolvedValue({
      status: "linked",
      organizationId: 77,
      userId: 9,
      syncedAuthUserId: false,
    });

    const request = new NextRequest(
      "https://www.ventorap.cl/auth/callback?code=oauth-code&intent=login&provider=google&next=/dashboard"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "https://www.ventorap.cl/dashboard"
    );
    expect(response.headers.getSetCookie().join("\n")).toContain(
      "sb-test-auth-token=session-value"
    );
  });
});
