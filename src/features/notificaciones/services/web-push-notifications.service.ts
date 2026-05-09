import "server-only";

import webpush, { type RequestOptions } from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";
import {
  webPushSubscriptionsRepository,
  type WebPushSubscriptionsRepository,
} from "@/features/notificaciones/repositories/web-push-subscriptions.repository";
import type {
  LeadCreatedPushPayload,
  PushDecisionKind,
  QuoteDecisionPushPayload,
  UpsertWebPushSubscriptionInput,
} from "@/features/notificaciones/types/web-push";

type WebPushNotificationsServiceDeps = {
  repository?: WebPushSubscriptionsRepository;
  validateMembership?: (context: AuthPushContext) => Promise<void>;
};

type SendQuoteDecisionPushInput = {
  organizationId: string | number;
  cotizacionId: string;
  codigo: string;
  clienteNombre: string;
  decision: PushDecisionKind;
};

type SendLeadCreatedPushInput = {
  organizationId: string | number;
  prospectoNombre: string;
  empresaNombre: string;
  tipoTrabajo: string;
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

async function validateUserBelongsToOrganization(context: AuthPushContext) {
  const supabase = createAdminClient();

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
    context.authUserId
  );

  if (authError || !authUser?.user?.email) {
    throw new Error("No se pudo validar la identidad del usuario.");
  }

  let data: { organization_id: string | number | null } | null = null;

  try {
    data = (await findActiveUserProfile(supabase, {
      authUserId: context.authUserId,
      email: authUser.user.email,
    })) as { organization_id: string | number | null } | null;
  } catch {
    throw new Error("No se pudo validar la pertenencia a la organizacion.");
  }

  if (!data || String(data.organization_id) !== String(context.organizationId)) {
    throw new Error("El usuario no pertenece a la organizacion indicada.");
  }
}

function buildQuoteDecisionPushPayload(
  input: SendQuoteDecisionPushInput
): QuoteDecisionPushPayload {
  const decisionLabel = input.decision === "aprobada" ? "aprobo" : "rechazo";
  const isApproved = input.decision === "aprobada";

  return {
    title: isApproved
      ? "Cliente aprobo tu cotizacion"
      : "Cliente rechazo tu cotizacion",
    body: `${input.clienteNombre} ${decisionLabel} ${input.codigo}.`,
    url: `/cotizaciones/${input.cotizacionId}`,
    tag: `cotizacion-${input.decision}-${input.cotizacionId}`,
    cotizacionId: input.cotizacionId,
    organizationId: String(input.organizationId),
    decision: input.decision,
    kind: "cotizacion-respuesta",
  };
}

function buildLeadCreatedPushPayload(
  input: SendLeadCreatedPushInput
): LeadCreatedPushPayload {
  return {
    title: "Nueva solicitud comercial",
    body: `${input.prospectoNombre} pidió ${input.tipoTrabajo} para ${input.empresaNombre}.`,
    url: "/solicitudes",
    tag: `solicitud-publica-${String(input.organizationId)}`,
    organizationId: String(input.organizationId),
    kind: "solicitud-publica",
  };
}

async function sendOrganizationPush(
  repository: WebPushSubscriptionsRepository,
  organizationId: string | number,
  payload: string,
  options?: RequestOptions
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
        payload,
        options
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
  const validateMembership =
    deps.validateMembership ?? validateUserBelongsToOrganization;

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

      await validateMembership(context);

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
      context: Pick<AuthPushContext, "organizationId" | "authUserId">
    ) {
      if (!endpoint.trim()) {
        return;
      }

      await repository.deactivateByEndpointAndAuthUserId(
        endpoint,
        context.organizationId,
        context.authUserId
      );
    },

    async sendQuoteDecisionPush(input: SendQuoteDecisionPushInput) {
      return sendOrganizationPush(
        repository,
        input.organizationId,
        JSON.stringify(buildQuoteDecisionPushPayload(input)),
        {
          urgency: "high",
          TTL: 60 * 60,
        }
      );
    },

    async sendLeadCreatedPush(input: SendLeadCreatedPushInput) {
      return sendOrganizationPush(
        repository,
        input.organizationId,
        JSON.stringify(buildLeadCreatedPushPayload(input)),
        {
          urgency: "high",
          TTL: 30 * 60,
        }
      );
    },
  };
}

export type WebPushNotificationsService = ReturnType<
  typeof createWebPushNotificationsService
>;

export const webPushNotificationsService =
  createWebPushNotificationsService();
