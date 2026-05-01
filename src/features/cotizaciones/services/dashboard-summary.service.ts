import { clientesRepository } from "@/features/clientes/repositories/clientes-repository";
import { cotizacionesRepository } from "@/features/cotizaciones/repositories/cotizaciones-repository";
import { projectsRepository } from "@/features/projects/repositories/projects.repository";
import { buildCotizacionAlerts, type CotizacionAlert } from "@/features/cotizaciones/services/cotizacion-alerts.service";
import { buildLegacyCotizacionCode } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import type { Cotizacion } from "@/features/cotizaciones/types/cotizacion";
import type {
  CotizacionWorkflowRecord,
  EstadoCotizacionWorkflow,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import type { EntityId } from "@/types/common";
import { impuestos } from "@/constants/impuestos";

export type DashboardSummary = {
  recentRecords: CotizacionWorkflowRecord[];
  alerts: CotizacionAlert[];
  pendingCount: number;
  monthCount: number;
  approvedTodayCount: number;
  approvedMonthTotal: number;
};

function formatValidez(value: string | null | undefined) {
  if (!value) return "15 dias";
  return value;
}

function toDateOrNow(value: string | null | undefined) {
  return value ? new Date(value) : new Date();
}

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function mapCotizacionToDashboardRecord(input: {
  cotizacion: Cotizacion;
  clientId: EntityId | null;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  projectTitle: string;
}): CotizacionWorkflowRecord {
  const total = Number(input.cotizacion.total ?? 0);
  const neto = Number(input.cotizacion.subtotalNeto ?? total);
  const subtotal = round(total, 2);
  const descuentoValor = round(subtotal - neto, 2);

  return {
    id: String(input.cotizacion.id),
    codigo:
      input.cotizacion.numero ??
      buildLegacyCotizacionCode(toDateOrNow(input.cotizacion.creadoEn), input.cotizacion.id),
    clientId: input.clientId,
    projectId: input.cotizacion.proyectoId,
    clienteNombre: input.clientName,
    clienteTelefono: input.clientPhone,
    obra: input.projectTitle,
    direccion: input.clientAddress,
    validez: formatValidez(input.cotizacion.validoHasta),
    descuentoPct: input.cotizacion.descuentoPct ?? 0,
    observaciones: input.cotizacion.notas ?? "",
    estado: input.cotizacion.estado as EstadoCotizacionWorkflow,
    approvalToken: input.cotizacion.approvalToken,
    approvalTokenExpiresAt: input.cotizacion.approvalTokenExpiresAt,
    clienteVioEn: input.cotizacion.clienteVioEn,
    clienteRespondioEn: input.cotizacion.clienteRespondioEn,
    clienteRespuestaCanal: input.cotizacion.clienteRespuestaCanal,
    createdAt: input.cotizacion.creadoEn ?? new Date().toISOString(),
    updatedAt: input.cotizacion.actualizadoEn ?? input.cotizacion.creadoEn ?? new Date().toISOString(),
    items: [],
    subtotal,
    descuentoValor,
    neto,
    iva: input.cotizacion.iva ?? round(neto * impuestos.iva, 2),
    flete: input.cotizacion.flete ?? 0,
    total,
  };
}

async function enrichCotizaciones(records: Cotizacion[], organizationId: EntityId) {
  const projectIds = Array.from(
    new Set(records.map((record) => record.proyectoId).filter((value): value is EntityId => value !== null))
  );
  const projects = await projectsRepository.listByIds(projectIds, organizationId);
  const projectsById = new Map(projects.map((project) => [String(project.id), project]));
  const clientIds = Array.from(
    new Set(
      projects
        .map((project) => project.clienteId)
        .filter((value): value is EntityId => value !== null)
    )
  );
  const clients = await clientesRepository.listByIds(clientIds, organizationId);
  const clientsById = new Map(clients.map((client) => [String(client.id), client]));

  return records.map((record) => {
    const project = record.proyectoId ? projectsById.get(String(record.proyectoId)) : null;
    const client = project?.clienteId != null ? clientsById.get(String(project.clienteId)) : null;

    return mapCotizacionToDashboardRecord({
      cotizacion: record,
      clientId: project?.clienteId ?? null,
      clientName: client?.nombre ?? "Cliente sin nombre",
      clientPhone: client?.telefono ?? "",
      clientAddress: client?.direccion ?? "",
      projectTitle: project?.titulo ?? "Proyecto sin nombre",
    });
  });
}

export async function getDashboardSummaryByOrganizationId(
  organizationId: EntityId
): Promise<DashboardSummary> {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [
    recentRecords,
    alertCandidates,
    pendingCount,
    monthCount,
    approvedTodayCount,
    approvedMonthTotal,
  ] = await Promise.all([
    cotizacionesRepository.listRecentByOrganizationId(organizationId, 50),
    cotizacionesRepository.listDashboardAlertCandidatesByOrganizationId(organizationId, 21),
    cotizacionesRepository.countByOrganizationId(organizationId, {
      estados: ["creada", "borrador", "enviada"],
    }),
    cotizacionesRepository.countByOrganizationId(organizationId, {
      updatedFrom: monthStart,
      updatedTo: monthEnd,
    }),
    cotizacionesRepository.countByOrganizationId(organizationId, {
      estados: ["aprobada"],
      updatedFrom: todayStart,
      updatedTo: tomorrowStart,
    }),
    cotizacionesRepository.sumTotalByOrganizationId(organizationId, {
      estados: ["aprobada"],
      updatedFrom: monthStart,
      updatedTo: monthEnd,
    }),
  ]);

  const combinedRecords = Array.from(
    new Map(
      [...recentRecords, ...alertCandidates].map((record) => [String(record.id), record])
    ).values()
  );
  const enrichedRecords = await enrichCotizaciones(combinedRecords, organizationId);
  const enrichedById = new Map(enrichedRecords.map((record) => [record.id, record]));

  return {
    recentRecords: recentRecords
      .map((record) => enrichedById.get(String(record.id)))
      .filter((record): record is CotizacionWorkflowRecord => Boolean(record)),
    alerts: buildCotizacionAlerts(
      alertCandidates
        .map((record) => enrichedById.get(String(record.id)))
        .filter((record): record is CotizacionWorkflowRecord => Boolean(record)),
      { limit: 3 }
    ),
    pendingCount,
    monthCount,
    approvedTodayCount,
    approvedMonthTotal,
  };
}
