import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { OrganizationSubscriptionRow } from "@/features/subscriptions/types/organization-subscription";
import type { PaymentStatus } from "@/features/subscriptions/types/pago-suscripcion";

const TABLE = "suscripciones_organizacion";
const COLS = `
  id, organization_id, provider, provider_subscription_id, provider_plan_id,
  plan_code, billing_period, country_code, currency_code, amount, status,
  provider_status, current_period_starts_at, current_period_ends_at,
  next_payment_at, cancel_at_period_end, cancelled_at, external_reference,
  creado_en, actualizado_en, eliminado_en
`;

function db() {
  // Los tipos generados se actualizan cuando la migracion llegue al schema remoto.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient().from(TABLE as any) as any;
}

export function createOrganizationSubscriptionRepository() {
  return {
    async createPending(input: {
      organizationId: number;
      providerPlanId: string;
      planCode: OrganizationSubscriptionRow["plan_code"];
      billingPeriod: OrganizationSubscriptionRow["billing_period"];
      amount: number;
      externalReference: string;
    }): Promise<{ subscription: OrganizationSubscriptionRow; created: boolean }> {
      const { data, error } = await db()
        .insert({
          organization_id: input.organizationId,
          provider: "mercadopago",
          provider_plan_id: input.providerPlanId,
          plan_code: input.planCode,
          billing_period: input.billingPeriod,
          country_code: "CL",
          currency_code: "CLP",
          amount: input.amount,
          status: "pending",
          provider_status: "local_pending",
          external_reference: input.externalReference,
        })
        .select(COLS)
        .single();

      if (!error) {
        return {
          subscription: data as OrganizationSubscriptionRow,
          created: true,
        };
      }

      if (error.code !== "23505") {
        throw new Error(`Error al reservar suscripcion: ${error.message}`);
      }

      const existing = await this.getOpenMercadoPagoByOrganizationId(
        input.organizationId
      );

      if (!existing) {
        throw new Error("No pudimos recuperar la suscripcion ya iniciada.");
      }

      return { subscription: existing, created: false };
    },

    async getOpenMercadoPagoByOrganizationId(
      organizationId: number
    ): Promise<OrganizationSubscriptionRow | null> {
      const { data, error } = await db()
        .select(COLS)
        .eq("organization_id", organizationId)
        .eq("provider", "mercadopago")
        .in("status", ["pending", "active", "paused", "past_due"])
        .is("eliminado_en", null)
        .order("actualizado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Error al buscar suscripcion abierta: ${error.message}`);
      }

      return (data as OrganizationSubscriptionRow | null) ?? null;
    },

    async getByProviderSubscriptionId(
      providerSubscriptionId: string
    ): Promise<OrganizationSubscriptionRow | null> {
      const { data, error } = await db()
        .select(COLS)
        .eq("provider", "mercadopago")
        .eq("provider_subscription_id", providerSubscriptionId)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw new Error(`Error al buscar suscripcion Mercado Pago: ${error.message}`);
      }

      return (data as OrganizationSubscriptionRow | null) ?? null;
    },

    async getByExternalReference(
      externalReference: string
    ): Promise<OrganizationSubscriptionRow | null> {
      const { data, error } = await db()
        .select(COLS)
        .eq("provider", "mercadopago")
        .eq("external_reference", externalReference)
        .is("eliminado_en", null)
        .maybeSingle();

      if (error) {
        throw new Error(`Error al buscar referencia de suscripcion: ${error.message}`);
      }

      return (data as OrganizationSubscriptionRow | null) ?? null;
    },

    async attachProviderSubscription(input: {
      id: number;
      providerSubscriptionId: string;
      providerStatus: string;
      status: OrganizationSubscriptionRow["status"];
    }): Promise<OrganizationSubscriptionRow> {
      const { data, error } = await db()
        .update({
          provider_subscription_id: input.providerSubscriptionId,
          provider_status: input.providerStatus,
          status: input.status,
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("provider", "mercadopago")
        .is("eliminado_en", null)
        .select(COLS)
        .single();

      if (error) {
        throw new Error(`Error al guardar suscripcion Mercado Pago: ${error.message}`);
      }

      return data as OrganizationSubscriptionRow;
    },

    async cancelPending(id: number): Promise<void> {
      const { error } = await db()
        .update({
          status: "cancelled",
          provider_status: "create_failed",
          cancelled_at: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("provider", "mercadopago")
        .eq("status", "pending")
        .is("provider_subscription_id", null)
        .is("eliminado_en", null);

      if (error) {
        throw new Error(`Error al liberar suscripcion pendiente: ${error.message}`);
      }
    },

    async releasePendingCheckout(id: number): Promise<void> {
      const { error } = await db()
        .update({
          status: "cancelled",
          provider_status: "checkout_replaced",
          cancelled_at: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("provider", "mercadopago")
        .eq("status", "pending")
        .is("eliminado_en", null);

      if (error) {
        throw new Error(`Error al liberar checkout pendiente: ${error.message}`);
      }
    },

    async reconcileMercadoPagoSubscription(input: {
      subscriptionId: number;
      providerSubscriptionId: string;
      providerPlanId: string;
      providerStatus: string;
      status: OrganizationSubscriptionRow["status"];
      periodStartsAt?: string | null;
      periodEndsAt?: string | null;
      nextPaymentAt?: string | null;
      cancelledAt?: string | null;
    }): Promise<number> {
      // Los tipos generados se regeneran despues de aplicar la migracion.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = createAdminClient() as any;
      const { data, error } = await admin.rpc(
        "reconcile_mercadopago_subscription",
        {
          p_subscription_id: input.subscriptionId,
          p_provider_subscription_id: input.providerSubscriptionId,
          p_provider_plan_id: input.providerPlanId,
          p_provider_status: input.providerStatus,
          p_status: input.status,
          p_period_starts_at: input.periodStartsAt ?? null,
          p_period_ends_at: input.periodEndsAt ?? null,
          p_next_payment_at: input.nextPaymentAt ?? null,
          p_cancelled_at: input.cancelledAt ?? null,
        }
      );

      if (error || typeof data !== "number") {
        throw new Error(
          `Error al reconciliar suscripcion Mercado Pago: ${error?.message ?? "respuesta invalida"}`
        );
      }

      return data;
    },

    async markMercadoPagoCancellationRequested(
      subscriptionId: number
    ): Promise<OrganizationSubscriptionRow> {
      const { data, error } = await db()
        .update({
          cancel_at_period_end: true,
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", subscriptionId)
        .eq("provider", "mercadopago")
        .eq("status", "cancelled")
        .is("eliminado_en", null)
        .select(COLS)
        .single();

      if (error) {
        throw new Error(`Error al registrar cancelacion Mercado Pago: ${error.message}`);
      }

      return data as OrganizationSubscriptionRow;
    },

    async reconcileMercadoPagoPayment(input: {
      subscriptionId: number;
      providerPaymentId: string;
      providerOrderId: string | null;
      providerStatus: string;
      status: PaymentStatus;
      amount: number;
      currencyCode: string;
      paidAt?: string | null;
      periodStartsAt?: string | null;
      periodEndsAt?: string | null;
      providerResponse?: unknown;
    }): Promise<number> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = createAdminClient() as any;
      const { data, error } = await admin.rpc("reconcile_mercadopago_payment", {
        p_subscription_id: input.subscriptionId,
        p_provider_payment_id: input.providerPaymentId,
        p_provider_order_id: input.providerOrderId,
        p_provider_status: input.providerStatus,
        p_status: input.status,
        p_amount: input.amount,
        p_currency_code: input.currencyCode,
        p_paid_at: input.paidAt ?? null,
        p_period_starts_at: input.periodStartsAt ?? null,
        p_period_ends_at: input.periodEndsAt ?? null,
        p_provider_response: input.providerResponse ?? null,
      });

      if (error || typeof data !== "number") {
        throw new Error(
          `Error al reconciliar pago Mercado Pago: ${error?.message ?? "respuesta invalida"}`
        );
      }

      return data;
    },

    async getLatestByOrganizationId(
      organizationId: number
    ): Promise<OrganizationSubscriptionRow | null> {
      const { data, error } = await db()
        .select(COLS)
        .eq("organization_id", organizationId)
        .is("eliminado_en", null)
        .order("actualizado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Error al buscar suscripcion recurrente: ${error.message}`);
      }

      return (data as OrganizationSubscriptionRow | null) ?? null;
    },

    async activateFromApprovedPayment(paymentId: number): Promise<number> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = createAdminClient() as any;
      const { data, error } = await admin.rpc("activate_subscription_from_payment", {
        p_payment_id: paymentId,
      });

      if (error) {
        throw new Error(`Error al activar suscripcion: ${error.message}`);
      }

      if (typeof data !== "number") {
        throw new Error("La activacion no devolvio una suscripcion valida.");
      }

      return data;
    },
  };
}

export type OrganizationSubscriptionRepository = ReturnType<
  typeof createOrganizationSubscriptionRepository
>;
