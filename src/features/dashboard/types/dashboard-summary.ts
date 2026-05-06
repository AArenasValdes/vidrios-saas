import type { CotizacionAlert } from "@/features/cotizaciones/services/cotizacion-alerts.service";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

export type DashboardSummary = {
  recentRecords: CotizacionWorkflowRecord[];
  alerts: CotizacionAlert[];
  totalCount: number;
  pendingCount: number;
  monthCount: number;
  approvedTodayCount: number;
  approvedMonthTotal: number;
};
