jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { proxy } from "../proxy";

function createSupabaseMock(user: { id: string } | null) {
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

  it("redirige ventorap.cl hacia www antes de resolver auth", async () => {
    const request = new NextRequest("https://ventorap.cl/api/auth/profile?x=1");
    const response = await proxy(request);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.ventorap.cl/api/auth/profile?x=1"
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
      createSupabaseMock({ id: "auth-1" })
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
});
