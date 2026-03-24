import {
  clientesRepository,
  type ClientesRepository,
} from "@/repositories/clientes-repository";
import {
  cotizacionesRepository,
  type CotizacionesRepository,
} from "@/repositories/cotizaciones-repository";
import {
  projectsRepository,
  type ProjectsRepository,
} from "@/repositories/projects.repository";
import {
  buildCotizacionCode,
  buildLegacyCotizacionCode,
  calculateComponentItem,
  calculateCotizacionWorkflowTotals,
} from "@/services/cotizaciones-workflow.service";
import { impuestos } from "@/constants/impuestos";
import { createApprovalToken } from "@/utils/cotizacion-approval";
import type { Cliente } from "@/types/cliente";
import type { EntityId } from "@/types/common";
import type { Cotizacion, CrearCotizacionInput } from "@/types/cotizacion";
import type { CotizacionItem, CrearCotizacionItemInput } from "@/types/cotizacion-item";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
  EstadoCotizacionWorkflow,
} from "@/types/cotizacion-workflow";

type CotizacionesAppServiceDeps = {
  clientesRepository?: ClientesRepository;
  projectsRepository?: ProjectsRepository;
  cotizacionesRepository?: CotizacionesRepository;
};

export type GuardarCotizacionWorkflowInput = {
  organizationId: EntityId;
  draft: CotizacionWorkflowDraft;
  estado: EstadoCotizacionWorkflow;
  existingId?: EntityId | null;
  existingCode?: string | null;
  existingClientId?: EntityId | null;
  existingProjectId?: EntityId | null;
};

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

function toDateOrNow(value: string | null | undefined) {
  return value ? new Date(value) : new Date();
}

function normalizeString(value: string) {
  return value.trim();
}

function formatValidez(value: string | null) {
  if (!value) {
    return "15 dias";
  }

  const validUntil = new Date(value);
  if (Number.isNaN(validUntil.getTime())) {
    return value;
  }

  const now = new Date();
  const diffMs = validUntil.getTime() - now.getTime();
  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  if (days <= 7) {
    return "7 dias";
  }

  if (days <= 15) {
    return "15 dias";
  }

  return "30 dias";
}

function resolveValidoHasta(value: string) {
  const normalized = normalizeString(value).toLowerCase();

  if (!normalized) {
    return null;
  }

  const rawDays = Number.parseInt(normalized, 10);
  const days =
    normalized.includes("7") ? 7 : normalized.includes("30") ? 30 : rawDays || 15;
  const target = new Date();

  target.setDate(target.getDate() + days);

  return target.toISOString().slice(0, 10);
}

function mapDatabaseItemToWorkflowItem(
  item: CotizacionItem,
  index: number
): CotizacionWorkflowItem {
  const codigo = item.codigo?.trim() || item.linea?.trim() || `I${index + 1}`;
  const tipo =
    item.tipoComponente?.trim() || item.color?.trim() || item.tipoItem || "Componente";
  const nombre = item.nombre?.trim() || `Componente ${index + 1}`;
  const descripcion = item.descripcion?.trim() || nombre;
  const costoProveedorUnitario = item.costoUnitario ?? 0;
  const margenPct = item.margenPct ?? 0;

  return calculateComponentItem({
    id: String(item.id),
    codigo,
    tipo,
    vidrio: item.vidrio ?? "",
    nombre,
    descripcion,
    ancho: item.ancho,
    alto: item.alto,
    cantidad: item.cantidad,
    unidad: item.unidad ?? "unidad",
    costoProveedorUnitario,
    margenPct,
    observaciones: item.observaciones ?? "",
  });
}

function mapCotizacionToWorkflowRecord(input: {
  cotizacion: Cotizacion;
  clientId: EntityId | null;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  projectTitle: string;
}): CotizacionWorkflowRecord {
  const items = input.cotizacion.items.map(mapDatabaseItemToWorkflowItem);
  const subtotal = round(
    items.reduce((accumulator, item) => accumulator + item.precioTotal, 0),
    2
  );
  const neto = input.cotizacion.subtotalNeto ?? subtotal;
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
    descuentoPct: input.cotizacion.descuentoPct ?? 0,
    observaciones: input.cotizacion.notas ?? "",
    estado: input.cotizacion.estado as EstadoCotizacionWorkflow,
    approvalToken: input.cotizacion.approvalToken,
    approvalTokenExpiresAt: input.cotizacion.approvalTokenExpiresAt,
    clienteVioEn: input.cotizacion.clienteVioEn,
    clienteRespondioEn: input.cotizacion.clienteRespondioEn,
    clienteRespuestaCanal: input.cotizacion.clienteRespuestaCanal,
    createdAt: input.cotizacion.creadoEn ?? new Date().toISOString(),
    updatedAt:
      input.cotizacion.actualizadoEn ??
      input.cotizacion.creadoEn ??
      new Date().toISOString(),
    items,
    subtotal,
    descuentoValor,
    neto,
    iva: input.cotizacion.iva ?? round(neto * impuestos.iva, 2),
    flete: input.cotizacion.flete ?? 0,
    total: input.cotizacion.total,
  };
}

function normalizeWorkflowItem(
  item: CotizacionWorkflowItem,
  index: number
): CotizacionWorkflowItem {
  return calculateComponentItem({
    id: item.id,
    codigo: item.codigo || `I${index + 1}`,
    tipo: item.tipo || "Componente",
    vidrio: item.vidrio,
    nombre: item.nombre || item.descripcion || `Componente ${index + 1}`,
    descripcion: item.descripcion || item.nombre || `Componente ${index + 1}`,
    ancho: item.ancho,
    alto: item.alto,
    cantidad: item.cantidad,
    unidad: item.unidad,
    costoProveedorUnitario: item.costoProveedorUnitario,
    margenPct: item.margenPct,
    observaciones: item.observaciones,
  });
}

function mapWorkflowItemToRepositoryItem(
  item: CotizacionWorkflowItem,
  organizationId: EntityId,
  index: number
): CrearCotizacionItemInput {
  const utilidad = round(item.precioTotal - item.costoProveedorTotal, 2);

  return {
    codigo: item.codigo,
    tipoComponente: item.tipo,
    orden: index,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    subtotal: item.precioTotal,
    organizationId,
    ancho: item.ancho,
    alto: item.alto,
    areaM2: item.areaM2,
    linea: item.codigo,
    color: item.tipo,
    vidrio: item.vidrio || null,
    nombre: item.nombre,
    descripcion: item.descripcion,
    unidad: item.unidad,
    observaciones: item.observaciones || null,
    tipoItem: "componente",
    productTypeId: null,
    systemLineId: null,
    configurationId: null,
    costoUnitario: item.costoProveedorUnitario,
    costoTotal: item.costoProveedorTotal,
    margenPct: item.margenPct,
    utilidad,
    breakdown: [],
  };
}

export function createCotizacionesAppService(
  deps: CotizacionesAppServiceDeps = {}
) {
  const clientesRepo = deps.clientesRepository ?? clientesRepository;
  const projectsRepo = deps.projectsRepository ?? projectsRepository;
  const cotizacionesRepo = deps.cotizacionesRepository ?? cotizacionesRepository;

  async function ensureClient(input: {
    organizationId: EntityId;
    existingClientId?: EntityId | null;
    nombre: string;
    telefono: string;
    direccion: string;
  }) {
    const nombre = normalizeString(input.nombre);

    if (!nombre) {
      throw new Error("El nombre del cliente es obligatorio");
    }

    const existingById = input.existingClientId
      ? await clientesRepo.getById(input.existingClientId, input.organizationId)
      : null;

    if (existingById) {
      return clientesRepo.update(existingById.id, input.organizationId, {
        nombre,
        telefono: normalizeString(input.telefono) || null,
        direccion: normalizeString(input.direccion) || null,
      });
    }

    const existingByName = await clientesRepo.findByNombre(nombre, input.organizationId);

    if (existingByName) {
      return clientesRepo.update(existingByName.id, input.organizationId, {
        nombre,
        telefono: normalizeString(input.telefono) || null,
        direccion: normalizeString(input.direccion) || null,
      });
    }

    return clientesRepo.create({
      organizationId: input.organizationId,
      nombre,
      telefono: normalizeString(input.telefono) || null,
      direccion: normalizeString(input.direccion) || null,
    });
  }

  async function ensureProject(input: {
    organizationId: EntityId;
    existingProjectId?: EntityId | null;
    clientId: EntityId;
    titulo: string;
  }) {
    const titulo = normalizeString(input.titulo);

    if (!titulo) {
      throw new Error("La obra o proyecto es obligatorio");
    }

    const existingById = input.existingProjectId
      ? await projectsRepo.getById(input.existingProjectId, input.organizationId)
      : null;

    if (existingById) {
      return projectsRepo.update(existingById.id, input.organizationId, {
        titulo,
        clienteId: input.clientId,
      });
    }

    const existingByTitle = await projectsRepo.findByTitleAndClientId(
      titulo,
      input.clientId,
      input.organizationId
    );

    if (existingByTitle) {
      return projectsRepo.update(existingByTitle.id, input.organizationId, {
        titulo,
        clienteId: input.clientId,
      });
    }

    return projectsRepo.create({
      titulo,
      clienteId: input.clientId,
      organizationId: input.organizationId,
    });
  }

  async function listWorkflowByOrganizationId(organizationId: EntityId) {
    const cotizaciones = await cotizacionesRepo.listByOrganizationId(organizationId);
    const projectIds = Array.from(
      new Set(
        cotizaciones
          .map((cotizacion) => cotizacion.proyectoId)
          .filter((value): value is EntityId => value !== null)
      )
    );
    const projects = await projectsRepo.listByIds(projectIds, organizationId);
    const projectsById = new Map(projects.map((project) => [String(project.id), project]));
    const clientIds = Array.from(
      new Set(
        projects
          .map((project) => project.clienteId)
          .filter((value): value is EntityId => value !== null)
      )
    );
    const clients = await clientesRepo.listByIds(clientIds, organizationId);
    const clientsById = new Map(clients.map((client) => [String(client.id), client]));

    return cotizaciones.map((cotizacion) => {
      const project = cotizacion.proyectoId
        ? projectsById.get(String(cotizacion.proyectoId))
        : null;
      const client =
        project?.clienteId !== null && project?.clienteId !== undefined
          ? clientsById.get(String(project.clienteId))
          : null;

      return mapCotizacionToWorkflowRecord({
        cotizacion: {
          ...cotizacion,
          items: [],
        },
        clientId: project?.clienteId ?? null,
        clientName: client?.nombre ?? "Cliente sin nombre",
        clientPhone: client?.telefono ?? "",
        clientAddress: client?.direccion ?? "",
        projectTitle: project?.titulo ?? "Proyecto sin nombre",
      });
    });
  }

  async function listClientsByOrganizationId(organizationId: EntityId): Promise<Cliente[]> {
    return clientesRepo.listByOrganizationId(organizationId);
  }

  async function getWorkflowById(id: EntityId, organizationId: EntityId) {
    let cotizacion = await cotizacionesRepo.getById(id, organizationId);

    if (!cotizacion) {
      return null;
    }

    if (!cotizacion.approvalToken) {
      cotizacion = await cotizacionesRepo.updateApprovalAccess(id, organizationId, {
        approvalToken: createApprovalToken(),
        approvalTokenExpiresAt: cotizacion.approvalTokenExpiresAt,
        clienteVioEn: cotizacion.clienteVioEn,
        clienteRespondioEn: cotizacion.clienteRespondioEn,
        clienteRespuestaCanal: cotizacion.clienteRespuestaCanal,
      });
    }

    const project = cotizacion.proyectoId
      ? await projectsRepo.getById(cotizacion.proyectoId, organizationId)
      : null;
    const client =
      project?.clienteId !== null && project?.clienteId !== undefined
        ? await clientesRepo.getById(project.clienteId, organizationId)
        : null;

    return mapCotizacionToWorkflowRecord({
      cotizacion,
      clientId: project?.clienteId ?? null,
      clientName: client?.nombre ?? "Cliente sin nombre",
      clientPhone: client?.telefono ?? "",
      clientAddress: client?.direccion ?? "",
      projectTitle: project?.titulo ?? "Proyecto sin nombre",
    });
  }

  async function saveWorkflow(input: GuardarCotizacionWorkflowInput) {
    const existingCotizacion = input.existingId
      ? await cotizacionesRepo.getById(input.existingId, input.organizationId)
      : null;
    const normalizedItems = input.draft.items.map(normalizeWorkflowItem);

    if (input.estado !== "borrador" && normalizedItems.length === 0) {
      throw new Error("La cotizacion debe tener al menos un componente");
    }

    const client = await ensureClient({
      organizationId: input.organizationId,
      existingClientId: input.existingClientId,
      nombre: input.draft.clienteNombre,
      telefono: input.draft.clienteTelefono,
      direccion: input.draft.direccion,
    });
    const project = await ensureProject({
      organizationId: input.organizationId,
      existingProjectId: input.existingProjectId,
      clientId: client.id,
      titulo: input.draft.obra,
    });

    const totals = calculateCotizacionWorkflowTotals(
      normalizedItems,
      input.draft.descuentoPct,
      input.draft.flete
    );
    const costoTotal = round(
      normalizedItems.reduce(
        (accumulator, item) => accumulator + item.costoProveedorTotal,
        0
      ),
      2
    );
    const utilidadTotal = round(totals.neto - costoTotal, 2);
    const margenPct =
      costoTotal === 0 ? 0 : round((utilidadTotal / costoTotal) * 100, 2);
    const codigo =
      input.existingCode ??
      (await cotizacionesRepo.reserveNextCode(input.organizationId)) ??
      buildCotizacionCode();

    const cotizacionInput: CrearCotizacionInput = {
      organizationId: input.organizationId,
      proyectoId: project.id,
      numero: codigo,
      estado: input.estado,
      descuentoPct: input.draft.descuentoPct,
      notas: input.draft.observaciones,
      validoHasta: resolveValidoHasta(input.draft.validez),
      subtotalNeto: totals.neto,
      costoTotal,
      margenPct,
      utilidadTotal,
      approvalToken: existingCotizacion?.approvalToken ?? createApprovalToken(),
      approvalTokenExpiresAt: existingCotizacion?.approvalTokenExpiresAt ?? null,
      clienteVioEn: existingCotizacion?.clienteVioEn ?? null,
      clienteRespondioEn: existingCotizacion?.clienteRespondioEn ?? null,
      clienteRespuestaCanal: existingCotizacion?.clienteRespuestaCanal ?? null,
      iva: totals.iva,
      flete: totals.flete,
      total: totals.total,
      items: normalizedItems.map((item, index) =>
        mapWorkflowItemToRepositoryItem(item, input.organizationId, index)
      ),
    };

    const persisted = input.existingId
      ? await cotizacionesRepo.update(input.existingId, cotizacionInput)
      : await cotizacionesRepo.create(cotizacionInput);

    const workflowRecord = await getWorkflowById(persisted.id, input.organizationId);

    if (!workflowRecord) {
      throw new Error("No se pudo recuperar la cotizacion guardada");
    }

    return workflowRecord;
  }

  async function deleteWorkflow(id: EntityId, organizationId: EntityId) {
    await cotizacionesRepo.softDelete(id, organizationId);
  }

  async function updateManualResponseStatus(input: {
    id: EntityId;
    organizationId: EntityId;
    estado: "pendiente" | "aprobada" | "rechazada" | "terminada";
  }) {
    const existing = await cotizacionesRepo.getById(input.id, input.organizationId);

    if (!existing) {
      throw new Error("No se encontro la cotizacion para actualizar la respuesta.");
    }

    const nextEstado = input.estado === "pendiente" ? "creada" : input.estado;
    const respondedAt =
      input.estado === "pendiente"
        ? null
        : input.estado === "terminada"
        ? existing.clienteRespondioEn
        : existing.clienteRespondioEn ?? new Date().toISOString();
    const responseChannel =
      input.estado === "pendiente"
        ? null
        : input.estado === "terminada"
        ? existing.clienteRespuestaCanal
        : "manual_app";

    const updated = await cotizacionesRepo.updateManualResponse(input.id, input.organizationId, {
      estado: nextEstado,
      clienteRespondioEn: respondedAt,
      clienteRespuestaCanal: responseChannel,
    });
    const project = updated.proyectoId
      ? await projectsRepo.getById(updated.proyectoId, input.organizationId)
      : null;
    const client =
      project?.clienteId !== null && project?.clienteId !== undefined
        ? await clientesRepo.getById(project.clienteId, input.organizationId)
        : null;

    return mapCotizacionToWorkflowRecord({
      cotizacion: updated,
      clientId: project?.clienteId ?? null,
      clientName: client?.nombre ?? "Cliente sin nombre",
      clientPhone: client?.telefono ?? "",
      clientAddress: client?.direccion ?? "",
      projectTitle: project?.titulo ?? "Proyecto sin nombre",
    });
  }

  return {
    listClientsByOrganizationId,
    listWorkflowByOrganizationId,
    getWorkflowById,
    saveWorkflow,
    deleteWorkflow,
    updateManualResponseStatus,
  };
}

export const cotizacionesAppService = createCotizacionesAppService();
