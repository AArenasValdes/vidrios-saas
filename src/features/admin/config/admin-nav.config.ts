import type { IconType } from "react-icons";
import {
  LuCreditCard,
  LuLayoutDashboard,
  LuLogOut,
  LuMegaphone,
  LuSparkles,
  LuTarget,
  LuUsers,
  LuZap,
} from "react-icons/lu";

export type AdminNavItem = {
  href: string;
  title: string;
  icon: IconType;
  exact?: boolean;
};

export const ADMIN_PRIMARY_NAV: AdminNavItem[] = [
  {
    href: "/admin",
    title: "Resumen",
    icon: LuLayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/prospectos",
    title: "Prospectos",
    icon: LuTarget,
  },
  {
    href: "/admin/clientes",
    title: "Clientes",
    icon: LuUsers,
  },
  {
    href: "/admin/pagos-y-planes",
    title: "Pagos y planes",
    icon: LuCreditCard,
  },
  {
    href: "/admin/activacion",
    title: "Activación",
    icon: LuZap,
  },
  {
    href: "/admin/tareas",
    title: "Tareas",
    icon: LuSparkles,
  },
  {
    href: "/admin/marketing",
    title: "Marketing",
    icon: LuMegaphone,
  },
];

export const ADMIN_FOOTER_NAV = [
  {
    href: "/dashboard",
    title: "Ir a Ventora",
    icon: LuLayoutDashboard,
  },
  {
    href: "/auth/logout",
    title: "Cerrar sesión",
    icon: LuLogOut,
  },
] as const;
