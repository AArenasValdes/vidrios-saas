import { NextResponse } from "next/server";

import { getMercadoPagoChileConfig } from "@/features/subscriptions/config/mercadopago-cl.config";
import { verifyMercadoPagoWebhookSignature } from "@/features/subscriptions/providers/mercadopago/mercadopago-signature";
import {
  isMercadoPagoWebhookTopic,
  processMercadoPagoWebhook,
} from "@/features/subscriptions/services/mercadopago-webhook.service";
import { createPaymentWebhookEventRepository } from "@/features/subscriptions/repositories/payment-webhook-event.repository";
import {
  isRequestBodyTooLargeError,
  parseJsonObjectBody,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

export const dynamic = "force-dynamic";

type WebhookBody = {
  type?: unknown;
  topic?: unknown;
  data?: { id?: unknown } | null;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: WebhookBody;

  try {
    body =
      (await parseJsonObjectBody<WebhookBody>(request, {
        maxBytes: 32 * 1024,
      })) ?? {};
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return NextResponse.json(
        { error: "Payload demasiado grande." },
        { status: 413 }
      );
    }

    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const resourceIdValue = url.searchParams.get("data.id") ?? body.data?.id;
  const resourceId =
    typeof resourceIdValue === "string" || typeof resourceIdValue === "number"
      ? String(resourceIdValue)
      : "";
  const topicValue = url.searchParams.get("type") ?? body.type ?? body.topic;
  const topic = typeof topicValue === "string" ? topicValue : "";
  const requestId = request.headers.get("x-request-id")?.trim() ?? "";
  const { webhookSecret } = getMercadoPagoChileConfig();
  const signatureValid = verifyMercadoPagoWebhookSignature({
    dataId: resourceId,
    requestId,
    signature: request.headers.get("x-signature"),
    secret: webhookSecret,
  });

  if (!signatureValid || !REQUEST_ID_PATTERN.test(requestId)) {
    return NextResponse.json({ error: "Firma invalida." }, { status: 401 });
  }

  if (!resourceId || !isMercadoPagoWebhookTopic(topic)) {
    return NextResponse.json({ received: true, processed: false });
  }

  const events = createPaymentWebhookEventRepository();

  try {
    const claimed = await events.claimMercadoPagoEvent({
      requestId,
      topic,
      resourceId,
    });

    if (!claimed) {
      return NextResponse.json({
        received: true,
        processed: false,
        duplicate: true,
      });
    }

    const processed = await processMercadoPagoWebhook({
      topic,
      resourceId,
    });
    await events.markProcessed(requestId);

    return NextResponse.json({ received: true, processed });
  } catch (error) {
    await events.markFailed(
      requestId,
      error instanceof Error ? error.message : "unknown"
    );
    console.error("[mercadopago:webhook]", error);
    return NextResponse.json(
      { error: "No pudimos reconciliar el evento." },
      { status: 500 }
    );
  }
}
