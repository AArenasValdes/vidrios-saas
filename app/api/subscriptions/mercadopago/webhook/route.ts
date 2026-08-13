import { NextResponse } from "next/server";

import { getMercadoPagoChileConfig } from "@/features/subscriptions/config/mercadopago-cl.config";
import { verifyMercadoPagoWebhookSignature } from "@/features/subscriptions/providers/mercadopago/mercadopago-signature";
import {
  isMercadoPagoWebhookTopic,
  processMercadoPagoWebhook,
} from "@/features/subscriptions/services/mercadopago-webhook.service";

export const dynamic = "force-dynamic";

type WebhookBody = {
  type?: unknown;
  topic?: unknown;
  data?: { id?: unknown } | null;
};

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: WebhookBody;

  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const resourceIdValue = url.searchParams.get("data.id") ?? body.data?.id;
  const resourceId =
    typeof resourceIdValue === "string" || typeof resourceIdValue === "number"
      ? String(resourceIdValue)
      : "";
  const topicValue = url.searchParams.get("type") ?? body.type ?? body.topic;
  const topic = typeof topicValue === "string" ? topicValue : "";
  const { webhookSecret } = getMercadoPagoChileConfig();
  const signatureValid = verifyMercadoPagoWebhookSignature({
    dataId: resourceId,
    requestId: request.headers.get("x-request-id"),
    signature: request.headers.get("x-signature"),
    secret: webhookSecret,
  });

  if (!signatureValid) {
    return NextResponse.json({ error: "Firma invalida." }, { status: 401 });
  }

  if (!resourceId || !isMercadoPagoWebhookTopic(topic)) {
    return NextResponse.json({ received: true, processed: false });
  }

  try {
    const processed = await processMercadoPagoWebhook({
      topic,
      resourceId,
    });

    return NextResponse.json({ received: true, processed });
  } catch (error) {
    console.error("[mercadopago:webhook]", error);
    return NextResponse.json(
      { error: "No pudimos reconciliar el evento." },
      { status: 500 }
    );
  }
}
