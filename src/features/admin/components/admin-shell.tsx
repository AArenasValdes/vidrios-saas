import type { ReactNode } from "react";
import Link from "next/link";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import s from "./admin-shell.module.css";

type AdminShellProps = {
  children: ReactNode;
  founderEmail: string | null;
};

export function AdminShell({ children, founderEmail }: AdminShellProps) {
  return (
    <div className={s.shell}>
      <div className={s.inner}>
        <header className={s.header}>
          <div className={s.headerText}>
            <strong className={s.title}>Ventora Admin</strong>
            {founderEmail ? (
              <span className={s.subtitle}>{founderEmail}</span>
            ) : null}
          </div>

          <div className={s.headerActions}>
            <Link href="/auth/logout" className={s.primaryLink}>
              Cerrar sesión
            </Link>
          </div>
        </header>

        <div className={s.body}>
          <AdminSidebar />
          <main className={s.content}>{children}</main>
        </div>
      </div>
    </div>
  );
}
