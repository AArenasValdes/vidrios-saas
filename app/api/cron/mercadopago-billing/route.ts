import { NextResponse } from "next/server";

import { getMercadoPagoChileConfig } from "@/features/subscriptions/config/mercadopago-cl.config";
import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";
import { synchronizeMercadoPagoSubscriptionForOrganization } from "@/features/subscriptions/services/mercadopago-webhook.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SUBSCRIPTIONS_PER_QUERY = 20;
const RECONCILIATION_CONCURRENCY = 10;
const RECENT_PENDING_LOOKBACK_HOURS = 48;
const UPCOMING_PAYMENT_LOOKAHEAD_HOURS = 24;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!getMercadoPagoChileConfig().accessToken) {
    return NextResponse.json(
      { error: "Mercado Pago no tiene credenciales configuradas." },
      { status: 503 }
    );
  }

  const now = Date.now();
  const pendingCreatedSince = new Date(
    now - RECENT_PENDING_LOOKBACK_HOURS * 60 * 60 * 1000
  ).toISOString();
  const dueBefore = new Date(
    now + UPCOMING_PAYMENT_LOOKAHEAD_HOURS * 60 * 60 * 1000
  ).toISOString();
  const repository = createOrganizationSubscriptionRepository();

  try {
    const [recentPending, dueSubscriptions] = await Promise.all([
      repository.listRecentPendingMercadoPago(
        pendingCreatedSince,
        MAX_SUBSCRIPTIONS_PER_QUERY
      ),
      repository.listMercadoPagoDueBefore(
        dueBefore,
        MAX_SUBSCRIPTIONS_PER_QUERY
      ),
    ]);
    const organizations = new Set(
      [...recentPending, ...dueSubscriptions].map((subscription) =>
        Number(subscription.organization_id)
      )
    );
    let synchronized = 0;
    let failed = 0;

    const organizationIds = [...organizations];

    for (
      let offset = 0;
      offset < organizationIds.length;
      offset += RECONCILIATION_CONCURRENCY
    ) {
      const batch = organizationIds.slice(
        offset,
        offset + RECONCILIATION_CONCURRENCY
      );
      const outcomes = await Promise.all(
        batch.map(async (organizationId) => {
          try {
            return {
              synchronized: await synchronizeMercadoPagoSubscriptionForOrganization(
                organizationId,
                { includePaymentDetails: false }
              ),
              organizationId,
            };
          } catch (error) {
            console.error(
              "[cron:mercadopago-billing] No se pudo sincronizar una cuenta.",
              {
                organizationId,
                error: error instanceof Error ? error.message : "unknown",
              }
            );
            return { error: true, organizationId };
          }
        })
      );

      for (const outcome of outcomes) {
        if ("error" in outcome) {
          failed += 1;
        } else if (outcome.synchronized) {
          synchronized += 1;
        }
      }
    }

    const result = {
      scanned: organizations.size,
      synchronized,
      failed,
      truncated:
        recentPending.length === MAX_SUBSCRIPTIONS_PER_QUERY ||
        dueSubscriptions.length === MAX_SUBSCRIPTIONS_PER_QUERY,
    };

    return NextResponse.json(result, { status: failed > 0 ? 500 : 200 });
  } catch (error) {
    console.error("[cron:mercadopago-billing] Fallo la consulta de suscripciones.", error);
    return NextResponse.json(
      { error: "No pudimos consultar las suscripciones para reconciliar." },
      { status: 500 }
    );
  }
}
