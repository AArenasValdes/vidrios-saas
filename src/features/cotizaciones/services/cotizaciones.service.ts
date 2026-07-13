import {
  clientesRepository,
  type ClientesRepository,
} from "@/features/clientes/repositories/clientes-repository";
import {
  cotizacionesRepository,
  type CotizacionesRepository,
} from "@/features/cotizaciones/repositories/cotizaciones-repository";
import {
  projectsRepository,
  type ProjectsRepository,
} from "@/features/projects/repositories/projects.repository";
import { reconcileWorkflowItemsPricing } from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  buildCotizacionCode,
  buildLegacyCotizacionCode,
  calculateComponentItem,
  calculateFreeValueItem,
  calculateWorkflowTotalsForPricingMode,
  resolveWorkflowObraTitle,
} from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { createApprovalToken } from "@/utils/cotizacion-approval";
import type { Cliente } from "@/features/clientes/types/cliente";
import type { EntityId } from "@/types/common";
import type { Cotizacion, CrearCotizacionInput } from "@/features/cotizaciones/types/cotizacion";
import type { CotizacionItem, CrearCotizacionItemInput } from "@/features/cotizaciones/types/cotizacion-item";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
  CotizacionWorkflowRecord,
  EstadoCotizacionWorkflow,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import { createQuoteStudioFinancialDraft } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import {
  normalizeQuotePricingMode,
  type QuotePricingMode,
} from "@/features/cotizaciones/types/quote-pricing-mode";
import { buildQuoteStudioFinancialSummary } from "@/features/cotizaciones/services/quote-studio-financial.service";

type CotizacionesAppServiceDeps = {
  clientesRepository?: ClientesRepository;
  projectsRepository?: ProjectsRepository;
  cotizacionesRepository?: CotizacionesRepository;
};

type EnsuredEntity<T> = {
  record: T;
  rollback?: () => Promise<void>;
};

export type GuardarCotizacionWorkflowInput = {
  organizationId: EntityId;
  draft: CotizacionWorkflowDraft;
  estado: EstadoCotizacionWorkflow;
  existingId?: EntityId | null;
  existingCode?: string | null;
  existingClientId?: EntityId | null;
  existingProjectId?: EntityId | null;
  requestKey?: string;
};

type GetWorkflowByIdOptions = {
  seed?: CotizacionWorkflowRecord | null;
  ensureApprovalToken?: boolean;
};

type WorkflowSummaryPageOptions = {
  page: number;
  pageSize: number;
  estado?: string | null;
  clienteNombre?: string | null;
  period?: "all" | "this_month" | "last_month" | "last_90_days";
  order?: "updated_desc" | "total_desc" | "codigo_desc" | "estado";
  search?: string | null;
};

type WorkflowSummaryPageResult = {
  cotizaciones: CotizacionWorkflowRecord[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
  summary: {
    totalCount: number;
    totalAmount: number;
    approvedAmount: number;
    pdfGeneratedCount: number;
    counts: {
      borrador: number;
      creada: number;
      enviada: number;
      aprobada: number;
      rechazada: number;
      terminada: number;
    };
  };
};

type WorkflowSummaryScope = {
  allowedProjectIds: EntityId[] | null;
  searchProjectIds: EntityId[] | null;
  normalizedSearch: string;
};

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

const inflightSaveKeys = new Map<string, Promise<CotizacionWorkflowRecord>>();

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
  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
  const tipoItem = item.tipoItem === "item_libre_con_valor" ? "item_libre_con_valor" : "componente";
  const codigo = item.codigo?.trim() || `I${index + 1}`;

  if (tipoItem === "item_libre_con_valor") {
    const cantidad = Number(item.cantidad) > 0 ? Number(item.cantidad) : 1;
    const valorUnitario =
      item.precioUnitario ??
      (item.subtotal && cantidad > 0 ? round(item.subtotal / cantidad, 2) : null) ??
      presentation.totalClienteVisible ??
      item.subtotal ??
      0;

    return calculateFreeValueItem({
      id: String(item.id),
      codigo,
      nombre: item.nombre?.trim() || `Item libre ${index + 1}`,
      descripcion: item.descripcion?.trim() || item.nombre?.trim() || `Item libre ${index + 1}`,
      valor: valorUnitario,
      cantidad,
      ivaMode: presentation.ivaMode ?? "total_incluye_iva",
      observaciones: presentation.raw,
      allowZeroValue: presentation.displayMode === "item_libre",
    });
  }

  const tipo =
    item.tipoComponente?.trim() || item.color?.trim() || item.tipoItem || "Componente";
  const nombre = item.nombre?.trim() || `Componente ${index + 1}`;
  const descripcion = item.descripcion?.trim() || nombre;
  const costoProveedorUnitario = item.costoUnitario ?? 0;
  const margenPct = Math.max(0, item.margenPct ?? 0);
  const calculatedItem = calculateComponentItem({
    id: String(item.id),
    codigo,
    tipo,
    lineaComercial: presentation.referencia || item.linea?.trim() || "",
    vidrio: item.vidrio ?? "",
    nombre,
    descripcion,
    ancho: item.ancho,
    alto: item.alto,
    cantidad: item.cantidad,
    unidad: item.unidad ?? "unidad",
    costoProveedorUnitario,
    margenPct,
    precioPorM2: presentation.precioPorM2,
    minimoCobrable: presentation.minimoCobrable,
    redondeoPrecio: presentation.redondeoPrecio,
    precioPlantillaSugerido: presentation.precioPlantillaSugerido,
    precioAjustadoManual: presentation.precioAjustadoManual,
    origenPrecio: presentation.origenPrecio,
    observaciones: item.observaciones ?? "",
    tipoItem,
  });
  const storedPrecioUnitario =
    item.precioUnitario !== null && item.precioUnitario !== undefined
      ? Number(item.precioUnitario)
      : null;
  const storedSubtotal =
    item.subtotal !== null && item.subtotal !== undefined ? Number(item.subtotal) : null;

  if (
    presentation.precioAjustadoManual &&
    storedPrecioUnitario !== null &&
    Number.isFinite(storedPrecioUnitario) &&
    storedSubtotal !== null &&
    Number.isFinite(storedSubtotal)
  ) {
    return {
      ...calculatedItem,
      precioUnitario: round(storedPrecioUnitario, 2),
      precioTotal: round(storedSubtotal, 2),
      precioAjustadoManual: true,
      origenPrecio: presentation.origenPrecio ?? "manual",
    };
  }

  return calculatedItem;
}

function mapCotizacionToWorkflowRecord(input: {
  cotizacion: Cotizacion;
  clientId: EntityId | null;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  projectTitle: string;
}): CotizacionWorkflowRecord {
  const quotePricingMode = normalizeQuotePricingMode(input.cotizacion.pricingMode);
  const items = reconcileWorkflowItemsPricing(
    input.cotizacion.items.map(mapDatabaseItemToWorkflowItem),
    quotePricingMode
  );
  const workflowTotals = calculateWorkflowTotalsForPricingMode({
    items,
    descuentoPct: input.cotizacion.descuentoPct ?? 0,
    flete: input.cotizacion.flete ?? 0,
    quotePricingMode,
    costoTotalFabricacion: input.cotizacion.costoTotal ?? 0,
    margenGlobalPct: input.cotizacion.margenPct ?? 0,
    totalClienteManual: quotePricingMode === "total_global" ? input.cotizacion.total : null,
    mostrarIva: input.cotizacion.iva ? input.cotizacion.iva > 0 : true,
  });
  const subtotal = workflowTotals.subtotal;
  const neto = input.cotizacion.subtotalNeto ?? workflowTotals.neto;
  const descuentoValor = workflowTotals.descuentoValor;
  const costoTotalFabricacion = input.cotizacion.costoTotal ?? 0;
  const utilidadTotal = input.cotizacion.utilidadTotal ?? 0;
  const margenGlobalPct = input.cotizacion.margenPct ?? 0;
  const iva = input.cotizacion.iva ?? workflowTotals.iva;
  const flete = input.cotizacion.flete ?? 0;
  const total = input.cotizacion.total;
  const redondeoComercial = Math.max(0, round(total - (neto + iva + flete), 2));

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
    descuentoTipo: "porcentaje",
    descuentoMonto: workflowTotals.descuentoValor,
    observaciones: input.cotizacion.notas ?? "",
    estado: input.cotizacion.estado as EstadoCotizacionWorkflow,
    approvalToken: input.cotizacion.approvalToken,
    approvalTokenExpiresAt: input.cotizacion.approvalTokenExpiresAt,
    clienteVioEn: input.cotizacion.clienteVioEn,
    clienteRespondioEn: input.cotizacion.clienteRespondioEn,
    clienteRespuestaCanal: input.cotizacion.clienteRespuestaCanal,
    pdfDescargadoEn: input.cotizacion.pdfDescargadoEn,
    createdAt: input.cotizacion.creadoEn ?? new Date().toISOString(),
    updatedAt:
      input.cotizacion.actualizadoEn ??
      input.cotizacion.creadoEn ??
      new Date().toISOString(),
    items,
    subtotal,
    descuentoValor,
    neto,
    iva,
    flete,
    redondeoComercial,
    total,
    quotePricingMode,
    costoTotalFabricacion,
    margenGlobalPct,
    utilidadTotal,
    totalClienteManual: quotePricingMode === "total_global" ? input.cotizacion.total : null,
    mostrarIva: input.cotizacion.iva ? input.cotizacion.iva > 0 : true,
    quoteStudioFinancial: createQuoteStudioFinancialDraft({
      manoObra: input.cotizacion.costoManoObraTotal ?? 0,
      traslado: input.cotizacion.costoTrasladoTotal ?? 0,
      otrosCostos: input.cotizacion.costoOtrosTotal ?? 0,
      mermaPct: input.cotizacion.mermaPct ?? 0,
      margenObjetivoRealPct: input.cotizacion.margenObjetivoPct ?? 30,
    }),
  };
}

function mapCotizacionToWorkflowRecordFromSeed(
  cotizacion: Cotizacion,
  seed: CotizacionWorkflowRecord
) {
  return mapCotizacionToWorkflowRecord({
    cotizacion,
    clientId: seed.clientId ?? cotizacion.proyectoId ?? null,
    clientName: seed.clienteNombre,
    clientPhone: seed.clienteTelefono,
    clientAddress: seed.direccion,
    projectTitle: seed.obra,
  });
}


function mapWorkflowItemToRepositoryItem(
  item: CotizacionWorkflowItem,
  organizationId: EntityId,
  index: number,
  quotePricingMode: QuotePricingMode = "por_item"
): CrearCotizacionItemInput {
  const isGlobalPricing = quotePricingMode === "total_global";
  const isFreeValueItem = item.tipoItem === "item_libre_con_valor";
  const utilidad = isGlobalPricing ? 0 : round(item.precioTotal - item.costoProveedorTotal, 2);

  return {
    codigo: item.codigo,
    tipoComponente: item.tipo,
    orden: index,
    cantidad: item.cantidad,
    precioUnitario: isGlobalPricing && !isFreeValueItem ? 0 : item.precioUnitario,
    subtotal: isGlobalPricing && !isFreeValueItem ? 0 : item.precioTotal,
    organizationId,
    ancho: item.ancho,
    alto: item.alto,
    areaM2: item.areaM2,
    linea: item.lineaComercial || null,
    color: item.tipo,
    vidrio: item.vidrio || null,
    nombre: item.nombre,
    descripcion: item.descripcion,
    unidad: item.unidad,
    observaciones: item.observaciones || null,
    tipoItem: isFreeValueItem ? "item_libre_con_valor" : "componente",
    productTypeId: null,
    systemLineId: null,
    configurationId: null,
    costoUnitario: isGlobalPricing || isFreeValueItem ? 0 : item.costoProveedorUnitario,
    costoTotal: isGlobalPricing || isFreeValueItem ? 0 : item.costoProveedorTotal,
    margenPct: isGlobalPricing || isFreeValueItem ? 0 : item.margenPct,
    utilidad: isFreeValueItem ? 0 : utilidad,
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
  }): Promise<EnsuredEntity<Cliente>> {
    const nombre = normalizeString(input.nombre);

    if (!nombre) {
      throw new Error("El nombre del cliente es obligatorio");
    }

    const existingById = input.existingClientId
      ? await clientesRepo.getById(input.existingClientId, input.organizationId)
      : null;

    if (existingById) {
      return {
        record: await clientesRepo.update(existingById.id, input.organizationId, {
          nombre,
          telefono: normalizeString(input.telefono) || null,
          direccion: normalizeString(input.direccion) || null,
        }),
      };
    }

    const existingByName = await clientesRepo.findByNombre(nombre, input.organizationId);

    if (existingByName) {
      return {
        record: await clientesRepo.update(existingByName.id, input.organizationId, {
          nombre,
          telefono: normalizeString(input.telefono) || null,
          direccion: normalizeString(input.direccion) || null,
        }),
      };
    }

    const createdClient = await clientesRepo.create({
      organizationId: input.organizationId,
      nombre,
      telefono: normalizeString(input.telefono) || null,
      direccion: normalizeString(input.direccion) || null,
    });

    return {
      record: createdClient,
      rollback: async () => {
        await clientesRepo.softDelete(createdClient.id, input.organizationId);
      },
    };
  }

  async function ensureProject(input: {
    organizationId: EntityId;
    existingProjectId?: EntityId | null;
    clientId: EntityId;
    clientName: string;
    titulo: string;
  }): Promise<
    EnsuredEntity<Awaited<ReturnType<ProjectsRepository["create"]>>>
  > {
    const titulo = normalizeString(
      resolveWorkflowObraTitle({
        obra: input.titulo,
        clienteNombre: input.clientName,
      })
    );

    const existingById = input.existingProjectId
      ? await projectsRepo.getById(input.existingProjectId, input.organizationId)
      : null;

    if (existingById) {
      return {
        record: await projectsRepo.update(existingById.id, input.organizationId, {
          titulo,
          clienteId: input.clientId,
        }),
      };
    }

    const existingByTitle = await projectsRepo.findByTitleAndClientId(
      titulo,
      input.clientId,
      input.organizationId
    );

    if (existingByTitle) {
      return {
        record: await projectsRepo.update(existingByTitle.id, input.organizationId, {
          titulo,
          clienteId: input.clientId,
        }),
      };
    }

    const createdProject = await projectsRepo.create({
      titulo,
      clienteId: input.clientId,
      organizationId: input.organizationId,
    });

    return {
      record: createdProject,
      rollback: async () => {
        await projectsRepo.softDelete(createdProject.id, input.organizationId);
      },
    };
  }

async function rollbackEntities(rollbacks: Array<(() => Promise<void>) | undefined>) {
    for (const rollback of [...rollbacks].reverse()) {
      if (!rollback) {
        continue;
      }

      try {
        await rollback();
      } catch (error) {
        console.error("No se pudo revertir una entidad auxiliar de la cotización.", error);
      }
    }
  }

  function resolvePeriodRange(period: WorkflowSummaryPageOptions["period"]) {
    if (!period || period === "all") {
      return { updatedFrom: undefined, updatedTo: undefined };
    }

    const now = new Date();

    if (period === "this_month") {
      return {
        updatedFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        updatedTo: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      };
    }

    if (period === "last_month") {
      return {
        updatedFrom: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        updatedTo: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      };
    }

    return {
      updatedFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updatedTo: undefined,
    };
  }

  async function resolveWorkflowSummaryScope(
    organizationId: EntityId,
    options: Pick<WorkflowSummaryPageOptions, "clienteNombre" | "search">
  ): Promise<WorkflowSummaryScope> {
    let allowedProjectIds: EntityId[] | null = null;

    if (options.clienteNombre?.trim()) {
      const clientIds = await clientesRepo.listIdsByExactNombre(
        organizationId,
        options.clienteNombre.trim()
      );

      if (clientIds.length === 0) {
        return {
          allowedProjectIds: [],
          searchProjectIds: [],
          normalizedSearch: options.search?.trim() ?? "",
        };
      }

      allowedProjectIds = await projectsRepo.listIdsByClientIds(clientIds, organizationId);

      if (allowedProjectIds.length === 0) {
        return {
          allowedProjectIds: [],
          searchProjectIds: [],
          normalizedSearch: options.search?.trim() ?? "",
        };
      }
    }

    let searchProjectIds: EntityId[] | null = null;
    const normalizedSearch = options.search?.trim() ?? "";

    if (normalizedSearch) {
      const [matchedClientIds, matchedProjectIds] = await Promise.all([
        clientesRepo.searchIdsByNombre(organizationId, normalizedSearch),
        projectsRepo.searchIdsByTitulo(organizationId, normalizedSearch),
      ]);
      const projectIdsFromClients = matchedClientIds.length
        ? await projectsRepo.listIdsByClientIds(matchedClientIds, organizationId)
        : [];

      searchProjectIds = Array.from(
        new Set([...matchedProjectIds, ...projectIdsFromClients].map(String))
      ) as unknown as EntityId[];
    }

    return {
      allowedProjectIds,
      searchProjectIds,
      normalizedSearch,
    };
  }

  async function listWorkflowSummaryPageByOrganizationId(
    organizationId: EntityId,
    options: WorkflowSummaryPageOptions
  ): Promise<WorkflowSummaryPageResult> {
    const scope = await resolveWorkflowSummaryScope(organizationId, options);

    if (scope.allowedProjectIds && scope.allowedProjectIds.length === 0) {
      return {
        cotizaciones: [],
        totalCount: 0,
        hasMore: false,
        page: options.page,
        pageSize: options.pageSize,
        summary: {
          totalCount: 0,
          totalAmount: 0,
          approvedAmount: 0,
          pdfGeneratedCount: 0,
          counts: {
            borrador: 0,
            creada: 0,
            enviada: 0,
            aprobada: 0,
            rechazada: 0,
            terminada: 0,
          },
        },
      };
    }

    const periodRange = resolvePeriodRange(options.period);
    const [pageResult, summary] = await Promise.all([
      cotizacionesRepo.listPageByOrganizationId(organizationId, {
      page: options.page,
      pageSize: options.pageSize,
      estado: options.estado,
      period: options.period,
      order: options.order,
      search: scope.normalizedSearch || null,
      allowedProjectIds: scope.allowedProjectIds,
      searchProjectIds: scope.searchProjectIds,
      }),
      cotizacionesRepo.getResumenGlobalByOrganizationId(organizationId, {
        allowedProjectIds: scope.allowedProjectIds,
        searchProjectIds: scope.searchProjectIds,
        search: scope.normalizedSearch || null,
        updatedFrom: periodRange.updatedFrom,
        updatedTo: periodRange.updatedTo,
      }),
    ]);

    const projectIds = Array.from(
      new Set(
        pageResult.cotizaciones
          .map((cotizacion) => cotizacion.proyectoId)
          .filter((value): value is EntityId => value !== null && value !== undefined)
      )
    );
    const projects = await projectsRepo.listByIds(projectIds, organizationId);
    const projectsById = new Map(projects.map((project) => [String(project.id), project]));
    const clientIds = Array.from(
      new Set(
        projects
          .map((project) => project.clienteId)
          .filter((value): value is EntityId => value !== null && value !== undefined)
      )
    );
    const clients = await clientesRepo.listByIds(clientIds, organizationId);
    const clientsById = new Map(clients.map((client) => [String(client.id), client]));

    return {
      ...pageResult,
      summary,
      cotizaciones: pageResult.cotizaciones.map((cotizacion) => {
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
      }),
    };
  }

  async function listWorkflowSummaryByOrganizationId(organizationId: EntityId) {
    const [cotizaciones, allProjects, allClients] = await Promise.all([
      cotizacionesRepo.listByOrganizationId(organizationId),
      projectsRepo.listByOrganizationId(organizationId),
      clientesRepo.listByOrganizationId(organizationId),
    ]);

    const projectsById = new Map(allProjects.map((project) => [String(project.id), project]));
    const clientsById = new Map(allClients.map((client) => [String(client.id), client]));

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

  async function getWorkflowById(
    id: EntityId,
    organizationId: EntityId,
    options: GetWorkflowByIdOptions = {}
  ) {
    let cotizacion = await cotizacionesRepo.getById(id, organizationId, {
      includeBreakdown: false,
    });

    if (!cotizacion) {
      return null;
    }

    if (options.ensureApprovalToken !== false && !cotizacion.approvalToken) {
      cotizacion = await cotizacionesRepo.updateApprovalAccess(id, organizationId, {
        approvalToken: createApprovalToken(),
        approvalTokenExpiresAt: cotizacion.approvalTokenExpiresAt,
        clienteVioEn: cotizacion.clienteVioEn,
        clienteRespondioEn: cotizacion.clienteRespondioEn,
        clienteRespuestaCanal: cotizacion.clienteRespuestaCanal,
      });
    }

    if (options.seed) {
      return mapCotizacionToWorkflowRecordFromSeed(cotizacion, options.seed);
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
      clientName: client?.nombre ?? (cotizacion.proyectoId ? "Cliente sin nombre" : "Cliente"),
      clientPhone: client?.telefono ?? "",
      clientAddress: client?.direccion ?? "",
      projectTitle: project?.titulo ?? (cotizacion.proyectoId ? "Proyecto sin nombre" : "Cotización"),
    });
  }

async function saveWorkflow(input: GuardarCotizacionWorkflowInput) {
    if (input.requestKey) {
      const inflight = inflightSaveKeys.get(input.requestKey);
      if (inflight) {
        return inflight;
      }
    }

    const savePromise = _saveWorkflow(input);

    if (input.requestKey) {
      inflightSaveKeys.set(input.requestKey, savePromise);
      try {
        return await savePromise;
      } finally {
        inflightSaveKeys.delete(input.requestKey);
      }
    }

    return savePromise;
  }

  async function _saveWorkflow(input: GuardarCotizacionWorkflowInput) {
    const SAVE_TIMEOUT_MS = 30000;
    const existingCotizacion = input.existingId
      ? await cotizacionesRepo.getById(input.existingId, input.organizationId)
      : null;
    const quotePricingMode = normalizeQuotePricingMode(input.draft.quotePricingMode);
    const normalizedItems = reconcileWorkflowItemsPricing(
      input.draft.items,
      quotePricingMode
    );
    const hasTotalGlobalManualTotal =
      quotePricingMode === "total_global" &&
      input.draft.totalClienteManual !== null &&
      input.draft.totalClienteManual !== undefined &&
      Number.isFinite(input.draft.totalClienteManual) &&
      input.draft.totalClienteManual > 0;

    if (
      input.estado !== "borrador" &&
      normalizedItems.length === 0 &&
      !hasTotalGlobalManualTotal
    ) {
      throw new Error("La cotizacion debe tener al menos un componente");
    }

    const isAnonymousClient =
      input.draft.clienteNombre.trim() === "Cliente" && !input.existingClientId;

    let clientResult: EnsuredEntity<Cliente> | null = null;
    let projectResult:
      | EnsuredEntity<Awaited<ReturnType<ProjectsRepository["create"]>>>
      | null = null;
    const rollbackStack: Array<(() => Promise<void>) | undefined> = [];

    if (!isAnonymousClient) {
      clientResult = await ensureClient({
        organizationId: input.organizationId,
        existingClientId: input.existingClientId,
        nombre: input.draft.clienteNombre,
        telefono: input.draft.clienteTelefono,
        direccion: input.draft.direccion,
      });
      rollbackStack.push(clientResult.rollback);
    }

    try {
      const withTimeout = <T>(promise: Promise<T>, label: string): Promise<T> => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout: ${label} excedio ${SAVE_TIMEOUT_MS}ms`));
          }, SAVE_TIMEOUT_MS);
          promise
            .then((result) => {
              clearTimeout(timeoutId);
              resolve(result);
            })
            .catch((error) => {
              clearTimeout(timeoutId);
              reject(error);
            });
        });
      };

      if (!isAnonymousClient && clientResult) {
        projectResult = await withTimeout(
          ensureProject({
            organizationId: input.organizationId,
            existingProjectId: input.existingProjectId,
            clientId: clientResult.record.id,
            clientName: clientResult.record.nombre,
            titulo: input.draft.obra,
          }),
          "crear o actualizar proyecto"
        );

        if (projectResult.rollback) {
          rollbackStack.push(projectResult.rollback);
        }
      }
      const proyectoId = projectResult?.record?.id ?? null;

      const quotePricingMode = normalizeQuotePricingMode(input.draft.quotePricingMode);
      const totals = calculateWorkflowTotalsForPricingMode({
        ...input.draft,
        quotePricingMode,
        items: normalizedItems,
      });
      const descuentoPct =
        totals.subtotal > 0 ? round(Math.min(100, (totals.descuentoValor / totals.subtotal) * 100), 6) : 0;
      const financialDraft = createQuoteStudioFinancialDraft(input.draft.quoteStudioFinancial);
      const financialSummary = buildQuoteStudioFinancialSummary({
        items: normalizedItems,
        quotePricingMode,
        neto: totals.neto,
        total: totals.total,
        costoTotalFabricacion: totals.costoTotalFabricacion,
        manoObra: financialDraft.manoObra,
        traslado: financialDraft.traslado,
        otrosCostos: financialDraft.otrosCostos,
        mermaPct: financialDraft.mermaPct,
        margenObjetivoRealPct: financialDraft.margenObjetivoRealPct,
      });
      const costoTotal = financialSummary.costoTotal;
      const utilidadTotal = financialSummary.utilidadEstimada;
      const margenPct = financialSummary.margenRealPct;
      const ivaPct = totals.neto > 0 ? round((totals.iva / totals.neto) * 100, 4) : 0;
      const financialSnapshotCalculatedAt = new Date().toISOString();
      const codigo =
        input.existingCode ??
        (await cotizacionesRepo.reserveNextCode(input.organizationId)) ??
        buildCotizacionCode();

      const cotizacionInput: CrearCotizacionInput = {
        organizationId: input.organizationId,
        proyectoId,
        numero: codigo,
        estado: input.estado,
        pricingMode: quotePricingMode,
        descuentoPct,
        notas: input.draft.observaciones,
        validoHasta: resolveValidoHasta(input.draft.validez),
        subtotalNeto: totals.neto,
        costoTotal,
        margenPct,
        utilidadTotal,
        costoMaterialesTotal: financialSummary.costoMateriales,
        costoManoObraTotal: financialSummary.manoObra,
        costoTrasladoTotal: financialSummary.traslado,
        costoOtrosTotal: financialSummary.otrosCostos,
        mermaPct: financialDraft.mermaPct,
        mermaTotal: financialSummary.merma,
        margenObjetivoPct: financialSummary.margenObjetivoRealPct,
        precioRecomendadoNeto: financialSummary.precioRecomendadoNeto,
        ivaPct,
        financialSnapshotVersion: 1,
        financialSnapshotCalculadoEn: financialSnapshotCalculatedAt,
        costBasisStatus: financialSummary.hasCostBasis
          ? financialDraft.manoObra > 0 ||
            financialDraft.traslado > 0 ||
            financialDraft.otrosCostos > 0 ||
            financialDraft.mermaPct > 0
            ? "manual"
            : "estimado"
          : "sin_costos",
        approvalToken: existingCotizacion?.approvalToken ?? createApprovalToken(),
        approvalTokenExpiresAt: existingCotizacion?.approvalTokenExpiresAt ?? null,
        clienteVioEn: existingCotizacion?.clienteVioEn ?? null,
        clienteRespondioEn: existingCotizacion?.clienteRespondioEn ?? null,
        clienteRespuestaCanal: existingCotizacion?.clienteRespuestaCanal ?? null,
        iva: totals.iva,
        flete: quotePricingMode === "total_global" ? 0 : totals.flete,
        total: totals.total,
        items: normalizedItems.map((item, index) =>
          mapWorkflowItemToRepositoryItem(item, input.organizationId, index, quotePricingMode)
        ),
      };

      const persisted = input.existingId
        ? await withTimeout(
            cotizacionesRepo.update(input.existingId, cotizacionInput, existingCotizacion),
            "actualizar cotización"
          )
        : await withTimeout(cotizacionesRepo.create(cotizacionInput), "crear cotización");

      const workflowRecord = await withTimeout(
        getWorkflowById(persisted.id, input.organizationId),
        "recuperar cotización guardada"
      );

      if (!workflowRecord) {
        throw new Error("No se pudo recuperar la cotizacion guardada");
      }

return workflowRecord;
    } catch (error) {
      if (!input.existingId) {
        await rollbackEntities(rollbackStack);
      }

      console.error("Fallo el guardado principal de la cotización.", error);
      throw error;
    }
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

  async function markWorkflowAsSent(input: {
    id: EntityId;
    organizationId: EntityId;
  }) {
    const existing = await cotizacionesRepo.getById(input.id, input.organizationId);

    if (!existing) {
      throw new Error("No se encontro la cotizacion para marcarla como enviada.");
    }

    const nextEstado =
      existing.estado === "creada" || existing.estado === "borrador"
        ? "enviada"
        : existing.estado;
    const updated =
      nextEstado === existing.estado
        ? existing
        : await cotizacionesRepo.updateShareStatus(input.id, input.organizationId, {
            estado: "enviada",
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

  async function markWorkflowPdfDownloaded(input: {
    id: EntityId;
    organizationId: EntityId;
  }) {
    const updated = await cotizacionesRepo.recordPdfDownload(
      input.id,
      input.organizationId
    );
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
    listWorkflowByOrganizationId: listWorkflowSummaryByOrganizationId,
    listWorkflowSummaryByOrganizationId,
    listWorkflowSummaryPageByOrganizationId,
    getWorkflowById,
    saveWorkflow,
    deleteWorkflow,
    updateManualResponseStatus,
    markWorkflowAsSent,
    markWorkflowPdfDownloaded,
  };
}

export const cotizacionesAppService = createCotizacionesAppService();

