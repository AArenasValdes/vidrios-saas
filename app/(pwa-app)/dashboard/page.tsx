"use client";

import { DashboardDesktop } from "./_components/desktop/dashboard-desktop";
import { DashboardMobile } from "./_components/mobile/dashboard-mobile";
import { useDashboardBreakpoint } from "./_hooks/use-dashboard-breakpoint";
import { useDashboardViewModel } from "./_hooks/use-dashboard-view-model";

export default function DashboardPage() {
  const viewModel = useDashboardViewModel();
  const isDesktop = useDashboardBreakpoint();

  if (isDesktop) {
    return <DashboardDesktop {...viewModel.desktop} />;
  }

  return <DashboardMobile {...viewModel.mobile} />;
}
