import type {
  OrganizationRecurringStatus,
  OrganizationSubscriptionProvider,
} from "@/features/subscriptions/types/organization-subscription";

export type CreateRecurringSubscriptionInput = {
  organizationId: number;
  externalReference: string;
  providerPlanId: string;
  payerEmail: string;
  returnUrl: string;
  notificationUrl: string;
};

export type RecurringSubscriptionResult = {
  providerSubscriptionId: string;
  providerStatus: string;
  status: OrganizationRecurringStatus;
  checkoutUrl: string | null;
  rawResponse: unknown;
};

export interface SubscriptionProvider {
  readonly code: OrganizationSubscriptionProvider;
  createSubscription(
    input: CreateRecurringSubscriptionInput
  ): Promise<RecurringSubscriptionResult>;
  getSubscription(providerSubscriptionId: string): Promise<RecurringSubscriptionResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<RecurringSubscriptionResult>;
  reactivateSubscription(providerSubscriptionId: string): Promise<RecurringSubscriptionResult>;
}
