import "server-only";

import webpush from "web-push";

import {
  webPushSubscriptionsRepository,
  type WebPushSubscriptionsRepository,
} from "@/repositories/web-push-subscriptions.repository";
import type {
  PushDecisionKind,
  QuoteDecisionPushPayload,
  QuoteSentPushPayload,
  UpsertWebPushSubscriptionInput,
} from "@/types/web-push";

type WebPushNotificationsServiceDeps = {
  repository?: WebPushSubscriptionsRepository;
};

type SendQuoteDecisionPushInput = {
  organizationId: string | number;
  cotizacionId: string;
  codigo: string;
  clienteNombre: string;
  decision: PushDecisionKind;
};

type SendQuoteSentPushInput = {
  organizationId: string | number;
  cotizacionId: string;
  codigo: string;
  clienteNombre: string;
};

type AuthPushContext = {
  organizationId: string | number;
  authUserId: string;
  userEmail?: string | null;
  userAgent?: string | null;
};

let vapidConfigured = false;

function toWebPushSubscription(subscription: PushSubscriptionJSON) {
  return {
    endpoint: subscription.endpoint ?? "",
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: subscription.keys?.p256dh ?? "",
      auth: subscription.keys?.auth ?? "",
    },
  };
}

function ensureWebPushConfigured() {
  if (vapidConfigured) {
    return true;
  }

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject =
    process.env.WEB_PUSH_SUBJECT ?? "mailto:notificaciones@ventora.app";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function buildQuoteDecisionPushPayload(
  input: SendQuoteDecisionPushInput
): QuoteDecisionPushPayload {
  const decisionLabel = input.decision === "aprobada" ? "aprobada" : "rechazada";

  return {
    title:
      input.decision === "aprobada"
        ? "Cotizacion aprobada"
        : "Cotizacion rechazada",
    body: `${input.clienteNombre} ${decisionLabel} ${input.codigo}.`,
    url: `/cotizaciones/${input.cotizacionId}`,
    tag: `cotizacion-${input.decision}-${input.cotizacionId}`,
    cotizacionId: input.cotizacionId,
    organizationId: String(input.organizationId),
    decision: input.decision,
  };
}

function buildQuoteSentPushPayload(
  input: SendQuoteSentPushInput
): QuoteSentPushPayload {
  return {
    title: "Cotizacion enviada",
    body: `${input.codigo} fue enviada a ${input.clienteNombre}.`,
    url: `/cotizaciones/${input.cotizacionId}`,
    tag: `cotizacion-enviada-${input.cotizacionId}`,
    cotizacionId: input.cotizacionId,
    organizationId: String(input.organizationId),
    kind: "cotizacion-enviada",
  };
}

async function sendOrganizationPush(
  repository: WebPushSubscriptionsRepository,
  organizationId: string | number,
  payload: string
) {
  if (!ensureWebPushConfigured()) {
    return {
      sent: 0,
      skipped: true,
    };
  }

  const subscriptions = await repository.listActiveByOrganizationId(organizationId);

  if (subscriptions.length === 0) {
    return {
      sent: 0,
      skipped: false,
    };
  }

  let sent = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        toWebPushSubscription(subscription.subscription),
        payload
      );
      sent += 1;
    } catch (error) {
      const statusCode =
        error && typeof error === "object" && "statusCode" in error
          ? Number((error as { statusCode?: unknown }).statusCode)
          : null;

      if (statusCode === 404 || statusCode === 410) {
        await repository.deactivateByEndpoint(subscription.endpoint);
        continue;
      }

      throw error;
    }
  }

  return {
    sent,
    skipped: false,
  };
}

export function createWebPushNotificationsService(
  deps: WebPushNotificationsServiceDeps = {}
) {
  const repository = deps.repository ?? webPushSubscriptionsRepository;

  return {
    isConfigured() {
      return ensureWebPushConfigured();
    },

    async registerSubscription(
      subscription: PushSubscriptionJSON,
      context: AuthPushContext
    ) {
      const endpoint = subscription.endpoint?.trim();
      const keys = subscription.keys;
      const p256dh = keys?.p256dh?.trim();
      const auth = keys?.auth?.trim();

      if (!endpoint || !p256dh || !auth) {
        throw new Error("La suscripcion push del dispositivo no es valida.");
      }

      const payload: UpsertWebPushSubscriptionInput = {
        organizationId: context.organizationId,
        authUserId: context.authUserId,
        endpoint,
        p256dh,
        auth,
        subscription,
        userEmail: context.userEmail ?? null,
        userAgent: context.userAgent ?? null,
      };

      return repository.upsert(payload);
    },

    async unregisterSubscription(
      endpoint: string,
      organizationId: string | number
    ) {
      if (!endpoint.trim()) {
        return;
      }

      await repository.deactivateByEndpointAndOrganizationId(endpoint, organizationId);
    },

    async sendQuoteDecisionPush(input: SendQuoteDecisionPushInput) {
      return sendOrganizationPush(
        repository,
        input.organizationId,
        JSON.stringify(buildQuoteDecisionPushPayload(input))
      );
    },

    async sendQuoteSentPush(input: SendQuoteSentPushInput) {
      return sendOrganizationPush(
        repository,
        input.organizationId,
        JSON.stringify(buildQuoteSentPushPayload(input))
      );
    },
  };
}

export const webPushNotificationsService =
  createWebPushNotificationsService();
