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
          codigo: "V1",
          tipoComponente: "Ventana",
          orden: 1,
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

  it("debe reutilizar el resumen existente al hidratar detalle desde el listado", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const projectsRepository = createProjectsRepositoryMock();
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    const service = createCotizacionesAppService({
      clientesRepository,
      projectsRepository,
      cotizacionesRepository,
    });

    const record = await service.getWorkflowById(100, 77, {
      ensureApprovalToken: false,
      seed: {
        id: "100",
        codigo: "COT-123456",
        clientId: 1,
        projectId: 10,
        clienteNombre: "Cliente cacheado",
        clienteTelefono: "+56 9 1111 2222",
        obra: "Obra cacheada",
        direccion: "Direccion cacheada",
        validez: "15 dias",
        descuentoPct: 0,
        observaciones: "",
        estado: "creada",
        approvalToken: null,
        approvalTokenExpiresAt: null,
        clienteVioEn: null,
        clienteRespondioEn: null,
        clienteRespuestaCanal: null,
        createdAt: "2026-03-14T10:00:00.000Z",
        updatedAt: "2026-03-14T10:00:00.000Z",
        items: [],
        subtotal: 600000,
        descuentoValor: 0,
        neto: 600000,
        iva: 114000,
        flete: 0,
        total: 714000,
      },
    });

    expect(projectsRepository.getById).not.toHaveBeenCalled();
    expect(clientesRepository.getById).not.toHaveBeenCalled();
    expect(cotizacionesRepository.updateApprovalAccess).not.toHaveBeenCalled();
    expect(record?.clienteNombre).toBe("Cliente cacheado");
    expect(record?.obra).toBe("Obra cacheada");
    expect(record?.items).toHaveLength(1);
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
          codigo: "V1",
          tipoComponente: "Ventana",
          orden: 1,
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

  it("debe revertir cliente y proyecto nuevos si falla la creacion de la cotizacion", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const projectsRepository = createProjectsRepositoryMock();
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    cotizacionesRepository.create.mockRejectedValueOnce(
      new Error("fallo insert cotizacion")
    );
    clientesRepository.softDelete.mockResolvedValueOnce(undefined);
    projectsRepository.softDelete.mockResolvedValueOnce(undefined);
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
      })
    ).rejects.toThrow("fallo insert cotizacion");

    expect(projectsRepository.softDelete).toHaveBeenCalledWith(10, 77);
    expect(clientesRepository.softDelete).toHaveBeenCalledWith(1, 77);
  });

  it("debe pasar el snapshot previo al actualizar una cotizacion existente", async () => {
    const clientesRepository = createClientesRepositoryMock();
    const projectsRepository = createProjectsRepositoryMock();
    const cotizacionesRepository = createCotizacionesRepositoryMock();
    clientesRepository.update.mockResolvedValueOnce({
      id: 1,
      organizationId: 77,
      nombre: "Roberto Fuentes",
      telefono: "+56 9 8234 5678",
      direccion: "Los Pescadores 221",
      correo: null,
      creadoEn: null,
      actualizadoEn: null,
      eliminadoEn: null,
    });
    projectsRepository.update.mockResolvedValueOnce({
      id: 10,
      titulo: "Casa Coquimbo",
      descripcion: null,
      clienteId: 1,
      organizationId: 77,
      creadoEn: null,
      estado: "activo",
      actualizadoEn: null,
      eliminadoEn: null,
    });
    cotizacionesRepository.update.mockResolvedValueOnce({ id: 100 } as never);
    const service = createCotizacionesAppService({
      clientesRepository,
      projectsRepository,
      cotizacionesRepository,
    });

    await service.saveWorkflow({
      organizationId: 77,
      existingId: 100,
      existingCode: "COT-123456",
      existingClientId: 1,
      existingProjectId: 10,
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

    expect(cotizacionesRepository.update).toHaveBeenCalledWith(
      100,
      expect.any(Object),
      expect.objectContaining({
        id: 100,
        numero: "COT-123456",
      })
    );
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
