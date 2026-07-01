"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { AdminHeaderProvider, useAdminHeader } from "@/features/admin/components/admin-header-context";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { ADMIN_PORTAL_ROOT_ID } from "@/features/admin/components/admin-portal";
import tokens from "@/features/admin/styles/admin-design-tokens.module.css";
import s from "./admin-shell.module.css";

type AdminShellProps = {
  children: ReactNode;
};

function AdminShellFrame({ children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const header = useAdminHeader();

  return (
    <div className={`${tokens.tokens} ${s.shell}`}>
      <AdminSidebar
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <div className={s.main}>
        <div className={s.headerWrap}>
          <AdminPageHeader
            syncedAt={header.syncedAt}
            periodDays={header.periodDays}
            onPeriodChange={header.onPeriodChange}
            onRefresh={header.onRefresh}
            isRefreshing={header.isRefreshing}
            onNewProspect={header.onNewProspect}
            customPrimaryAction={header.customPrimaryAction}
            customSecondaryAction={header.customSecondaryAction}
            customTertiaryAction={header.customTertiaryAction}
            hideDefaultPrimaryActions={header.hideDefaultPrimaryActions}
            onOpenNav={() => setMobileNavOpen(true)}
          />
        </div>
        <div className={s.content}>{children}</div>
      </div>
      <div id={ADMIN_PORTAL_ROOT_ID} className={s.portalRoot} />
    </div>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <AdminHeaderProvider>
      <AdminShellFrame>{children}</AdminShellFrame>
    </AdminHeaderProvider>
  );
}
