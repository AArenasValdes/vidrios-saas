"use client";

import { Suspense } from "react";

import { PremiumPageReveal } from "@/components/motion/premium-page-reveal";
import { MercadoPagoReturnConfirmation } from "@/features/subscriptions/components/mercadopago-return-confirmation";
import { SubscriptionBadge } from "@/features/subscriptions/components/subscription-badge";
import { useActivationGate } from "@/features/onboarding/hooks/useActivationGate";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import dynamic from "next/dynamic";
import { useDashboardBreakpoint } from "./_hooks/use-dashboard-breakpoint";
import { useDashboardViewModel } from "./_hooks/use-dashboard-view-model";
import s from "./page.module.css";

const DashboardDesktop = dynamic(
  () => import("./_components/desktop/dashboard-desktop").then((m) => ({ default: m.DashboardDesktop })),
);

const DashboardMobile = dynamic(
  () => import("./_components/mobile/dashboard-mobile").then((m) => ({ default: m.DashboardMobile })),
);

function isSubscriptionUrgent(
  status: string | null | undefined
) {
  return (
    status === "trial_expiring" ||
    status === "trial_expired" ||
    status === "past_due"
  );
}

export default function DashboardPage() {
  useActivationGate({ redirectWhenNeeded: true });
  const viewModel = useDashboardViewModel();
  const isDesktop = useDashboardBreakpoint();
  const { profile } = useOrganizationProfile();

  const planCode = profile?.planCode;
  const subscription = profile?.subscription;
  const showBadge = subscription && planCode && planCode !== "trial";
  const subscriptionIsUrgent = isSubscriptionUrgent(subscription?.effectiveStatus);

  const mobileBadge = showBadge ? (
    <div
      className={
        subscriptionIsUrgent
          ? s.mobileSubscriptionWrapUrgent
          : s.mobileSubscriptionWrap
      }
    >
      <SubscriptionBadge
        subscription={subscription}
        planCode={planCode}
        variant={subscriptionIsUrgent ? "default" : "compact"}
      />
    </div>
  ) : null;

  if (isDesktop) {
    return (
      <PremiumPageReveal>
        <Suspense fallback={null}>
          <MercadoPagoReturnConfirmation />
        </Suspense>
        <DashboardDesktop {...viewModel.desktop} />
      </PremiumPageReveal>
    );
  }

  return (
    <PremiumPageReveal>
      <Suspense fallback={null}>
        <MercadoPagoReturnConfirmation />
      </Suspense>
      {mobileBadge}
      <DashboardMobile {...viewModel.mobile} />
    </PremiumPageReveal>
  );
}
