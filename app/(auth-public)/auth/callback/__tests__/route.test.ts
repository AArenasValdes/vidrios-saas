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

  it("usa solo las cookies emitidas por Supabase SSR y las mantiene host-only", async () => {
    (createServerClient as jest.Mock).mockImplementation(
      (_url: string, _key: string, options: {
        cookies: { setAll: (cookies: Array<Record<string, unknown>>) => void };
      }) => {
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
            exchangeCodeForSession: jest.fn().mockImplementation(async () => {
              options.cookies.setAll([
                {
                  name: "sb-yrtrwgkaopfumpidjthk-auth-token",
                  value: "official-ssr-session",
                  options: {
                    path: "/",
                    sameSite: "lax",
                    secure: true,
                    maxAge: 3600,
                  },
                },
              ]);
              return {
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
              };
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
      accountComplete: true,
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
    const setCookie = response.headers.getSetCookie().join("\n");
    expect(setCookie).toContain(
      "sb-yrtrwgkaopfumpidjthk-auth-token="
    );
    expect(setCookie).toContain("official-ssr-session");
    expect(setCookie).not.toContain("base64-");
    expect(setCookie).not.toContain("Domain=.ventorap.cl");
    expect(setCookie).not.toContain("Max-Age=34560000");
    expect(response.headers.get("x-oauth-cookie-name")).toBeNull();
  });
});
