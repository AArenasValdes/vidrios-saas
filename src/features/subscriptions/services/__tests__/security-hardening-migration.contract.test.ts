import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260814201536_security_hardening_payments_auth.sql"
);
const sql = readFileSync(migrationPath, "utf8").toLowerCase();

describe("security hardening migration", () => {
  it("reserva billing de organization_profile al servidor", () => {
    expect(sql).toContain(
      "revoke insert, update on table public.organization_profile from authenticated"
    );
    expect(sql).not.toMatch(/grant update \([\s\S]*subscription_status/);
    expect(sql).not.toMatch(/grant update \([\s\S]*founder_price_locked/);
  });

  it("retira el ledger crudo de la Data API autenticada", () => {
    expect(sql).toContain(
      "revoke select on table public.pagos_suscripcion from authenticated"
    );
  });

  it("agrega deduplicacion durable y wrapper de identidad verificada", () => {
    expect(sql).toContain("create table if not exists public.payment_webhook_events");
    expect(sql).toContain("claim_mercadopago_webhook_event");
    expect(sql).toContain("complete_verified_auth_account");
    expect(sql).toContain("existing_auth_user_id is distinct from p_auth_user_id");
  });
});
