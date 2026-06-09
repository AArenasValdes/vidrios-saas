"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./admin-sidebar.module.css";

const NAV_ITEMS = [
  { href: "/admin/clientes", title: "Clientes" },
  { href: "/admin/growth", title: "Prospectos" },
];

function isActivePath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={s.sidebar}>
      <nav className={s.nav} aria-label="Navegación admin">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${s.navLink} ${active ? s.navActive : ""}`}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
