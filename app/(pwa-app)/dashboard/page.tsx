"use client";

import { PremiumPageReveal } from "@/components/motion/premium-page-reveal";
import { SubscriptionBadge } from "@/features/subscriptions/components/subscription-badge";
import { useActivationGate } from "@/features/onboarding/hooks/useActivationGate";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { DashboardDesktop } from "./_components/desktop/dashboard-desktop";
import { DashboardMobile } from "./_components/mobile/dashboard-mobile";
import { useDashboardBreakpoint } from "./_hooks/use-dashboard-breakpoint";
import { useDashboardViewModel } from "./_hooks/use-dashboard-view-model";
import s from "./page.module.css";

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

  const desktopBadge = showBadge ? (
    <div className={s.desktopSubscriptionWrap}>
      <SubscriptionBadge subscription={subscription} planCode={planCode} />
    </div>
  ) : null;

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
        {desktopBadge}
        <DashboardDesktop {...viewModel.desktop} />
      </PremiumPageReveal>
    );
  }

  return (
    <PremiumPageReveal>
      {mobileBadge}
      <DashboardMobile {...viewModel.mobile} />
    </PremiumPageReveal>
  );
}
