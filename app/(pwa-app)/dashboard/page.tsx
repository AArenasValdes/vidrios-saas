"use client";

import { PremiumPageReveal } from "@/components/motion/premium-page-reveal";
import { SubscriptionBadge } from "@/features/subscriptions/components/subscription-badge";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { DashboardDesktop } from "./_components/desktop/dashboard-desktop";
import { DashboardMobile } from "./_components/mobile/dashboard-mobile";
import { useDashboardBreakpoint } from "./_hooks/use-dashboard-breakpoint";
import { useDashboardViewModel } from "./_hooks/use-dashboard-view-model";

export default function DashboardPage() {
  const viewModel = useDashboardViewModel();
  const isDesktop = useDashboardBreakpoint();
  const { profile } = useOrganizationProfile();

  const planCode = profile?.planCode;
  const subscription = profile?.subscription;
  const showBadge = subscription && planCode && planCode !== "trial";

  const badge = showBadge ? (
    <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-start" }}>
      <SubscriptionBadge subscription={subscription} planCode={planCode} />
    </div>
  ) : null;

  if (isDesktop) {
    return (
      <PremiumPageReveal>
        {badge}
        <DashboardDesktop {...viewModel.desktop} />
      </PremiumPageReveal>
    );
  }

  return (
    <PremiumPageReveal>
      {badge}
      <DashboardMobile {...viewModel.mobile} />
    </PremiumPageReveal>
  );
}
