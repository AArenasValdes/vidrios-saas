jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { proxy } from "../proxy";

function createSupabaseMock(user: { id: string; email?: string | null } | null) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
      }),
    },
  };
}

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

  it("permite abrir login en ventorap.cl sin redirigir de host", async () => {
    const request = new NextRequest("https://ventorap.cl/login");
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
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
        cookie: "sb-test-auth-token=abc123",
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
        cookie: "sb-test-auth-token=abc123",
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

  it("bloquea acceso a /admin para admin normal autenticado", async () => {
    (createServerClient as jest.Mock).mockReturnValue(
      createSupabaseMock({
        id: "auth-admin-normal",
        email: "admin@vidrio.cl",
      })
    );

    const request = new NextRequest("http://localhost:3000/admin", {
      headers: {
        cookie: "sb-test-auth-token=abc123",
      },
    });
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });
});
