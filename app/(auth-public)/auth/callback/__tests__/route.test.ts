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
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://yrtrwgkaopfumpidjthk.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("escribe cookie de sesion Supabase en el redirect final aunque setAll no corra", async () => {
    (createServerClient as jest.Mock).mockImplementation(
      () => {
        const user = {
          id: "auth-1",
          email: "maestro@test.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "2026-01-01T00:00:00.000Z",
        };
        return {
          auth: {
            exchangeCodeForSession: jest.fn().mockResolvedValue({
              data: {
                session: {
                  access_token: "access-token",
                  refresh_token: "refresh-token",
                  expires_in: 3600,
                  token_type: "bearer",
                  user,
                },
              },
              error: null,
            }),
            getUser: jest.fn().mockResolvedValue({
              data: {
                user,
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
      "sb-yrtrwgkaopfumpidjthk-auth-token="
    );
    expect(response.headers.getSetCookie().join("\n")).toContain(
      "base64-"
    );
  });
});
