"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_FOOTER_NAV,
  ADMIN_PRIMARY_NAV,
  type AdminNavItem,
} from "@/features/admin/config/admin-nav.config";
import tokens from "@/features/admin/styles/admin-design-tokens.module.css";
import s from "./admin-sidebar.module.css";

type AdminSidebarProps = {
  mobileOpen: boolean;
  onNavigate?: () => void;
};

const SECONDARY_SHARED_ROUTES = new Set([
  "Marketing",
  "Configuración",
]);

function isActivePath(currentPath: string, item: AdminNavItem) {
  if (SECONDARY_SHARED_ROUTES.has(item.title)) {
    return false;
  }

  if (item.exact) {
    return currentPath === item.href;
  }

  return currentPath === item.href || currentPath.startsWith(`${item.href}/`);
}

export function AdminSidebar({ mobileOpen, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`${s.backdrop} ${mobileOpen ? s.backdropVisible : ""}`}
        onClick={onNavigate}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={`${tokens.tokens} ${s.sidebar} ${mobileOpen ? s.sidebarOpen : ""}`}
        aria-label="Navegación admin"
      >
        <div className={s.brandBlock}>
          <strong className={s.brandTitle}>Ventora Admin</strong>
          <span className={s.brandSubtitle}>Founder</span>
        </div>

        <nav className={s.nav}>
          {ADMIN_PRIMARY_NAV.map((item) => {
            const active = isActivePath(pathname, item);
            const Icon = item.icon;

            return (
              <Link
                key={`${item.href}-${item.title}`}
                href={item.href}
                className={`${s.navLink} ${active ? s.navActive : ""}`}
                onClick={onNavigate}
              >
                <Icon aria-hidden className={s.navIcon} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className={s.footer}>
          {ADMIN_FOOTER_NAV.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={s.footerLink}
                onClick={onNavigate}
              >
                <Icon aria-hidden className={s.navIcon} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
