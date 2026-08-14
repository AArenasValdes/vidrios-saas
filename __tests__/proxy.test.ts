jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { proxy } from "../proxy";
import { SUPABASE_COOKIE_MIGRATION_MARKER } from "@/lib/supabase/cookie-options";

function createSupabaseMock(
  user: { id: string; email?: string | null } | null,
  error: unknown = null
) {
  return {
    auth: {
      getClaims: jest.fn().mockResolvedValue({
        data: {
          claims: user
            ? {
                sub: user.id,
                email: user.email ?? null,
              }
            : null,
        },
        error,
      }),
    },
  };
}

const migratedCookie = `${SUPABASE_COOKIE_MIGRATION_MARKER}=1`;

describe("proxy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirige rutas privadas de ventorap.cl hacia www", async () => {
    const request = new NextRequest("https://ventorap.cl/dashboard?x=1");
    const response = await proxy(request);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.ventorap.cl/dashboard?x=1"
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("canonicaliza login en ventorap.cl antes de iniciar OAuth", async () => {
    const request = new NextRequest(
      "https://ventorap.cl/login?next=%2Fdashboard"
    );
    const response = await proxy(request);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.ventorap.cl/login?next=%2Fdashboard"
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("canonicaliza registro en ventorap.cl antes de iniciar OAuth", async () => {
    const request = new NextRequest("https://ventorap.cl/registro");
    const response = await proxy(request);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.ventorap.cl/registro"
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("redirige solicitudes privadas no autenticadas al login con next", async () => {
    (createServerClient as jest.Mock).mockReturnValue(createSupabaseMock(null));

    const request = new NextRequest("http://localhost:3000/solicitudes");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fsolicitudes"
    );
  });

  it("redirige configuracion privada no autenticada al login con next", async () => {
    (createServerClient as jest.Mock).mockReturnValue(createSupabaseMock(null));

    const request = new NextRequest("http://localhost:3000/configuracion/empresa");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fconfiguracion%2Fempresa"
    );
  });

  it("permite el acceso cuando existe usuario autenticado", async () => {
    (createServerClient as jest.Mock).mockReturnValue(
      createSupabaseMock({ id: "auth-1", email: "cliente@vidrio.cl" })
    );

    const request = new NextRequest("http://localhost:3000/solicitudes", {
      headers: {
        cookie: `sb-test-auth-token=abc123; ${migratedCookie}`,
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirige founder autenticado desde login hacia /admin", async () => {
    (createServerClient as jest.Mock).mockReturnValue(
      createSupabaseMock({
        id: "auth-founder",
        email: "alessandroreal2.0@gmail.com",
      })
    );

    const request = new NextRequest("http://localhost:3000/login", {
      headers: {
        cookie: `sb-test-auth-token=abc123; ${migratedCookie}`,
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/admin"
    );
  });

  it("redirige founder autenticado desde /dashboard hacia /admin", async () => {
    (createServerClient as jest.Mock).mockReturnValue(
      createSupabaseMock({
        id: "auth-founder",
        email: "alessandroreal2.0@gmail.com",
      })
    );

    const request = new NextRequest("http://localhost:3000/dashboard", {
      headers: {
        cookie: "sb-test-auth-token=abc123",
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/admin"
    );
  });

  it("renueva sesion y permite /api/admin para founder autenticado", async () => {
    (createServerClient as jest.Mock).mockReturnValue(
      createSupabaseMock({
        id: "auth-founder",
        email: "alessandroreal2.0@gmail.com",
      })
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/clientes/provision",
      {
        method: "POST",
        headers: {
          cookie: `sb-test-auth-token=abc123; ${migratedCookie}`,
        },
      }
    );
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("bloquea /api/admin sin sesion con 401", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/clientes/provision",
      {
        method: "POST",
      }
    );
    const response = await proxy(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "No autorizado." });
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("bloquea acceso a /admin para admin normal autenticado", async () => {
    (createServerClient as jest.Mock).mockReturnValue(
      createSupabaseMock({
        id: "auth-admin-normal",
        email: "admin@vidrio.cl",
      })
    );

    const request = new NextRequest("http://localhost:3000/admin", {
      headers: {
        cookie: `sb-test-auth-token=abc123; ${migratedCookie}`,
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  it("conserva en el redirect las cookies que Supabase rota", async () => {
    (createServerClient as jest.Mock).mockImplementation(
      (
        _url: string,
        _key: string,
        options: {
          cookies: {
            setAll: (
              cookies: Array<{
                name: string;
                value: string;
                options: Record<string, unknown>;
              }>
            ) => void;
          };
        }
      ) => {
        const supabaseMock = createSupabaseMock({
          id: "auth-founder",
          email: "alessandroreal2.0@gmail.com",
        });
        supabaseMock.auth.getClaims.mockImplementation(async () => {
          options.cookies.setAll([
            {
              name: "sb-test-auth-token",
              value: "rotated-session",
              options: { path: "/", sameSite: "lax", secure: true },
            },
          ]);

          return {
            data: {
              claims: {
                sub: "auth-founder",
                email: "alessandroreal2.0@gmail.com",
              },
            },
            error: null,
          };
        });

        return supabaseMock;
      }
    );

    const request = new NextRequest("https://www.ventorap.cl/login", {
      headers: {
        cookie: `sb-test-auth-token=old-session; ${migratedCookie}`,
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://www.ventorap.cl/admin");
    expect(response.headers.getSetCookie().join("\n")).toContain(
      "sb-test-auth-token=rotated-session"
    );
  });

  it("elimina una vez la cookie compartida legacy antes de validar la sesion", async () => {
    const request = new NextRequest("https://www.ventorap.cl/dashboard", {
      headers: {
        cookie: "sb-test-auth-token=legacy-session",
      },
    });

    const response = await proxy(request);
    const setCookies = response.headers.getSetCookie();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://www.ventorap.cl/dashboard"
    );
    expect(setCookies.join("\n")).toContain("Domain=.ventorap.cl");
    expect(setCookies.join("\n")).toContain(
      `${SUPABASE_COOKIE_MIGRATION_MARKER}=1`
    );
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("limpia la sesion rota y vuelve al login sin mantener el loop", async () => {
    (createServerClient as jest.Mock).mockReturnValue(
      createSupabaseMock(null, {
        status: 400,
        code: "refresh_token_not_found",
        message: "Invalid Refresh Token: Refresh Token Not Found",
      })
    );

    const request = new NextRequest("https://www.ventorap.cl/dashboard", {
      headers: {
        cookie: `sb-test-auth-token=stale; ${migratedCookie}`,
      },
    });
    const response = await proxy(request);
    const setCookies = response.headers.getSetCookie().join("\n");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://www.ventorap.cl/login?next=%2Fdashboard&session=expired"
    );
    expect(setCookies).toContain("sb-test-auth-token=");
    expect(setCookies).toContain("Domain=.ventorap.cl");
    expect(
      response.headers
        .getSetCookie()
        .filter((cookie) => cookie.startsWith("sb-test-auth-token="))
    ).toHaveLength(2);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
