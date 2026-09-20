import { buildFreshTrialRepairSnapshot } from "../subscription-status.service";
import { assertSubscriptionAllowsRequestManagement } from "../subscription-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";
import type { OrganizationSubscriptionSnapshot } from "@/features/subscriptions/types/subscription";

describe("subscription-route-access.service", () => {
  const expiredTrial: OrganizationSubscriptionSnapshot = {
    subscriptionStatus: "trial_expired",
    trialStartedAt: null,
    trialEndsAt: "2026-05-25T12:00:00.000Z",
    subscriptionStartedAt: null,
    subscriptionEndsAt: null,
    planType: "trial",
    planCode: "trial",
    billingPeriod: "none",
    paymentMethod: "none",
    lastPaymentAt: null,
    founderPriceLocked: false,
  };

  it("repara un trial vencido solo si la organizacion fue creada dentro de los 15 dias iniciales", () => {
    const repaired = buildFreshTrialRepairSnapshot({
      snapshot: expiredTrial,
      organizationCreatedAt: "2026-06-28T12:00:00.000Z",
      now: new Date("2026-06-30T12:00:00.000Z"),
    });

    expect(repaired).toMatchObject({
      subscriptionStatus: "trial_active",
      trialEndsAt: "2026-07-13T12:00:00.000Z",
      planType: "trial",
      planCode: "trial",
    });
  });

  it("no reactiva trials de organizaciones fuera de la ventana inicial", () => {
    const repaired = buildFreshTrialRepairSnapshot({
      snapshot: expiredTrial,
      organizationCreatedAt: "2026-06-01T12:00:00.000Z",
      now: new Date("2026-06-30T12:00:00.000Z"),
    });

    expect(repaired).toBeNull();
  });

  it("no modifica cuentas pagadas o canceladas", () => {
    const repaired = buildFreshTrialRepairSnapshot({
      snapshot: {
        ...expiredTrial,
        subscriptionStatus: "cancelled",
        planType: "monthly",
        planCode: "founder_full",
      },
      organizationCreatedAt: "2026-06-28T12:00:00.000Z",
      now: new Date("2026-06-30T12:00:00.000Z"),
    });

    expect(repaired).toBeNull();
  });

  it("bloquea solicitudes solo con plan_code, sin consultar billing completo", () => {
    expect(() =>
      assertSubscriptionAllowsRequestManagement({
        subscription: { planCode: "quote_only" },
      })
    ).toThrow(AuthRouteAccessError);

    expect(() =>
      assertSubscriptionAllowsRequestManagement({
        subscription: { planCode: "trial" },
      })
    ).not.toThrow();
  });
});
