"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { IconType } from "react-icons";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  LuBell,
  LuBadgeCheck,
  LuBoxes,
  LuChevronRight,
  LuCircleSlash2,
  LuClock3,
  LuCreditCard,
  LuFilePlus2,
  LuFileText,
  LuGlobe,
  LuInbox,
  LuLayoutDashboard,
  LuLogOut,
  LuRefreshCw,
  LuSettings,
  LuSparkles,
  LuUsers,
} from "react-icons/lu";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { navigateToLogoutRoute } from "@/features/auth/services/logout-navigation.service";
import { useCotizacionAlerts } from "@/features/cotizaciones/hooks/useCotizacionAlerts";
import type { CotizacionAlert } from "@/features/cotizaciones/services/cotizacion-alerts.service";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { buildOrganizationInitials } from "@/features/organization-profile/services/organization-profile.service";
import { useSolicitudesContacto } from "@/features/solicitudes/hooks/useSolicitudesContacto";
import { canAccessSolicitudes } from "@/features/solicitudes/services/solicitudes-contacto-access";
import {
  getLatestSolicitudesSeenAt,
  getSolicitudesSeenStorageKey,
  persistSolicitudesSeenAt,
  readSolicitudesSeenAt,
} from "@/features/solicitudes/services/solicitudes-seen-storage.service";
import {
  canAccessPrivatePathWithSubscription,
  isQuoteOnlyRestrictedPath,
  isWriteRestrictedPrivatePath,
  resolveOrganizationSubscriptionState,
} from "@/features/subscriptions/services/subscription-status.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Toaster } from "@/components/ui/sonner";
import { UpdateChecker } from "@/components/pwa/update-checker";

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

type BrowserWindowWithIdleCallback = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
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
    mobileLabel: "Solicitudes",
    description: "Contactos y demos que llegan desde la landing",
  },
  {
    href: "/configuracion/empresa",
    icon: LuSettings,
    label: "Empresa",
    mobileLabel: "Empresa",
    description: "Marca, logo y datos comerciales del negocio",
  },
  {
    href: "/configuracion/pagina-venta",
    icon: LuGlobe,
    label: "Pagina de venta",
    mobileLabel: "Pagina",
    description: "Configura tu mini landing publica",
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
const TRIAL_NOTICE_DAILY_STORAGE_PREFIX = "ventora:trial-notice-day:";
const TRIAL_NOTICE_SESSION_STORAGE_PREFIX = "ventora:trial-notice-session:";
const TRIAL_REMINDER_DAILY_STORAGE_PREFIX = "ventora:trial-reminder-day:";
const TRIAL_URGENT_DAYS = 3;
const DESKTOP_VIEWPORT_QUERY = "(min-width: 861px)";

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

function getTrialNoticeStorageKey(
  prefix: string,
  organizationId: string | number | null | undefined,
  email: string | null | undefined
) {
  if (!organizationId || !email) {
    return null;
  }

  return `${prefix}${String(organizationId)}:${email.trim().toLowerCase()}`;
}

function getTodayStorageValue() {
  return new Date().toISOString().slice(0, 10);
}

function scheduleDeferredShellWork(callback: () => void, delayMs = 650) {
  if (typeof window === "undefined") {
    callback();
    return () => undefined;
  }

  const browserWindow = window as BrowserWindowWithIdleCallback;

  if (typeof browserWindow.requestIdleCallback === "function") {
    const idleCallbackId = browserWindow.requestIdleCallback(() => {
      callback();
    }, { timeout: Math.max(1800, delayMs) });

    return () => {
      browserWindow.cancelIdleCallback?.(idleCallbackId);
    };
  }

  const timeoutId = window.setTimeout(callback, delayMs);
  return () => window.clearTimeout(timeoutId);
}

function shouldSkipRoutePrefetch() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const navigatorWithConnection = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  return (
    navigatorWithConnection.connection?.saveData === true ||
    navigatorWithConnection.connection?.effectiveType === "slow-2g" ||
    navigatorWithConnection.connection?.effectiveType === "2g"
  );
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

function subscribeToHydrationSnapshot() {
  return () => undefined;
}

function getHydratedClientSnapshot() {
  return true;
}

function getHydratedServerSnapshot() {
  return false;
}

function subscribeToDesktopViewport(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }

  const mediaQueryList = window.matchMedia(DESKTOP_VIEWPORT_QUERY);
  mediaQueryList.addEventListener("change", callback);

  return () => {
    mediaQueryList.removeEventListener("change", callback);
  };
}

function getDesktopViewportSnapshot() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(DESKTOP_VIEWPORT_QUERY).matches
    : false;
}

function getDesktopViewportServerSnapshot() {
  return false;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, rol, signOut, organizacionId, cargando: authCargando } = useAuth();
  const { profile } = useOrganizationProfile();
  const subscription = profile?.subscription ?? resolveOrganizationSubscriptionState(null);
  const isQuoteOnlyPlan =
    profile?.planCode === "quote_only" || subscription.planCode === "quote_only";
  const reduceMotion = useReducedMotion();
  const [shouldLoadShellFeeds, setShouldLoadShellFeeds] = useState(() =>
    pathname.startsWith("/solicitudes")
  );
  const { alerts, isLoading: isAlertsLoading, error: alertsError, refresh } =
    useCotizacionAlerts(organizacionId, {
      autoRefresh: shouldLoadShellFeeds,
      refreshOnVisibility: shouldLoadShellFeeds,
      pollingIntervalMs: shouldLoadShellFeeds ? 45000 : 0,
    });
  const isNuevaCotizacionRoute = pathname.startsWith("/cotizaciones/nueva");
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<
    "sidebar" | "mobile" | "topbar" | null
  >(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authBootStuck, setAuthBootStuck] = useState(false);
  const [showTrialWelcomeNotice, setShowTrialWelcomeNotice] = useState(false);
  const [isTrialReminderDismissed, setIsTrialReminderDismissed] = useState(false);
  const [trialStorageScope, setTrialStorageScope] = useState<string | null>(null);
  const hasHydrated = useSyncExternalStore(
    subscribeToHydrationSnapshot,
    getHydratedClientSnapshot,
    getHydratedServerSnapshot
  );
  const isDesktopViewport = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopViewportSnapshot,
    getDesktopViewportServerSnapshot
  );
  const [alertsSeenAt, setAlertsSeenAt] = useState(0);
  const [alertsClearedAt, setAlertsClearedAt] = useState(0);
  const [solicitudesSeenAt, setSolicitudesSeenAt] = useState(0);
  const [isCompactMobile, setIsCompactMobile] = useState(false);
  const isMountedRef = useRef(true);

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
      !isQuoteOnlyPlan &&
      canAccessSolicitudes({
        email: user?.email,
        rol,
      }),
    [isQuoteOnlyPlan, rol, user?.email]
  );
  const cargando = authCargando;
  const solicitudesShellCacheKey = String(
    user?.email?.trim().toLowerCase() ??
      organizacionId ??
      profile?.organizationId ??
      "default"
  );
  const { solicitudes: solicitudesShell } = useSolicitudesContacto(
    canReviewSolicitudes &&
      !cargando &&
      (shouldLoadShellFeeds || pathname.startsWith("/solicitudes")),
    solicitudesShellCacheKey
  );
  const email = user?.email ?? "usuario@empresa.cl";
  const companyName = profile?.empresaNombre ?? "Mi empresa";
  const companyInitials = useMemo(
    () => buildOrganizationInitials(companyName),
    [companyName]
  );
  const isCuentaVencidaRoute = pathname === "/cuenta-vencida";
  const usesMinimalShell = isCuentaVencidaRoute;
  const shouldRedirectForSubscription =
    profile !== null &&
    subscription.isWriteBlocked &&
    !canAccessPrivatePathWithSubscription(pathname, subscription);
  const shouldRedirectQuoteOnlyRoute =
    isQuoteOnlyPlan && !subscription.isWriteBlocked && isQuoteOnlyRestrictedPath(pathname);
  const isDashboardRoute = pathname === "/dashboard";
  const trialDaysRemaining = subscription.daysRemaining ?? 0;
  const isTrialInProgress =
    subscription.isTrial &&
    !subscription.isExpired &&
    subscription.daysRemaining !== null &&
    subscription.daysRemaining > 0;
  const shouldShowSoftTrialNotice =
    profile !== null && isTrialInProgress && trialDaysRemaining > TRIAL_URGENT_DAYS;
  const alertsSeenStorageKey = useMemo(
    () => getAlertsSeenStorageKey(organizacionId, user?.email),
    [organizacionId, user?.email]
  );
  const alertsClearedStorageKey = useMemo(
    () => getAlertsClearedStorageKey(organizacionId, user?.email),
    [organizacionId, user?.email]
  );
  const solicitudesSeenStorageKey = useMemo(
    () => getSolicitudesSeenStorageKey(organizacionId, user?.email),
    [organizacionId, user?.email]
  );
  const trialNoticeDailyStorageKey = useMemo(
    () =>
      getTrialNoticeStorageKey(
        TRIAL_NOTICE_DAILY_STORAGE_PREFIX,
        organizacionId,
        user?.email
      ),
    [organizacionId, user?.email]
  );
  const trialNoticeSessionStorageKey = useMemo(
    () =>
      getTrialNoticeStorageKey(
        TRIAL_NOTICE_SESSION_STORAGE_PREFIX,
        organizacionId,
        user?.email
      ),
    [organizacionId, user?.email]
  );
  const trialReminderDailyStorageKey = useMemo(
    () =>
      getTrialNoticeStorageKey(
        TRIAL_REMINDER_DAILY_STORAGE_PREFIX,
        organizacionId,
        user?.email
      ),
    [organizacionId, user?.email]
  );
  const trialStorageScopeKey = useMemo(() => {
    if (
      !trialNoticeDailyStorageKey ||
      !trialNoticeSessionStorageKey ||
      !trialReminderDailyStorageKey
    ) {
      return null;
    }

    return `${trialNoticeDailyStorageKey}|${trialNoticeSessionStorageKey}|${trialReminderDailyStorageKey}`;
  }, [
    trialNoticeDailyStorageKey,
    trialNoticeSessionStorageKey,
    trialReminderDailyStorageKey,
  ]);
  const isTrialStorageReady =
    trialStorageScopeKey !== null && trialStorageScope === trialStorageScopeKey;
  const shouldShowDashboardTrialBanner =
    isTrialStorageReady &&
    !usesMinimalShell &&
    isDashboardRoute &&
    isTrialInProgress &&
    trialDaysRemaining <= TRIAL_URGENT_DAYS &&
    !isTrialReminderDismissed;
  const shouldShowDashboardTrialPill =
    isTrialStorageReady &&
    !usesMinimalShell &&
    isDashboardRoute &&
    isTrialInProgress &&
    trialDaysRemaining > TRIAL_URGENT_DAYS;
  const unreadAlerts = useMemo(
    () => alerts.filter((alert) => getAlertTimestamp(alert.occurredAt) > alertsSeenAt),
    [alerts, alertsSeenAt]
  );
  const alertCount = unreadAlerts.length;
  const isWorkspaceBooting = hasHydrated && cargando && !user;
  const isOrganizationBootstrapPending = Boolean(user && !organizacionId);
  const isProfileMenuOpen = profileMenuAnchor !== null;
  const visibleAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => getAlertTimestamp(alert.occurredAt) > alertsClearedAt)
        .slice(0, isCompactMobile ? 6 : 8),
    [alerts, alertsClearedAt, isCompactMobile]
  );
  const nuevasSolicitudesCount = useMemo(
    () =>
      solicitudesShell.filter((solicitud) => {
        if (solicitud.estado !== "nueva") {
          return false;
        }

        return getAlertTimestamp(solicitud.creadoEn) > solicitudesSeenAt;
      }).length,
    [solicitudesSeenAt, solicitudesShell]
  );

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setIsAlertsOpen(false);
    setProfileMenuAnchor(null);
    void signOut().catch(() => undefined);
    navigateToLogoutRoute();
  };

  const handleToggleProfileMenu = (anchor: "sidebar" | "mobile" | "topbar") => {
    setIsAlertsOpen(false);
    setProfileMenuAnchor((current) => (current === anchor ? null : anchor));
  };

  const dismissTrialWelcomeNotice = useCallback(() => {
    setShowTrialWelcomeNotice(false);

    if (!trialNoticeDailyStorageKey || !trialNoticeSessionStorageKey) {
      return;
    }

    try {
      window.localStorage.setItem(trialNoticeDailyStorageKey, getTodayStorageValue());
      window.sessionStorage.setItem(trialNoticeSessionStorageKey, "1");
    } catch {
      // Storage can be unavailable in private modes; UI dismissal still works in memory.
    }
  }, [trialNoticeDailyStorageKey, trialNoticeSessionStorageKey]);

  const handleTrialNoticeOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        dismissTrialWelcomeNotice();
      }
    },
    [dismissTrialWelcomeNotice]
  );

  const handleViewPlansFromTrialNotice = useCallback(() => {
    dismissTrialWelcomeNotice();
    router.push("/cuenta-vencida");
  }, [dismissTrialWelcomeNotice, router]);

  const dismissTrialReminder = useCallback(() => {
    setIsTrialReminderDismissed(true);

    if (!trialReminderDailyStorageKey) {
      return;
    }

    try {
      window.localStorage.setItem(trialReminderDailyStorageKey, getTodayStorageValue());
      toast("Te recordaremos despu\u00e9s", {
        description: "El aviso vuelve a aparecer ma\u00f1ana si tu prueba sigue activa.",
      });
    } catch {
      // Storage can be unavailable in private modes; UI dismissal still works in memory.
    }
  }, [trialReminderDailyStorageKey]);

  const resolveGuardedHref = useCallback(
    (href: string) => {
      if (
        subscription.isWriteBlocked &&
        isWriteRestrictedPrivatePath(href)
      ) {
        return "/cuenta-vencida";
      }

      return href;
    },
    [subscription.isWriteBlocked]
  );

  const renderAccountMenu = (variant: "sidebar" | "mobile" | "topbar") => (
    <div
      className={`${s.accountMenu} ${
        variant === "sidebar"
          ? s.accountMenuSidebar
          : variant === "mobile"
            ? s.accountMenuMobile
            : s.accountMenuTopbar
      }`}
      data-profile-menu="true"
    >
      <div className={s.accountMenuHeader}>
        <span className={s.accountMenuEyebrow}>Cuenta</span>
        <strong>{companyName}</strong>
        <span>{email}</span>
      </div>
      <div className={s.accountMenuList}>
        <Link
          href={resolveGuardedHref("/configuracion/empresa")}
          className={s.accountMenuLink}
          prefetch={false}
          onClick={() => setProfileMenuAnchor(null)}
        >
          <LuSettings aria-hidden />
          Configuracion de empresa
        </Link>
        {!isQuoteOnlyPlan ? (
          <Link
            href={resolveGuardedHref("/configuracion/pagina-venta")}
            className={s.accountMenuLink}
            prefetch={false}
            onClick={() => setProfileMenuAnchor(null)}
          >
            <LuGlobe aria-hidden />
            Pagina de venta
          </Link>
        ) : null}
        <Link
          href={resolveGuardedHref("/cuenta/suscripcion")}
          className={s.accountMenuLink}
          prefetch={false}
          onClick={() => setProfileMenuAnchor(null)}
        >
          <LuCreditCard aria-hidden />
          Plan y suscripcion
        </Link>
        <button
          className={s.accountMenuAction}
          type="button"
          onClick={handleLogout}
          disabled={isSigningOut}
          aria-busy={isSigningOut}
        >
          <LuLogOut aria-hidden />
          {isSigningOut ? "Cerrando sesion..." : "Cerrar sesion"}
        </button>
      </div>
    </div>
  );

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

  const syncAlertsSeenAtFromStorage = useCallback(() => {
    if (typeof window === "undefined" || !alertsSeenStorageKey) {
      return;
    }

    const rawSeenAt = window.localStorage.getItem(alertsSeenStorageKey);
    const parsedSeenAt = rawSeenAt ? Number(rawSeenAt) : 0;
    const nextSeenAt = Number.isFinite(parsedSeenAt) ? parsedSeenAt : 0;

    if (nextSeenAt > alertsSeenAt) {
      setAlertsSeenAt(nextSeenAt);
    }
  }, [alertsSeenAt, alertsSeenStorageKey]);

  const markSolicitudesAsSeen = useCallback(() => {
    const latestSolicitudSeenAt = getLatestSolicitudesSeenAt(
      solicitudesShell,
      solicitudesSeenAt
    );

    if (latestSolicitudSeenAt === solicitudesSeenAt) {
      return;
    }

    setSolicitudesSeenAt(latestSolicitudSeenAt);
    persistSolicitudesSeenAt(solicitudesSeenStorageKey, latestSolicitudSeenAt);
  }, [solicitudesSeenAt, solicitudesSeenStorageKey, solicitudesShell]);

  const syncSolicitudesSeenAtFromStorage = useCallback(() => {
    const persistedSeenAt = readSolicitudesSeenAt(solicitudesSeenStorageKey);

    if (persistedSeenAt > solicitudesSeenAt) {
      setSolicitudesSeenAt(persistedSeenAt);
    }
  }, [solicitudesSeenAt, solicitudesSeenStorageKey]);

  useEffect(() => {
    if (!cargando && !user) {
      if (isSigningOut) {
        return;
      }

      const nextPath = pathname?.startsWith("/") ? pathname : "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [cargando, isSigningOut, pathname, router, user]);

  useEffect(() => {
    if (!shouldRedirectForSubscription) {
      return;
    }

    router.replace("/cuenta-vencida");
  }, [router, shouldRedirectForSubscription]);

  useEffect(() => {
    if (!shouldRedirectQuoteOnlyRoute) {
      return;
    }

    router.replace("/dashboard");
  }, [router, shouldRedirectQuoteOnlyRoute]);

  useEffect(() => {
    return scheduleDeferredShellWork(() => {
      if (
        !trialNoticeDailyStorageKey ||
        !trialNoticeSessionStorageKey ||
        !trialReminderDailyStorageKey ||
        !trialStorageScopeKey
      ) {
        setShowTrialWelcomeNotice(false);
        setIsTrialReminderDismissed(false);
        setTrialStorageScope(null);
        return;
      }

      try {
        const today = getTodayStorageValue();
        const dismissedToday =
          window.localStorage.getItem(trialNoticeDailyStorageKey) === today;
        const dismissedThisSession =
          window.sessionStorage.getItem(trialNoticeSessionStorageKey) === "1";
        const reminderDismissed =
          window.localStorage.getItem(trialReminderDailyStorageKey) === today;

        setShowTrialWelcomeNotice(
          shouldShowSoftTrialNotice && !dismissedToday && !dismissedThisSession
        );
        setIsTrialReminderDismissed(reminderDismissed);
        setTrialStorageScope(trialStorageScopeKey);
      } catch {
        setIsTrialReminderDismissed(false);
        setShowTrialWelcomeNotice(false);
        setTrialStorageScope(trialStorageScopeKey);
      }
    }, 0);
  }, [
    shouldShowSoftTrialNotice,
    trialNoticeDailyStorageKey,
    trialNoticeSessionStorageKey,
    trialReminderDailyStorageKey,
    trialStorageScopeKey,
  ]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated || !cargando || user) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }

      setAuthBootStuck(true);
    }, 10000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cargando, hasHydrated, user]);

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

    const timeoutId = window.setTimeout(() => {
      if (!alertsSeenStorageKey) {
        setAlertsSeenAt(0);
        return;
      }

      const rawSeenAt = window.localStorage.getItem(alertsSeenStorageKey);
      const parsedSeenAt = rawSeenAt ? Number(rawSeenAt) : 0;
      setAlertsSeenAt(Number.isFinite(parsedSeenAt) ? parsedSeenAt : 0);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [alertsSeenStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!alertsClearedStorageKey) {
        setAlertsClearedAt(0);
        return;
      }

      const rawClearedAt = window.localStorage.getItem(alertsClearedStorageKey);
      const parsedClearedAt = rawClearedAt ? Number(rawClearedAt) : 0;
      setAlertsClearedAt(Number.isFinite(parsedClearedAt) ? parsedClearedAt : 0);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [alertsClearedStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!solicitudesSeenStorageKey) {
        setSolicitudesSeenAt(0);
        return;
      }

      setSolicitudesSeenAt(readSolicitudesSeenAt(solicitudesSeenStorageKey));
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [solicitudesSeenStorageKey]);

  useEffect(() => {
    const cleanup = scheduleDeferredShellWork(() => {
      syncAlertsSeenAtFromStorage();
    }, 0);

    return cleanup;
  }, [alerts.length, syncAlertsSeenAtFromStorage]);

  useEffect(() => {
    if (!pathname.startsWith("/solicitudes")) {
      return;
    }

    return scheduleDeferredShellWork(() => {
      setShouldLoadShellFeeds(true);
      syncSolicitudesSeenAtFromStorage();
      markSolicitudesAsSeen();
    }, 0);
  }, [
    markSolicitudesAsSeen,
    pathname,
    solicitudesShell.length,
    syncSolicitudesSeenAtFromStorage,
  ]);

  useEffect(() => {
    if (!isAlertsOpen || alerts.length === 0) {
      return;
    }

    return scheduleDeferredShellWork(() => {
      markAlertsAsSeen();
    }, 0);
  }, [alerts, isAlertsOpen, markAlertsAsSeen]);

  useEffect(() => {
    if (cargando || !organizacionId || shouldLoadShellFeeds) {
      return;
    }

    return scheduleDeferredShellWork(() => {
      setShouldLoadShellFeeds(true);
    });
  }, [cargando, organizacionId, shouldLoadShellFeeds]);

  useEffect(() => {
    if (cargando || !organizacionId || !shouldLoadShellFeeds || shouldSkipRoutePrefetch()) {
      return;
    }

    const routesToPrefetch = [
      "/dashboard",
      "/cotizaciones",
      "/clientes",
      "/solicitudes",
        "/configuracion/empresa",
        "/configuracion/pagina-venta",
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
      }, { timeout: 2400 });

      return () => {
        window.cancelIdleCallback(idleCallbackId);
        timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      };
    }

    schedulePrefetch();

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [cargando, organizacionId, pathname, router, shouldLoadShellFeeds]);

  useEffect(() => {
    if (!isAlertsOpen && !isProfileMenuOpen) {
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

      if (target.closest("[data-profile-trigger='true']")) {
        return;
      }

      if (target.closest("[data-profile-menu='true']")) {
        return;
      }

      setIsAlertsOpen(false);
      setProfileMenuAnchor(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAlertsOpen(false);
        setProfileMenuAnchor(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAlertsOpen, isProfileMenuOpen]);

  useEffect(() => {
    return scheduleDeferredShellWork(() => {
      setIsAlertsOpen(false);
      setProfileMenuAnchor(null);
    }, 0);
  }, [pathname]);

  const handleToggleAlerts = () => {
    const nextIsOpen = !isAlertsOpen;
    setShouldLoadShellFeeds(true);
    setProfileMenuAnchor(null);
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

  const trialNoticeActions = (
    <>
      <Button
        className={s.trialNoticePrimaryButton}
        type="button"
        onClick={handleViewPlansFromTrialNotice}
      >
        Ver planes
      </Button>
      <Button
        className={s.trialNoticeSecondaryButton}
        type="button"
        variant="outline"
        onClick={dismissTrialWelcomeNotice}
      >
        {"Despu\u00e9s"}
      </Button>
    </>
  );

  if (isWorkspaceBooting || (!cargando && !user && !isSigningOut)) {
    return (
      <div className={s.bootRoot}>
        <div className={s.bootCard}>
          <Image
            alt="Ventora"
            className={s.bootBrandLogo}
            src="/brand/ventora-logo-boot.svg"
            width={320}
            height={76}
            unoptimized
            priority
          />
          <p className={s.bootLoadingText}>
            Preparando tu espacio de trabajo
          </p>
          <div className={s.bootProgress} aria-hidden>
            <span className={s.bootProgressBar} />
          </div>
        </div>
      </div>
    );
  }

  if (authBootStuck && !user && !isSigningOut) {
    return (
      <div className={s.bootRoot}>
        <div className={s.bootCard}>
          <div className={s.bootBadge}>Error de conexion</div>
          <h1 className={s.bootTitle}>No pudimos conectar con tu espacio</h1>
          <p className={s.bootText}>
            Tu conexion parece inestable o el servidor esta tardando en responder.
            Intenta refrescar la pagina en unos segundos.
          </p>
          <button
            className={s.primaryButton}
            type="button"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isSigningOut) {
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
    <div className={`${s.root}${usesMinimalShell ? ` ${s.rootMinimal}` : ""}`}>
      {!usesMinimalShell ? (
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
            href={resolveGuardedHref("/cotizaciones/nueva")}
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

            if (isQuoteOnlyPlan && (item.href === "/solicitudes" || item.href === "/configuracion/pagina-venta")) {
              return null;
            }

            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={resolveGuardedHref(item.href)}
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
                {item.href === "/solicitudes" && nuevasSolicitudesCount > 0 ? (
                  <span className={s.navCountPill}>
                    {nuevasSolicitudesCount > 9 ? "9+" : nuevasSolicitudesCount}
                  </span>
                ) : null}
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

        <div className={s.profileMenuWrap}>
          <button
            className={`${s.sidebarUser} ${profileMenuAnchor === "sidebar" ? s.profileTriggerActive : ""}`}
            type="button"
            data-profile-trigger="true"
            aria-expanded={profileMenuAnchor === "sidebar"}
            onClick={() => handleToggleProfileMenu("sidebar")}
          >
            <div className={s.userAvatar}>{initial}</div>
            <div className={s.userInfo}>
              <div className={s.userName}>{email}</div>
              <div className={s.userRole}>{rol ?? "usuario"}</div>
            </div>
            <LuChevronRight className={s.profileTriggerArrow} aria-hidden />
          </button>

          {profileMenuAnchor === "sidebar" ? (
            renderAccountMenu("sidebar")
          ) : null}
        </div>
      </aside>
      ) : null}

      {!usesMinimalShell && !isNuevaCotizacionRoute ? (
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
            <div className={s.profileMenuWrap}>
              <button
                className={`${s.mobileAvatarButton} ${profileMenuAnchor === "mobile" ? s.profileTriggerActive : ""}`}
                type="button"
                data-profile-trigger="true"
                aria-label="Abrir menu de cuenta"
                aria-expanded={profileMenuAnchor === "mobile"}
                onClick={() => handleToggleProfileMenu("mobile")}
              >
                <div className={s.mobileAvatar}>{initial}</div>
              </button>

              {profileMenuAnchor === "mobile" ? (
                renderAccountMenu("mobile")
              ) : null}
            </div>
          </div>
        </header>
      ) : null}

      <main
        className={`${s.main}${usesMinimalShell ? ` ${s.mainMinimal}` : ""}${
          isNuevaCotizacionRoute ? ` ${s.mainCreateFlow}` : ""
        }`}
      >
        {!usesMinimalShell && !isNuevaCotizacionRoute ? (
          <div className={s.topbar}>
            <div>
              <p className={s.topbarEyebrow}>Panel operativo</p>
              <h1 className={s.topbarTitle}>{currentItem.label}</h1>
              <p className={s.topbarText}>{currentItem.description}</p>
              {isOrganizationBootstrapPending ? (
                <p className={s.topbarText}>
                  Terminando de conectar tu empresa y permisos...
                </p>
              ) : null}
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
              <div className={s.profileMenuWrap}>
                <button
                  className={`${s.teamBadge} ${profileMenuAnchor === "topbar" ? s.profileTriggerActive : ""}`}
                  type="button"
                  data-profile-trigger="true"
                  aria-expanded={profileMenuAnchor === "topbar"}
                  onClick={() => handleToggleProfileMenu("topbar")}
                >
                  <div className={s.teamBadgeAvatar}>{initial}</div>
                  <div>
                    <div className={s.teamBadgeName}>Equipo activo</div>
                    <div className={s.teamBadgeMeta}>{rol ?? "usuario"}</div>
                  </div>
                  <LuChevronRight className={s.teamBadgeArrow} aria-hidden />
                </button>

                {profileMenuAnchor === "topbar" ? (
                  renderAccountMenu("topbar")
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={`${s.pageContent}${usesMinimalShell ? ` ${s.pageContentMinimal}` : ""}${
            isNuevaCotizacionRoute ? ` ${s.pageContentCreateFlow}` : ""
          }`}
        >
          {shouldShowDashboardTrialPill ? (
            <section className={s.trialCompactNotice} role="status" aria-live="polite">
              <span>
                Prueba activa &middot; quedan {trialDaysRemaining} {"d\u00edas"}
              </span>
              <Link href="/cuenta-vencida" prefetch={false}>
                Ver planes
              </Link>
            </section>
          ) : null}

          {shouldShowDashboardTrialBanner ? (
            <section className={s.trialUrgentBanner} role="status" aria-live="polite">
              <div>
                <span className={s.trialUrgentEyebrow}>
                  {subscription.isLastTrialDay ? "Ultimo dia de prueba" : "Tu prueba termina pronto"}
                </span>
                <strong>
                  {subscription.isLastTrialDay
                    ? "Tu prueba termina hoy."
                    : `Te quedan ${trialDaysRemaining} d\u00edas de prueba en Ventora.`}
                </strong>
              </div>
              <div className={s.trialUrgentActions}>
                <Link
                  className={s.subscriptionPrimaryAction}
                  href="/cuenta-vencida"
                  prefetch={false}
                >
                  Ver planes
                </Link>
                <button
                  className={s.subscriptionSecondaryAction}
                  type="button"
                  onClick={dismissTrialReminder}
                >
                  {"Despu\u00e9s"}
                </button>
              </div>
            </section>
          ) : null}
          {children}
        </div>
      </main>

      {!usesMinimalShell ? (
        <>
          <Toaster position="top-center" richColors />
          <UpdateChecker />
          <Dialog
            open={showTrialWelcomeNotice && isDesktopViewport}
            onOpenChange={handleTrialNoticeOpenChange}
          >
            <DialogContent
              className={s.trialDialogContent}
              showCloseButton
            >
              <motion.div
                animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                className={s.trialNoticeMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
                transition={reduceMotion ? undefined : { duration: 0.22, ease: "easeOut" }}
              >
                <DialogHeader className={s.trialNoticeHeader}>
                  <motion.span
                    animate={reduceMotion ? undefined : { rotate: 0, scale: 1 }}
                    className={s.trialNoticeIcon}
                    initial={reduceMotion ? false : { rotate: -8, scale: 0.92 }}
                    transition={reduceMotion ? undefined : { duration: 0.24, ease: "easeOut" }}
                  >
                    <LuSparkles aria-hidden />
                  </motion.span>
                  <span className={s.trialNoticeEyebrow}>Prueba activa</span>
                  <DialogTitle className={s.trialNoticeTitle}>
                    Tu prueba termina pronto
                  </DialogTitle>
                  <DialogDescription className={s.trialNoticeText}>
                    Te quedan {trialDaysRemaining} {"d\u00edas"} para seguir usando
                    Ventora sin interrupciones.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className={s.trialNoticeActions}>
                  {trialNoticeActions}
                </DialogFooter>
              </motion.div>
            </DialogContent>
          </Dialog>

          <Drawer
            open={showTrialWelcomeNotice && !isDesktopViewport}
            onOpenChange={handleTrialNoticeOpenChange}
          >
            <DrawerContent className={s.trialDrawerContent}>
              <motion.div
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                className={s.trialDrawerInner}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                transition={reduceMotion ? undefined : { duration: 0.22, ease: "easeOut" }}
              >
                <DrawerHeader className={s.trialNoticeHeader}>
                  <motion.span
                    animate={reduceMotion ? undefined : { rotate: 0, scale: 1 }}
                    className={s.trialNoticeIcon}
                    initial={reduceMotion ? false : { rotate: -8, scale: 0.92 }}
                    transition={reduceMotion ? undefined : { duration: 0.24, ease: "easeOut" }}
                  >
                    <LuSparkles aria-hidden />
                  </motion.span>
                  <span className={s.trialNoticeEyebrow}>Prueba activa</span>
                  <DrawerTitle className={s.trialNoticeTitle}>
                    Tu prueba termina pronto
                  </DrawerTitle>
                  <DrawerDescription className={s.trialNoticeText}>
                    Te quedan {trialDaysRemaining} {"d\u00edas"} para seguir usando
                    Ventora sin interrupciones.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter className={s.trialNoticeActions}>
                  {trialNoticeActions}
                </DrawerFooter>
              </motion.div>
            </DrawerContent>
          </Drawer>
        </>
      ) : null}

      {!usesMinimalShell && isAlertsOpen ? (
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

      {!usesMinimalShell ? (
      <nav className={`${s.tabBar}${isNuevaCotizacionRoute ? ` ${s.tabBarHidden}` : ""}`}>
        <div
          className={`${s.tabBarInner}${
            canReviewSolicitudes ? ` ${s.tabBarInnerWithSolicitudes}` : ""
          }`}
        >
          <Link
            href="/dashboard"
            prefetch={false}
            className={`${s.tabItem}${isActivePath(pathname, "/dashboard") ? ` ${s.tabItemActive}` : ""}`}
          >
            <LuLayoutDashboard className={s.tabIcon} aria-hidden />
            Inicio
          </Link>
          <Link
            href="/cotizaciones"
            prefetch={false}
            className={`${s.tabItem}${isActivePath(pathname, "/cotizaciones") && !isNuevaCotizacionRoute ? ` ${s.tabItemActive}` : ""}`}
          >
            <LuFileText className={s.tabIcon} aria-hidden />
            Cotizaciones
          </Link>
          <Link
            href={resolveGuardedHref("/cotizaciones/nueva")}
            prefetch={false}
            className={`${s.tabItem} ${s.tabItemCreate}${isNuevaCotizacionRoute ? ` ${s.tabItemCreateActive}` : ""}`}
            aria-label="Crear nueva cotizacion"
          >
            <span className={s.tabCreateCircle}>
              <LuFilePlus2 aria-hidden />
            </span>
            <span>Nueva cotizacion</span>
          </Link>
          {canReviewSolicitudes && !isQuoteOnlyPlan ? (
            <Link
              href="/solicitudes"
              prefetch={false}
              className={`${s.tabItem}${isActivePath(pathname, "/solicitudes") ? ` ${s.tabItemActive}` : ""}`}
            >
              <LuInbox className={s.tabIcon} aria-hidden />
              Solicitudes
              {nuevasSolicitudesCount > 0 ? (
                <span className={s.tabItemCount}>
                  {nuevasSolicitudesCount > 9 ? "9+" : nuevasSolicitudesCount}
                </span>
              ) : null}
            </Link>
          ) : null}
          <Link
            href="/clientes"
            prefetch={false}
            className={`${s.tabItem}${isActivePath(pathname, "/clientes") ? ` ${s.tabItemActive}` : ""}`}
          >
            <LuUsers className={s.tabIcon} aria-hidden />
            Clientes
          </Link>
        </div>
      </nav>
      ) : null}
    </div>
  );
}
