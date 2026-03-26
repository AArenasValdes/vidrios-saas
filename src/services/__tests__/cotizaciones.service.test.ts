import { createCotizacionesAppService } from "../cotizaciones.service";
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
        direccion: "Los Pescadores 221",
        correo: null,
        creadoEn: null,
        actualizadoEn: null,
        eliminadoEn: null,
      },
    ]),
    listByIds: jest.fn().mockResolvedValue([
      {
        id: 1,
        organizationId: 77,
        nombre: "Roberto Fuentes",
        telefono: "+56 9 8234 5678",
        direccion: "Los Pescadores 221",
        correo: null,
        creadoEn: null,
        actualizadoEn: null,
        eliminadoEn: null,
      },
    ]),
    getById: jest.fn().mockResolvedValue({
      id: 1,
      organizationId: 77,
      nombre: "Roberto Fuentes",
      telefono: "+56 9 8234 5678",
      direccion: "Los Pescadores 221",
      correo: null,
      creadoEn: null,
      actualizadoEn: null,
      eliminadoEn: null,
    }),
    findByNombre: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 1,
      organizationId: 77,
      nombre: "Roberto Fuentes",
      telefono: "+56 9 8234 5678",
      direccion: "Los Pescadores 221",
      correo: null,
      creadoEn: null,
      actualizadoEn: null,
      eliminadoEn: null,
    }),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<ClientesRepository>;
}

function createProjectsRepositoryMock(): jest.Mocked<ProjectsRepository> {
  return {
    listByOrganizationId: jest.fn(),
    listByIds: jest.fn().mockResolvedValue([
      {
        id: 10,
        titulo: "Casa Coquimbo",
        descripcion: null,
        clienteId: 1,
        organizationId: 77,
        creadoEn: null,
        estado: "activo",
        actualizadoEn: null,
        eliminadoEn: null,
      },
    ]),
    getById: jest.fn().mockResolvedValue({
      id: 10,
      titulo: "Casa Coquimbo",
      descripcion: null,
      clienteId: 1,
      organizationId: 77,
      creadoEn: null,
      estado: "activo",
      actualizadoEn: null,
      eliminadoEn: null,
    }),
    findByTitleAndClientId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 10,
      titulo: "Casa Coquimbo",
      descripcion: null,
      clienteId: 1,
      organizationId: 77,
      creadoEn: null,
      estado: "activo",
      actualizadoEn: null,
      eliminadoEn: null,
    }),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<ProjectsRepository>;
}

function createCotizacionesRepositoryMock(): jest.Mocked<CotizacionesRepository> {
  return {
    listByOrganizationId: jest.fn().mockResolvedValue([]),
    reserveNextCode: jest.fn().mockResolvedValue("COT-210326-001"),
    getById: jest.fn().mockResolvedValue({
      id: 100,
      proyectoId: 10,
      organizationId: 77,
      numero: "COT-123456",
      estado: "creada",
      descuentoPct: 0,
      flete: 0,
      iva: 114000,
      notas: "",
      validoHasta: "2026-03-29",
      subtotalNeto: 600000,
      costoTotal: 300000,
      margenPct: 100,
      utilidadTotal: 300000,
      estadoComercial: null,
      approvalToken: "approval-token-1",
      approvalTokenExpiresAt: null,
      clienteVioEn: null,
      clienteRespondioEn: null,
      clienteRespuestaCanal: null,
      creadoEn: "2026-03-14T10:00:00.000Z",
      actualizadoEn: "2026-03-14T10:00:00.000Z",
      eliminadoEn: null,
      items: [
        {
          id: 200,
          cotizacionId: 100,
          organizationId: 77,
          cantidad: 1,
          precioUnitario: 600000,
          subtotal: 600000,
          ancho: 1200,
          alto: 1500,
          areaM2: 1.8,
          linea: "V1",
          color: "Ventana",
          vidrio: "Incoloro monolitico 5mm",
          nombre: "Ventana living",
          actualizadoEn: null,
          eliminadoEn: null,
          descripcion: "Ventana corredera color negro",
          unidad: "unidad",
          observaciones: null,
          tipoItem: "componente",
          creadoEn: null,
          productTypeId: null,
          systemLineId: null,
          configurationId: null,
          costoUnitario: 300000,
          costoTotal: 300000,
          margenPct: 100,
          utilidad: 300000,
          breakdown: [],
        },
      ],
      total: 714000,
    }),
    create: jest.fn().mockResolvedValue({ id: 100 }),
    update: jest.fn(),
    softDelete: jest.fn(),
    updateApprovalAccess: jest.fn(),
    updateManualResponse: jest.fn().mockResolvedValue({
      id: 100,
      proyectoId: 10,
      organizationId: 77,
      numero: "COT-123456",
      estado: "aprobada",
      descuentoPct: 0,
      flete: 0,
      iva: 114000,
      notas: "",
      validoHasta: "2026-03-29",
      subtotalNeto: 600000,
      costoTotal: 300000,
      margenPct: 100,
      utilidadTotal: 300000,
      estadoComercial: null,
      approvalToken: "approval-token-1",
      approvalTokenExpiresAt: null,
      clienteVioEn: null,
      clienteRespondioEn: "2026-03-21T10:00:00.000Z",
      clienteRespuestaCanal: "manual_app",
      creadoEn: "2026-03-14T10:00:00.000Z",
      actualizadoEn: "2026-03-21T10:00:00.000Z",
      eliminadoEn: null,
      items: [],
      total: 714000,
    }),
    updateShareStatus: jest.fn().mockResolvedValue({
      id: 100,
      proyectoId: 10,
      organizationId: 77,
      numero: "COT-123456",
      estado: "enviada",
      descuentoPct: 0,
      flete: 0,
      iva: 114000,
      notas: "",
      validoHasta: "2026-03-29",
      subtotalNeto: 600000,
      costoTotal: 300000,
      margenPct: 100,
      utilidadTotal: 300000,
      estadoComercial: null,
      approvalToken: "approval-token-1",
      approvalTokenExpiresAt: null,
      clienteVioEn: null,
      clienteRespondioEn: null,
      clienteRespuestaCanal: null,
      creadoEn: "2026-03-14T10:00:00.000Z",
      actualizadoEn: "2026-03-21T10:00:00.000Z",
      eliminadoEn: null,
      items: [],
      total: 714000,
    }),
  } as unknown as jest.Mocked<CotizacionesRepository>;
}

describe("cotizaciones.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe listar clientes de la organizacion", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const service = createCotizacionesAppService({
      clientesRepository,
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository: createCotizacionesRepositoryMock(),
    });

    const clientes = await service.listClientsByOrganizationId(77);

    expect(clientesRepository.listByOrganizationId).toHaveBeenCalledWith(77);
    expect(clientes).toHaveLength(1);
  });

  it("debe guardar una cotizacion de componentes resolviendo cliente y proyecto", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const projectsRepository = createProjectsRepositoryMock();
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    const service = createCotizacionesAppService({
      clientesRepository,
      projectsRepository,
      cotizacionesRepository,
    });

    const record = await service.saveWorkflow({
      organizationId: 77,
      estado: "creada",
      draft: {
        clienteNombre: "Roberto Fuentes",
        clienteTelefono: "+56 9 8234 5678",
        obra: "Casa Coquimbo",
        direccion: "Los Pescadores 221",
        validez: "15 dias",
        descuentoPct: 0,
        flete: 0,
        observaciones: "",
        items: [
          {
            id: "item-1",
            codigo: "V1",
            tipo: "Ventana",
            nombre: "Ventana living",
            descripcion: "Ventana corredera color negro",
            ancho: 1200,
            alto: 1500,
            cantidad: 1,
            unidad: "unidad",
            areaM2: 1.8,
            costoProveedorUnitario: 300000,
            costoProveedorTotal: 300000,
            margenPct: 100,
            precioUnitario: 600000,
            precioTotal: 600000,
            vidrio: "Incoloro monolitico 5mm",
            observaciones: "",
          },
        ],
      },
    });

    expect(clientesRepository.create).toHaveBeenCalledTimes(1);
    expect(projectsRepository.create).toHaveBeenCalledTimes(1);
    expect(cotizacionesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 77,
        proyectoId: 10,
        numero: "COT-210326-001",
        estado: "creada",
        total: 714000,
        approvalToken: expect.any(String),
        items: [
          expect.objectContaining({
            vidrio: "Incoloro monolitico 5mm",
          }),
        ],
      })
    );
    expect(record.codigo).toBe("COT-123456");
    expect(record.clienteNombre).toBe("Roberto Fuentes");
    expect(record.obra).toBe("Casa Coquimbo");
    expect(record.items[0].codigo).toBe("V1");
    expect(record.items[0].vidrio).toBe("Incoloro monolitico 5mm");
  });

  it("debe persistir el flete y sumarlo al total guardado", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const projectsRepository = createProjectsRepositoryMock();
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    cotizacionesRepository.getById.mockResolvedValueOnce({
      id: 100,
      proyectoId: 10,
      organizationId: 77,
      numero: "COT-123456",
      estado: "creada",
      descuentoPct: 0,
      flete: 25000,
      iva: 114000,
      notas: "",
      validoHasta: "2026-03-29",
      subtotalNeto: 600000,
      costoTotal: 300000,
      margenPct: 100,
      utilidadTotal: 300000,
      estadoComercial: null,
      approvalToken: "approval-token-1",
      approvalTokenExpiresAt: null,
      clienteVioEn: null,
      clienteRespondioEn: null,
      clienteRespuestaCanal: null,
      creadoEn: "2026-03-14T10:00:00.000Z",
      actualizadoEn: "2026-03-14T10:00:00.000Z",
      eliminadoEn: null,
      items: [
        {
          id: 200,
          cotizacionId: 100,
          organizationId: 77,
          cantidad: 1,
          precioUnitario: 600000,
          subtotal: 600000,
          ancho: 1200,
          alto: 1500,
          areaM2: 1.8,
          linea: "V1",
          color: "Ventana",
          vidrio: "Incoloro monolitico 5mm",
          nombre: "Ventana living",
          actualizadoEn: null,
          eliminadoEn: null,
          descripcion: "Ventana corredera color negro",
          unidad: "unidad",
          observaciones: null,
          tipoItem: "componente",
          creadoEn: null,
          productTypeId: null,
          systemLineId: null,
          configurationId: null,
          costoUnitario: 300000,
          costoTotal: 300000,
          margenPct: 100,
          utilidad: 300000,
          breakdown: [],
        },
      ],
      total: 739000,
    });
    const service = createCotizacionesAppService({
      clientesRepository,
      projectsRepository,
      cotizacionesRepository,
    });

    const record = await service.saveWorkflow({
      organizationId: 77,
      estado: "creada",
      draft: {
        clienteNombre: "Roberto Fuentes",
        clienteTelefono: "+56 9 8234 5678",
        obra: "Casa Coquimbo",
        direccion: "Los Pescadores 221",
        validez: "15 dias",
        descuentoPct: 0,
        flete: 25000,
        observaciones: "",
        items: [
          {
            id: "item-1",
            codigo: "V1",
            tipo: "Ventana",
            nombre: "Ventana living",
            descripcion: "Ventana corredera color negro",
            ancho: 1200,
            alto: 1500,
            cantidad: 1,
            unidad: "unidad",
            areaM2: 1.8,
            costoProveedorUnitario: 300000,
            costoProveedorTotal: 300000,
            margenPct: 100,
            precioUnitario: 600000,
            precioTotal: 600000,
            vidrio: "Incoloro monolitico 5mm",
            observaciones: "",
          },
        ],
      },
    });

    expect(cotizacionesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        numero: "COT-210326-001",
        flete: 25000,
        total: 739000,
      })
    );
    expect(record.flete).toBe(25000);
    expect(record.total).toBe(739000);
  });

  it("debe permitir guardar un borrador sin componentes", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const projectsRepository = createProjectsRepositoryMock();
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    const service = createCotizacionesAppService({
      clientesRepository,
      projectsRepository,
      cotizacionesRepository,
    });

    const record = await service.saveWorkflow({
      organizationId: 77,
      estado: "borrador",
      draft: {
        clienteNombre: "Roberto Fuentes",
        clienteTelefono: "+56 9 8234 5678",
        obra: "Casa Coquimbo",
        direccion: "Los Pescadores 221",
        validez: "15 dias",
        descuentoPct: 0,
        flete: 0,
        observaciones: "",
        items: [],
      },
    });

    expect(clientesRepository.create).toHaveBeenCalledTimes(1);
    expect(projectsRepository.create).toHaveBeenCalledTimes(1);
    expect(cotizacionesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: "borrador",
        items: [],
        total: 0,
      })
    );
    expect(record.id).toBe("100");
  });

  it("debe fallar sin componentes antes de crear cliente o proyecto al guardar como presupuesto", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const projectsRepository = createProjectsRepositoryMock();
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    const service = createCotizacionesAppService({
      clientesRepository,
      projectsRepository,
      cotizacionesRepository,
    });

    await expect(
      service.saveWorkflow({
        organizationId: 77,
        estado: "creada",
        draft: {
          clienteNombre: "Roberto Fuentes",
          clienteTelefono: "+56 9 8234 5678",
          obra: "Casa Coquimbo",
          direccion: "Los Pescadores 221",
          validez: "15 dias",
          descuentoPct: 0,
          flete: 0,
          observaciones: "",
          items: [],
        },
      })
    ).rejects.toThrow("La cotizacion debe tener al menos un componente");

    expect(clientesRepository.create).not.toHaveBeenCalled();
    expect(projectsRepository.create).not.toHaveBeenCalled();
    expect(cotizacionesRepository.create).not.toHaveBeenCalled();
  });

  it("debe eliminar una cotizacion con soft delete", async () => {
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    const service = createCotizacionesAppService({
      clientesRepository: createClientesRepositoryMock(),
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository,
    });

    await service.deleteWorkflow(100, 77);

    expect(cotizacionesRepository.softDelete).toHaveBeenCalledWith(100, 77);
  });

  it("debe actualizar manualmente la respuesta de una cotizacion", async () => {
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    const service = createCotizacionesAppService({
      clientesRepository: createClientesRepositoryMock(),
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository,
    });

    const record = await service.updateManualResponseStatus({
      id: 100,
      organizationId: 77,
      estado: "aprobada",
    });

    expect(cotizacionesRepository.updateManualResponse).toHaveBeenCalledWith(100, 77, {
      estado: "aprobada",
      clienteRespondioEn: expect.any(String),
      clienteRespuestaCanal: "manual_app",
    });
    expect(record.estado).toBe("aprobada");
    expect(record.clienteRespuestaCanal).toBe("manual_app");
  });

  it("debe permitir marcar una cotizacion como proyecto terminado sin pisar la respuesta previa", async () => {
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    cotizacionesRepository.getById.mockResolvedValueOnce({
      id: 100,
      proyectoId: 10,
      organizationId: 77,
      numero: "COT-123456",
      estado: "aprobada",
      descuentoPct: 0,
      flete: 0,
      iva: 114000,
      notas: "",
      validoHasta: "2026-03-29",
      subtotalNeto: 600000,
      costoTotal: 300000,
      margenPct: 100,
      utilidadTotal: 300000,
      estadoComercial: null,
      approvalToken: "approval-token-1",
      approvalTokenExpiresAt: null,
      clienteVioEn: null,
      clienteRespondioEn: "2026-03-21T10:00:00.000Z",
      clienteRespuestaCanal: "manual_app",
      creadoEn: "2026-03-14T10:00:00.000Z",
      actualizadoEn: "2026-03-21T10:00:00.000Z",
      eliminadoEn: null,
      items: [],
      total: 714000,
    });
    cotizacionesRepository.updateManualResponse.mockResolvedValueOnce({
      id: 100,
      proyectoId: 10,
      organizationId: 77,
      numero: "COT-123456",
      estado: "terminada",
      descuentoPct: 0,
      flete: 0,
      iva: 114000,
      notas: "",
      validoHasta: "2026-03-29",
      subtotalNeto: 600000,
      costoTotal: 300000,
      margenPct: 100,
      utilidadTotal: 300000,
      estadoComercial: null,
      approvalToken: "approval-token-1",
      approvalTokenExpiresAt: null,
      clienteVioEn: null,
      clienteRespondioEn: "2026-03-21T10:00:00.000Z",
      clienteRespuestaCanal: "manual_app",
      creadoEn: "2026-03-14T10:00:00.000Z",
      actualizadoEn: "2026-03-21T10:00:00.000Z",
      eliminadoEn: null,
      items: [],
      total: 714000,
    });
    const service = createCotizacionesAppService({
      clientesRepository: createClientesRepositoryMock(),
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository,
    });

    const record = await service.updateManualResponseStatus({
      id: 100,
      organizationId: 77,
      estado: "terminada",
    });

    expect(cotizacionesRepository.updateManualResponse).toHaveBeenCalledWith(100, 77, {
      estado: "terminada",
      clienteRespondioEn: "2026-03-21T10:00:00.000Z",
      clienteRespuestaCanal: "manual_app",
    });
    expect(record.estado).toBe("terminada");
    expect(record.clienteRespuestaCanal).toBe("manual_app");
  });

  it("debe marcar una cotizacion creada como enviada al compartirla", async () => {
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    const service = createCotizacionesAppService({
      clientesRepository: createClientesRepositoryMock(),
      projectsRepository: createProjectsRepositoryMock(),
      cotizacionesRepository,
    });

    const record = await service.markWorkflowAsSent({
      id: 100,
      organizationId: 77,
    });

    expect(cotizacionesRepository.updateShareStatus).toHaveBeenCalledWith(100, 77, {
      estado: "enviada",
    });
    expect(record.estado).toBe("enviada");
  });
});
