"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getDashboardSummaryByOrganizationId } from "@/features/cotizaciones/services/dashboard-summary.service";
import type { CotizacionAlert } from "@/features/cotizaciones/services/cotizacion-alerts.service";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

type DashboardSummaryState = {
  organizationKey: string | null;
  recentRecords: CotizacionWorkflowRecord[];
  alerts: CotizacionAlert[];
  totalCount: number;
  pendingCount: number;
  monthCount: number;
  approvedTodayCount: number;
  approvedMonthTotal: number;
  isLoading: boolean;
  isReady: boolean;
};

type DashboardSummaryCacheEntry = Omit<
  DashboardSummaryState,
  "organizationKey" | "isLoading" | "isReady"
>;

const dashboardSummaryCache = new Map<string, DashboardSummaryCacheEntry>();
const dashboardSummaryPromiseCache = new Map<string, Promise<DashboardSummaryCacheEntry>>();
const DASHBOARD_SUMMARY_STORAGE_PREFIX = "vidrios-saas:dashboard-summary:";

function getDashboardSummaryStorageKey(organizationKey: string) {
  return `${DASHBOARD_SUMMARY_STORAGE_PREFIX}${organizationKey}`;
}

function readDashboardSummaryFromStorage(organizationKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getDashboardSummaryStorageKey(organizationKey));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as DashboardSummaryCacheEntry;
  } catch {
    return null;
  }
}

function persistDashboardSummary(
  organizationKey: string,
  summary: DashboardSummaryCacheEntry
) {
  dashboardSummaryCache.set(organizationKey, summary);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getDashboardSummaryStorageKey(organizationKey),
      JSON.stringify(summary)
    );
  } catch {
    return;
  }
}

function scheduleIdleRefresh(callback: () => void) {
  if (typeof window === "undefined") {
    callback();
    return () => undefined;
  }

  const browserWindow = globalThis as Window &
    typeof globalThis & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

  if (typeof browserWindow.requestIdleCallback === "function") {
    const handle = browserWindow.requestIdleCallback(callback, { timeout: 1500 });
    return () => browserWindow.cancelIdleCallback?.(handle);
  }

  const timer = globalThis.setTimeout(callback, 900);
  return () => globalThis.clearTimeout(timer);
}

function readInitialDashboardSummaryState(
  organizationId: string | number | null | undefined
): DashboardSummaryState {
  const organizationKeyOrNull =
    organizationId === null || organizationId === undefined ? null : String(organizationId);

  if (organizationId === null || organizationId === undefined) {
    return {
      organizationKey: organizationKeyOrNull,
      recentRecords: [],
      alerts: [],
      totalCount: 0,
      pendingCount: 0,
      monthCount: 0,
      approvedTodayCount: 0,
      approvedMonthTotal: 0,
      isLoading: false,
      isReady: false,
    };
  }

  const organizationKey = String(organizationId);
  const warmCache = dashboardSummaryCache.get(organizationKey);

  if (warmCache) {
    return {
      organizationKey,
      ...warmCache,
      isLoading: false,
      isReady: true,
    };
  }

  const persisted = readDashboardSummaryFromStorage(organizationKey);

  if (persisted) {
    dashboardSummaryCache.set(organizationKey, persisted);

    return {
      organizationKey,
      ...persisted,
      isLoading: false,
      isReady: true,
    };
  }

  return {
    organizationKey,
    recentRecords: [],
    alerts: [],
    totalCount: 0,
    pendingCount: 0,
    monthCount: 0,
    approvedTodayCount: 0,
    approvedMonthTotal: 0,
    isLoading: false,
    isReady: false,
  };
}

export function useDashboardSummary(organizationId: string | number | null | undefined) {
  const [state, setState] = useState<DashboardSummaryState>(() =>
    readInitialDashboardSummaryState(organizationId)
  );
  const isMountedRef = useRef(true);
  const currentOrganizationKey =
    organizationId === null || organizationId === undefined ? null : String(organizationId);

  const refresh = useCallback(async () => {
    if (!organizationId) {
      if (isMountedRef.current) {
        setState({
          organizationKey: null,
          recentRecords: [],
          alerts: [],
          totalCount: 0,
          pendingCount: 0,
          monthCount: 0,
          approvedTodayCount: 0,
          approvedMonthTotal: 0,
          isLoading: false,
          isReady: true,
        });
      }
      return;
    }

    const organizationKey = String(organizationId);

    if (isMountedRef.current) {
      setState((current) => ({ ...current, isLoading: true }));
    }

    try {
      const inFlightPromise = dashboardSummaryPromiseCache.get(organizationKey);
      const summaryPromise =
        inFlightPromise ??
        getDashboardSummaryByOrganizationId(organizationId)
          .then((summary) => ({
            recentRecords: summary.recentRecords,
            alerts: summary.alerts,
            totalCount: summary.totalCount,
            pendingCount: summary.pendingCount,
            monthCount: summary.monthCount,
            approvedTodayCount: summary.approvedTodayCount,
            approvedMonthTotal: summary.approvedMonthTotal,
          }))
          .finally(() => {
            dashboardSummaryPromiseCache.delete(organizationKey);
          });

      if (!inFlightPromise) {
        dashboardSummaryPromiseCache.set(organizationKey, summaryPromise);
      }

      const summary = await summaryPromise;

      if (!isMountedRef.current) {
        return;
      }

      persistDashboardSummary(organizationKey, summary);
      setState({
        organizationKey,
        ...summary,
        isLoading: false,
        isReady: true,
      });
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setState((current) =>
        current.organizationKey === organizationKey
          ? { ...current, isLoading: false, isReady: true }
          : {
              ...readInitialDashboardSummaryState(organizationId),
              organizationKey,
              isLoading: false,
              isReady: true,
            }
      );
    }
  }, [organizationId]);

  useEffect(() => {
    isMountedRef.current = true;

    const organizationKey = organizationId ? String(organizationId) : null;
    const hasWarmState =
      organizationKey !== null &&
      (dashboardSummaryCache.has(organizationKey) ||
        Boolean(readDashboardSummaryFromStorage(organizationKey)));

    const cleanup = hasWarmState
      ? scheduleIdleRefresh(() => {
          void refresh();
        })
      : (() => {
          queueMicrotask(() => {
            void refresh();
          });

          return () => undefined;
        })();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [organizationId, refresh]);

  return {
    ...(state.organizationKey === currentOrganizationKey
      ? state
      : readInitialDashboardSummaryState(organizationId)),
    refresh,
  };
}
