import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  UpsertWebPushSubscriptionInput,
  WebPushSubscriptionRecord,
} from "@/types/web-push";

type WebPushSubscriptionRow = {
  id: number;
  organization_id: string | number;
  auth_user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  subscription: PushSubscriptionJSON;
  user_email: string | null;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
};

function mapRow(row: WebPushSubscriptionRow): WebPushSubscriptionRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    authUserId: row.auth_user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    subscription: row.subscription,
    userEmail: row.user_email,
    userAgent: row.user_agent,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function createWebPushSubscriptionsRepository() {
  const supabase = createAdminClient();

  return {
    async upsert(input: UpsertWebPushSubscriptionInput) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("web_push_subscriptions")
        .upsert(
          ({
            organization_id: input.organizationId,
            auth_user_id: input.authUserId,
            endpoint: input.endpoint,
            p256dh: input.p256dh,
            auth: input.auth,
            subscription: input.subscription,
            user_email: input.userEmail ?? null,
            user_agent: input.userAgent ?? null,
            is_active: true,
            updated_at: now,
            last_seen_at: now,
          } as never),
          {
            onConflict: "endpoint",
          }
        )
        .select(
          "id, organization_id, auth_user_id, endpoint, p256dh, auth, subscription, user_email, user_agent, is_active, created_at, updated_at, last_seen_at"
        )
        .single<WebPushSubscriptionRow>();

      if (error) {
        throw error;
      }

      return mapRow(data);
    },

    async listActiveByOrganizationId(organizationId: string | number) {
      const { data, error } = await supabase
        .from("web_push_subscriptions")
        .select(
          "id, organization_id, auth_user_id, endpoint, p256dh, auth, subscription, user_email, user_agent, is_active, created_at, updated_at, last_seen_at"
        )
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .returns<WebPushSubscriptionRow[]>();

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapRow);
    },

    async deactivateByEndpoint(endpoint: string) {
      const { error } = await supabase
        .from("web_push_subscriptions")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("endpoint", endpoint);

      if (error) {
        throw error;
      }
    },

    async deactivateByEndpointAndOrganizationId(
      endpoint: string,
      organizationId: string | number
    ) {
      const { error } = await supabase
        .from("web_push_subscriptions")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("endpoint", endpoint)
        .eq("organization_id", organizationId);

      if (error) {
        throw error;
      }
    },
  };
}

export type WebPushSubscriptionsRepository = ReturnType<
  typeof createWebPushSubscriptionsRepository
>;

export const webPushSubscriptionsRepository =
  createWebPushSubscriptionsRepository();
