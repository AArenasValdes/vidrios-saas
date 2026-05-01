"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getDashboardSummaryByOrganizationId } from "@/features/cotizaciones/services/dashboard-summary.service";
import type { CotizacionAlert } from "@/features/cotizaciones/services/cotizacion-alerts.service";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

type DashboardSummaryState = {
  recentRecords: CotizacionWorkflowRecord[];
  alerts: CotizacionAlert[];
  pendingCount: number;
  monthCount: number;
  approvedTodayCount: number;
  approvedMonthTotal: number;
  isLoading: boolean;
  isReady: boolean;
};

export function useDashboardSummary(organizationId: string | number | null | undefined) {
  const [state, setState] = useState<DashboardSummaryState>({
    recentRecords: [],
    alerts: [],
    pendingCount: 0,
    monthCount: 0,
    approvedTodayCount: 0,
    approvedMonthTotal: 0,
    isLoading: false,
    isReady: false,
  });
  const isMountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!organizationId) {
      if (isMountedRef.current) {
        setState({
          recentRecords: [],
          alerts: [],
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

    if (isMountedRef.current) {
      setState((current) => ({ ...current, isLoading: true }));
    }

    try {
      const summary = await getDashboardSummaryByOrganizationId(organizationId);

      if (!isMountedRef.current) {
        return;
      }

      setState({
        recentRecords: summary.recentRecords,
        alerts: summary.alerts,
        pendingCount: summary.pendingCount,
        monthCount: summary.monthCount,
        approvedTodayCount: summary.approvedTodayCount,
        approvedMonthTotal: summary.approvedMonthTotal,
        isLoading: false,
        isReady: true,
      });
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setState((current) => ({ ...current, isLoading: false, isReady: true }));
    }
  }, [organizationId]);

  useEffect(() => {
    isMountedRef.current = true;
    queueMicrotask(() => {
      void refresh();
    });

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}
