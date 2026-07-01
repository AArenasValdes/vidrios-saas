"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuCalendarDays, LuMenu, LuPlus, LuRefreshCw } from "react-icons/lu";

import { resolveAdminPageMeta } from "@/features/admin/config/admin-page-meta.config";
import tokens from "@/features/admin/styles/admin-design-tokens.module.css";
import s from "./admin-page-header.module.css";

type AdminHeaderAction = {
  label: string;
  onClick?: () => void;
  href?: string;
};

type AdminPageHeaderProps = {
  syncedAt?: string | null;
  periodDays?: number;
  onPeriodChange?: (days: number) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onNewProspect?: () => void;
  customPrimaryAction?: AdminHeaderAction;
  customSecondaryAction?: AdminHeaderAction;
  customTertiaryAction?: AdminHeaderAction;
  hideDefaultPrimaryActions?: boolean;
  onOpenNav?: () => void;
};

function renderHeaderAction(
  action: AdminHeaderAction,
  className: string,
  withPlus = false
) {
  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {withPlus ? <LuPlus aria-hidden /> : null}
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={action.onClick}>
      {withPlus ? <LuPlus aria-hidden /> : null}
      {action.label}
    </button>
  );
}

const PERIOD_OPTIONS = [
  { value: 7, label: "Últimos 7 días" },
  { value: 30, label: "Últimos 30 días" },
  { value: 90, label: "Últimos 90 días" },
];

function formatSyncLabel(syncedAt: string | null | undefined) {
  if (!syncedAt) {
    return "Sincronizando con Supabase…";
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(syncedAt).getTime()) / 60000)
  );

  if (diffMinutes <= 0) {
    return "Sincronizado con Supabase ahora";
  }

  if (diffMinutes === 1) {
    return "Sincronizado con Supabase hace 1 min";
  }

  return `Sincronizado con Supabase hace ${diffMinutes} min`;
}

export function AdminPageHeader({
  syncedAt,
  periodDays = 30,
  onPeriodChange,
  onRefresh,
  isRefreshing = false,
  onNewProspect,
  customPrimaryAction,
  customSecondaryAction,
  customTertiaryAction,
  hideDefaultPrimaryActions = false,
  onOpenNav,
}: AdminPageHeaderProps) {
  const pathname = usePathname();
  const meta = resolveAdminPageMeta(pathname);

  return (
    <header className={`${tokens.tokens} ${s.header}`}>
      <div className={s.leading}>
        <button
          type="button"
          className={s.menuButton}
          aria-label="Abrir navegación"
          onClick={onOpenNav}
        >
          <LuMenu aria-hidden />
        </button>

        <div className={s.titleBlock}>
          <h1 className={s.title}>{meta.title}</h1>
          <p className={s.subtitle}>{meta.subtitle}</p>
          <div className={s.syncRow}>
            <LuRefreshCw aria-hidden className={isRefreshing ? s.spin : ""} />
            <span>{formatSyncLabel(syncedAt)}</span>
            {onRefresh ? (
              <button
                type="button"
                className={s.syncButton}
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                Actualizar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={s.actions}>
        {meta.showDateRange && onPeriodChange ? (
          <label className={s.periodField}>
            <LuCalendarDays aria-hidden />
            <select
              value={periodDays}
              onChange={(event) => onPeriodChange(Number(event.target.value))}
              aria-label="Rango de fechas"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {meta.showPrimaryActions ? (
          <>
            {customTertiaryAction
              ? renderHeaderAction(customTertiaryAction, s.tertiaryAction)
              : null}

            {customSecondaryAction
              ? renderHeaderAction(customSecondaryAction, s.secondaryAction)
              : !hideDefaultPrimaryActions ? (
                  <Link href="/admin/clientes#crear-trial" className={s.secondaryAction}>
                    Crear trial
                  </Link>
                ) : null}

            {customPrimaryAction
              ? renderHeaderAction(customPrimaryAction, s.primaryAction)
              : !hideDefaultPrimaryActions ? (
                  onNewProspect ? (
                    <button type="button" className={s.primaryAction} onClick={onNewProspect}>
                      <LuPlus aria-hidden />
                      Nuevo prospecto
                    </button>
                  ) : (
                    <Link href="/admin/prospectos" className={s.primaryAction}>
                      <LuPlus aria-hidden />
                      Nuevo prospecto
                    </Link>
                  )
                ) : null}
          </>
        ) : null}
      </div>
    </header>
  );
}
