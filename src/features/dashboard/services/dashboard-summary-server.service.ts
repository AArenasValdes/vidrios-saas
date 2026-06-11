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

  const [
    totalCount,
    quotedTotal,
    pdfGeneratedCount,
    approvedCount,
    monthCount,
    approvedTodayCount,
    recentRecordsBase,
    alertRecordsBase,
  ] = await Promise.all([
    cotizacionesRepository.countByOrganizationId(organizationId),
    cotizacionesRepository.sumTotalByOrganizationId(organizationId),
    cotizacionesRepository.countByOrganizationId(organizationId, {
      pdfDownloadedOnly: true,
    }),
    cotizacionesRepository.countByOrganizationId(organizationId, {
      estados: ["aprobada"],
    }),
    cotizacionesRepository.countByOrganizationId(organizationId, {
      updatedFrom: monthStartIso,
      updatedTo: monthEndIso,
    }),
    cotizacionesRepository.countByOrganizationId(organizationId, {
      estados: ["aprobada"],
      updatedFrom: todayStartIso,
      updatedTo: tomorrowStartIso,
    }),
    cotizacionesRepository.listRecentByOrganizationId(organizationId, 24),
    cotizacionesRepository.listDashboardAlertCandidatesByOrganizationId(
      organizationId,
      21
    ),
  ]);

  const recentRecordsSorted = sortByUpdatedDesc(recentRecordsBase).slice(0, 12);
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

    return mapCotizacionToWorkflowRecord({
      cotizacion,
      clientId: project?.clienteId ?? null,
      clientName: client?.nombre ?? "Cliente sin nombre",
      clientPhone: client?.telefono ?? "",
      clientAddress: client?.direccion ?? "",
      projectTitle: project?.titulo ?? "Proyecto sin nombre",
    });
  };

  const recentRecords = recentRecordsSorted.map(enrichRecord);
  const alertRecords = alertRecordsBase.map(enrichRecord);

  return {
    recentRecords,
    alerts: buildCotizacionAlerts(alertRecords, { limit: 3 }),
    totalCount,
    quotedTotal,
    pdfGeneratedCount,
    approvedCount,
    monthCount,
    approvedTodayCount,
  };
}
