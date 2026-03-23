import { createClientesService } from "../clientes.service";
import type { ClientesRepository } from "@/repositories/clientes-repository";
import type { CotizacionesRepository } from "@/repositories/cotizaciones-repository";
import type { ProjectsRepository } from "@/repositories/projects.repository";

function createClientesRepositoryMock(): jest.Mocked<ClientesRepository> {
  return {
    listByOrganizationId: jest.fn().mockResolvedValue([
      {
        id: 1,
        organizationId: 77,
        nombre: "Roberto Fuentes",
        telefono: "+56 9 8234 5678",
        direccion: "Los Pescadores 221, Coquimbo",
        correo: "roberto@correo.cl",
        creadoEn: "2026-03-01T10:00:00.000Z",
        actualizadoEn: "2026-03-10T10:00:00.000Z",
        eliminadoEn: null,
      },
    ]),
    listByIds: jest.fn(),
    getById: jest.fn().mockResolvedValue({
      id: 1,
      organizationId: 77,
      nombre: "Roberto Fuentes",
      telefono: "+56 9 8234 5678",
      direccion: "Los Pescadores 221, Coquimbo",
      correo: "roberto@correo.cl",
      creadoEn: "2026-03-01T10:00:00.000Z",
      actualizadoEn: "2026-03-10T10:00:00.000Z",
      eliminadoEn: null,
    }),
    findByNombre: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue({
      id: 1,
      organizationId: 77,
      nombre: "Roberto Actualizado",
      telefono: "+56 9 8765 4321",
      direccion: "La Serena",
      correo: "nuevo@correo.cl",
      creadoEn: "2026-03-01T10:00:00.000Z",
      actualizadoEn: "2026-03-15T10:00:00.000Z",
      eliminadoEn: null,
    }),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<ClientesRepository>;
}

function createProjectsRepositoryMock(): jest.Mocked<ProjectsRepository> {
  return {
    listByOrganizationId: jest.fn().mockResolvedValue([
      {
        id: 10,
        titulo: "Casa Coquimbo",
        descripcion: null,
        clienteId: 1,
        organizationId: 77,
        creadoEn: "2026-03-02T10:00:00.000Z",
        estado: "activo",
        actualizadoEn: "2026-03-11T10:00:00.000Z",
        eliminadoEn: null,
      },
      {
        id: 11,
        titulo: "Oficina Serena",
        descripcion: null,
        clienteId: 1,
        organizationId: 77,
        creadoEn: "2026-03-03T10:00:00.000Z",
        estado: "activo",
        actualizadoEn: "2026-03-12T10:00:00.000Z",
        eliminadoEn: null,
      },
    ]),
    listByIds: jest.fn(),
    getById: jest.fn(),
    findByTitleAndClientId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<ProjectsRepository>;
}

function createCotizacionesRepositoryMock(): jest.Mocked<CotizacionesRepository> {
  return {
    listByOrganizationId: jest.fn().mockResolvedValue([
      {
        id: 100,
        proyectoId: 10,
        organizationId: 77,
        numero: "COT-100",
        estado: "creada",
        descuentoPct: 0,
        flete: 0,
        iva: 19000,
        notas: "",
        validoHasta: null,
        subtotalNeto: 100000,
        costoTotal: 80000,
        margenPct: 25,
        utilidadTotal: 20000,
        estadoComercial: null,
        creadoEn: "2026-03-12T10:00:00.000Z",
        actualizadoEn: "2026-03-13T10:00:00.000Z",
        eliminadoEn: null,
        items: [],
        total: 119000,
      },
      {
        id: 101,
        proyectoId: 11,
        organizationId: 77,
        numero: "COT-101",
        estado: "enviada",
        descuentoPct: 0,
        flete: 0,
        iva: 38000,
        notas: "",
        validoHasta: null,
        subtotalNeto: 200000,
        costoTotal: 160000,
        margenPct: 25,
        utilidadTotal: 40000,
        estadoComercial: null,
        creadoEn: "2026-03-10T10:00:00.000Z",
        actualizadoEn: "2026-03-14T10:00:00.000Z",
        eliminadoEn: null,
        items: [],
        total: 238000,
      },
    ]),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    updateApprovalAccess: jest.fn(),
    updateManualResponse: jest.fn(),
  } as unknown as jest.Mocked<CotizacionesRepository>;
}

describe("clientes.service", () => {
  it("debe listar resumenes de clientes con obras y ultima gestion", async () => {
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    cotizacionesRepository.listByOrganizationId.mockResolvedValue([
      {
        id: 100,
        proyectoId: 10,
        organizationId: 77,
        numero: "COT-100",
        estado: "aprobada",
        descuentoPct: 0,
        flete: 0,
        iva: 19000,
        notas: "",
        validoHasta: null,
        subtotalNeto: 100000,
        costoTotal: 80000,
        margenPct: 25,
        utilidadTotal: 20000,
        estadoComercial: null,
        creadoEn: "2026-03-12T10:00:00.000Z",
        actualizadoEn: "2026-03-13T10:00:00.000Z",
        eliminadoEn: null,
        items: [],
        total: 119000,
      },
    ]);
    const service = createClientesService({
      clientesRepository: createClientesRepositoryMock(),
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository,
    });

    const resumenes = await service.listResumenByOrganizationId(77);

    expect(resumenes).toHaveLength(1);
    expect(resumenes[0]).toMatchObject({
      nombre: "Roberto Fuentes",
      obras: 2,
      direccion: "Los Pescadores 221, Coquimbo",
      referencia: "Oficina Serena",
      estado: "activo",
    });
  });

  it("debe armar el detalle del cliente con proyectos y cotizaciones", async () => {
    const service = createClientesService({
      clientesRepository: createClientesRepositoryMock(),
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository: createCotizacionesRepositoryMock(),
    });

    const detalle = await service.getDetalleById(1, 77);

    expect(detalle).not.toBeNull();
    expect(detalle?.proyectos).toHaveLength(2);
    expect(detalle?.cotizaciones).toHaveLength(2);
    expect(detalle?.cotizaciones[0].codigo).toBe("COT-101");
  });

  it("debe ignorar proyectos y cotizaciones de otros clientes al armar el detalle", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const projectsRepository = createProjectsRepositoryMock();
    const cotizacionesRepository = createCotizacionesRepositoryMock();

    projectsRepository.listByOrganizationId.mockResolvedValue([
      ...(await projectsRepository.listByOrganizationId(77)),
      {
        id: 99,
        titulo: "Proyecto ajeno",
        descripcion: null,
        clienteId: 999,
        organizationId: 77,
        creadoEn: "2026-03-20T10:00:00.000Z",
        estado: "activo",
        actualizadoEn: "2026-03-20T10:00:00.000Z",
        eliminadoEn: null,
      },
    ]);

    cotizacionesRepository.listByOrganizationId.mockResolvedValue([
      ...(await cotizacionesRepository.listByOrganizationId(77)),
      {
        id: 999,
        proyectoId: 99,
        organizationId: 77,
        numero: "COT-999",
        estado: "creada",
        descuentoPct: 0,
        flete: 0,
        iva: 0,
        notas: "",
        validoHasta: null,
        subtotalNeto: 1,
        costoTotal: 1,
        margenPct: 0,
        utilidadTotal: 0,
        estadoComercial: null,
        creadoEn: "2026-03-20T10:00:00.000Z",
        actualizadoEn: "2026-03-20T10:00:00.000Z",
        eliminadoEn: null,
        items: [],
        total: 1,
      },
    ]);

    const service = createClientesService({
      clientesRepository,
      projectsRepository,
      cotizacionesRepository,
    });

    const detalle = await service.getDetalleById(1, 77);

    expect(detalle).not.toBeNull();
    expect(detalle?.proyectos).toHaveLength(2);
    expect(detalle?.cotizaciones).toHaveLength(2);
    expect(detalle?.cotizaciones.some((cotizacion) => cotizacion.codigo === "COT-999")).toBe(
      false
    );
  });

  it("debe validar el nombre al actualizar un cliente", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const service = createClientesService({
      clientesRepository,
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository: createCotizacionesRepositoryMock(),
    });

    await expect(
      service.updateClient(1, 77, {
        nombre: "   ",
      })
    ).rejects.toThrow("El nombre del cliente es obligatorio");

    expect(clientesRepository.update).not.toHaveBeenCalled();
  });

  it("debe actualizar un cliente normalizando los datos de contacto", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const service = createClientesService({
      clientesRepository,
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository: createCotizacionesRepositoryMock(),
    });

    await service.updateClient(1, 77, {
      nombre: " Roberto Actualizado ",
      telefono: " +56 9 8765 4321 ",
      direccion: " La Serena ",
      correo: " Nuevo@Correo.CL ",
    });

    expect(clientesRepository.update).toHaveBeenCalledWith(1, 77, {
      nombre: "Roberto Actualizado",
      telefono: "+56 9 8765 4321",
      direccion: "La Serena",
      correo: "nuevo@correo.cl",
    });
  });

  it("debe marcar seguimiento si el cliente tiene cotizaciones pero ninguna aprobada", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const service = createClientesService({
      clientesRepository,
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository: createCotizacionesRepositoryMock(),
    });

    const resumenes = await service.listResumenByOrganizationId(77);

    expect(resumenes[0]).toMatchObject({
      estado: "seguimiento",
    });
  });

  it("debe marcar prospecto si el cliente aun no tiene cotizaciones", async () => {
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    cotizacionesRepository.listByOrganizationId.mockResolvedValue([]);
    const service = createClientesService({
      clientesRepository: createClientesRepositoryMock(),
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository,
    });

    const resumenes = await service.listResumenByOrganizationId(77);

    expect(resumenes[0]).toMatchObject({
      estado: "prospecto",
    });
  });

  it("debe marcar inactivo si la ultima cotizacion es de hace mas de 30 dias", async () => {
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    cotizacionesRepository.listByOrganizationId.mockResolvedValue([
      {
        id: 100,
        proyectoId: 10,
        organizationId: 77,
        numero: "COT-100",
        estado: "aprobada",
        descuentoPct: 0,
        flete: 0,
        iva: 19000,
        notas: "",
        validoHasta: null,
        subtotalNeto: 100000,
        costoTotal: 80000,
        margenPct: 25,
        utilidadTotal: 20000,
        estadoComercial: null,
        creadoEn: "2025-12-01T10:00:00.000Z",
        actualizadoEn: "2026-01-01T10:00:00.000Z",
        eliminadoEn: null,
        items: [],
        total: 119000,
      },
    ]);
    const service = createClientesService({
      clientesRepository: createClientesRepositoryMock(),
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository,
    });

    const resumenes = await service.listResumenByOrganizationId(77);

    expect(resumenes[0]).toMatchObject({
      estado: "inactivo",
    });
  });

  it("debe actualizar el estado de un proyecto del cliente", async () => {
    const projectsRepository = createProjectsRepositoryMock();
    projectsRepository.update.mockResolvedValue({
      id: 10,
      titulo: "Casa Coquimbo",
      descripcion: null,
      clienteId: 1,
      organizationId: 77,
      creadoEn: "2026-03-02T10:00:00.000Z",
      estado: "terminado",
      actualizadoEn: "2026-03-21T10:00:00.000Z",
      eliminadoEn: null,
    });
    const service = createClientesService({
      clientesRepository: createClientesRepositoryMock(),
      projectsRepository,
      cotizacionesRepository: createCotizacionesRepositoryMock(),
    });

    await service.updateProjectStatus(10, 77, " terminado ");

    expect(projectsRepository.update).toHaveBeenCalledWith(10, 77, {
      estado: "terminado",
    });
  });

  it("debe eliminar el cliente junto con sus proyectos y cotizaciones relacionadas", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const projectsRepository = createProjectsRepositoryMock();
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    const service = createClientesService({
      clientesRepository,
      projectsRepository,
      cotizacionesRepository,
    });

    const result = await service.deleteClient(1, 77);

    expect(cotizacionesRepository.softDelete).toHaveBeenCalledTimes(2);
    expect(cotizacionesRepository.softDelete).toHaveBeenNthCalledWith(1, 100, 77);
    expect(cotizacionesRepository.softDelete).toHaveBeenNthCalledWith(2, 101, 77);
    expect(projectsRepository.softDelete).toHaveBeenCalledTimes(2);
    expect(projectsRepository.softDelete).toHaveBeenNthCalledWith(1, 10, 77);
    expect(projectsRepository.softDelete).toHaveBeenNthCalledWith(2, 11, 77);
    expect(clientesRepository.softDelete).toHaveBeenCalledWith(1, 77);
    expect(result).toEqual({
      deletedProjects: 2,
      deletedCotizaciones: 2,
    });
  });
});
