import { NextRequest } from "next/server";

import { GET } from "../route";

describe("/auth/logout", () => {
  it("expira cookies de sesion y redirige al login", async () => {
    const request = new NextRequest("https://www.ventorap.cl/auth/logout", {
      headers: {
        cookie: "sb-test-auth-token=abc; sb-test-auth-token.0=chunk; theme=light",
      },
    });

    const response = await GET(request);
    const cookies = response.cookies.getAll();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://www.ventorap.cl/login");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "sb-test-auth-token",
          value: "",
          domain: undefined,
          path: "/",
          maxAge: 0,
        }),
        expect.objectContaining({
          name: "sb-test-auth-token.0",
          value: "",
          domain: undefined,
          path: "/",
          maxAge: 0,
        }),
      ])
    );
    expect(cookies.find((cookie) => cookie.name === "theme")).toBeUndefined();
  });
});
