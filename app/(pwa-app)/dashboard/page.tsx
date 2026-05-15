"use client";

import dynamic from "next/dynamic";

import { PremiumPageReveal } from "@/components/motion/premium-page-reveal";
import { useDashboardBreakpoint } from "./_hooks/use-dashboard-breakpoint";
import { useDashboardViewModel } from "./_hooks/use-dashboard-view-model";

const DashboardDesktop = dynamic(
  () => import("./_components/desktop/dashboard-desktop").then((mod) => mod.DashboardDesktop),
  { ssr: false }
);

const DashboardMobile = dynamic(
  () => import("./_components/mobile/dashboard-mobile").then((mod) => mod.DashboardMobile),
  { ssr: false }
);

export default function DashboardPage() {
  const viewModel = useDashboardViewModel();
  const isDesktop = useDashboardBreakpoint();

  if (isDesktop) {
    return (
      <PremiumPageReveal>
        <DashboardDesktop {...viewModel.desktop} />
      </PremiumPageReveal>
    );
  }

  return (
    <PremiumPageReveal>
      <DashboardMobile {...viewModel.mobile} />
    </PremiumPageReveal>
  );
}
