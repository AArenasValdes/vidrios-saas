import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CreatePagoInput,
  PagoSuscripcionRow,
  PaymentProvider,
  PaymentStatus,
  UpdatePagoInput,
} from "@/features/subscriptions/types/pago-suscripcion";

const TABLE = "pagos_suscripcion";
const COLS = `
  id, organization_id, plan_code, billing_period, amount_clp, amount,
  currency, currency_code, subscription_id, provider_payment_id,
  payment_provider, provider_token, provider_order_id, provider_status,
  provider_response, checkout_url, buy_order, status, paid_at,
  period_starts_at, period_ends_at, creado_en, actualizado_en,
  eliminado_en
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return (createAdminClient().from(TABLE) as any); }

function mapRow(row: Record<string, unknown>): PagoSuscripcionRow {
  return {
    id: row.id as number,
    organization_id: row.organization_id as number,
    plan_code: row.plan_code as string,
    billing_period: row.billing_period as string,
    amount_clp: row.amount_clp as number,
    amount: Number(row.amount),
    currency: row.currency as string,
    currency_code: row.currency_code as string,
    subscription_id: (row.subscription_id as number) ?? null,
    provider_payment_id: (row.provider_payment_id as string) ?? null,
    payment_provider: row.payment_provider as PaymentProvider,
    provider_token: (row.provider_token as string) ?? null,
    provider_order_id: (row.provider_order_id as string) ?? null,
    provider_status: (row.provider_status as string) ?? null,
    provider_response: row.provider_response,
    checkout_url: (row.checkout_url as string) ?? null,
    buy_order: (row.buy_order as string) ?? null,
    status: row.status as PaymentStatus,
    paid_at: (row.paid_at as string) ?? null,
    period_starts_at: (row.period_starts_at as string) ?? null,
    period_ends_at: (row.period_ends_at as string) ?? null,
    creado_en: row.creado_en as string,
    actualizado_en: row.actualizado_en as string,
    eliminado_en: (row.eliminado_en as string) ?? null,
  };
}

export function createPagoSuscripcionRepository() {
  return {
    async create(input: CreatePagoInput): Promise<PagoSuscripcionRow> {
      const { data, error } = await db()
        .insert({
          organization_id: input.organization_id,
          plan_code: input.plan_code,
          billing_period: input.billing_period,
          amount_clp: input.amount_clp,
          amount: input.amount_clp,
          currency: "CLP",
          currency_code: "CLP",
          payment_provider: input.payment_provider ?? "webpay_plus",
          buy_order: input.buy_order,
          provider_token: input.provider_token ?? null,
          provider_order_id: input.provider_order_id ?? null,
          checkout_url: input.checkout_url ?? null,
          status: "pendiente",
        })
        .select(COLS)
        .single();

      if (error) {
        throw new Error(
          `Error al crear pago: ${error.message}`
        );
      }

      return mapRow(data as Record<string, unknown>);
    },

    async getByProviderToken(
      token: string
    ): Promise<PagoSuscripcionRow | null> {
      const { data, error } = await db()
        .select(COLS)
        .eq("provider_token", token)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw new Error(
          `Error al buscar pago por token: ${error.message}`
        );
      }

      return data ? mapRow(data as Record<string, unknown>) : null;
    },

    async getByProviderOrderId(input: {
      paymentProvider: PaymentProvider;
      providerOrderId: string;
    }): Promise<PagoSuscripcionRow | null> {
      const { data, error } = await db()
        .select(COLS)
        .eq("payment_provider", input.paymentProvider)
        .eq("provider_order_id", input.providerOrderId)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw new Error(
          `Error al buscar pago por orden del proveedor: ${error.message}`
        );
      }

      return data ? mapRow(data as Record<string, unknown>) : null;
    },

    async getByBuyOrder(
      buyOrder: string
    ): Promise<PagoSuscripcionRow | null> {
      const { data, error } = await db()
        .select(COLS)
        .eq("buy_order", buyOrder)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw new Error(
          `Error al buscar pago por orden: ${error.message}`
        );
      }

      return data ? mapRow(data as Record<string, unknown>) : null;
    },

    async listByOrganizationId(
      organizationId: number
    ): Promise<PagoSuscripcionRow[]> {
      const { data, error } = await db()
        .select(COLS)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .order("creado_en", { ascending: false });

      if (error) {
        throw new Error(
          `Error al listar pagos: ${error.message}`
        );
      }

      return (data as Record<string, unknown>[]).map(mapRow);
    },

    async update(
      id: number,
      input: UpdatePagoInput
    ): Promise<void> {
      const payload: Record<string, unknown> = {};

      if (input.status !== undefined) payload.status = input.status;
      if (input.provider_token !== undefined) {
        payload.provider_token = input.provider_token;
      }
      if (input.provider_order_id !== undefined) {
        payload.provider_order_id = input.provider_order_id;
      }
      if (input.provider_status !== undefined) {
        payload.provider_status = input.provider_status;
      }
      if (input.provider_response !== undefined) {
        payload.provider_response = input.provider_response;
      }
      if (input.checkout_url !== undefined) {
        payload.checkout_url = input.checkout_url;
      }
      if (input.paid_at !== undefined) payload.paid_at = input.paid_at;
      if (input.period_starts_at !== undefined) {
        payload.period_starts_at = input.period_starts_at;
      }
      if (input.period_ends_at !== undefined) {
        payload.period_ends_at = input.period_ends_at;
      }
      payload.actualizado_en = new Date().toISOString();

      const { error } = await db()
        .update(payload)
        .eq("id", id)
        .is("eliminado_en", null);

      if (error) {
        throw new Error(
          `Error al actualizar pago ${id}: ${error.message}`
        );
      }
    },
  };
}

export type PagoSuscripcionRepository = ReturnType<
  typeof createPagoSuscripcionRepository
>;
