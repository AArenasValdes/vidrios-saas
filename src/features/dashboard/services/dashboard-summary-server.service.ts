import "server-only";

import { impuestos } from "@/constants/impuestos";
import { createClientesRepository } from "@/features/clientes/repositories/clientes-repository";
import { createCotizacionesRepository } from "@/features/cotizaciones/repositories/cotizaciones-repository";
import { buildCotizacionAlerts } from "@/features/cotizaciones/services/cotizacion-alerts.service";
import { buildLegacyCotizacionCode } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import type { Cotizacion } from "@/features/cotizaciones/types/cotizacion";
import type {
  CotizacionWorkflowRecord,
  EstadoCotizacionWorkflow,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import { buildLastMonthBuckets } from "@/features/dashboard/services/dashboard-monthly-totals.service";
import { isCotizacionPendingSend } from "@/features/dashboard/services/dashboard-pending-send.service";
import type { DashboardSummary } from "@/features/dashboard/types/dashboard-summary";
import { createProjectsRepository } from "@/features/projects/repositories/projects.repository";
import { createClient } from "@/lib/supabase/server";
import type { EntityId } from "@/types/common";

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function toDateOrNow(value: string | null | undefined) {
  return value ? new Date(value) : new Date();
}

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function formatValidez(value: string | null | undefined) {
  return value || "15 dias";
}

function getMonthBounds(now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  return {
    monthStartIso: monthStart.toISOString(),
    monthEndIso: monthEnd.toISOString(),
    todayStartIso: todayStart.toISOString(),
    tomorrowStartIso: tomorrowStart.toISOString(),
  };
}

function mapCotizacionToWorkflowRecord(input: {
  cotizacion: Cotizacion;
  clientId: EntityId | null;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  projectTitle: string;
}): CotizacionWorkflowRecord {
  const total = toNumber(input.cotizacion.total);
  const neto = toNumber(input.cotizacion.subtotalNeto ?? input.cotizacion.total);
  const subtotal = round(total, 2);
  const descuentoValor = round(subtotal - neto, 2);

  return {
    id: String(input.cotizacion.id),
    codigo:
      input.cotizacion.numero ??
      buildLegacyCotizacionCode(
        toDateOrNow(input.cotizacion.creadoEn),
        input.cotizacion.id
      ),
    clientId: input.clientId,
    projectId: input.cotizacion.proyectoId,
    clienteNombre: input.clientName,
    clienteTelefono: input.clientPhone,
    obra: input.projectTitle,
    direccion: input.clientAddress,
    validez: formatValidez(input.cotizacion.validoHasta),
    descuentoPct: toNumber(input.cotizacion.descuentoPct),
    observaciones: input.cotizacion.notas ?? "",
    estado: input.cotizacion.estado as EstadoCotizacionWorkflow,
    approvalToken: input.cotizacion.approvalToken ?? null,
    approvalTokenExpiresAt: input.cotizacion.approvalTokenExpiresAt ?? null,
    clienteVioEn: input.cotizacion.clienteVioEn ?? null,
    clienteRespondioEn: input.cotizacion.clienteRespondioEn ?? null,
    clienteRespuestaCanal: input.cotizacion.clienteRespuestaCanal ?? null,
    pdfDescargadoEn: input.cotizacion.pdfDescargadoEn ?? null,
    createdAt: input.cotizacion.creadoEn ?? new Date().toISOString(),
    updatedAt:
      input.cotizacion.actualizadoEn ??
      input.cotizacion.creadoEn ??
      new Date().toISOString(),
    items: [],
    subtotal,
    descuentoValor,
    neto,
    iva: toNumber(input.cotizacion.iva) || round(neto * impuestos.iva, 2),
    flete: toNumber(input.cotizacion.flete),
    total,
  };
}

function sortByUpdatedDesc(records: Cotizacion[]) {
  return [...records].sort((left, right) => {
    return (
      new Date(right.actualizadoEn ?? right.creadoEn ?? 0).getTime() -
      new Date(left.actualizadoEn ?? left.creadoEn ?? 0).getTime()
    );
  });
}

function isUpdatedWithinRange(
  value: string | null,
  fromIso: string,
  toIso: string
) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();

  return !Number.isNaN(timestamp) && timestamp >= from && timestamp < to;
}

export async function getDashboardSummaryByOrganizationId(
  organizationId: EntityId
): Promise<DashboardSummary> {
  const supabase = await createClient();
  const cotizacionesRepository = createCotizacionesRepository({
    clientFactory: supabase as never,
  });
  const projectsRepository = createProjectsRepository({
    clientFactory: supabase as never,
  });
  const clientesRepository = createClientesRepository({
    clientFactory: supabase as never,
  });
  const { monthStartIso, monthEndIso, todayStartIso, tomorrowStartIso } =
    getMonthBounds();
  const monthBuckets = buildLastMonthBuckets(6);

  const [dashboardMetrics, recentRecordsBase, alertRecordsBase] = await Promise.all([
    cotizacionesRepository.listDashboardMetricsByOrganizationId(organizationId),
    cotizacionesRepository.listRecentByOrganizationId(organizationId, 48),
    cotizacionesRepository.listDashboardAlertCandidatesByOrganizationId(
      organizationId,
      21
    ),
  ]);

  const totalCount = dashboardMetrics.length;
  const quotedTotal = dashboardMetrics.reduce((total, metric) => total + metric.total, 0);
  const approvedMetrics = dashboardMetrics.filter((metric) => metric.estado === "aprobada");
  const quotedMonthMetrics = dashboardMetrics.filter((metric) =>
    isUpdatedWithinRange(metric.actualizadoEn, monthStartIso, monthEndIso)
  );
  const quotedMonthTotal = quotedMonthMetrics.reduce(
    (total, metric) => total + metric.total,
    0
  );
  const approvedTotal = approvedMetrics.reduce((total, metric) => total + metric.total, 0);
  const pdfGeneratedCount = dashboardMetrics.filter(
    (metric) => metric.pdfDescargadoEn !== null
  ).length;
  const approvedCount = approvedMetrics.length;
  const monthCount = quotedMonthMetrics.length;
  const approvedTodayCount = approvedMetrics.filter((metric) =>
    isUpdatedWithinRange(metric.actualizadoEn, todayStartIso, tomorrowStartIso)
  ).length;

  const recentRecordsSorted = sortByUpdatedDesc(recentRecordsBase);
  const relevantProjectIds = Array.from(
    new Set(
      [...recentRecordsSorted, ...alertRecordsBase]
        .map((cotizacion) => cotizacion.proyectoId)
        .filter((value): value is EntityId => value !== null)
    )
  );
  const projects = await projectsRepository.listByIds(
    relevantProjectIds,
    organizationId
  );
  const projectsById = new Map(projects.map((project) => [String(project.id), project]));
  const relevantClientIds = Array.from(
    new Set(
      projects
        .map((project) => project.clienteId)
        .filter((value): value is EntityId => value !== null)
    )
  );
  const clients = await clientesRepository.listByIds(
    relevantClientIds,
    organizationId
  );
  const clientsById = new Map(clients.map((client) => [String(client.id), client]));

  const enrichRecord = (cotizacion: Cotizacion) => {
    const project = cotizacion.proyectoId
      ? projectsById.get(String(cotizacion.proyectoId))
      : null;
    const client =
      project?.clienteId != null ? clientsById.get(String(project.clienteId)) : null;
    const hasProject = Boolean(cotizacion.proyectoId);

    return mapCotizacionToWorkflowRecord({
      cotizacion,
      clientId: project?.clienteId ?? null,
      clientName: client?.nombre ?? (hasProject ? "Cliente sin nombre" : "Cliente"),
      clientPhone: client?.telefono ?? "",
      clientAddress: client?.direccion ?? "",
      projectTitle: project?.titulo ?? (hasProject ? "Proyecto sin nombre" : "Cotización"),
    });
  };

  const enrichedRecent = recentRecordsSorted.map(enrichRecord);
  const recentRecords = enrichedRecent.slice(0, 12);
  const pendingSendRecords = enrichedRecent
    .filter((record) => isCotizacionPendingSend(record.estado))
    .slice(0, 12);
  const alertRecords = alertRecordsBase.map(enrichRecord);
  const monthlyQuotedTotals = monthBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    total: dashboardMetrics
      .filter((metric) =>
        isUpdatedWithinRange(metric.actualizadoEn, bucket.startIso, bucket.endIso)
      )
      .reduce((total, metric) => total + metric.total, 0),
  }));

  return {
    recentRecords,
    pendingSendRecords,
    alerts: buildCotizacionAlerts(alertRecords, { limit: 3 }),
    totalCount,
    quotedTotal,
    quotedMonthTotal,
    approvedTotal,
    pdfGeneratedCount,
    approvedCount,
    monthCount,
    monthlyQuotedTotals,
    approvedTodayCount,
  };
}
