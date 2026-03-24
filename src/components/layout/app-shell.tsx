"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LuBell,
  LuBadgeCheck,
  LuBoxes,
  LuChevronRight,
  LuCircleSlash2,
  LuClock3,
  LuFilePlus2,
  LuFileText,
  LuInbox,
  LuLayoutDashboard,
  LuLogOut,
  LuRefreshCw,
  LuSettings,
  LuUsers,
} from "react-icons/lu";

import { useCotizacionAlerts } from "@/hooks/useCotizacionAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationProfile } from "@/hooks/useOrganizationProfile";
import { PushNotificationsPrompt } from "@/components/pwa/push-notifications-prompt";
import { buildOrganizationInitials } from "@/services/organization-profile.service";
import { canAccessSolicitudes } from "@/services/solicitudes-contacto-access";
import type { CotizacionAlert } from "@/services/cotizacion-alerts.service";

import s from "./app-shell.module.css";

type NavItem = {
  href: string;
  icon: IconType;
  label: string;
  mobileLabel: string;
  description: string;
};

type ContextItem = {
  href: string;
  label: string;
  mobileLabel: string;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    icon: LuLayoutDashboard,
    label: "Dashboard",
    mobileLabel: "Inicio",
    description: "Resumen del negocio en tiempo real",
  },
  {
    href: "/cotizaciones",
    icon: LuFileText,
    label: "Cotizaciones",
    mobileLabel: "Cotizaciones",
    description: "Presupuestos y seguimiento comercial",
  },
  {
    href: "/clientes",
    icon: LuUsers,
    label: "Clientes",
    mobileLabel: "Clientes",
    description: "Contactos, obras e historial comercial",
  },
  {
    href: "/solicitudes",
    icon: LuInbox,
    label: "Solicitudes",
    mobileLabel: "Leads",
    description: "Contactos y demos que llegan desde la landing",
  },
  {
    href: "/configuracion/empresa",
    icon: LuSettings,
    label: "Empresa",
    mobileLabel: "Empresa",
    description: "Marca, logo y datos comerciales del negocio",
  },
];

const FUTURE_ITEMS = [
  { label: "Materiales", icon: LuBoxes },
];

const SPECIAL_SCREENS: ContextItem[] = [
  {
    href: "/cotizaciones/nueva",
    label: "Crear cotizacion",
    mobileLabel: "Crear",
    description: "Flujo principal para crear una cotizacion desde cero.",
  },
];

const ALERTS_SEEN_STORAGE_PREFIX = "vidrios-saas:alerts-seen:";
const ALERTS_CLEARED_STORAGE_PREFIX = "vidrios-saas:alerts-cleared:";

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function getAlertTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getAlertsSeenStorageKey(
  organizationId: string | number | null | undefined,
  email: string | null | undefined
) {
  if (!organizationId || !email) {
    return null;
  }

  return `${ALERTS_SEEN_STORAGE_PREFIX}${String(organizationId)}:${email.trim().toLowerCase()}`;
}

function getAlertsClearedStorageKey(
  organizationId: string | number | null | undefined,
  email: string | null | undefined
) {
  if (!organizationId || !email) {
    return null;
  }

  return `${ALERTS_CLEARED_STORAGE_PREFIX}${String(organizationId)}:${email.trim().toLowerCase()}`;
}

function formatAlertDate(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Hace un momento";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Hace un momento";
  }

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getAlertMeta(alert: CotizacionAlert) {
  if (alert.kind === "aprobada") {
    return {
      chipClass: s.alertChipApproved,
      chipLabel: "Aprobada",
      Icon: LuBadgeCheck,
    };
  }

  if (alert.kind === "rechazada") {
    return {
      chipClass: s.alertChipRejected,
      chipLabel: "Rechazada",
      Icon: LuCircleSlash2,
    };
  }

  return {
    chipClass: s.alertChipViewed,
    chipLabel: "Vista",
    Icon: LuClock3,
  };
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, rol, signOut, organizacionId, cargando } = useAuth();
  const { profile } = useOrganizationProfile();
  const { alerts, isLoading: isAlertsLoading, error: alertsError, refresh } =
    useCotizacionAlerts(organizacionId, {
      autoRefresh: true,
      refreshOnVisibility: true,
    });
  const showMobileFab = !pathname.startsWith("/cotizaciones");
  const isNuevaCotizacionRoute = pathname.startsWith("/cotizaciones/nueva");
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [alertsSeenAt, setAlertsSeenAt] = useState(0);
  const [alertsClearedAt, setAlertsClearedAt] = useState(0);
  const [isCompactMobile, setIsCompactMobile] = useState(false);

  const currentItem = useMemo(
    () =>
      SPECIAL_SCREENS.find((item) => pathname.startsWith(item.href)) ??
      NAV_ITEMS.find((item) => isActivePath(pathname, item.href)) ??
      NAV_ITEMS[0],
    [pathname]
  );
  const initial = useMemo(() => user?.email?.[0]?.toUpperCase() ?? "U", [user?.email]);
  const canReviewSolicitudes = useMemo(
    () =>
      canAccessSolicitudes({
        email: user?.email,
        rol,
      }),
    [rol, user?.email]
  );
  const email = user?.email ?? "usuario@empresa.cl";
  const companyName = profile?.empresaNombre ?? "Mi empresa";
  const companyInitials = useMemo(
    () => buildOrganizationInitials(companyName),
    [companyName]
  );
  const alertsSeenStorageKey = useMemo(
    () => getAlertsSeenStorageKey(organizacionId, user?.email),
    [organizacionId, user?.email]
  );
  const alertsClearedStorageKey = useMemo(
    () => getAlertsClearedStorageKey(organizacionId, user?.email),
    [organizacionId, user?.email]
  );
  const unreadAlerts = useMemo(
    () => alerts.filter((alert) => getAlertTimestamp(alert.occurredAt) > alertsSeenAt),
    [alerts, alertsSeenAt]
  );
  const alertCount = unreadAlerts.length;
  const isWorkspaceBooting = cargando || Boolean(user && !organizacionId);
  const visibleAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => getAlertTimestamp(alert.occurredAt) > alertsClearedAt)
        .slice(0, isCompactMobile ? 6 : 8),
    [alerts, alertsClearedAt, isCompactMobile]
  );

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    try {
      setIsSigningOut(true);
      setIsAlertsOpen(false);
      router.replace("/login");
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const markAlertsAsSeen = useCallback(() => {
    const latestSeenAt = alerts.reduce(
      (latest, alert) => Math.max(latest, getAlertTimestamp(alert.occurredAt)),
      alertsSeenAt
    );

    setAlertsSeenAt(latestSeenAt);

    if (typeof window !== "undefined" && alertsSeenStorageKey) {
      window.localStorage.setItem(alertsSeenStorageKey, String(latestSeenAt));
    }
  }, [alerts, alertsSeenAt, alertsSeenStorageKey]);

  useEffect(() => {
    if (!cargando && !user) {
      if (isSigningOut) {
        router.replace("/login");
        return;
      }

      const nextPath = pathname?.startsWith("/") ? pathname : "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [cargando, isSigningOut, pathname, router, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncViewport = () => {
      setIsCompactMobile(window.innerWidth <= 720);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!alertsSeenStorageKey) {
      setAlertsSeenAt(0);
      return;
    }

    const rawSeenAt = window.localStorage.getItem(alertsSeenStorageKey);
    const parsedSeenAt = rawSeenAt ? Number(rawSeenAt) : 0;
    setAlertsSeenAt(Number.isFinite(parsedSeenAt) ? parsedSeenAt : 0);
  }, [alertsSeenStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!alertsClearedStorageKey) {
      setAlertsClearedAt(0);
      return;
    }

    const rawClearedAt = window.localStorage.getItem(alertsClearedStorageKey);
    const parsedClearedAt = rawClearedAt ? Number(rawClearedAt) : 0;
    setAlertsClearedAt(Number.isFinite(parsedClearedAt) ? parsedClearedAt : 0);
  }, [alertsClearedStorageKey]);

  useEffect(() => {
    if (isWorkspaceBooting) {
      return;
    }

    const routesToPrefetch = [
      "/dashboard",
      "/cotizaciones",
      "/clientes",
      "/solicitudes",
      "/configuracion/empresa",
      "/cotizaciones/nueva",
    ].filter((href) => href !== pathname);
    const timeouts: number[] = [];
    const schedulePrefetch = () => {
      routesToPrefetch.forEach((href, index) => {
        const timeoutId = window.setTimeout(() => {
          router.prefetch(href);
        }, 180 * index);

        timeouts.push(timeoutId);
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleCallbackId = window.requestIdleCallback(() => {
        schedulePrefetch();
      });

      return () => {
        window.cancelIdleCallback(idleCallbackId);
        timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      };
    }

    schedulePrefetch();

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [isWorkspaceBooting, pathname, router]);

  useEffect(() => {
    if (!isAlertsOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-alerts-trigger='true']")) {
        return;
      }

      if (target.closest("[data-alerts-panel='true']")) {
        return;
      }

      setIsAlertsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAlertsOpen(false);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAlertsOpen]);

  const handleToggleAlerts = () => {
    const nextIsOpen = !isAlertsOpen;
    setIsAlertsOpen(nextIsOpen);

    if (nextIsOpen) {
      markAlertsAsSeen();
      void refresh();
    }
  };

  const handleClearAlerts = () => {
    markAlertsAsSeen();
    const latestClearedAt = alerts.reduce(
      (latest, alert) => Math.max(latest, getAlertTimestamp(alert.occurredAt)),
      alertsClearedAt
    );

    setAlertsClearedAt(latestClearedAt);

    if (typeof window !== "undefined" && alertsClearedStorageKey) {
      window.localStorage.setItem(alertsClearedStorageKey, String(latestClearedAt));
    }
  };

  if (isWorkspaceBooting) {
    return (
      <div className={s.bootRoot}>
        <div className={s.bootCard}>
          <div className={s.bootBadge}>Panel operativo</div>
          <h1 className={s.bootTitle}>Cargando tu espacio de trabajo</h1>
          <p className={s.bootText}>
            Estamos conectando sesion, empresa y datos comerciales para que el
            panel abra completo desde el primer intento.
          </p>
          <div className={s.bootProgress} aria-hidden>
            <span className={s.bootProgressBar} />
          </div>
        </div>
      </div>
    );
  }

  if (isSigningOut || (!cargando && !user)) {
    return (
      <div className={s.bootRoot}>
        <div className={s.bootCard}>
          <div className={s.bootBadge}>Cerrando sesion</div>
          <h1 className={s.bootTitle}>Saliendo del panel</h1>
          <p className={s.bootText}>
            Estamos cerrando tu sesion y volviendo al acceso principal.
          </p>
          <div className={s.bootProgress} aria-hidden>
            <span className={s.bootProgressBar} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <aside className={s.sidebar}>
        <div className={s.sidebarTop}>
          <div className={s.sidebarBrand}>
            <div className={s.sidebarBrandIcon}>
              <div className={s.sidebarBrandDot}>{companyInitials}</div>
            </div>
            <div>
              <span className={s.sidebarBrandName}>Panel operativo</span>
              <div className={s.sidebarOrg}>{companyName}</div>
            </div>
          </div>

          <div className={s.sidebarPitch}>
            Cotiza en terreno y controla el avance del negocio desde un solo panel.
          </div>
        </div>

        <div className={s.sidebarCta}>
          <div className={s.navLabel}>Crear</div>
          <Link
            href="/cotizaciones/nueva"
            prefetch={false}
            className={`${s.sidebarCtaButton}${isNuevaCotizacionRoute ? ` ${s.sidebarCtaButtonActive}` : ""}`}
          >
            <LuFilePlus2 aria-hidden />
            Crear cotizacion
          </Link>
        </div>

        <nav className={s.sidebarNav}>
          <div className={s.navLabel}>Operacion</div>

          {NAV_ITEMS.map((item) => {
            if (item.href === "/solicitudes" && !canReviewSolicitudes) {
              return null;
            }

            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`${s.navItem}${active ? ` ${s.navItemActive}` : ""}`}
              >
                <span className={s.navIconWrap}>
                  <Icon className={s.navIcon} aria-hidden />
                </span>
                <span className={s.navText}>
                  <span className={s.navTitle}>{item.label}</span>
                  <span className={s.navHint}>{item.description}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className={s.sidebarFuture}>
          <div className={s.navLabel}>Siguiente</div>
          {FUTURE_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className={s.futureItem}>
                <span className={s.futureIconWrap}>
                  <Icon className={s.futureIcon} aria-hidden />
                </span>
                <span>{item.label}</span>
                <span className={s.futurePill}>Pronto</span>
              </div>
            );
          })}
        </div>

        <div className={s.sidebarUser}>
          <div className={s.userAvatar}>{initial}</div>
          <div className={s.userInfo}>
            <div className={s.userName}>{email}</div>
            <div className={s.userRole}>{rol ?? "usuario"}</div>
          </div>
          <button
            className={s.logoutBtn}
            onClick={handleLogout}
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
            disabled={isSigningOut}
            aria-busy={isSigningOut}
          >
            <LuLogOut aria-hidden />
          </button>
        </div>
      </aside>

      <header className={s.mobileHeader}>
        <div>
          <span className={s.mobileHeaderEyebrow}>Area operativa</span>
          <div className={s.mobileHeaderBrand}>{currentItem.mobileLabel}</div>
        </div>
        <div className={s.mobileHeaderRight}>
          <button
            className={`${s.mobileGhostBtn}${isAlertsOpen ? ` ${s.mobileGhostBtnActive}` : ""}`}
            type="button"
            aria-label="Notificaciones"
            aria-expanded={isAlertsOpen}
            data-alerts-trigger="true"
            onClick={handleToggleAlerts}
          >
            <LuBell aria-hidden />
            {alertCount > 0 ? (
              <span className={s.alertDot}>{alertCount > 9 ? "9+" : alertCount}</span>
            ) : null}
          </button>
          <div className={s.mobileAvatar}>{initial}</div>
        </div>
      </header>

      <main className={s.main}>
        <div className={s.topbar}>
          <div>
            <p className={s.topbarEyebrow}>Panel operativo</p>
            <h1 className={s.topbarTitle}>{currentItem.label}</h1>
            <p className={s.topbarText}>{currentItem.description}</p>
          </div>

          <div className={s.topbarActions}>
            <button
              className={`${s.ghostAction}${isAlertsOpen ? ` ${s.ghostActionActive}` : ""}`}
              type="button"
              aria-expanded={isAlertsOpen}
              data-alerts-trigger="true"
              onClick={handleToggleAlerts}
            >
              <LuBell aria-hidden />
              Alertas
              {alertCount > 0 ? (
                <span className={s.alertPill}>{alertCount > 9 ? "9+" : alertCount}</span>
              ) : null}
            </button>
            <div className={s.teamBadge}>
              <div className={s.teamBadgeAvatar}>{initial}</div>
              <div>
                <div className={s.teamBadgeName}>Equipo activo</div>
                <div className={s.teamBadgeMeta}>{rol ?? "usuario"}</div>
              </div>
              <LuChevronRight className={s.teamBadgeArrow} aria-hidden />
            </div>
          </div>
        </div>

        <div className={s.pageContent}>
          <PushNotificationsPrompt />
          {children}
        </div>
      </main>

      {isAlertsOpen ? (
        <aside className={s.alertsPanel} data-alerts-panel="true">
          <div className={s.alertsHeader}>
            <div>
              <strong>Alertas comerciales</strong>
              <p>
                {alertCount > 0
                  ? `${alertCount} alerta${alertCount === 1 ? "" : "s"} para revisar`
                  : "Sin alertas activas"}
              </p>
            </div>
            <div className={s.alertsHeaderActions}>
              <button
                className={s.alertsClearBtn}
                onClick={handleClearAlerts}
                type="button"
                aria-label="Limpiar alertas"
              >
                Limpiar
              </button>
              <button
                className={s.alertsRefreshBtn}
                onClick={() => void refresh()}
                type="button"
                aria-label="Actualizar alertas"
              >
                <LuRefreshCw aria-hidden />
              </button>
            </div>
          </div>

          {isAlertsLoading && alerts.length === 0 ? (
            <div className={s.alertsLoadingState}>
              <span className={s.alertsSpinner} aria-hidden />
              <div>
                <strong>Actualizando alertas</strong>
                <p>Estamos revisando respuestas nuevas de tus clientes.</p>
              </div>
            </div>
          ) : null}

          {alertsError ? (
            <div className={s.alertsErrorState}>
              <strong>No pudimos sincronizar las alertas</strong>
              <p>{alertsError}</p>
            </div>
          ) : null}

          {visibleAlerts.length > 0 ? (
            <div className={s.alertsList}>
              {visibleAlerts.map((alert) => {
                const meta = getAlertMeta(alert);
                const Icon = meta.Icon;

                return (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className={s.alertItem}
                    onClick={() => setIsAlertsOpen(false)}
                  >
                    <div className={s.alertItemIcon}>
                      <Icon aria-hidden />
                    </div>
                    <div className={s.alertItemBody}>
                      <div className={s.alertItemTop}>
                        <strong>{alert.title}</strong>
                        <span className={`${s.alertChip} ${meta.chipClass}`}>{meta.chipLabel}</span>
                      </div>
                      <p>{alert.message}</p>
                      <div className={s.alertItemMeta}>
                        <span>{alert.codigo}</span>
                        <span>{formatAlertDate(alert.occurredAt)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : !isAlertsLoading && !alertsError ? (
            <div className={s.alertsEmptyState}>
              <strong>Sin respuestas nuevas</strong>
              <p>
                Cuando un cliente apruebe, rechace o vea un presupuesto sin responder,
                aparecera aqui.
              </p>
            </div>
          ) : null}

          <Link className={s.alertsFooterLink} href="/cotizaciones" onClick={() => setIsAlertsOpen(false)}>
            Ir a cotizaciones
          </Link>
        </aside>
      ) : null}

      <nav className={s.tabBar}>
        <div className={s.tabBarInner}>
          {NAV_ITEMS.map((item) => {
            if (item.href === "/solicitudes" && !canReviewSolicitudes) {
              return null;
            }

            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`${s.tabItem}${active ? ` ${s.tabItemActive}` : ""}`}
              >
                <Icon className={s.tabIcon} aria-hidden />
                {item.mobileLabel}
              </Link>
            );
          })}
        </div>
      </nav>

      {showMobileFab ? (
        <Link
          href="/cotizaciones/nueva"
          prefetch={false}
          className={s.mobileFab}
          aria-label="Crear cotizacion"
        >
          <LuFilePlus2 aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
