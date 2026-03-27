export type PushDecisionKind = "aprobada" | "rechazada";
export type PushNotificationKind = "cotizacion-enviada" | "cotizacion-respuesta";

export type WebPushSubscriptionRecord = {
  id: number;
  organizationId: string | number;
  authUserId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  subscription: PushSubscriptionJSON;
  userEmail: string | null;
  userAgent: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};

export type UpsertWebPushSubscriptionInput = {
  organizationId: string | number;
  authUserId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  subscription: PushSubscriptionJSON;
  userEmail?: string | null;
  userAgent?: string | null;
};

export type QuoteDecisionPushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  cotizacionId: string;
  organizationId: string;
  decision: PushDecisionKind;
};

export type QuoteSentPushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  cotizacionId: string;
  organizationId: string;
  kind: PushNotificationKind;
};
