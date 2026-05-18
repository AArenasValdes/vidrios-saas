import {
  getSupabaseCookieOptions,
  isSharedVentoraWebHost,
} from "../cookie-options";

describe("supabase cookie options", () => {
  it("comparte cookies entre ventorap.cl y www.ventorap.cl", () => {
    expect(isSharedVentoraWebHost("ventorap.cl")).toBe(true);
    expect(isSharedVentoraWebHost("www.ventorap.cl")).toBe(true);
    expect(getSupabaseCookieOptions("ventorap.cl")).toEqual({
      domain: ".ventorap.cl",
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("no fuerza dominio compartido fuera del host productivo", () => {
    expect(isSharedVentoraWebHost("localhost:3000")).toBe(false);
    expect(isSharedVentoraWebHost("preview.vercel.app")).toBe(false);
    expect(getSupabaseCookieOptions("localhost:3000")).toBeUndefined();
    expect(getSupabaseCookieOptions("preview.vercel.app")).toBeUndefined();
  });
});
