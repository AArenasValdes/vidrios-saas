export type AdminPageMeta = {
  title: string;
  subtitle: string;
  showDateRange?: boolean;
  showPrimaryActions?: boolean;
};

const PAGE_META: Record<string, AdminPageMeta> = {
  "/admin": {
    title: "Control de Ventora",
    subtitle: "Visión comercial, clientes y operación en un solo lugar.",
    showDateRange: true,
    showPrimaryActions: true,
  },
  "/admin/prospectos": {
    title: "Prospectos",
    subtitle: "Pipeline comercial, seguimientos y trabajo diario.",
    showPrimaryActions: true,
  },
  "/admin/clientes": {
    title: "Clientes",
    subtitle: "Gestiona trials, cuentas activas, pagos y renovaciones.",
    showPrimaryActions: true,
  },
  "/admin/pagos-y-planes": {
    title: "Pagos y planes",
    subtitle: "Controla cobros, activaciones, renovaciones y estado de suscripciones.",
    showPrimaryActions: true,
  },
  "/admin/activacion": {
    title: "Activación",
    subtitle: "Acompaña cada cuenta hasta su primera cotización y primer resultado.",
    showPrimaryActions: true,
  },
  "/admin/tareas": {
    title: "Tareas",
    subtitle: "Prioridades comerciales, activación y seguimiento en un solo lugar.",
    showPrimaryActions: true,
  },
  "/admin/marketing": {
    title: "Marketing",
    subtitle: "Adquisición de Ventora y rendimiento de páginas públicas.",
    showPrimaryActions: true,
  },
};

export function resolveAdminPageMeta(pathname: string): AdminPageMeta {
  if (pathname.startsWith("/admin/clientes/")) {
    return {
      title: "Detalle de cuenta",
      subtitle: "Estado comercial, pagos y acciones de la organización.",
    };
  }

  for (const [prefix, meta] of Object.entries(PAGE_META)) {
    if (prefix === "/admin" && pathname === "/admin") {
      return meta;
    }

    if (prefix !== "/admin" && pathname.startsWith(prefix)) {
      return meta;
    }
  }

  return {
    title: "Ventora Admin",
    subtitle: "Panel interno del fundador.",
  };
}
