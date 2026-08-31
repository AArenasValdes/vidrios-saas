import {
  assertValidSupabaseServiceRoleKey,
  classifySupabaseSecret,
  isValidSupabaseServiceRoleKey,
} from "../service-role-key";

describe("clave de servicio de Supabase", () => {
  it("acepta JWT service_role y sb_secret_", () => {
    expect(
      isValidSupabaseServiceRoleKey(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig"
      )
    ).toBe(true);
    expect(isValidSupabaseServiceRoleKey("sb_secret_abc123")).toBe(true);
  });

  it("rechaza secretos cifrados de Vercel y vacios", () => {
    expect(classifySupabaseSecret("vck_abc")).toBe("vercel_encrypted");
    expect(isValidSupabaseServiceRoleKey("vck_abc")).toBe(false);
    expect(isValidSupabaseServiceRoleKey("")).toBe(false);
    expect(isValidSupabaseServiceRoleKey("not-a-key")).toBe(false);
  });

  it("lanza un error accionable si la clave no sirve en local", () => {
    expect(() => assertValidSupabaseServiceRoleKey("vck_abc")).toThrow(
      /Dashboard → Settings → API/
    );
  });
});
