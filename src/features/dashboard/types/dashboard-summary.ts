import type { CotizacionAlert } from "@/features/cotizaciones/services/cotizacion-alerts.service";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

export type DashboardSummary = {
  recentRecords: CotizacionWorkflowRecord[];
  alerts: CotizacionAlert[];
  totalCount: number;
  quotedTotal: number;
  pdfGeneratedCount: number;
  approvedCount: number;
  monthCount: number;
  /** @deprecated Usar quotedTotal y pdfGeneratedCount. Se mantiene por cache local. */
  pendingCount?: number;
  approvedTodayCount: number;
  /** @deprecated Usar quotedTotal. Se mantiene por cache local. */
  approvedMonthTotal?: number;
};
