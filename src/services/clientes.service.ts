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
import type {
  ActualizarClienteInput,
  ClienteDetalle,
  ClienteCotizacionResumen,
  ClienteProyectoResumen,
  ClienteResumen,
  CrearClienteInput,
  EstadoClienteResumen,
} from "@/types/cliente";
import type { EntityId } from "@/types/common";

type ClientesServiceDeps = {
  clientesRepository?: ClientesRepository;
  projectsRepository?: ProjectsRepository;
  cotizacionesRepository?: CotizacionesRepository;
};

function getTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatRelativeDate(value: string | null) {
  if (!value) {
    return "Sin actividad";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function resolveEstadoClienteAutomatico(input: {
  totalCotizaciones: number;
  latestQuoteAt: string | null;
  hasApprovedQuote: boolean;
}): EstadoClienteResumen {
  if (input.totalCotizaciones === 0) {
    return "prospecto";
  }

  if (!input.latestQuoteAt) {
    return "seguimiento";
  }

  const diffDays =
    (Date.now() - new Date(input.latestQuoteAt).getTime()) /
    (1000 * 60 * 60 * 24);

  if (diffDays > 30) {
    return "inactivo";
  }

  if (input.hasApprovedQuote) {
    return "activo";
  }

  return "seguimiento";
}

function buildClienteResumen(input: {
  id: EntityId;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
  latestProjectTitle: string | null;
  latestProjectUpdatedAt: string | null;
  latestQuoteDate: string | null;
  obras: number;
  totalCotizaciones: number;
  hasApprovedQuote: boolean;
}): ClienteResumen {
  const ultimaGestionAt =
    input.latestQuoteDate ??
    input.latestProjectUpdatedAt ??
    input.actualizadoEn ??
    input.creadoEn;
  const estadoAutomatico = resolveEstadoClienteAutomatico({
    totalCotizaciones: input.totalCotizaciones,
    latestQuoteAt: input.latestQuoteDate,
    hasApprovedQuote: input.hasApprovedQuote,
  });

  return {
    id: input.id,
    nombre: input.nombre,
    telefono: input.telefono,
    direccion: input.direccion?.trim() || "Sin direccion",
    referencia: input.latestProjectTitle ?? input.direccion ?? "Sin referencia",
    obras: input.obras,
    ultimaGestion: formatRelativeDate(ultimaGestionAt),
    ultimaGestionAt,
    estado: estadoAutomatico,
  };
}

export function createClientesService(deps: ClientesServiceDeps = {}) {
  const clientesRepo = deps.clientesRepository ?? clientesRepository;
  const projectsRepo = deps.projectsRepository ?? projectsRepository;
  const cotizacionesRepo = deps.cotizacionesRepository ?? cotizacionesRepository;

  function buildProjectIndexes(
    projects: Awaited<ReturnType<ProjectsRepository["listByOrganizationId"]>>
  ) {
    const projectsByClientId = new Map<string, typeof projects>();
    const projectById = new Map<string, (typeof projects)[number]>();
    const projectIdToClientId = new Map<string, string>();
    const latestProjectByClientId = new Map<string, (typeof projects)[number]>();

    for (const project of projects) {
      projectById.set(String(project.id), project);

      if (project.clienteId === null || project.clienteId === undefined) {
        continue;
      }

      const clientKey = String(project.clienteId);
      const projectKey = String(project.id);
      const currentProjects = projectsByClientId.get(clientKey) ?? [];

      currentProjects.push(project);
      projectsByClientId.set(clientKey, currentProjects);
      projectIdToClientId.set(projectKey, clientKey);

      const currentLatestProject = latestProjectByClientId.get(clientKey);

      if (
        !currentLatestProject ||
        getTimestamp(project.actualizadoEn ?? project.creadoEn) >
          getTimestamp(
            currentLatestProject.actualizadoEn ?? currentLatestProject.creadoEn
          )
      ) {
        latestProjectByClientId.set(clientKey, project);
      }
    }

    return {
      latestProjectByClientId,
      projectById,
      projectIdToClientId,
      projectsByClientId,
    };
  }

  return {
    async listResumenByOrganizationId(
      organizationId: EntityId
    ): Promise<ClienteResumen[]> {
      const [clientes, projects, cotizaciones] = await Promise.all([
        clientesRepo.listByOrganizationId(organizationId),
        projectsRepo.listByOrganizationId(organizationId),
        cotizacionesRepo.listByOrganizationId(organizationId),
      ]);

      const {
        latestProjectByClientId,
        projectIdToClientId,
        projectsByClientId,
      } = buildProjectIndexes(projects);
      const latestQuoteDateByClientId = new Map<string, string>();
      const quoteCountByClientId = new Map<string, number>();
      const approvedQuoteByClientId = new Map<string, boolean>();

      for (const cotizacion of cotizaciones) {
        if (!cotizacion.proyectoId) {
          continue;
        }

        const clientKey = projectIdToClientId.get(String(cotizacion.proyectoId));
        const updatedAt = cotizacion.actualizadoEn ?? cotizacion.creadoEn;

        if (!clientKey || !updatedAt) {
          continue;
        }

        quoteCountByClientId.set(clientKey, (quoteCountByClientId.get(clientKey) ?? 0) + 1);

        if (
          cotizacion.estado === "aprobada" ||
          cotizacion.estado === "terminada"
        ) {
          approvedQuoteByClientId.set(clientKey, true);
        }

        const currentLatest = latestQuoteDateByClientId.get(clientKey);

        if (getTimestamp(updatedAt) > getTimestamp(currentLatest)) {
          latestQuoteDateByClientId.set(clientKey, updatedAt);
        }
      }

      return clientes
        .map((cliente) => {
          const clientKey = String(cliente.id);
          const relatedProjects = projectsByClientId.get(clientKey) ?? [];
          const latestProject = latestProjectByClientId.get(clientKey) ?? null;
          const obras = relatedProjects.length;

          return buildClienteResumen({
            id: cliente.id,
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            direccion: cliente.direccion,
            creadoEn: cliente.creadoEn,
            actualizadoEn: cliente.actualizadoEn,
            latestProjectTitle: latestProject?.titulo ?? null,
            latestProjectUpdatedAt:
              latestProject?.actualizadoEn ?? latestProject?.creadoEn ?? null,
            latestQuoteDate: latestQuoteDateByClientId.get(clientKey) ?? null,
            obras,
            totalCotizaciones: quoteCountByClientId.get(clientKey) ?? 0,
            hasApprovedQuote: approvedQuoteByClientId.get(clientKey) ?? false,
          });
        })
        .sort((left, right) => {
          return getTimestamp(right.ultimaGestionAt) - getTimestamp(left.ultimaGestionAt);
        });
    },

    async getDetalleById(
      clientId: EntityId,
      organizationId: EntityId
    ): Promise<ClienteDetalle | null> {
      const [cliente, projects, cotizaciones] = await Promise.all([
        clientesRepo.getById(clientId, organizationId),
        projectsRepo.listByOrganizationId(organizationId),
        cotizacionesRepo.listByOrganizationId(organizationId),
      ]);

      if (!cliente) {
        return null;
      }

      const { projectsByClientId } = buildProjectIndexes(projects);
      const relatedProjects = projectsByClientId.get(String(cliente.id)) ?? [];
      const relatedProjectById = new Map(
        relatedProjects.map((project) => [String(project.id), project] as const)
      );
      const quotesByProjectId = new Map<string, ClienteCotizacionResumen[]>();
      const latestQuoteAtByProjectId = new Map<string, string | null>();
      const cotizacionesResumen: ClienteCotizacionResumen[] = [];
      let latestQuoteAt: string | null = null;
      let approvedQuotes = false;

      for (const cotizacion of cotizaciones) {
        if (!cotizacion.proyectoId) {
          continue;
        }

        const projectKey = String(cotizacion.proyectoId);
        const project = relatedProjectById.get(projectKey);

        if (!project) {
          continue;
        }

        const summary: ClienteCotizacionResumen = {
          id: cotizacion.id,
          codigo: cotizacion.numero ?? `COT-${cotizacion.id}`,
          proyectoId: cotizacion.proyectoId,
          obra: project.titulo,
          estado: cotizacion.estado,
          total: cotizacion.total,
          updatedAt: cotizacion.actualizadoEn ?? cotizacion.creadoEn,
        };
        const current = quotesByProjectId.get(projectKey) ?? [];

        current.push(summary);
        quotesByProjectId.set(projectKey, current);
        cotizacionesResumen.push(summary);

        if (cotizacion.estado === "aprobada" || cotizacion.estado === "terminada") {
          approvedQuotes = true;
        }

        if (getTimestamp(summary.updatedAt) > getTimestamp(latestQuoteAt)) {
          latestQuoteAt = summary.updatedAt;
        }

        const latestProjectQuoteAt = latestQuoteAtByProjectId.get(projectKey);

        if (getTimestamp(summary.updatedAt) > getTimestamp(latestProjectQuoteAt)) {
          latestQuoteAtByProjectId.set(projectKey, summary.updatedAt ?? null);
        }
      }

      cotizacionesResumen.sort(
        (left, right) => getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt)
      );

      const proyectos: ClienteProyectoResumen[] = relatedProjects
        .map((project) => {
          const projectKey = String(project.id);
          const projectQuotes = quotesByProjectId.get(projectKey) ?? [];
          const projectLatestQuoteAt = latestQuoteAtByProjectId.get(projectKey) ?? null;

          return {
            id: project.id,
            titulo: project.titulo,
            estado: project.estado,
            cotizaciones: projectQuotes.length,
            ultimaActividadAt:
              projectLatestQuoteAt ?? project.actualizadoEn ?? project.creadoEn,
          };
        })
        .sort(
          (left, right) =>
            getTimestamp(right.ultimaActividadAt) -
            getTimestamp(left.ultimaActividadAt)
        );

      const resumen = buildClienteResumen({
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        creadoEn: cliente.creadoEn,
        actualizadoEn: cliente.actualizadoEn,
        latestProjectTitle: proyectos[0]?.titulo ?? null,
        latestProjectUpdatedAt: proyectos[0]?.ultimaActividadAt ?? null,
        latestQuoteDate: latestQuoteAt,
        obras: relatedProjects.length,
        totalCotizaciones: cotizacionesResumen.length,
        hasApprovedQuote: approvedQuotes,
      });

      return {
        cliente,
        resumen,
        proyectos,
        cotizaciones: cotizacionesResumen,
      };
    },

    async createClient(input: CrearClienteInput) {
      const nombre = input.nombre.trim();

      if (!nombre) {
        throw new Error("El nombre del cliente es obligatorio");
      }

      return clientesRepo.create({
        ...input,
        nombre,
        telefono: input.telefono?.trim() || null,
        direccion: input.direccion?.trim() || null,
        correo: input.correo?.trim().toLowerCase() || null,
      });
    },

    async updateClient(
      clientId: EntityId,
      organizationId: EntityId,
      input: ActualizarClienteInput
    ) {
      const payload: ActualizarClienteInput = {};

      if (input.nombre !== undefined) {
        const nombre = input.nombre.trim();

        if (!nombre) {
          throw new Error("El nombre del cliente es obligatorio");
        }

        payload.nombre = nombre;
      }

      if (input.telefono !== undefined) {
        payload.telefono = input.telefono?.trim() || null;
      }

      if (input.direccion !== undefined) {
        payload.direccion = input.direccion?.trim() || null;
      }

      if (input.correo !== undefined) {
        payload.correo = input.correo?.trim().toLowerCase() || null;
      }

      return clientesRepo.update(clientId, organizationId, payload);
    },

    async updateProjectStatus(
      projectId: EntityId,
      organizationId: EntityId,
      estado: string | null
    ) {
      const normalized = estado?.trim() || null;

      return projectsRepo.update(projectId, organizationId, {
        estado: normalized,
      });
    },

    async deleteClient(clientId: EntityId, organizationId: EntityId) {
      const [projects, cotizaciones] = await Promise.all([
        projectsRepo.listByOrganizationId(organizationId),
        cotizacionesRepo.listByOrganizationId(organizationId),
      ]);

      const relatedProjects = projects.filter(
        (project) => String(project.clienteId) === String(clientId)
      );
      const relatedProjectIds = new Set(
        relatedProjects.map((project) => String(project.id))
      );
      const relatedCotizaciones = cotizaciones.filter((cotizacion) => {
        if (!cotizacion.proyectoId) {
          return false;
        }

        return relatedProjectIds.has(String(cotizacion.proyectoId));
      });

      await Promise.all(
        relatedCotizaciones.map((cotizacion) =>
          cotizacionesRepo.softDelete(cotizacion.id, organizationId)
        )
      );

      await Promise.all(
        relatedProjects.map((project) =>
          projectsRepo.softDelete(project.id, organizationId)
        )
      );

      await clientesRepo.softDelete(clientId, organizationId);

      return {
        deletedProjects: relatedProjects.length,
        deletedCotizaciones: relatedCotizaciones.length,
      };
    },
  };
}

export const clientesService = createClientesService();
