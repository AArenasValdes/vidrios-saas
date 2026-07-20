import type { CotizacionAlert } from "@/features/cotizaciones/services/cotizacion-alerts.service";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { DashboardMonthlyQuotedPoint } from "@/features/dashboard/services/dashboard-monthly-totals.service";

export type DashboardSummary = {
  recentRecords: CotizacionWorkflowRecord[];
  /** Cola Por enviar (creada/PDF sin envío ni cierre). */
  pendingSendRecords: CotizacionWorkflowRecord[];
  alerts: CotizacionAlert[];
  totalCount: number;
  /** Valor cotizado histórico (mobile y compatibilidad). */
  quotedTotal: number;
  /** Valor cotizado del mes calendario actual (hero desktop). */
  quotedMonthTotal: number;
  /** Suma de totales de cotizaciones aprobadas. */
  approvedTotal: number;
  pdfGeneratedCount: number;
  approvedCount: number;
  monthCount: number;
  /** Tendencia real de valor cotizado por mes (últimos 6). */
  monthlyQuotedTotals: DashboardMonthlyQuotedPoint[];
  /** @deprecated Usar quotedTotal y pdfGeneratedCount. Se mantiene por cache local. */
  pendingCount?: number;
  approvedTodayCount: number;
  /** @deprecated Usar quotedTotal. Se mantiene por cache local. */
  approvedMonthTotal?: number;
};

export type { DashboardMonthlyQuotedPoint };
