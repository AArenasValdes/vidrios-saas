import { assertIsolatedQaSupabaseEnv } from "../qa-isolation-guard";

describe("assertIsolatedQaSupabaseEnv", () => {
  it("bloquea la URL de producción y URLs remotas no autorizadas", () => {
    expect(() =>
      assertIsolatedQaSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://yrtrwgkaopfumpidjthk.supabase.co",
      })
    ).toThrow(/production Supabase project/i);

    expect(() =>
      assertIsolatedQaSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://otroproyecto.supabase.co",
      })
    ).toThrow(/VENTORA_QA_ISOLATED_SUPABASE=1/);

    expect(() => assertIsolatedQaSupabaseEnv({})).toThrow(/not configured/i);
  });

  it("permite Supabase local aislado en loopback", () => {
    expect(
      assertIsolatedQaSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      })
    ).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      isLocalSupabase: true,
    });
  });
});
