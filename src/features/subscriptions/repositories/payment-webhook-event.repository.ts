import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const TABLE = "payment_webhook_events";

export function createPaymentWebhookEventRepository() {
  const admin = createAdminClient();
  // La migracion que agrega esta tabla/RPC aun no forma parte del snapshot de
  // tipos generado. Mantener el escape localizado hasta regenerarlo tras aplicar.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const untypedAdmin = admin as any;

  return {
    async claimMercadoPagoEvent(input: {
      requestId: string;
      topic: string;
      resourceId: string;
    }): Promise<boolean> {
      const { data, error } = await untypedAdmin.rpc(
        "claim_mercadopago_webhook_event",
        {
          p_request_id: input.requestId,
          p_topic: input.topic,
          p_resource_id: input.resourceId,
        }
      );

      if (error) {
        throw new Error(`No pudimos reservar el webhook: ${error.message}`);
      }

      return data === true;
    },

    async markProcessed(requestId: string): Promise<void> {
      const { error } = await untypedAdmin
        .from(TABLE)
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("provider", "mercadopago")
        .eq("request_id", requestId)
        .eq("status", "processing");

      if (error) {
        throw new Error(`No pudimos cerrar el webhook: ${error.message}`);
      }
    },

    async markFailed(requestId: string, errorMessage: string): Promise<void> {
      const { error } = await untypedAdmin
        .from(TABLE)
        .update({
          status: "failed",
          last_error: errorMessage.slice(0, 500),
        })
        .eq("provider", "mercadopago")
        .eq("request_id", requestId)
        .eq("status", "processing");

      if (error) {
        console.error("[mercadopago:webhook] No pudimos liberar el evento.", {
          requestId,
          error: error.message,
        });
      }
    },
  };
}
